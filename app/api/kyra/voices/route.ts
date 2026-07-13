import { NextRequest,NextResponse } from "next/server";
import { isDemoMode } from "@/lib/appMode";

const openAiVoices=["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse"].map(id=>({id,name:id.replace(/^./,letter=>letter.toUpperCase()),language:"Multilingual"}));
export async function GET(request:NextRequest){
 if(isDemoMode)return NextResponse.json({configured:{browser:true,openai:false,elevenlabs:false,azure:false},demo:true});
 const provider=request.nextUrl.searchParams.get("provider");
 const configured={browser:true,openai:Boolean(process.env.OPENAI_API_KEY),elevenlabs:Boolean(process.env.ELEVENLABS_API_KEY),azure:Boolean(process.env.AZURE_SPEECH_KEY&&process.env.AZURE_SPEECH_REGION)};
 if(!provider)return NextResponse.json({configured});
 if(provider==="openai")return configured.openai?NextResponse.json({voices:openAiVoices}):NextResponse.json({error:"Set OPENAI_API_KEY in .env.local."},{status:503});
 if(provider==="elevenlabs"){
  if(!configured.elevenlabs)return NextResponse.json({error:"Set ELEVENLABS_API_KEY in .env.local."},{status:503});
  const response=await fetch("https://api.elevenlabs.io/v2/voices?page_size=100",{headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY!},cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"ElevenLabs voice discovery failed."},{status:502});
  const data=await response.json() as {voices?:Array<{voice_id:string;name:string;description?:string;preview_url?:string;labels?:Record<string,string>;verified_languages?:Array<{locale?:string;language?:string}>}>};
  return NextResponse.json({voices:(data.voices||[]).map(voice=>({id:voice.voice_id,name:voice.name,language:voice.verified_languages?.map(item=>item.locale||item.language).filter(Boolean).join(", ")||voice.labels?.accent,gender:voice.labels?.gender,previewUrl:voice.preview_url,description:voice.description}))});
 }
 if(provider==="azure"){
  if(!configured.azure)return NextResponse.json({error:"Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.local."},{status:503});
  const response=await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`,{headers:{"Ocp-Apim-Subscription-Key":process.env.AZURE_SPEECH_KEY!},cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Azure voice discovery failed."},{status:502});
  const voices=await response.json() as Array<{ShortName:string;DisplayName:string;LocalName:string;Locale:string;Gender:string;VoiceType:string}>;
  return NextResponse.json({voices:voices.map(voice=>({id:voice.ShortName,name:`${voice.DisplayName} · ${voice.LocalName}`,language:voice.Locale,gender:voice.Gender,description:voice.VoiceType}))});
 }
 return NextResponse.json({error:"Unknown voice provider."},{status:400});
}
