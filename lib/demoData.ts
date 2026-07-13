import type { Activity, AiChat, Credential, DocumentItem, Memory, Note, Project, Task } from "./types";

const now="2026-07-12T09:00:00.000Z";
export const demoProjects:Project[]=[
 {id:"demo-karvian-os",name:"Karvian OS",description:"A founder operating dashboard for projects, execution, memory and AI-assisted planning.",status:"building",priority:"critical",progress:78,deadline:"2026-08-15",tags:["Founder OS","AI","Dashboard"],github:"",website:"",folder:"Demo Workspace",aiSummary:"Core dashboard, projects and execution views are working. Voice and public showcase polish are in progress.",createdAt:now,updatedAt:now},
 {id:"demo-vault",name:"Secure Vault Layer",description:"A local-first vault concept for encrypted credentials, documents and sensitive founder context.",status:"testing",priority:"high",progress:64,deadline:"2026-08-02",tags:["Security","Local-first"],aiSummary:"Demo shows encrypted-workflow UX without exposing real secrets or private files.",createdAt:now,updatedAt:now},
 {id:"demo-kyra",name:"KYRA Assistant",description:"Premium voice and workspace assistant interface for natural command, memory and planning workflows.",status:"building",priority:"high",progress:58,deadline:"2026-08-28",tags:["Voice","AI"],aiSummary:"Showcase mode uses safe scripted responses and never calls Gemini.",createdAt:now,updatedAt:now}
];
export const demoTasks:Task[]=[
 {id:"demo-task-1",projectId:"demo-karvian-os",title:"Finalize public showcase mode",status:"in-progress",priority:"critical",due:"2026-07-18",description:"Create read-only sample experience for visitors.",createdAt:now,updatedAt:now},
 {id:"demo-task-2",projectId:"demo-vault",title:"Polish vault preview cards",status:"review",priority:"high",due:"2026-07-20",description:"Show safe credential metadata without exposing secrets.",createdAt:now,updatedAt:now},
 {id:"demo-task-3",projectId:"demo-kyra",title:"Add KYRA demo prompts",status:"backlog",priority:"medium",due:"2026-07-25",description:"Use canned showcase interactions instead of API calls.",createdAt:now,updatedAt:now},
 {id:"demo-task-4",projectId:"demo-karvian-os",title:"Prepare LinkedIn launch post",status:"done",priority:"medium",due:"2026-07-10",description:"Explain product vision and invite feedback.",createdAt:now,updatedAt:now}
];
export const demoNotes:Note[]=[
 {id:"demo-note-1",projectId:"demo-karvian-os",title:"Product Vision",content:"Karvian Vault is a private founder operating system: projects, execution, notes, documents, memory and assistant workflows in one premium interface.",tags:["vision","showcase"],pinned:true,createdAt:now,updatedAt:now},
 {id:"demo-note-2",projectId:"demo-kyra",title:"KYRA Showcase Behavior",content:"In Public Demo Mode, KYRA demonstrates the interface with safe scripted responses. The private version connects to Gemini and local Vault context.",tags:["kyra","demo"],pinned:false,createdAt:now,updatedAt:now}
];
export const demoChats:AiChat[]=[
 {id:"demo-chat-1",projectId:"demo-karvian-os",title:"Founder OS Positioning",model:"ChatGPT",summary:"Messaging ideas for presenting Karvian Vault as a premium founder workspace.",content:"Sample saved conversation summary for public demo only.",url:"",folder:"Strategy",favorite:true,tags:["positioning"],createdAt:now,updatedAt:now},
 {id:"demo-chat-2",projectId:"demo-kyra",title:"KYRA Voice UX",model:"Claude",summary:"Notes on making assistant interactions calm, concise and premium.",content:"Sample voice UX notes for public demo only.",url:"",folder:"Product",favorite:false,tags:["voice"],createdAt:now,updatedAt:now}
];
export const demoDocuments:DocumentItem[]=[
 {id:"demo-doc-1",projectId:"demo-karvian-os",name:"Karvian Vault Product Brief.pdf",type:"pdf",url:"",notes:"Demo placeholder. No private file is included.",fileName:"product-brief-demo.pdf",fileType:"application/pdf",fileSize:184000,createdAt:now,updatedAt:now},
 {id:"demo-doc-2",projectId:"demo-vault",name:"Security Architecture Notes",type:"link",url:"https://example.com/demo-security-notes",notes:"Safe sample link for showcase mode.",createdAt:now,updatedAt:now}
];
export const demoCredentials:Credential[]=[
 {id:"demo-credential-1",projectId:"demo-vault",name:"Demo Supabase Project",username:"demo-owner@example.com",encryptedPassword:"demo-locked",iv:"demo",salt:"demo",url:"https://supabase.com",category:"Demo Credential",tags:["fake","preview"],notes:"Locked public demo preview. No real secret exists here.",favorite:true,createdAt:now,updatedAt:now}
];
export const demoMemories:Memory[]=[
 {id:"demo-memory-1",projectId:"demo-karvian-os",title:"Kartik prefers premium dark UI",content:"Use dark, cinematic, cyan/violet UI language with calm KYRA responses.",category:"Preference",tags:["ui","kyra"],pinned:true,createdAt:now,updatedAt:now},
 {id:"demo-memory-2",projectId:"demo-karvian-os",title:"Public visitors see sample data only",content:"Showcase deployments must not reveal private local Vault data or consume Gemini quota.",category:"Security",tags:["demo","privacy"],pinned:true,createdAt:now,updatedAt:now}
];
export const demoActivities:Activity[]=[
 {id:"demo-activity-1",action:"Opened public showcase dashboard",entityType:"demo",createdAt:"2026-07-12T09:20:00.000Z"},
 {id:"demo-activity-2",action:"Reviewed KYRA assistant preview",entityType:"demo",entityId:"demo-kyra",createdAt:"2026-07-12T09:10:00.000Z"},
 {id:"demo-activity-3",action:"Loaded sample project workspace",entityType:"project",entityId:"demo-karvian-os",createdAt:"2026-07-12T09:00:00.000Z"}
];
export const demoVaultState={projects:demoProjects,tasks:demoTasks,notes:demoNotes,chats:demoChats,credentials:demoCredentials,documents:demoDocuments,memories:demoMemories};
