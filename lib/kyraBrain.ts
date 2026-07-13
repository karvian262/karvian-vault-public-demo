import { db } from "./db";
import { localKyra, type KyraCommand } from "./kyra";
import type { VaultState } from "./store";

export type KyraRoute="general"|"personal"|"mixed";
export type KyraPlan={route:KyraRoute;reason:string};

const personalSignals=/\b(my|mine|karvian|vault|project|projects|task|tasks|deadline|schedule|note|notes|document|documents|password|passwords|credential|credentials|memory|memories|remember|prefer|preference|gpt chat|claude chat|worked on|yesterday|today's work)\b/i;
const synthesisSignals=/\b(explain|teach|write|draft|brainstorm|ideas?|recommend|analyse|analyze|compare|plan|improve|summarize|strategy|email|research|why|how should)\b/i;

export function classifyKyraRequest(message:string):KyraPlan{
 const personal=personalSignals.test(message),synthesis=synthesisSignals.test(message);
 if(personal&&synthesis)return {route:"mixed",reason:"Requires Gemini reasoning grounded in Vault data"};
 if(personal)return {route:"personal",reason:"Can be answered or acted on using private Vault data"};
 return {route:"general",reason:"General knowledge or creation belongs to Gemini"};
}

export async function answerPersonal(message:string,state:VaultState):Promise<KyraCommand>{
 const query=message.toLowerCase();
 const memory=message.match(/(?:remember that|remember|i prefer|my preference is)\s+(.+)/i);
 if(memory){const now=new Date().toISOString(),content=memory[1].trim();await db.memories.add({id:`memory_${crypto.randomUUID()}`,title:content.slice(0,72),content,category:/prefer/i.test(message)?"Preference":"Important",tags:["kyra"],pinned:true,createdAt:now,updatedAt:now});return {answer:"I’ll remember that."}}
 if(/what projects|which projects|projects do i have|mere projects/.test(query)){const projects=state.projects.filter(project=>!project.archivedAt);return {answer:projects.length?`You have ${projects.length} active projects: ${projects.map(project=>project.name).join(", ")}.`:"You have no active projects.",navigate:"/projects"}}
 if(/what.*tasks|pending tasks|my tasks|mere tasks/.test(query)){const tasks=state.tasks.filter(task=>task.status!=="done");return {answer:tasks.length?`You have ${tasks.length} pending tasks: ${tasks.slice(0,6).map(task=>task.title).join(", ")}.`:"You have no pending tasks.",navigate:"/tasks"}}
 if(/worked on yesterday|yesterday.*work|kal.*kaam/.test(query)){const date=new Date();date.setDate(date.getDate()-1);const day=date.toISOString().slice(0,10),items=(await db.activities.toArray()).filter(item=>item.createdAt.slice(0,10)===day);return {answer:items.length?`Yesterday: ${items.slice(0,8).map(item=>item.action).join(", ")}.`:"No Vault activity was recorded yesterday."}}
 if(/password|credential|secret|api key/.test(query))return {answer:/hindi|karo|kholo/.test(query)?"Password Vault open kar rahi hoon.":"Opening Password Vault.",navigate:"/vault"};
 if(/gpt|claude|chat/.test(query)){const terms=query.replace(/open|show|find|my|gpt|claude|chat|about/g,"").trim(),matches=state.chats.filter(chat=>!terms||`${chat.title} ${chat.summary} ${chat.tags.join(" ")}`.toLowerCase().includes(terms));return {answer:matches.length?`I found ${matches.length}: ${matches.slice(0,5).map(chat=>chat.title).join(", ")}.`:"I couldn’t find a matching saved chat.",navigate:"/ai-vault"}}
 return localKyra(message,state);
}

export function vaultContext(state:VaultState){return {projects:state.projects.map(({id,name,status,priority,progress,deadline,tags,aiSummary})=>({id,name,status,priority,progress,deadline,tags,aiSummary})),tasks:state.tasks,notes:state.notes.map(({title,content,tags,projectId})=>({title,content:content.replace(/<[^>]*>/g," ").slice(0,1200),tags,projectId})),documents:state.documents.map(({name,type,notes,projectId})=>({name,type,notes,projectId})),chats:state.chats.map(({title,model,summary,tags,projectId})=>({title,model,summary,tags,projectId})),memories:state.memories,credentials:state.credentials.map(({name,category,projectId,tags})=>({name,category,projectId,tags}))}}
