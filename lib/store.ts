"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { isDemoMode } from "./appMode";
import { db } from "./db";
import { demoActivities,demoVaultState } from "./demoData";
import type { AiChat, Credential, DocumentItem, Memory, Note, Priority, Project, ProjectStatus, Task, TaskStatus } from "./types";

const now=()=>new Date().toISOString(); const uid=(p:string)=>`${p}_${crypto.randomUUID()}`;
const empty={projects:[] as Project[],tasks:[] as Task[],notes:[] as Note[],chats:[] as AiChat[],credentials:[] as Credential[],documents:[] as DocumentItem[],memories:[] as Memory[]};
export type VaultState=typeof empty;
async function activity(action:string,entityType:string,entityId?:string){await db.activities.add({id:uid("log"),action,entityType,entityId,createdAt:now()})}
async function cascadeProject(id:string){await db.transaction("rw",[db.projects,db.tasks,db.notes,db.chats,db.credentials,db.documents,db.memories],async()=>{await Promise.all([db.projects.delete(id),db.tasks.where("projectId").equals(id).delete(),db.notes.where("projectId").equals(id).delete(),db.chats.where("projectId").equals(id).delete(),db.credentials.where("projectId").equals(id).delete(),db.documents.where("projectId").equals(id).delete(),db.memories.where("projectId").equals(id).delete()])})}

export function useVault(){
 if(isDemoMode)return demoVault();
 const state=useLiveQuery(async()=>({projects:await db.projects.reverse().sortBy("updatedAt"),tasks:await db.tasks.toArray(),notes:await db.notes.reverse().sortBy("updatedAt"),chats:await db.chats.reverse().sortBy("updatedAt"),credentials:await db.credentials.reverse().sortBy("updatedAt"),documents:await db.documents.reverse().sortBy("updatedAt"),memories:await db.memories.reverse().sortBy("updatedAt")}),[],empty)??empty;
 const stats={projects:state.projects.length,tasks:state.tasks.filter(t=>t.status!=="done").length,chats:state.chats.length,passwords:state.credentials.length,notes:state.notes.length,documents:state.documents.length};
 return {state,stats,
 addProject:async(p:Partial<Project>)=>{const stamp=now(),id=uid("p");await db.projects.add({id,name:p.name?.trim()||"Untitled Project",description:p.description||"",status:(p.status as ProjectStatus)||"planning",priority:(p.priority as Priority)||"medium",progress:Number(p.progress)||0,deadline:p.deadline||stamp.slice(0,10),tags:p.tags||[],github:p.github,website:p.website,folder:p.folder,aiSummary:p.aiSummary||"",archivedAt:p.archivedAt,createdAt:stamp,updatedAt:stamp});await activity("Created project","project",id);return id},
 updateProject:async(id:string,patch:Partial<Project>)=>{await db.projects.update(id,{...patch,updatedAt:now()});await activity("Updated project","project",id)},archiveProject:(id:string)=>db.projects.update(id,{archivedAt:now(),updatedAt:now()}),restoreProject:(id:string)=>db.projects.update(id,{archivedAt:undefined,updatedAt:now()}),deleteProject:async(id:string)=>{await cascadeProject(id);await activity("Deleted project","project",id)},
 addTask:async(t:Partial<Task>)=>{const stamp=now(),id=uid("t");await db.tasks.add({id,projectId:t.projectId||"",title:t.title?.trim()||"Untitled Task",status:(t.status as TaskStatus)||"backlog",priority:(t.priority as Priority)||"medium",due:t.due||stamp.slice(0,10),description:t.description||"",createdAt:stamp,updatedAt:stamp});await activity("Created task","task",id);return id},updateTask:async(id:string,patch:Partial<Task>)=>{await db.tasks.update(id,{...patch,updatedAt:now()});await activity("Updated task","task",id)},deleteTask:async(id:string)=>{await db.tasks.delete(id);await activity("Deleted task","task",id)},
 addNote:async(n:Partial<Note>)=>{const stamp=now(),id=uid("n");await db.notes.add({id,projectId:n.projectId,title:n.title?.trim()||"Untitled Note",content:n.content||"",tags:n.tags||[],pinned:!!n.pinned,createdAt:stamp,updatedAt:stamp});await activity("Created note","note",id);return id},updateNote:async(id:string,patch:Partial<Note>)=>{await db.notes.update(id,{...patch,updatedAt:now()});await activity("Updated note","note",id)},deleteNote:(id:string)=>db.notes.delete(id),
 addChat:async(c:Partial<AiChat>)=>{const stamp=now(),id=uid("chat");await db.chats.add({id,projectId:c.projectId,title:c.title?.trim()||"Untitled Chat",model:c.model||"ChatGPT",summary:c.summary||"",content:c.content||"",url:c.url||"",folder:c.folder||"General",favorite:!!c.favorite,tags:c.tags||[],createdAt:stamp,updatedAt:stamp});return id},updateChat:(id:string,patch:Partial<AiChat>)=>db.chats.update(id,{...patch,updatedAt:now()}),deleteChat:(id:string)=>db.chats.delete(id),
 addCredential:(c:Credential)=>{const {password:discarded,...safe}=c;void discarded;return db.credentials.add(safe)},updateCredential:(id:string,patch:Partial<Credential>)=>{const {password:discarded,...safe}=patch;void discarded;return db.credentials.update(id,{...safe,updatedAt:now()})},deleteCredential:(id:string)=>db.credentials.delete(id),
 addDocument:async(d:Partial<DocumentItem>)=>{const stamp=now(),id=uid("doc");await db.documents.add({id,projectId:d.projectId,name:d.name?.trim()||d.fileName||"Untitled Document",type:d.type||"link",url:d.url||"",notes:d.notes||"",file:d.file,fileName:d.fileName,fileType:d.fileType,fileSize:d.fileSize,createdAt:stamp,updatedAt:stamp});return id},updateDocument:(id:string,patch:Partial<DocumentItem>)=>db.documents.update(id,{...patch,updatedAt:now()}),deleteDocument:(id:string)=>db.documents.delete(id),
 addMemory:async(m:Partial<Memory>)=>{const stamp=now(),id=uid("mem");await db.memories.add({id,projectId:m.projectId,title:m.title?.trim()||"Untitled Memory",content:m.content||"",category:m.category||"General",tags:m.tags||[],pinned:!!m.pinned,createdAt:stamp,updatedAt:stamp});return id},updateMemory:(id:string,patch:Partial<Memory>)=>db.memories.update(id,{...patch,updatedAt:now()}),deleteMemory:(id:string)=>db.memories.delete(id)
 };
}

