import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/appMode";

type KyraRequest={message?:string;route?:"general"|"mixed";context?:unknown;conversation?:Array<{role:string;text:string}>};
type GeminiResponse={candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
type GeminiModel={name:string;supportedGenerationMethods?:string[]};
type GeminiModelsResponse={models?:GeminiModel[]};
type GeminiError={error?:{code?:number;message?:string;status?:string;details?:Array<Record<string,unknown>>}};
type GeminiCallResult={ok:true;text:string;model:string}|{ok:false;status:number;detail:string;retryAfterMs?:number;model:string;timedOut?:boolean};

const GEMINI_TIMEOUT_MS=10000;
let cachedModels:{expires:number;items:GeminiModel[]}|undefined;
let cachedModelName:string|undefined;
let quotaCooldownUntil=0;
let activeController:AbortController|undefined;

export async function GET(){
 if(isDemoMode)return NextResponse.json({configured:false,demo:true});
 const key=process.env.GEMINI_API_KEY;
 if(!key)return NextResponse.json({configured:false});
 const wait=cooldownMs();
 if(wait>0)return NextResponse.json({configured:true,model:cachedModelName?.replace(/^models\//,"")||null,cooldownMs:wait});
 const model=await selectModel(key).catch(()=>undefined);
 return NextResponse.json({configured:true,model:model?.replace(/^models\//,"")||null,cooldownMs:cooldownMs()});
}

export async function POST(request:Request){
 if(isDemoMode)return NextResponse.json({error:"Gemini is disabled in Public Demo Mode.",demo:true},{status:403});
 const key=process.env.GEMINI_API_KEY;
 if(!key)return NextResponse.json({error:"Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart the app."},{status:503});
 const wait=cooldownMs();
 if(wait>0)return limitResponse(wait);
 const body=await request.json() as KyraRequest;
 if(!body.message?.trim())return NextResponse.json({error:"A message is required."},{status:400});
 const models=await candidateModels(key);
 if(!models.length)return NextResponse.json({error:"No available Gemini text model was found for this API key."},{status:503});
 activeController?.abort();
 const result=await generateWithFallback(key,models,body);
 return result.ok?NextResponse.json({text:result.text,model:result.model.replace(/^models\//,"")}):errorResponse(result);
}

async function generateWithFallback(key:string,models:string[],body:KyraRequest):Promise<GeminiCallResult>{
 const primary=models[0],fallback=models.find(model=>model!==primary);
 let result=await callGemini(key,primary,body);
 if(result.ok)return result;
 if(result.status===401||result.status===403||result.status===429)return result;
 if(result.status===404){cachedModelName=undefined;cachedModels=undefined;if(fallback)return callGemini(key,fallback,body)}
 if(isUnavailable(result)){
  await sleep(1000);
  result=await callGemini(key,primary,body);
  if(result.ok)return result;
  if(result.status===401||result.status===403||result.status===429)return result;
  if(result.status===404){cachedModelName=undefined;cachedModels=undefined}
  if(fallback){
   await sleep(2000);
   const fallbackResult=await callGemini(key,fallback,body);
   if(fallbackResult.ok)return fallbackResult;
   return fallbackResult;
  }
 }
 return result;
}

async function callGemini(key:string,model:string,body:KyraRequest):Promise<GeminiCallResult>{
 const controller=new AbortController();
 activeController=controller;
 const timeout=setTimeout(()=>controller.abort(),GEMINI_TIMEOUT_MS);
 try{
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify(payload(body))});
  if(response.ok){
   const data=await response.json() as GeminiResponse;
   const text=data.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("").trim();
   cachedModelName=model;
   return {ok:true,text:text||"I could not form a response. Please try again.",model};
  }
  const detail=await response.text();
  console.error("Gemini API error",response.status,detail);
  return {ok:false,status:response.status,detail,retryAfterMs:response.status===429?retryDelayMs(detail)||retryAfterHeaderMs(response.headers.get("retry-after"))||60000:undefined,model};
 }catch(error){
  const timedOut=error instanceof DOMException&&error.name==="AbortError";
  console.error("Gemini request failed",timedOut?"timeout":error);
  return {ok:false,status:503,detail:timedOut?"Gemini request timed out.":"Gemini request failed.",model,timedOut};
 }finally{
  clearTimeout(timeout);
  if(activeController===controller)activeController=undefined;
 }
}

function payload(body:KyraRequest){
 const prompt=`ROUTE
${body.route||"general"}

AVAILABLE VAULT CONTEXT
${JSON.stringify(body.context)}

RECENT CONVERSATION
${JSON.stringify((body.conversation||[]).slice(-12))}

RAW BROWSER SPEECH TRANSCRIPT
${body.message}`;
 return {systemInstruction:{parts:[{text:"You are KYRA, Kartik's private Karvian Vault assistant powered by Gemini. The USER field is a raw browser Speech Recognition transcript, often Hindi/Hinglish/Indian English. First silently correct only obvious recognition mistakes using recent conversation and Vault context, then answer the corrected intended request. Preserve Kartik's actual meaning and never invent a different request. Preserve names and terms exactly when likely intended: KYRA, Kartik, Karvian, Karvian Vault, Karvian OS, Supabase, Codex, Gemini. Use Gemini for general knowledge, reasoning, teaching, writing, and conversation. Use supplied Vault context only when it is relevant to personal or mixed requests. Detect whether Kartik speaks Hindi, English, or Hinglish, then reply in the same natural everyday style. Be warm, calm, intelligent, friendly, and concise by default. Simple factual questions need one direct short answer. Normal conversation should be 1 to 3 short sentences. Complex explanations may be structured, but still speech-friendly. Do not read markdown, URLs, bullet symbols, or code formatting unless explicitly needed. Never reveal, invent, or infer password values."}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:.45,topP:.9,maxOutputTokens:700}};
}

function errorResponse(result:Extract<GeminiCallResult,{ok:false}>){
 if(result.status===429){const retryAfterMs=result.retryAfterMs||60000;quotaCooldownUntil=Date.now()+retryAfterMs;return limitResponse(retryAfterMs)}
 if(result.status===401||result.status===403)return NextResponse.json({error:"Gemini API key or model access is not allowed. Check your Gemini API access."},{status:result.status});
 if(result.status===404){cachedModelName=undefined;cachedModels=undefined;return NextResponse.json({error:"The selected Gemini model is unavailable. KYRA is refreshing model access."},{status:503})}
 if(result.status===503)return NextResponse.json({error:"KYRA is temporarily unavailable. Try again in a moment."},{status:503});
 return NextResponse.json({error:"KYRA is temporarily unavailable. Try again in a moment."},{status:502});
}

async function candidateModels(key:string){
 const models=await listModels(key),configured=normaliseModel(process.env.GEMINI_MODEL);
 const available=rankModels(models.filter(model=>model.supportedGenerationMethods?.includes("generateContent")));
 const configuredModel=configured?available.find(model=>model.name===configured):undefined;
 const names=[configuredModel?.name,cachedModelName,...available.map(model=>model.name)].filter(Boolean) as string[];
 return [...new Set(names)].slice(0,4);
}

async function selectModel(key:string){return (await candidateModels(key))[0]}

async function listModels(key:string){
 if(cachedModels&&cachedModels.expires>Date.now())return cachedModels.items;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),GEMINI_TIMEOUT_MS);
 try{
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,{cache:"no-store",signal:controller.signal});
  if(!response.ok){console.error("Gemini model list error",response.status,await response.text());return []}
  const data=await response.json() as GeminiModelsResponse;
  cachedModels={expires:Date.now()+10*60*1000,items:data.models||[]};
  return cachedModels.items;
 }catch(error){console.error("Gemini model list failed",error);return []}
 finally{clearTimeout(timeout)}
}

function rankModels(models:GeminiModel[]){
 return [...models].filter(model=>!/(embedding|aqa|vision|image|tts)/i.test(model.name)).sort((a,b)=>scoreModel(b.name)-scoreModel(a.name));
}
function scoreModel(name:string){
 let score=0;
 if(/flash/i.test(name))score+=50;
 if(/pro/i.test(name))score+=30;
 if(/latest/i.test(name))score+=20;
 const version=name.match(/gemini-(\d+(?:\.\d+)?)/i)?.[1];
 if(version)score+=Number(version)*10;
 if(/experimental|exp|preview/i.test(name))score-=25;
 return score;
}
function isUnavailable(result:Extract<GeminiCallResult,{ok:false}>){return result.status===503||result.timedOut}
function normaliseModel(value:string|undefined){if(!value)return;return value.startsWith("models/")?value:`models/${value}`}
function cooldownMs(){return Math.max(0,quotaCooldownUntil-Date.now())}
function limitResponse(retryAfterMs:number){return NextResponse.json({error:"Gemini limit reached. Try again shortly.",retryAfterMs},{status:429,headers:{"Retry-After":String(Math.ceil(retryAfterMs/1000))}})}
function retryAfterHeaderMs(value:string|null){if(!value)return 0;const seconds=Number(value);return Number.isFinite(seconds)?seconds*1000:0}
function retryDelayMs(detail:string){
 try{
  const data=JSON.parse(detail) as GeminiError;
  for(const item of data.error?.details||[]){
   const retryDelay=typeof item.retryDelay==="string"?item.retryDelay:undefined;
   if(retryDelay)return durationMs(retryDelay);
  }
 }catch{}
 return 0;
}
function durationMs(value:string){const match=value.match(/^(\d+(?:\.\d+)?)s$/);return match?Math.ceil(Number(match[1])*1000):0}
function sleep(ms:number){return new Promise(resolve=>setTimeout(resolve,ms))}
