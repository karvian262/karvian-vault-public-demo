"use client";

export async function playStopConfirmationChime(){
 if(typeof window==="undefined")return;
 const AudioContextClass=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 if(!AudioContextClass)return;
 const context=new AudioContextClass();
 try{
  if(context.state==="suspended")await context.resume();
  const now=context.currentTime;
  const output=context.createGain();
  output.gain.setValueAtTime(0.0001,now);
  output.gain.exponentialRampToValueAtTime(0.16,now+0.025);
  output.gain.exponentialRampToValueAtTime(0.0001,now+0.34);
  output.connect(context.destination);
  playTone(context,output,now,560,760,0.22);
  playTone(context,output,now+0.055,860,1180,0.24);
  await wait(360);
 }finally{
  await context.close().catch(()=>{});
 }
}

function playTone(context:AudioContext,output:GainNode,start:number,from:number,to:number,duration:number){
 const oscillator=context.createOscillator(),gain=context.createGain();
 oscillator.type="sine";
 oscillator.frequency.setValueAtTime(from,start);
 oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);
 gain.gain.setValueAtTime(0.0001,start);
 gain.gain.exponentialRampToValueAtTime(0.65,start+0.018);
 gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
 oscillator.connect(gain);
 gain.connect(output);
 oscillator.start(start);
 oscillator.stop(start+duration+0.02);
}

function wait(ms:number){return new Promise(resolve=>setTimeout(resolve,ms))}
