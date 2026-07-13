"use client";

import AppShell from "@/components/AppShell";
import { Empty, Modal, PageTitle, ProgressBar } from "@/components/UI";
import { isDemoMode } from "@/lib/appMode";
import { useVault } from "@/lib/store";
import type { Priority, Project, ProjectStatus } from "@/lib/types";
import { Archive, ArchiveRestore, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProjectForm=Partial<Project>&{tagText?:string};
type SortKey="updated"|"name"|"deadline"|"progress";
const today=()=>new Date().toISOString().slice(0,10);
const emptyForm:ProjectForm={status:"planning",priority:"medium",progress:0,deadline:today()};

export default function Projects(){
  const vault=useVault();
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<string>();
  const [form,setForm]=useState<ProjectForm>(emptyForm);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState<"all"|ProjectStatus>("all");
  const [sort,setSort]=useState<SortKey>("updated");
  const [showArchived,setShowArchived]=useState(false);

  const projects=useMemo(()=>vault.state.projects
    .filter(project=>showArchived?Boolean(project.archivedAt):!project.archivedAt)
    .filter(project=>status==="all"||project.status===status)
    .filter(project=>`${project.name} ${project.description} ${project.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b)=>sort==="name"?a.name.localeCompare(b.name):sort==="deadline"?a.deadline.localeCompare(b.deadline):sort==="progress"?b.progress-a.progress:b.updatedAt.localeCompare(a.updatedAt)),
    [vault.state.projects,showArchived,status,query,sort]);

  function show(project?:Project){
    setEditing(project?.id);
    setForm(project?{...project,tagText:project.tags.join(", ")}:{...emptyForm,deadline:today()});
    setOpen(true);
  }

  async function submit(event:React.FormEvent){
    event.preventDefault();
    const project={...form,name:form.name?.trim(),progress:Math.max(0,Math.min(100,Number(form.progress))),tags:(form.tagText||"").split(",").map(tag=>tag.trim()).filter(Boolean)};
    if(editing)await vault.updateProject(editing,project);else await vault.addProject(project);
    setOpen(false);
  }

  return <AppShell>
    <PageTitle title="Projects" subtitle="Build, archive and operate every venture from one workspace." action={isDemoMode?<span className="badge">Read-only public demo</span>:<button className="btn" onClick={()=>show()}>+ New Project</button>}/>
    <section className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]">
      <label className="relative"><Search className="absolute left-3 top-3.5 text-slate-500" size={16}/><input className="field pl-10" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search projects and tags"/></label>
      <label className="relative"><SlidersHorizontal className="absolute left-3 top-3.5 text-slate-500" size={16}/><select className="field pl-10" value={status} onChange={event=>setStatus(event.target.value as typeof status)}><option value="all">All statuses</option>{["idea","planning","building","testing","launched","paused","completed"].map(value=><option key={value}>{value}</option>)}</select></label>
      <select className="field" value={sort} onChange={event=>setSort(event.target.value as SortKey)}><option value="updated">Recently updated</option><option value="name">Name</option><option value="deadline">Deadline</option><option value="progress">Progress</option></select>
      <button className={showArchived?"btn":"btn2"} onClick={()=>setShowArchived(value=>!value)}>{showArchived?"Active projects":"Archived"}</button>
    </section>
    {!projects.length?<Empty title={showArchived?"No archived projects":"No projects found"} subtitle={query?"Try a different search or filter.":"Create your first founder workspace."}/>:<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{projects.map(project=><article key={project.id} className="card p-5 transition hover:-translate-y-1 hover:border-violet-400/40">
      <Link href={`/projects/${project.id}`}><div className="flex justify-between gap-4"><h2 className="text-xl font-black">{project.name}</h2><span className="badge">{project.status}</span></div><p className="muted mt-2 min-h-12 text-sm">{project.description||"No description"}</p><div className="mt-5"><div className="mb-2 flex justify-between text-xs muted"><span>{project.priority}</span><span>{project.progress}%</span></div><ProgressBar value={project.progress}/></div><div className="mt-4 flex flex-wrap gap-2">{project.tags.map(tag=><span className="badge" key={tag}>{tag}</span>)}</div></Link>
      {!isDemoMode&&<div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4"><button className="btn2" onClick={()=>show(project)}>Edit</button>{project.archivedAt?<button className="btn2 flex items-center justify-center gap-2" onClick={()=>void vault.restoreProject(project.id)}><ArchiveRestore size={15}/> Restore</button>:<button className="btn2 flex items-center justify-center gap-2" onClick={()=>void vault.archiveProject(project.id)}><Archive size={15}/> Archive</button>}<button className="btn2 text-red-300" onClick={()=>confirm(`Permanently delete ${project.name} and all linked data?`)&&void vault.deleteProject(project.id)}>Delete</button></div>}
    </article>)}</div>}
    {!isDemoMode&&<Modal open={open} onClose={()=>setOpen(false)} title={editing?"Edit Project":"New Project"}><form onSubmit={submit} className="space-y-4"><input required className="field" placeholder="Project name" value={form.name||""} onChange={event=>setForm({...form,name:event.target.value})}/><textarea className="field min-h-24" placeholder="Description" value={form.description||""} onChange={event=>setForm({...form,description:event.target.value})}/><div className="grid gap-3 md:grid-cols-3"><select className="field" value={form.status} onChange={event=>setForm({...form,status:event.target.value as ProjectStatus})}>{["idea","planning","building","testing","launched","paused","completed"].map(value=><option key={value}>{value}</option>)}</select><select className="field" value={form.priority} onChange={event=>setForm({...form,priority:event.target.value as Priority})}>{["low","medium","high","critical"].map(value=><option key={value}>{value}</option>)}</select><input className="field" type="number" min="0" max="100" value={form.progress??0} onChange={event=>setForm({...form,progress:Number(event.target.value)})}/></div><input required className="field" type="date" value={form.deadline||""} onChange={event=>setForm({...form,deadline:event.target.value})}/><input className="field" placeholder="Tags, comma separated" value={form.tagText||""} onChange={event=>setForm({...form,tagText:event.target.value})}/><div className="grid gap-3 md:grid-cols-2"><input className="field" placeholder="GitHub URL" value={form.github||""} onChange={event=>setForm({...form,github:event.target.value})}/><input className="field" placeholder="Website URL" value={form.website||""} onChange={event=>setForm({...form,website:event.target.value})}/></div><textarea className="field min-h-24" placeholder="KYRA project context" value={form.aiSummary||""} onChange={event=>setForm({...form,aiSummary:event.target.value})}/><button className="btn w-full">{editing?"Save Changes":"Create Project"}</button></form></Modal>}
  </AppShell>;
}
