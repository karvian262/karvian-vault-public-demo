import Dexie, { type EntityTable } from "dexie";
import type { Activity, AiChat, Credential, DocumentItem, Memory, Note, Project, Setting, Task } from "./types";

export class VaultDatabase extends Dexie {
  projects!: EntityTable<Project, "id">; tasks!: EntityTable<Task, "id">; notes!: EntityTable<Note, "id">;
  chats!: EntityTable<AiChat, "id">; credentials!: EntityTable<Credential, "id">; documents!: EntityTable<DocumentItem, "id">;
  memories!: EntityTable<Memory, "id">; activities!: EntityTable<Activity, "id">; settings!: EntityTable<Setting, "key">;
  constructor(){
    super("karvian-vault");
    this.version(1).stores({projects:"id,status,priority,updatedAt",tasks:"id,projectId,status,priority,due",notes:"id,projectId,pinned,updatedAt",chats:"id,projectId,model,updatedAt",credentials:"id,projectId,category,favorite,updatedAt",documents:"id,projectId,type,updatedAt",memories:"id,projectId,category,updatedAt",activities:"id,entityType,createdAt",settings:"key"});
    this.version(2).stores({projects:"id,status,priority,archivedAt,updatedAt",tasks:"id,projectId,status,priority,due,updatedAt",notes:"id,projectId,pinned,updatedAt",chats:"id,projectId,model,folder,favorite,updatedAt",credentials:"id,projectId,category,favorite,updatedAt",documents:"id,projectId,type,updatedAt",memories:"id,projectId,category,pinned,updatedAt",activities:"id,entityType,createdAt",settings:"key"}).upgrade(async tx=>{
      await tx.table("chats").toCollection().modify(chat=>{chat.favorite=Boolean(chat.favorite);chat.folder=chat.folder||"General"});
      await tx.table("credentials").toCollection().modify(item=>{item.tags=Array.isArray(item.tags)?item.tags:[]});
      await tx.table("memories").toCollection().modify(item=>{item.pinned=Boolean(item.pinned)});
    });
  }
}
export const db = new VaultDatabase();
