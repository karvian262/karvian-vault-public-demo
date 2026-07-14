"use client";
import { useCallback,useEffect,useRef,useState } from "react";

export type MicrophonePermission="prompt"|"granted"|"denied"|"unavailable";
export type VoiceLog={id:string;time:string;message:string;detail?:string};

type Result={isFinal:boolean;0:{transcript:string;confidence:number}};
type SpeechEvent={resultIndex:number;results:ArrayLike<Result>};
type Recognition={
 lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;
 start:()=>void;stop:()=>void;abort:()=>void;
 onstart:(()=>void)|null;onend:(()=>void)|null;onaudiostart:(()=>void)|null;onaudioend:(()=>void)|null;
 onspeechstart:(()=>void)|null;onspeechend:(()=>void)|null;
 onresult:((event:SpeechEvent)=>void)|null;onerror:((event:{error:string;message?:string})=>void)|null;
};

export function useContinuousSpeech({language,deviceId,onFinal,onLowConfidence,onInterrupt}:{language:string;deviceId?:string;onFinal:(text:string)=>void;onLowConfidence?:()=>void;onInterrupt?:()=>void}){
 const [permission,setPermissionState]=useState<MicrophonePermission>("prompt");
 const [voiceModeActive,setVoiceModeActiveState]=useState(false);
 const [isRecognitionRunning,setRecognitionRunningState]=useState(false);
 const [isStartingRecognition,setStartingRecognitionState]=useState(false);
 const [isSpeaking,setSpeakingState]=useState(false);
 const [isProcessing,setProcessingState]=useState(false);
 const [speechDetected,setSpeechDetected]=useState(false);
 const [interim,setInterim]=useState("");
 const [error,setError]=useState("");
 const [logs,setLogs]=useState<VoiceLog[]>([]);

 const recognition=useRef<Recognition|undefined>(undefined);
 const interruptRecognition=useRef<Recognition|undefined>(undefined);
 const restartTimer=useRef<ReturnType<typeof setTimeout>>();
 const interruptRestartTimer=useRef<ReturnType<typeof setTimeout>>();
 const silenceTimer=useRef<ReturnType<typeof setTimeout>>();
 const startWatchdog=useRef<ReturnType<typeof setTimeout>>();
 const audioDebugTimer=useRef<ReturnType<typeof setTimeout>>();
 const onFinalRef=useRef(onFinal);
 const onLowConfidenceRef=useRef(onLowConfidence);
 const onInterruptRef=useRef(onInterrupt);
 const permissionRef=useRef<MicrophonePermission>("prompt");
 const voiceModeActiveRef=useRef(false);
 const isRecognitionRunningRef=useRef(false);
 const isStartingRecognitionRef=useRef(false);
 const isSpeakingRef=useRef(false);
 const isProcessingRef=useRef(false);
 const userStoppedRef=useRef(false);
 const pausedForProcessingRef=useRef(false);
 const destroyingRef=useRef(false);
 const restartGenerationRef=useRef(0);
 const recognitionSessionRef=useRef(0);
 const lastFinalRef=useRef({text:"",time:0});
 const audioStartedRef=useRef(false);
 const speechStartedRef=useRef(false);
 const lastInterruptRef=useRef(0);
 const startInterruptListenerRef=useRef<()=>void>(()=>{});
 const startListeningSafelyRef=useRef<()=>Promise<boolean>>(async()=>false);

 useEffect(()=>{onFinalRef.current=onFinal},[onFinal]);
 useEffect(()=>{onLowConfidenceRef.current=onLowConfidence},[onLowConfidence]);
 useEffect(()=>{onInterruptRef.current=onInterrupt},[onInterrupt]);

 const log=useCallback((message:string,detail?:string)=>{
  console.info(`[KYRA] ${message}`,detail||"");
  setLogs(current=>[...current.slice(-39),{id:crypto.randomUUID(),time:new Date().toLocaleTimeString(),message,detail}]);
 },[]);
 const setPermission=useCallback((value:MicrophonePermission)=>{permissionRef.current=value;setPermissionState(value)},[]);
 const setVoiceModeActive=useCallback((value:boolean)=>{voiceModeActiveRef.current=value;setVoiceModeActiveState(value)},[]);
 const setRecognitionRunning=useCallback((value:boolean)=>{isRecognitionRunningRef.current=value;setRecognitionRunningState(value)},[]);
 const setStartingRecognition=useCallback((value:boolean)=>{isStartingRecognitionRef.current=value;setStartingRecognitionState(value)},[]);
 const setSpeaking=useCallback((value:boolean)=>{isSpeakingRef.current=value;setSpeakingState(value)},[]);
 const setProcessing=useCallback((value:boolean)=>{isProcessingRef.current=value;setProcessingState(value)},[]);
 const clearStartTimers=useCallback(()=>{
  if(restartTimer.current){clearTimeout(restartTimer.current);restartTimer.current=undefined}
  if(interruptRestartTimer.current){clearTimeout(interruptRestartTimer.current);interruptRestartTimer.current=undefined}
  if(startWatchdog.current){clearTimeout(startWatchdog.current);startWatchdog.current=undefined}
  if(audioDebugTimer.current){clearTimeout(audioDebugTimer.current);audioDebugTimer.current=undefined}
 },[]);
 const clearAllTimers=useCallback(()=>{
  clearStartTimers();
  if(silenceTimer.current){clearTimeout(silenceTimer.current);silenceTimer.current=undefined}
 },[clearStartTimers]);
 const invalidateRestarts=useCallback(()=>{restartGenerationRef.current++;clearStartTimers()},[clearStartTimers]);
 const cleanupRecognition=useCallback((abort=true)=>{
  const instance=recognition.current;
  if(audioDebugTimer.current){clearTimeout(audioDebugTimer.current);audioDebugTimer.current=undefined}
  if(!instance)return;
  destroyingRef.current=true;
  instance.onstart=null;instance.onend=null;instance.onaudiostart=null;instance.onaudioend=null;
  instance.onspeechstart=null;instance.onspeechend=null;instance.onresult=null;instance.onerror=null;
  if(abort)try{instance.abort()}catch{}
  recognition.current=undefined;
  destroyingRef.current=false;
  setRecognitionRunning(false);
  setStartingRecognition(false);
  setSpeechDetected(false);
 },[setRecognitionRunning,setStartingRecognition]);
 const cleanupInterruptRecognition=useCallback((abort=true)=>{
  if(interruptRestartTimer.current){clearTimeout(interruptRestartTimer.current);interruptRestartTimer.current=undefined}
  const instance=interruptRecognition.current;
  if(!instance)return;
  instance.onstart=null;instance.onend=null;instance.onaudiostart=null;instance.onaudioend=null;
  instance.onspeechstart=null;instance.onspeechend=null;instance.onresult=null;instance.onerror=null;
  if(abort)try{instance.abort()}catch{}
  interruptRecognition.current=undefined;
 },[]);
 const startInterruptListener=useCallback(()=>{
  if(!isSpeakingRef.current||interruptRecognition.current)return;
  const source=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Constructor=source.SpeechRecognition||source.webkitSpeechRecognition;
  if(!Constructor)return;
  const instance=new Constructor();
  instance.continuous=true;
  instance.interimResults=true;
  instance.lang=language==="en-IN"?"en-IN":"hi-IN";
  instance.maxAlternatives=1;
  instance.onstart=()=>log("Interrupt listener started","stop commands only");
  instance.onend=()=>{interruptRecognition.current=undefined;if(isSpeakingRef.current&&!userStoppedRef.current)interruptRestartTimer.current=setTimeout(()=>startInterruptListenerRef.current(),250)};
  instance.onerror=()=>{interruptRecognition.current=undefined;if(isSpeakingRef.current&&!userStoppedRef.current)interruptRestartTimer.current=setTimeout(()=>startInterruptListenerRef.current(),350)};
  instance.onresult=event=>{
   for(let index=event.resultIndex;index<event.results.length;index++){
    const phrase=event.results[index][0].transcript.trim();
    if(!phrase)continue;
    if(!isStopCommand(phrase))continue;
    const now=Date.now();
    if(now-lastInterruptRef.current<700)return;
    lastInterruptRef.current=now;
    log("Interrupt stop command",phrase);
    cleanupInterruptRecognition(true);
    onInterruptRef.current?.();
    return;
   }
  };
  interruptRecognition.current=instance;
  try{instance.start()}catch{interruptRecognition.current=undefined}
 },[cleanupInterruptRecognition,language,log]);
 const scheduleRestart=useCallback((delay:number,reason:string)=>{
  if(!voiceModeActiveRef.current||isSpeakingRef.current||isProcessingRef.current||userStoppedRef.current)return;
  const generation=++restartGenerationRef.current;
  if(restartTimer.current)clearTimeout(restartTimer.current);
  log("Restarting microphone",reason);
  restartTimer.current=setTimeout(()=>{
   if(generation!==restartGenerationRef.current)return;
   restartTimer.current=undefined;
   void startListeningSafelyRef.current();
  },delay);
 },[log]);
 const requestPermission=useCallback(async()=>{
  if(!navigator.mediaDevices?.getUserMedia){setPermission("unavailable");setError("This browser does not expose microphone capture.");return false}
  try{
   const permissionStream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:deviceId?{exact:deviceId}:undefined,echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
   log("Permission stream opened",deviceId||"System default");
   permissionStream.getTracks().forEach(track=>track.stop());
   log("Permission stream released");
   setPermission("granted");
   log("Microphone permission granted",deviceId||"System default");
   return true;
  }catch(reason){
   const name=reason instanceof DOMException?reason.name:"UnknownError";
   setPermission(name==="NotAllowedError"||name==="SecurityError"?"denied":"unavailable");
   setError(name==="NotAllowedError"?"Microphone permission was denied. Enable it in browser site settings.":"The selected microphone could not be opened.");
   log("Recognition error",name);
   return false;
  }
 },[deviceId,log,setPermission]);
 const createRecognition=useCallback(()=>{
  const source=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Constructor=source.SpeechRecognition||source.webkitSpeechRecognition;
  if(!Constructor)return;
  const session=++recognitionSessionRef.current;
  const instance=new Constructor();
  instance.continuous=true;instance.interimResults=true;instance.lang=language||"en-IN";instance.maxAlternatives=1;
  instance.onstart=()=>{
   if(recognitionSessionRef.current!==session)return;
   if(startWatchdog.current){clearTimeout(startWatchdog.current);startWatchdog.current=undefined}
   audioStartedRef.current=false;
   speechStartedRef.current=false;
   if(audioDebugTimer.current)clearTimeout(audioDebugTimer.current);
   audioDebugTimer.current=setTimeout(()=>{
    if(recognitionSessionRef.current===session&&isRecognitionRunningRef.current&&!audioStartedRef.current&&!speechStartedRef.current)log("Recognition audio debug","onstart fired, but onaudiostart and onspeechstart have not fired yet");
   },3000);
   setRecognitionRunning(true);setStartingRecognition(false);setError("");
   log("Recognition onstart fired",instance.lang);
  };
  instance.onend=()=>{
   if(destroyingRef.current||recognitionSessionRef.current!==session)return;
   recognition.current=undefined;
   setRecognitionRunning(false);setStartingRecognition(false);setSpeechDetected(false);
   log("Recognition ended");
   if(voiceModeActiveRef.current&&!isSpeakingRef.current&&!isProcessingRef.current&&!userStoppedRef.current&&!restartTimer.current)scheduleRestart(450,"450ms after recognition end");
  };
  instance.onaudiostart=()=>{audioStartedRef.current=true;log("Audio start fired")};
  instance.onaudioend=()=>log("Microphone audio stopped");
  instance.onspeechstart=()=>{
   if(isSpeakingRef.current||isProcessingRef.current)return;
   speechStartedRef.current=true;setSpeechDetected(true);log("Speech detected");
   if(silenceTimer.current)clearTimeout(silenceTimer.current);
  };
  instance.onspeechend=()=>{setSpeechDetected(false);silenceTimer.current=setTimeout(()=>setInterim(""),1200)};
  instance.onresult=event=>{
   if(isSpeakingRef.current||isProcessingRef.current){log("Recognition result ignored","KYRA is not listening");return}
   let partial="";
   for(let index=event.resultIndex;index<event.results.length;index++){
    const result=event.results[index],text=result[0].transcript.trim(),confidence=result[0].confidence;
    if(!text)continue;
    if(confidence>0&&confidence<.18)continue;
    if(result.isFinal){
     const normalized=normaliseTranscript(text),now=Date.now();
     if(!isMeaningfulTranscript(normalized)){log("Final transcript ignored","Too short");return}
     if(confidence>0&&confidence<.32){log("Final transcript ignored","Low confidence");onLowConfidenceRef.current?.();return}
     if(normalized&&lastFinalRef.current.text===normalized&&now-lastFinalRef.current.time<2500){log("Final transcript ignored","Duplicate");return}
     lastFinalRef.current={text:normalized,time:now};
     log("Final transcript",text);
     setInterim("");
     pausedForProcessingRef.current=true;
     setProcessing(true);
     invalidateRestarts();
     cleanupRecognition(true);
     onFinalRef.current(text);
     return;
    }
    partial+=`${text} `;
   }
   if(partial.trim()){
    const live=partial.trim();
    setInterim(live);log("Interim transcript",live);
    if(silenceTimer.current)clearTimeout(silenceTimer.current);
    silenceTimer.current=setTimeout(()=>setInterim(""),2200);
   }
  };
  instance.onerror=event=>{
   if(recognitionSessionRef.current!==session)return;
   const type=event.error;
   log("Recognition error",type);
   cleanupRecognition(true);
   if(type==="not-allowed"||type==="service-not-allowed"){setVoiceModeActive(false);userStoppedRef.current=true;setPermission("denied");setError("Microphone access is blocked. Enable it in browser site settings, then reload KYRA.");return}
   if(type==="audio-capture"){setError("No usable microphone was found. Check the selected input and system privacy settings.");return}
   if(type==="no-speech"){setError("");scheduleRestart(450,"450ms after no speech");return}
   if(type==="aborted"){if(!pausedForProcessingRef.current)scheduleRestart(450,"450ms after abort");return}
   if(type==="network"){setError("Speech recognition lost its network service. KYRA will retry automatically.");scheduleRestart(600,"600ms after network error");return}
   setError(`Speech recognition error: ${type}`);
  };
  recognition.current=instance;
  return {instance,session};
 },[cleanupRecognition,invalidateRestarts,language,log,scheduleRestart,setPermission,setProcessing,setRecognitionRunning,setStartingRecognition,setVoiceModeActive]);
 const startListeningSafely=useCallback(async()=>{
  if(!voiceModeActiveRef.current||isSpeakingRef.current||isProcessingRef.current||isRecognitionRunningRef.current||isStartingRecognitionRef.current||recognition.current)return false;
  log("Recognition start requested");
  setStartingRecognition(true);
  userStoppedRef.current=false;
  pausedForProcessingRef.current=false;
  const allowed=permissionRef.current==="granted"||await requestPermission();
  if(!allowed){setStartingRecognition(false);return false}
  const created=createRecognition();
  if(!created){setPermission("unavailable");setError("Web Speech recognition is unavailable. Use current Chrome or Edge.");setStartingRecognition(false);return false}
  try{
   created.instance.start();
   if(startWatchdog.current)clearTimeout(startWatchdog.current);
   const session=created.session;
   startWatchdog.current=setTimeout(()=>{
    if(recognitionSessionRef.current!==session)return;
    if(isStartingRecognitionRef.current&&!isRecognitionRunningRef.current){log("Recognition error","onstart watchdog timeout");cleanupRecognition(true);scheduleRestart(300,"300ms watchdog retry")}
   },1500);
   return true;
  }catch(error){
   log("Recognition error",error instanceof Error?error.message:"start failed");
   cleanupRecognition(true);
   scheduleRestart(450,"450ms after start failure");
   return false;
  }
 },[cleanupRecognition,createRecognition,log,requestPermission,scheduleRestart,setPermission,setStartingRecognition]);
 useEffect(()=>{startListeningSafelyRef.current=startListeningSafely},[startListeningSafely]);
 useEffect(()=>{startInterruptListenerRef.current=startInterruptListener},[startInterruptListener]);
 const start=useCallback(async()=>{invalidateRestarts();setError("");userStoppedRef.current=false;pausedForProcessingRef.current=false;setSpeaking(false);setProcessing(false);setVoiceModeActive(true);return startListeningSafely()},[invalidateRestarts,setProcessing,setSpeaking,setVoiceModeActive,startListeningSafely]);
 const pauseForSpeech=useCallback(()=>{log("KYRA started speaking");invalidateRestarts();setSpeaking(true);setProcessing(true);pausedForProcessingRef.current=true;setInterim("");cleanupRecognition(true);startInterruptListener()},[cleanupRecognition,invalidateRestarts,log,setProcessing,setSpeaking,startInterruptListener]);
 const resumeAfterSpeech=useCallback((delay=700)=>{log("KYRA finished speaking");setSpeaking(false);setProcessing(false);pausedForProcessingRef.current=false;cleanupInterruptRecognition(true);cleanupRecognition(true);if(!voiceModeActiveRef.current||userStoppedRef.current)return;scheduleRestart(delay,`${delay}ms after speech`)},[cleanupInterruptRecognition,cleanupRecognition,log,scheduleRestart,setProcessing,setSpeaking]);
 const stop=useCallback(()=>{userStoppedRef.current=true;pausedForProcessingRef.current=false;setVoiceModeActive(false);setSpeaking(false);setProcessing(false);invalidateRestarts();cleanupInterruptRecognition(true);cleanupRecognition(true);setInterim("");log("Recognition ended","Manual stop")},[cleanupInterruptRecognition,cleanupRecognition,invalidateRestarts,log,setProcessing,setSpeaking,setVoiceModeActive]);
 useEffect(()=>{if(!navigator.permissions?.query)return;let status:PermissionStatus|undefined;void navigator.permissions.query({name:"microphone" as PermissionName}).then(result=>{status=result;setPermission(result.state as MicrophonePermission);result.onchange=()=>setPermission(result.state as MicrophonePermission)}).catch(()=>{});return()=>{if(status)status.onchange=null}},[setPermission]);
 useEffect(()=>()=>{userStoppedRef.current=true;setVoiceModeActive(false);clearAllTimers();cleanupInterruptRecognition(true);cleanupRecognition(true)},[cleanupInterruptRecognition,cleanupRecognition,clearAllTimers,setVoiceModeActive]);
 return {permission,voiceModeActive,isRecognitionRunning,isStartingRecognition,isSpeaking,isProcessing,running:isRecognitionRunning,speechDetected,interim,error,logs,start,stop,pauseForSpeech,resumeAfterSpeech,startListeningSafely,requestPermission};
}

