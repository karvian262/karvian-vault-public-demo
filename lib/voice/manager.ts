"use client";
import { useEffect,useState } from "react";
import { isDemoMode } from "../appMode";
import { db } from "../db";
import { voicePreferences,voiceProviders } from "./providers";
import type { VoiceOption,VoiceProviderId } from "./types";

type VoiceManagerState={
 ready:boolean;
 loading:boolean;
 status:string;
 voices:VoiceOption[];
 microphones:MediaDeviceInfo[];
 configured:Partial<Record<VoiceProviderId,boolean>>;
 provider?:VoiceProviderId;
 voiceId?:string;
 language?:string;
};

const initialState:VoiceManagerState={ready:false,loading:false,status:"",voices:[],microphones:[],configured:{browser:true}};
let state=initialState,lastKey="",initializing:Promise<void>|undefined;
const listeners=new Set<()=>void>();

export function getVoiceManagerState(){return state}
export function subscribeVoiceManager(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
export function useVoiceManager(settings:Record<string,string>){
 const [snapshot,setSnapshot]=useState(state);
 useEffect(()=>subscribeVoiceManager(()=>setSnapshot({...state})),[]);
 useEffect(()=>{void initializeVoiceManager(settings)},[settings.voiceProvider,settings.voiceId,settings.voiceLanguage,settings.language,settings.microphoneId]);
 return snapshot;
}

export async function initializeVoiceManager(settings:Record<string,string>={}){
 if(typeof window==="undefined")return;
 const preferences=voicePreferences(settings),key=[preferences.provider,preferences.voice,preferences.language,settings.microphoneId||""].join("|");
 if(initializing&&key===lastKey)return initializing;
 if(state.ready&&key===lastKey)return;
 lastKey=key;
 initializing=(async()=>{
  patch({loading:true,status:""});
  await Promise.all([loadDevices(),loadConfigured(),loadVoices(preferences.provider,settings.voiceId,preferences.language)]);
  patch({ready:true,loading:false,provider:preferences.provider,voiceId:getVoiceManagerState().voiceId||preferences.voice,language:preferences.language});
 })().catch(error=>patch({ready:true,loading:false,status:error instanceof Error?error.message:"Voice initialization failed."})).finally(()=>{initializing=undefined});
 return initializing;
}

export async function refreshVoiceManagerDevices(request=false){
 try{
  let stream:MediaStream|undefined;
  if(request)stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  const devices=await navigator.mediaDevices.enumerateDevices();
  stream?.getTracks().forEach(track=>track.stop());
  patch({microphones:devices.filter(device=>device.kind==="audioinput"),status:"Microphone access is ready."});
 }catch{patch({status:"Microphone access is blocked. Enable it in browser site settings."})}
}

export async function loadVoiceManagerVoices(provider:VoiceProviderId,settings:Record<string,string>){
 const preferences=voicePreferences({...settings,voiceProvider:provider});
 patch({loading:true,status:"",provider});
 await loadVoices(provider,settings.voiceId,preferences.language);
 patch({loading:false,ready:true,language:preferences.language});
}

async function loadDevices(){
 try{
  const devices=await navigator.mediaDevices?.enumerateDevices?.();
  patch({microphones:(devices||[]).filter(device=>device.kind==="audioinput")});
 }catch{}
}

async function loadConfigured(){
 try{
  const response=await fetch("/api/kyra/voices");
  const data=await response.json() as {configured?:Partial<Record<VoiceProviderId,boolean>>};
  patch({configured:data.configured||{browser:true}});
 }catch{patch({configured:{browser:true}})}
}

async function loadVoices(provider:VoiceProviderId,saved:string|undefined,language:string){
 try{
  const voices=await voiceProviders[provider].listVoices();
  const selected=await restoreVoiceOption(voices,provider,saved,language);
  patch({voices,voiceId:selected?.id||saved,status:voices.length?"":`No ${voiceProviders[provider].name} voices were returned.`});
 }catch(error){patch({voices:[],status:error instanceof Error?error.message:"Voice discovery failed."})}
}

async function restoreVoiceOption(options:VoiceOption[],provider:VoiceProviderId,saved:string|undefined,language:string){
 if(!options.length)return;
 let selected=options.find(option=>option.id===saved)||options.find(option=>option.name===saved);
 if(!selected&&provider==="browser")selected=[...options].sort((a,b)=>browserScore(b,language)-browserScore(a,language))[0];
 selected||=options[0];
 if(selected.id!==saved&&!isDemoMode)await db.settings.put({key:"voiceId",value:selected.id});
 return selected;
}

function browserScore(voice:VoiceOption,language:string){
 let score=0;
 if(voice.language==="hi-IN")score+=language==="hi-IN"||language==="auto"?150:110;
 if(voice.language==="en-IN")score+=language==="en-IN"?140:100;
 if(/hindi|india|indian|\u0939\u093f\u0928\u094d\u0926\u0940/i.test(`${voice.name} ${voice.id}`))score+=45;
 return score;
}
function patch(next:Partial<VoiceManagerState>){state={...state,...next};listeners.forEach(listener=>listener())}
