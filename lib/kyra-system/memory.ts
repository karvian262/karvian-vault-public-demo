import { db } from "../db";
import { isDemoMode } from "../appMode";
import { demoMemories } from "../demoData";
export class MemoryEngine{
 async remember(input:string){if(isDemoMode)return false;const match=input.match(/(?:remember that|remember|i prefer|my preference is)\s+(.+)/i);if(!match)return false;const content=match[1].trim(),now=new Date().toISOString();await db.memories.add({id:`memory_${crypto.randomUUID()}`,title:content.slice(0,72),content,category:/prefer/i.test(input)?"Preference":"Important",tags:["kyra"],pinned:true,createdAt:now,updatedAt:now});return true}
 async durable(){return isDemoMode?demoMemories.filter(item=>item.pinned):db.memories.where("pinned").equals(1).toArray()}
}
