import { isDemoMode } from "../appMode";import { db } from "../db";import type { KyraMessage } from "./types";
const KEY="kyraConversationV2";
export class ConversationManager{
 async load(){if(isDemoMode)return [] as KyraMessage[];const row=await db.settings.get(KEY);if(!row?.value)return [] as KyraMessage[];try{return JSON.parse(row.value) as KyraMessage[]}catch{return []}}
 async save(messages:KyraMessage[]){if(isDemoMode)return;await db.settings.put({key:KEY,value:JSON.stringify(messages.slice(-60))})}
 append(messages:KyraMessage[],role:KyraMessage["role"],text:string){return [...messages,{role,text,createdAt:new Date().toISOString()}].slice(-60)}
}
