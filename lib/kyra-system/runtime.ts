import { ContextEngine } from "./context";
import { ConversationManager } from "./conversation";
import { GeminiEngine } from "./gpt";
import { VaultEngine } from "./vault";
import { isDemoMode } from "../appMode";
import type { KyraMessage,KyraResult } from "./types";
import type { VaultState } from "../store";

export class KyraRuntime{
 readonly conversation=new ConversationManager();
 readonly context=new ContextEngine();
 readonly vault=new VaultEngine();
 readonly gpt=new GeminiEngine();
 async respond(input:string,pathname:string,state:VaultState,messages:KyraMessage[]):Promise<KyraResult>{
  if(isDemoMode)return demoResponse(input,pathname);
  const context=await this.context.build(pathname,state),local=await this.vault.resolve(input,context);
  if(local)return local;
  const route=this.vault.classify(input).route;
  if(!await this.gpt.configured())return {text:"Gemini is not configured. Add GEMINI_API_KEY in .env.local, then restart Karvian Vault.",navigate:"/settings",source:"gpt"};
  const text=await this.gpt.respond(input,route==="mixed"?"mixed":"general",this.context.forGpt(context,route==="mixed"),messages);
  return {text,source:route==="mixed"?"hybrid":"gpt"};
 }
}
function demoResponse(input:string,pathname:string):KyraResult{
 const query=input.toLowerCase();
 if(/project|progress|karvian os/.test(query))return {text:"Public Demo Mode shows sample project progress only. Karvian OS is at 78% in this showcase.",navigate:"/projects",source:"vault"};
 if(/task|today|schedule|focus/.test(query))return {text:"Demo focus: finalize public showcase mode, polish vault previews, and prepare KYRA demo prompts.",navigate:"/tasks",source:"vault"};
 if(/password|secret|vault/.test(query))return {text:"Password Vault is locked in the public demo. No real credentials or secrets are included.",navigate:"/vault",source:"vault"};
 if(/note|document|file/.test(query))return {text:"You can explore sample notes and documents. Uploading and saving are disabled in Public Demo Mode.",navigate:pathname.includes("documents")?"/documents":"/notes",source:"vault"};
 return {text:"This is KYRA in Public Demo Mode. Interactive Gemini reasoning is available only in the private owner version, so public visitors never consume API quota.",source:"vault"};
}
