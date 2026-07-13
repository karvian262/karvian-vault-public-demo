import type { KyraMessage } from "./types";

let clientCooldownUntil=0;
let inFlight=false;

export class GeminiEngine{
 async configured(){const response=await fetch("/api/kyra");return response.ok&&Boolean((await response.json() as {configured?:boolean}).configured)}
 async respond(message:string,route:"general"|"mixed",context:unknown,conversation:KyraMessage[]){
  const wait=clientCooldownUntil-Date.now();
  if(wait>0)throw new Error("Gemini limit reached. Try again shortly.");
  if(inFlight)throw new Error("KYRA is already thinking. Please wait a moment.");
  inFlight=true;
  try{
   const response=await fetch("/api/kyra",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,route,context,conversation:conversation.slice(-12)})});
   const data=await response.json() as {text?:string;error?:string;retryAfterMs?:number};
   if(response.status===429){clientCooldownUntil=Date.now()+Math.max(1000,data.retryAfterMs||60000);throw new Error("Gemini limit reached. Try again shortly.")}
   if(response.status===503){clientCooldownUntil=Date.now()+10000;throw new Error(data.error||"KYRA is temporarily unavailable. Try again in a moment.")}
   if(!response.ok)throw new Error(data.error||"Gemini request failed.");
   return data.text||"I could not form a response.";
  }finally{inFlight=false}
 }
}