function demoVault(){
 const state=demoVaultState,stats={projects:state.projects.length,tasks:state.tasks.filter(t=>t.status!=="done").length,chats:state.chats.length,passwords:state.credentials.length,notes:state.notes.length,documents:state.documents.length},readonly=async()=>undefined;
 return {state,stats,
 addProject:async()=>"",updateProject:readonly,archiveProject:readonly,restoreProject:readonly,deleteProject:readonly,
 addTask:async()=>"",updateTask:readonly,deleteTask:readonly,
 addNote:async()=>"",updateNote:readonly,deleteNote:readonly,
 addChat:async()=>"",updateChat:readonly,deleteChat:readonly,
 addCredential:readonly,updateCredential:readonly,deleteCredential:readonly,
 addDocument:async()=>"",updateDocument:readonly,deleteDocument:readonly,
 addMemory:async()=>"",updateMemory:readonly,deleteMemory:readonly
 };
}

export async function exportVault(){if(isDemoMode)return {version:1,exportedAt:now(),...demoVaultState,activities:demoActivities,settings:[{key:"showcaseMode",value:"public-demo"}]};const [projects,tasks,notes,chats,credentials,documents,memories,activities,settings]=await Promise.all([db.projects.toArray(),db.tasks.toArray(),db.notes.toArray(),db.chats.toArray(),db.credentials.toArray(),db.documents.toArray(),db.memories.toArray(),db.activities.toArray(),db.settings.toArray()]);return {version:1,exportedAt:now(),projects,tasks,notes,chats,credentials,documents,memories,activities,settings}}
export async function resetVault(){if(isDemoMode)return;await Promise.all(db.tables.map(t=>t.clear()))}
export function demoActivitiesFor(entityId?:string){return entityId?demoActivities.filter(item=>item.entityId===entityId):demoActivities}
