export type ProjectStatus = "idea" | "planning" | "building" | "testing" | "launched" | "paused" | "completed";
export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "backlog" | "in-progress" | "review" | "done";

export interface Project { id:string; name:string; description:string; status:ProjectStatus; priority:Priority; progress:number; deadline:string; tags:string[]; github?:string; website?:string; folder?:string; aiSummary?:string; archivedAt?:string; createdAt:string; updatedAt:string }
export interface Task { id:string; projectId:string; title:string; status:TaskStatus; priority:Priority; due:string; description?:string; createdAt:string; updatedAt:string }
export interface Note { id:string; projectId?:string; title:string; content:string; tags:string[]; pinned:boolean; createdAt:string; updatedAt:string }
export interface AiChat { id:string; projectId?:string; title:string; model:"ChatGPT"|"Claude"|"Other"; summary:string; content:string; url?:string; folder?:string; favorite:boolean; tags:string[]; createdAt:string; updatedAt:string }
export interface Credential { id:string; projectId?:string; name:string; username:string; encryptedPassword:string; iv:string; salt:string; url:string; category:string; tags?:string[]; notes?:string; favorite:boolean; createdAt:string; updatedAt:string; /** Accepted only at the UI boundary; the store always strips it. */ password?:string }
export interface DocumentItem { id:string; projectId?:string; name:string; type:string; url:string; notes?:string; file?:Blob; fileName?:string; fileType?:string; fileSize?:number; createdAt:string; updatedAt:string }
export interface Memory { id:string; projectId?:string; title:string; content:string; category:string; tags:string[]; pinned:boolean; createdAt:string; updatedAt:string }
export interface Activity { id:string; action:string; entityType:string; entityId?:string; createdAt:string }
export interface Setting { key:string; value:string }
