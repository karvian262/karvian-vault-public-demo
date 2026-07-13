"use client";
import { db } from "../db";
import { isDemoMode } from "../appMode";
import { loadBrowserVoices,voicePreferences,voiceProviders } from "./providers";
import { naturalSpeechChunks,pauseForChunk,prepareSpeechText } from "./speech-preprocessor";
import type { VoicePreferences,VoiceProviderId } from "./types";

type SpeakCallbacks={onStart?:()=>void;onEnd?:()=>void;onError?:(error:unknown)=>void};
export class KyraVoiceEngine{
 private audio?:HTMLAudioElement;
 private objectUrl="";
 private runId=0;
 async speak(text:string,input:VoicePreferences,callbacks:SpeakCallbacks={}){
  this.stop();
  const run=++this.runId,preferences=await this.restore(input),selected=voiceProviders[preferences.provider],provider=await selected.isConfigured()?selected:await this.bestProvider(),chunks=naturalSpeechChunks(text);
  let started=false;
  const markStart=()=>{if(!started){started=true;callbacks.onStart?.()}};
  for(let index=0;index<chunks.length;index++){
   if(run!==this.runId)return;
   const chunk=chunks[index];
   if(provider.id==="browser")await this.speakBrowser(chunk,preferences,run,markStart);
   else try{const blob=await provider.synthesize({...preferences,provider:provider.id,text:prepareSpeechText(chunk)});await this.play(blob,preferences,run,markStart)}catch(error){callbacks.onError?.(error);await this.speakBrowser(chunk,preferences,run,markStart)}
   if(run!==this.runId)return;
   await pause(pauseForChunk(chunk,index,chunks.length),run,()=>this.runId);
  }
  if(run===this.runId)callbacks.onEnd?.();
 }
 stop(){this.runId++;speechSynthesis.cancel();this.cleanupAudio()}
 private async restore(fallback:VoicePreferences){
  const rows=await db.settings.bulkGet(["voiceProvider","voiceId","voiceSpeed","voicePitch","voiceVolume","voiceLanguage","language"]),settings:Record<string,string>={};
  for(const row of rows)if(row)settings[row.key]=row.value;
  const saved=voicePreferences(settings);
  return {provider:settings.voiceProvider?saved.provider:fallback.provider,voice:settings.voiceId?saved.voice:fallback.voice,speed:settings.voiceSpeed?saved.speed:fallback.speed,pitch:settings.voicePitch?saved.pitch:fallback.pitch,volume:settings.voiceVolume?saved.volume:fallback.volume,language:settings.voiceLanguage||settings.language?saved.language:fallback.language};
 }
 private async bestProvider(){for(const id of ["elevenlabs","openai","azure"] as VoiceProviderId[])if(await voiceProviders[id].isConfigured())return voiceProviders[id];return voiceProviders.browser}
 private play(blob:Blob,preferences:VoicePreferences,run:number,onStart:()=>void){return new Promise<void>(resolve=>{if(run!==this.runId)return resolve();this.objectUrl=URL.createObjectURL(blob);this.audio=new Audio(this.objectUrl);this.audio.playbackRate=preferences.speed;this.audio.volume=preferences.volume;this.audio.onplay=()=>onStart();this.audio.onended=()=>{this.cleanupAudio();resolve()};this.audio.onerror=()=>{this.cleanupAudio();resolve()};void this.audio.play().catch(()=>{this.cleanupAudio();resolve()})})}
 private cleanupAudio(){if(this.audio){this.audio.pause();this.audio.src="";this.audio=undefined}if(this.objectUrl){URL.revokeObjectURL(this.objectUrl);this.objectUrl=""}}
 private async speakBrowser(text:string,preferences:VoicePreferences,run:number,onStart:()=>void){
  const voices=await loadBrowserVoices(),saved=preferences.voice,exact=voices.find(voice=>voice.voiceURI===saved)||voices.find(voice=>voice.name===saved);
  let selected=exact;
  if(!selected){selected=[...voices].sort((a,b)=>score(b,preferences.language)-score(a,preferences.language))[0];if(selected)console.warn("[KYRA Voice] Saved voice was unavailable; selected closest replacement.",selected.voiceURI||selected.name)}
  if(!selected)throw new Error("No browser voice is available.");
  const identifier=selected.voiceURI||selected.name;
  if(saved!==identifier&&!isDemoMode)await Promise.all([db.settings.put({key:"voiceProvider",value:"browser"}),db.settings.put({key:"voiceId",value:identifier})]);
  console.info("[KYRA Voice] Selected Voice:",selected.name);
  console.info("[KYRA Voice] Voice URI:",identifier);
  console.info("[KYRA Voice] Language:",selected.lang);
  await new Promise<void>(resolve=>{if(run!==this.runId)return resolve();speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(prepareSpeechText(text));utterance.voice=selected;utterance.lang=preferences.language==="auto"?selected.lang:preferences.language;utterance.rate=preferences.speed;utterance.pitch=preferences.pitch;utterance.volume=preferences.volume;utterance.onstart=()=>{console.info("[KYRA Voice] Speaking start",utterance.text);onStart()};utterance.onend=()=>{console.info("[KYRA Voice] Speaking end");resolve()};utterance.onerror=event=>{console.warn("[KYRA Voice] Speaking error",event.error);resolve()};speechSynthesis.speak(utterance)});
 }
}
function score(voice:SpeechSynthesisVoice,language:string){let value=0;if(voice.lang==="hi-IN")value+=language==="hi-IN"||language==="auto"?150:110;if(voice.lang==="en-IN")value+=language==="en-IN"?140:100;if(/hindi|india|indian|हिन्दी/i.test(`${voice.name} ${voice.voiceURI}`))value+=45;if(/female|neerja|heera|priya|veena|aditi|raveena|swara/i.test(voice.name))value+=25;if(voice.localService)value+=5;return value}
function pause(duration:number,run:number,current:()=>number){return new Promise<void>(resolve=>{if(!duration||run!==current())return resolve();setTimeout(resolve,duration)})}