function normaliseTranscript(value:string){return value.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g,"").replace(/\s+/g," ").trim()}
function isMeaningfulTranscript(value:string){return value.length>2&&!/^(uh|um|hmm|hm|haan|ha|ok|okay)$/i.test(value)}
function ignoredOldStopCommand(value:string){
 const text=normaliseTranscript(value);
 return /^(kyra stop|stop kyra|stop|be quiet|chup|bas|ruko|ruk jao|ruk ja|बस|चुप|रुको|रुक जाओ)$/.test(text);
}
function isStopCommand(value:string){
 const text=normaliseTranscript(value);
 if(!text)return false;
 const withoutWakeWord=text.replace(/\b(hey|hi|hello|kyra|kira|kiara|kayra)\b/g," ").replace(/\s+/g," ").trim();
 return [text,withoutWakeWord].some(candidate=>isExactStopCandidate(candidate)||isShortStopPhrase(candidate));
}
function isExactStopCandidate(text:string){return stopCommands.includes(text)}
function isShortStopPhrase(text:string){return text.length<=36&&stopCommands.some(command=>new RegExp(`(^|\\s)${escapeRegex(command)}(\\s|$)`).test(text))}
function escapeRegex(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
const stopCommands=[
 "kyra stop","stop kyra","stop","be quiet","quiet","chup","chup ho jao","bas","bas karo","bass","ruko","roko","ruk jao","rook jao","ruk ja","ruk jaao","ruk jao kyra","ruko kyra",
 "\u092c\u0938","\u092c\u0938 \u0915\u0930\u094b","\u091a\u0941\u092a","\u091a\u0941\u092a \u0939\u094b \u091c\u093e\u0913","\u0930\u0941\u0915\u094b","\u0930\u094b\u0915\u094b","\u0930\u0941\u0915 \u091c\u093e\u0913","\u0930\u0941\u0915 \u091c\u093e"
];
