import type { VaultState } from "../store";
export type KyraMessage={role:"user"|"kyra";text:string;createdAt:string};
export type KyraRuntimeContext={pathname:string;state:VaultState;recentActivity:string[]};
export type KyraResult={text:string;navigate?:string;source:"gpt"|"vault"|"hybrid"|"tool"};
export type KyraToolResult={handled:boolean;text?:string;navigate?:string};
