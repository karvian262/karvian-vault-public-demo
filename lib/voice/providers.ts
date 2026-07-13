"use client";
import type { VoiceOption,VoicePreferences,VoiceProvider,VoiceProviderId,VoiceSynthesisRequest } from "./types";

const providerNames:Record<VoiceProviderId,string>={browser:"Browser",openai:"OpenAI",elevenlabs:"ElevenLabs",azure:"Azure AI Speech"};

class RemoteVoiceProvider implements VoiceProvider{
 constructor(readonly id:Exclude<VoiceProviderId,"browser">,readonly name:string){}
 async isConfigured(){const response=await fetch("/api/kyra/voices");if(!response.ok)return false;const data=await response.json() as {configured?:Partial<Record<VoiceProviderId,boolean>>};return Boolean(data.configured?.[this.id])}
 async listVoices(){const response=await fetch(`/api/kyra/voices?provider=${this.id}`,{cache:"no-store"});if(!response.ok)throw new Error((await response.json() as {error?:string}).error||`${this.name} is not configured.`);return (await response.json() as {voices:VoiceOption[]}).voices}
 async synthesize(request:VoiceSynthesisRequest){const response=await fetch("/api/kyra/speech",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});if(!response.ok)throw new Error((await response.json() as {error?:string}).error||`${this.name} speech failed.`);return response.blob()}
}

class BrowserVoiceProvider implements VoiceProvider{
 readonly id="browser" as const;readonly name="Browser";
 async isConfigured(){return typeof window!=="undefined"&&"speechSynthesis" in window}
 async listVoices(){const voices=await loadBrowserVoices();return voices.map(voice=>({id:voice.voiceURI||voice.name,name:voice.name,language:voice.lang,description:voice.localService?"Installed voice":"Online system voice"}))}
 async synthesize():Promise<Blob>{throw new Error("Browser speech is played directly and does not produce an audio blob.")}
}

export const voiceProviders:Record<VoiceProviderId,VoiceProvider>={browser:new BrowserVoiceProvider(),openai:new RemoteVoiceProvider("openai",providerNames.openai),elevenlabs:new RemoteVoiceProvider("elevenlabs",providerNames.elevenlabs),azure:new RemoteVoiceProvider("azure",providerNames.azure)};
export function voicePreferences(settings:Record<string,string>):VoicePreferences{return {provider:(settings.voiceProvider||"browser") as VoiceProviderId,voice:settings.voiceId||settings.voice?.replace(/^(openai|system):/,"")||"",speed:Number(settings.voiceSpeed||.98),pitch:Number(settings.voicePitch||1.04),volume:Number(settings.voiceVolume||.92),language:(settings.voiceLanguage||settings.language||"en-IN") as VoicePreferences["language"]}}

export function loadBrowserVoices(timeout=2000):Promise<SpeechSynthesisVoice[]>{return new Promise(resolve=>{let settle:ReturnType<typeof setTimeout>|undefined,finished=false;const done=()=>{if(finished)return;finished=true;if(settle)clearTimeout(settle);clearTimeout(limit);speechSynthesis.removeEventListener("voiceschanged",changed);resolve(speechSynthesis.getVoices())},changed=()=>{if(settle)clearTimeout(settle);settle=setTimeout(done,120)},limit=setTimeout(done,timeout);speechSynthesis.addEventListener("voiceschanged",changed);const current=speechSynthesis.getVoices();if(current.length)settle=setTimeout(done,160)})}
