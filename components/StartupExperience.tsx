"use client";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/appMode";
import { useEffect,useMemo,useRef,useState } from "react";

const SESSION_KEY="karvian_startup_seen_v4";
const ACTIVE_KEY="karvian_startup_active";
const WELCOME_EVENT="karvian:startup-complete";
const isPublicDemo=isDemoMode;
const bootLines=["CORE_LINK ........ ESTABLISHED","MEMORY_MATRIX .... ONLINE","VAULT_PROTOCOL ... SECURE","NEURAL_ENGINE .... INITIALIZING","VOICE_INTERFACE .. STANDBY"];
const panels=[["SYSTEM STATUS","ONLINE"],["CORE TEMPERATURE","31.7 C"],["NEURAL LOAD","72%"],["SECURITY LEVEL","AES-256"],["ACTIVE MODULES","11"],["MEMORY STATUS","SYNCED"],["VOICE LINK","STANDBY"],["NETWORK STATUS","LOCAL"]];
const labels=["KV-CORE // 07","NEURAL MATRIX ACTIVE","ENCRYPTION: AES-256","NODE CONNECTIONS","LATENCY 08MS","VAULT BUS READY"];
type BootState="BOOT_CHECKING"|"BOOT_PLAYING"|"APP_READY";

export default function StartupExperience(){
 const [bootState,setBootState]=useState<BootState>("BOOT_CHECKING"),[leaving,setLeaving]=useState(false),[elapsed,setElapsed]=useState(0),[skippable,setSkippable]=useState(false);
 const timers=useRef<ReturnType<typeof setTimeout>[]>([]),frame=useRef<number|undefined>(undefined),startedAt=useRef(0),finished=useRef(false);
 const reduced=useRef(false);
 const metrics=useMemo(()=>panels.map(([label,value],index)=>({label,value,id:index})),[]);
 useEffect(()=>{
  let cancelled=false;
  sessionStorage.setItem(ACTIVE_KEY,"true");
  void db.settings.get("showStartupSequence").then(row=>{
   if(cancelled)return;
   const alreadyPlayed=sessionStorage.getItem(SESSION_KEY)==="true";
   if(alreadyPlayed||(!isPublicDemo&&row?.value==="false")){revealApp();return}
   begin();
  }).catch(()=>{
   if(cancelled)return;
   if(sessionStorage.getItem(SESSION_KEY)==="true"){revealApp();return}
   begin();
  });
  return()=>{cancelled=true;clearTimers();if(frame.current)cancelAnimationFrame(frame.current);sessionStorage.removeItem(ACTIVE_KEY)};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 function clearTimers(){timers.current.forEach(clearTimeout);timers.current=[]}
 function begin(){
  if(finished.current)return;
  reduced.current=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  startedAt.current=performance.now();
  setBootState("BOOT_PLAYING");setLeaving(false);setElapsed(0);
  if(!reduced.current)void playStartupSound().catch(()=>{});
  const tick=()=>{const seconds=(performance.now()-startedAt.current)/1000;setElapsed(seconds);if(seconds<(reduced.current?1.6:3.85))frame.current=requestAnimationFrame(tick)};
  frame.current=requestAnimationFrame(tick);
  timers.current=[setTimeout(()=>setSkippable(true),1000),setTimeout(()=>finish(),reduced.current?1600:3820)];
 }
 function finish(announce=true){
  if(finished.current)return;
  finished.current=true;
  clearTimers();
  if(frame.current)cancelAnimationFrame(frame.current);
  sessionStorage.setItem(SESSION_KEY,"true");
  sessionStorage.removeItem(ACTIVE_KEY);
  setLeaving(true);
  if(announce)window.dispatchEvent(new CustomEvent(WELCOME_EVENT));
  setTimeout(()=>setBootState("APP_READY"),640);
 }
 function revealApp(){
  if(finished.current)return;
  finished.current=true;
  clearTimers();
  if(frame.current)cancelAnimationFrame(frame.current);
  sessionStorage.removeItem(ACTIVE_KEY);
  setBootState("APP_READY");
 }
 if(bootState==="APP_READY")return null;
 const checking=bootState==="BOOT_CHECKING";
 const phase=elapsed<.5?"signal":elapsed<1.2?"grid":elapsed<2.2?"assemble":elapsed<3?"online":"enter";
 const progress=checking?8:phase==="signal"?0:phase==="grid"?23:phase==="assemble"?Math.min(100,Math.floor(23+(elapsed-1.2)*77)):100;
 const finalLine=isPublicDemo?"WELCOME TO KARVIAN VAULT":"WELCOME BACK, KARTIK";
 return <div className={`boot-os ${phase} ${leaving?"leaving":""}`} role="status" aria-live="polite">
  <div className="boot-noise"/><div className="boot-grid"/><div className="boot-coordinate-x"/><div className="boot-coordinate-y"/><div className="boot-sweep"/><div className="boot-pulse"/>
  <div className="boot-corners"><i/><i/><i/><i/></div>
  <div className="boot-streams">{Array.from({length:28},(_,index)=><span key={index} style={{left:`${(index*3.7)%100}%`,animationDelay:`${index*57}ms`}}/>)}</div>
  <div className="boot-nodes">{Array.from({length:18},(_,index)=><b key={index} style={{left:`${8+(index*17)%84}%`,top:`${12+(index*29)%72}%`,animationDelay:`${index*90}ms`}}/>)}</div>
  <aside className="boot-panel boot-panel-left"><strong>SYSTEM STATUS</strong>{metrics.slice(0,4).map(item=><p key={item.id}><span>{item.label}</span><b>{item.value}</b></p>)}</aside>
  <aside className="boot-panel boot-panel-right"><strong>TELEMETRY</strong>{metrics.slice(4).map((item,index)=><p key={item.id}><span>{item.label}</span><b>{index===1?`${Math.min(99,Math.floor(42+elapsed*18))}%`:item.value}</b></p>)}</aside>
  <div className="boot-terminal"><span className="boot-cursor"/> {checking?"SECURE BOOT CHECK":elapsed<.5?"BOOT SIGNAL DETECTED":bootLines[Math.min(bootLines.length-1,Math.max(0,Math.floor((elapsed-.5)*7)))]}</div>
  <div className="boot-core-wrap">{labels.map((label,index)=><em key={label} className={`boot-label boot-label-${index}`}>{label}</em>)}<div className="boot-core"><span className="ring r1"/><span className="ring r2"/><span className="ring r3"/><span className="ring r4"/><div className="boot-circuit c1"/><div className="boot-circuit c2"/><div className="boot-circuit c3"/><div className="boot-energy"><i/><i/><i/><svg viewBox="0 0 180 44" aria-hidden="true"><path d="M0 25 C18 5 28 42 44 21 S72 16 88 24 116 40 132 15 160 8 180 25"/></svg></div></div></div>
  <section className="boot-copy"><p className="boot-kicker">{isPublicDemo?"KARVIAN VAULT // PUBLIC SHOWCASE MODE":"KARVIAN VAULT // PRIVATE AI OPERATING SYSTEM"}</p><h1>{checking?"SECURE BOOT CHECK":phase==="signal"?"BOOT SIGNAL DETECTED":phase==="online"||phase==="enter"?"KYRA ONLINE":"INITIALIZING KYRA"}</h1><p className="boot-stage">{checking?"Preparing encrypted workspace...":phase==="online"||phase==="enter"?finalLine:phase==="grid"?"Technical grid online. Secure workspace handshake complete.":"Assembling neural core, encrypted memory and voice interface."}</p><div className="boot-progress"><b style={{width:`${progress}%`}}/><span>{progress}%</span></div></section>
  {!checking&&skippable&&<button className="startup-skip boot-skip" onClick={()=>finish()}>Skip</button>}
 </div>
}

async function playStartupSound(){
 const AudioContextClass=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 if(!AudioContextClass)return;
 const context=new AudioContextClass();
 try{
  if(context.state==="suspended")await context.resume();
  const now=context.currentTime,out=context.createGain();
  out.gain.setValueAtTime(.0001,now);out.gain.exponentialRampToValueAtTime(.09,now+.04);out.gain.exponentialRampToValueAtTime(.0001,now+3.45);out.connect(context.destination);
  blip(context,out,now+.08,190,260,.16,"sine");blip(context,out,now+.62,420,680,.08,"square");blip(context,out,now+.82,520,760,.08,"square");blip(context,out,now+1.26,240,620,.34,"triangle");blip(context,out,now+2.2,140,420,.5,"sine");blip(context,out,now+2.72,760,1180,.22,"triangle");blip(context,out,now+3.05,980,1320,.28,"sine");
  await wait(3550);
 }finally{await context.close().catch(()=>{})}
}
function blip(context:AudioContext,out:GainNode,start:number,from:number,to:number,duration:number,type:OscillatorType){
 const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(from,start);oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.55,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);oscillator.connect(gain);gain.connect(out);oscillator.start(start);oscillator.stop(start+duration+.03);
}
function wait(ms:number){return new Promise(resolve=>setTimeout(resolve,ms))}
