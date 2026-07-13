import { answerPersonal,classifyKyraRequest } from "../kyraBrain";import { MemoryEngine } from "./memory";import { ToolEngine } from "./tools";import type { KyraRuntimeContext,KyraResult } from "./types";
export class VaultEngine{
 constructor(private memory=new MemoryEngine(),private tools=new ToolEngine()){}
 classify(input:string){return classifyKyraRequest(input)}
 async resolve(input:string,context:KyraRuntimeContext):Promise<KyraResult|undefined>{if(await this.memory.remember(input))return {text:"I’ll remember that.",source:"vault"};const tool=await this.tools.execute(input,context);if(tool.handled)return {text:tool.text||"Done.",navigate:tool.navigate,source:"tool"};if(this.classify(input).route!=="personal")return;const result=await answerPersonal(input,context.state);return {text:result.answer,navigate:result.navigate,source:"vault"}}
}
