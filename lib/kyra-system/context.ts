import { isDemoMode } from "../appMode";import { db } from "../db";import { demoActivities } from "../demoData";import { vaultContext } from "../kyraBrain";import type { VaultState } from "../store";import type { KyraRuntimeContext } from "./types";
export class ContextEngine{
 async build(pathname:string,state:VaultState):Promise<KyraRuntimeContext>{const activity=isDemoMode?demoActivities:await db.activities.orderBy("createdAt").reverse().limit(12).toArray();return {pathname,state,recentActivity:activity.map(item=>`${item.createdAt}: ${item.action}`)}}
 forGpt(context:KyraRuntimeContext,full:boolean){const base={openPage:context.pathname,recentActivity:context.recentActivity};return full?{...base,...vaultContext(context.state)}:{...base,memories:context.state.memories.filter(memory=>memory.pinned)}}
}
