"use client";

import AppShell from "@/components/AppShell";
import { Empty, Modal, PageTitle } from "@/components/UI";
import { isDemoMode } from "@/lib/appMode";
import { useVault } from "@/lib/store";
import type { Priority, Task, TaskStatus } from "@/lib/types";
import { Columns3, List, Search } from "lucide-react";
import { useMemo, useState } from "react";

const statuses:TaskStatus[]=["backlog","in-progress","review","done"];
const initialTask=():Partial<Task>=>({status:"backlog",priority:"medium",due:new Date().toISOString().slice(0,10)});

export default function Tasks(){
  const vault=useVault();
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<string>();
  const [form,setForm]=useState<Partial<Task>>(initialTask());
  const [query,setQuery]=useState("");
  const [projectId,setProjectId]=useState("all");
  const [priority,setPriority]=useState<"all"|Priority>("all");
  const [view,setView]=useState<"kanban"|"list">("kanban");

  const tasks=useMemo(()=>vault.state.tasks.filter(task=>`${task.title} ${task.description||""}`.toLowerCase().includes(query.toLowerCase())).filter(task=>projectId==="all"||task.projectId===projectId).filter(task=>priority==="all"||task.priority===priority).sort((a,b)=>a.due.localeCompare(b.due)),[vault.state.tasks,query,projectId,priority]);
  function show(task?:Task){setEditing(task?.id);setForm(task||initialTask());setOpen(true)}
  async function submit(event:React.FormEvent){event.preventDefault();if(editing)await vault.updateTask(editing,form);else await vault.addTask(form);setOpen(false)}

  return <AppShell><PageTitle title="Tasks" subtitle="Plan execution in Kanban or deadline order." action={isDemoMode?<span className="badge">Read-only public demo</span>:<button className="btn" onClick={()=>show()}>+ New Task</button>}/>
    <section className="card mb-6 grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto]"><label className="relative"><Search className="absolute left-3 top-3.5 text-slate-500" size={16}/><input className="field pl-10" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search tasks"/></label><select className="field" value={projectId} onChange={event=>setProjectId(event.target.value)}><option value="all">All projects</option>{vault.state.projects.filter(project=>!project.archivedAt).map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select><select className="field" value={priority} onChange={event=>setPriority(event.target.value as typeof priority)}><option value="all">All priorities</option>{["low","medium","high","critical"].map(value=><option key={value}>{value}</option>)}</select><div className="flex rounded-2xl border border-white/10 p-1"><button className={view==="kanban"?"btn":"btn2"} onClick={()=>setView("kanban")} aria-label="Kanban view"><Columns3 size={17}/></button><button className={view==="list"?"btn":"btn2"} onClick={()=>setView("list")} aria-label="List view"><List size={17}/></button></div></section>
    {!tasks.length?<Empty title="No tasks found"/>:view==="kanban"?<div className="grid gap-4 xl:grid-cols-4">{statuses.map(status=><section key={status} className="card min-h-72 p-4" onDragOver={event=>!isDemoMode&&event.preventDefault()} onDrop={event=>{if(isDemoMode)return;const id=event.dataTransfer.getData("text/task-id");if(id)void vault.updateTask(id,{status})}}><div className="mb-4 flex items-center justify-between"><h2 className="font-black capitalize">{status.replace("-"," ")}</h2><span className="badge">{tasks.filter(task=>task.status===status).length}</span></div><div className="space-y-3">{tasks.filter(task=>task.status===status).map(task=><TaskCard key={task.id} task={task} readOnly={isDemoMode} project={vault.state.projects.find(project=>project.id===task.projectId)?.name} edit={()=>show(task)} remove={()=>vault.deleteTask(task.id)}/>)}</div></section>)}</div>:<div className="space-y-3">{tasks.map(task=><TaskCard key={task.id} task={task} readOnly={isDemoMode} project={vault.state.projects.find(project=>project.id===task.projectId)?.name} edit={()=>show(task)} remove={()=>vault.deleteTask(task.id)}/>)}</div>}
    {!isDemoMode&&<Modal open={open} onClose={()=>setOpen(false)} title={editing?"Edit Task":"New Task"}><form className="space-y-3" onSubmit={submit}><input required className="field" placeholder="Task title" value={form.title||""} onChange={event=>setForm({...form,title:event.target.value})}/><textarea className="field min-h-24" placeholder="Description" value={form.description||""} onChange={event=>setForm({...form,description:event.target.value})}/><select className="field" value={form.projectId||""} onChange={event=>setForm({...form,projectId:event.target.value})}><option value="">No project</option>{vault.state.projects.filter(project=>!project.archivedAt).map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select><div className="grid gap-3 md:grid-cols-2"><select className="field" value={form.status} onChange={event=>setForm({...form,status:event.target.value as TaskStatus})}>{statuses.map(value=><option key={value}>{value}</option>)}</select><select className="field" value={form.priority} onChange={event=>setForm({...form,priority:event.target.value as Priority})}>{["low","medium","high","critical"].map(value=><option key={value}>{value}</option>)}</select></div><input required className="field" type="date" value={form.due||""} onChange={event=>setForm({...form,due:event.target.value})}/><button className="btn w-full">{editing?"Save Changes":"Create Task"}</button></form></Modal>}
  </AppShell>;
}

function TaskCard({task,project,edit,remove,readOnly}:{task:Task;project?:string;edit:()=>void;remove:()=>Promise<unknown>;readOnly?:boolean}){return <article draggable={!readOnly} onDragStart={event=>!readOnly&&event.dataTransfer.setData("text/task-id",task.id)} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-violet-400/40"><div className="flex flex-wrap gap-2"><span className="badge">{task.priority}</span>{project&&<span className="badge">{project}</span>}</div><h3 className="mt-3 font-bold">{task.title}</h3>{task.description&&<p className="muted mt-2 line-clamp-2 text-sm">{task.description}</p>}<p className="muted mt-3 text-xs">Due {task.due}</p>{!readOnly&&<div className="mt-3 flex gap-2"><button className="btn2 flex-1" onClick={edit}>Edit</button><button className="btn2 text-red-300" onClick={()=>confirm("Delete this task?")&&void remove()}>Delete</button></div>}</article>}
