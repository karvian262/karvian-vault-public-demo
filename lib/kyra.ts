import type { VaultState } from "./store";

export type KyraCommand={answer:string;navigate?:string};
export function localKyra(message:string,state:VaultState):KyraCommand{
  const query=message.toLowerCase(),today=new Date().toISOString().slice(0,10),open=state.tasks.filter(task=>task.status!=="done"),critical=open.filter(task=>task.priority==="critical"),project=state.projects.find(item=>query.includes(item.name.toLowerCase()));
  if(/^\s*(hey|hi|hello|namaste)\s+kyra[.!?]?\s*$/.test(query))return {answer:/namaste/.test(query)?"Namaste Kartik, kaise ho?":"Hello Kartik, kaise ho?"};
  if(/capital of india/.test(query))return {answer:"New Delhi."};
  const calculation=calculate(query);if(calculation!==undefined)return {answer:String(calculation)};
  if(project&&/open|show|go to|continue/.test(query))return {answer:`Opening ${project.name}.`,navigate:`/projects/${project.id}`};
  if(/pending|open tasks|what tasks/.test(query))return {answer:`You have ${open.length} open tasks. ${open.slice(0,5).map(task=>task.title).join(", ")||"Your queue is clear."}`,navigate:"/tasks"};
  if(/critical|priority/.test(query))return {answer:`You have ${critical.length} critical tasks. ${critical.map(task=>task.title).join(", ")||"None are marked critical."}`,navigate:"/tasks"};
  if(/deadline|due|calendar|schedule|aaj.*(task|kaam|schedule)/.test(query)){const due=[...open].sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5),hinglish=/aaj|batao|kya|hain/.test(query);return {answer:hinglish?`Aaj aapke ${open.length} pending tasks hain. ${due[0]?`Sabse pehle ${due[0].title}.`:"Aaj ka schedule clear hai."}`:`Your next deadlines are ${due.map(task=>`${task.title}, ${task.due}`).join("; ")||"clear"}.`,navigate:"/calendar"}}
  if(/note|branding/.test(query)){const matches=state.notes.filter(note=>`${note.title} ${note.content}`.toLowerCase().includes(query.replace(/find|search|notes?|about/g,"").trim()));return {answer:matches.length?`I found ${matches.length} notes: ${matches.slice(0,5).map(note=>note.title).join(", ")}.`:"I could not find a matching note.",navigate:"/notes"}}
  if(/gpt|claude|chat/.test(query)){const matches=state.chats.filter(chat=>`${chat.title} ${chat.summary} ${chat.tags.join(" ")}`.toLowerCase().includes(query.replace(/find|search|show|gpt|claude|chat|about/g,"").trim()));return {answer:matches.length?`I found ${matches.length} conversations: ${matches.slice(0,5).map(chat=>chat.title).join(", ")}.`:"I could not find a matching saved conversation.",navigate:"/ai-vault"}}
  if(/document|file/.test(query))return {answer:`You have ${state.documents.length} saved documents. ${state.documents.slice(0,5).map(document=>document.name).join(", ")}.`,navigate:"/documents"};
  if(/password|credential|secret|api key/.test(query))return {answer:/karo|kholo|open kar/.test(query)?"Sure, Password Vault open kar rahi hoon.":"Opening Password Vault.",navigate:"/vault"};
  if(/memory|remember|goal|preference/.test(query))return {answer:state.memories.filter(memory=>memory.pinned).slice(0,5).map(memory=>`${memory.title}: ${memory.content}`).join(". ")||"You have no pinned AI memories yet.",navigate:"/memory"};
  if(/today|brief|summary/.test(query)){const overdue=open.filter(task=>task.due<today);return {answer:`Today you have ${open.length} open tasks, ${overdue.length} overdue, and ${state.projects.filter(item=>!item.archivedAt).length} active projects. ${critical[0]?`Start with ${critical[0].title}.`:"Protect a focused work block."}`}}
  return {answer:"I can navigate your Vault, inspect projects and tasks, search notes, documents and AI chats, summarize deadlines, and use Gemini for broader planning when it is configured."};
}

function calculate(value:string){const match=value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(\+|-|×|x|\*|÷|\/)\s*(-?\d+(?:\.\d+)?)$/);if(!match)return;const left=Number(match[1]),right=Number(match[3]);if(match[2]==="+")return left+right;if(match[2]==="-")return left-right;if(match[2]==="×"||match[2]==="x"||match[2]==="*")return left*right;if(right!==0)return left/right}
