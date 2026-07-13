import type { Table } from "dexie";
import { db } from "./db";
import type { Activity, AiChat, Credential, DocumentItem, Memory, Note, Project, Task } from "./types";

const timestamp=()=>new Date().toISOString();
const identifier=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;

class Repository<T extends {id:string;createdAt:string;updatedAt:string}>{
  constructor(protected readonly table:Table<T,string>,private readonly entity:string){}
  all(){return this.table.toArray()}
  get(id:string){return this.table.get(id)}
  async create(value:Omit<T,"id"|"createdAt"|"updatedAt">){const now=timestamp(),id=identifier(this.entity);await this.table.add({...value,id,createdAt:now,updatedAt:now} as T);await logActivity(`Created ${this.entity}`,this.entity,id);return id}
  async update(id:string,patch:Partial<Omit<T,"id"|"createdAt">>){await this.table.update(id,{...patch,updatedAt:timestamp()} as never);await logActivity(`Updated ${this.entity}`,this.entity,id)}
  async remove(id:string){await this.table.delete(id);await logActivity(`Deleted ${this.entity}`,this.entity,id)}
}

async function logActivity(action:string,entityType:string,entityId?:string){const item:Activity={id:identifier("activity"),action,entityType,entityId,createdAt:timestamp()};await db.activities.add(item)}

class ProjectRepository extends Repository<Project>{
  constructor(){super(db.projects as unknown as Table<Project,string>,"project")}
  active(){return db.projects.filter(project=>!project.archivedAt).toArray()}
  archived(){return db.projects.filter(project=>Boolean(project.archivedAt)).toArray()}
  archive(id:string){return this.update(id,{archivedAt:timestamp()})}
  restore(id:string){return this.update(id,{archivedAt:undefined})}
  async removeCascade(id:string){await db.transaction("rw",[db.projects,db.tasks,db.notes,db.chats,db.credentials,db.documents,db.memories],async()=>{await Promise.all([db.projects.delete(id),db.tasks.where("projectId").equals(id).delete(),db.notes.where("projectId").equals(id).delete(),db.chats.where("projectId").equals(id).delete(),db.credentials.where("projectId").equals(id).delete(),db.documents.where("projectId").equals(id).delete(),db.memories.where("projectId").equals(id).delete()])});await logActivity("Deleted project and linked records","project",id)}
}

export const repositories={projects:new ProjectRepository(),tasks:new Repository<Task>(db.tasks as unknown as Table<Task,string>,"task"),notes:new Repository<Note>(db.notes as unknown as Table<Note,string>,"note"),chats:new Repository<AiChat>(db.chats as unknown as Table<AiChat,string>,"chat"),credentials:new Repository<Credential>(db.credentials as unknown as Table<Credential,string>,"credential"),documents:new Repository<DocumentItem>(db.documents as unknown as Table<DocumentItem,string>,"document"),memories:new Repository<Memory>(db.memories as unknown as Table<Memory,string>,"memory")};
export { identifier, logActivity, timestamp };
