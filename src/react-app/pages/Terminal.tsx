import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import cbcLogo from "../assets/cbclogo.png";
import discordIcon from "../assets/discord_icon.png";
import "./Terminal.css";

const API = "https://discordiny.com";
const ROOT = "https://root.discordiny.com/5dfg46df4gs4gs6";
type User={id:number;discord_id:string;username:string;global_name:string|null;avatar:string|null};
type FileRow={id:number;title:string;subtitle:string;classification:string;content:string;code?:string;discovered_at?:string};
type Draft={id:number|null;code:string;title:string;subtitle:string;classification:string;content:string};
const blank:Draft={id:null,code:"",title:"",subtitle:"",classification:"",content:""};

function inline(text:string):ReactNode[]{
  const re=/(\*\*[^*]+\*\*|~~[^~]+~~|\|\|[^|]+\|\||`[^`\n]+`|\*[^*\n]+\*)/g;
  return text.split(re).filter(Boolean).map((p,i)=>{
    if(p.startsWith("**")&&p.endsWith("**"))return <strong key={i}>{p.slice(2,-2)}</strong>;
    if(p.startsWith("~~")&&p.endsWith("~~"))return <del key={i}>{p.slice(2,-2)}</del>;
    if(p.startsWith("||")&&p.endsWith("||"))return <span key={i} className="term-spoiler">{p.slice(2,-2)}</span>;
    if(p.startsWith("`")&&p.endsWith("`"))return <code key={i}>{p.slice(1,-1)}</code>;
    if(p.startsWith("*")&&p.endsWith("*"))return <em key={i}>{p.slice(1,-1)}</em>;
    return p;
  });
}
function document(content:string){
  return content.split(/(```[\s\S]*?```)/g).map((b,i)=>b.startsWith("```")&&b.endsWith("```")
    ? <pre key={i}><code>{b.slice(3,-3).replace(/^\n/,"")}</code></pre>
    : b.split(/\n{2,}/).filter(Boolean).map((p,j)=><p key={`${i}-${j}`}>{p.split("\n").map((line,k,arr)=><span key={k}>{inline(line)}{k<arr.length-1?<br/>:null}</span>)}</p>)
  );
}

export default function Terminal(){
  const [loading,setLoading]=useState(true),[command,setCommand]=useState(""),[message,setMessage]=useState("");
  const [user,setUser]=useState<User|null>(null),[files,setFiles]=useState<FileRow[]>([]),[selected,setSelected]=useState<number|null>(null);
  const [rootUnlocked,setRootUnlocked]=useState(false),[admin,setAdmin]=useState(false),[accountOpen,setAccountOpen]=useState(false),[adminOpen,setAdminOpen]=useState(false);
  const [adminFiles,setAdminFiles]=useState<FileRow[]>([]),[draft,setDraft]=useState<Draft>(blank),[adminMessage,setAdminMessage]=useState("");
  const input=useRef<HTMLInputElement>(null);
  const current=useMemo(()=>files.find(f=>f.id===selected)??null,[files,selected]);
  const request=(path:string,init?:RequestInit)=>fetch(API+path,{...init,credentials:"include",headers:{...(init?.body?{"Content-Type":"application/json"}:{}),...(init?.headers??{})}});

  async function load(){
    const r=await request("/api/terminal/library"),d=await r.json();
    if(r.status===401||!d.authenticated){window.location.href=API+"/api/auth/login";return}
    if(!r.ok||!d.terminalUnlocked){window.location.href=API+"/";return}
    const next:FileRow[]=d.files??[]; setUser(d.user??null);setFiles(next);setRootUnlocked(!!d.rootUnlocked);setAdmin(!!d.isAdmin);
    setSelected(x=>x!==null&&next.some(f=>f.id===x)?x:(next[0]?.id??null));setLoading(false);
  }
  useEffect(()=>{void load().catch(()=>{setMessage("TERMINAL CONNECTION FAILED");setLoading(false)})},[]);
  useEffect(()=>{if(!loading)input.current?.focus()},[loading]);

  async function execute(e:FormEvent){e.preventDefault();const code=command.trim();if(!code)return;setMessage("");
    try{const r=await request("/api/terminal/execute",{method:"POST",body:JSON.stringify({code})}),d=await r.json();
      if(!r.ok||!d.success){setMessage(d.error??"ACCESS CODE NOT RECOGNIZED");setCommand("");return}
      if(d.type==="root"){setRootUnlocked(true);window.location.assign(d.redirectUrl??ROOT);return}
      if(d.file){setFiles(x=>x.some(f=>f.id===d.file.id)?x:[d.file,...x]);setSelected(d.file.id);setMessage("FILE ADDED TO LIBRARY")}setCommand("");
    }catch{setMessage("TERMINAL CONNECTION FAILED")}}
  async function root(){const r=await request("/api/terminal/root-access",{method:"POST"}),d=await r.json();if(r.ok&&d.success)window.location.assign(d.redirectUrl??ROOT);else setMessage(d.error??"ROOT ACCESS REFUSED")}
  const avatar=()=>user?.avatar?`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`:discordIcon;
  const name=user?.global_name||user?.username||"ACCOUNT";
  async function loadAdmin(){const r=await request("/api/terminal/admin/files"),d=await r.json();if(r.ok)setAdminFiles(d.files??[])}
  async function openAdmin(){setAdminOpen(true);setDraft(blank);setAdminMessage("");await loadAdmin()}
  async function save(e:FormEvent){e.preventDefault();const path=draft.id===null?"/api/terminal/admin/files":`/api/terminal/admin/files/${draft.id}`;const r=await request(path,{method:draft.id===null?"POST":"PUT",body:JSON.stringify(draft)}),d=await r.json();if(!r.ok){setAdminMessage(d.error??"FILE SAVE FAILED");return}setAdminMessage(draft.id===null?"FILE CREATED":"FILE UPDATED");setDraft(blank);await loadAdmin();await load()}
  async function remove(f:FileRow){if(!confirm(`Delete "${f.title}" permanently?`))return;const r=await request(`/api/terminal/admin/files/${f.id}`,{method:"DELETE"}),d=await r.json();if(!r.ok){setAdminMessage(d.error??"FILE DELETE FAILED");return}setAdminMessage("FILE DELETED");setDraft(blank);await loadAdmin();await load()}

  if(loading)return <main className="terminal-page terminal-loading"><div className="terminal-grid"/><div className="terminal-loading-copy"><img src={cbcLogo} alt=""/><span>CONNECTING TO ARCHIVE_</span></div></main>;
  return <main className="terminal-page"><div className="terminal-grid"/>
    <header className="terminal-topbar"><button className="terminal-brand" onClick={()=>{setSelected(null);setAdminOpen(false)}}><img src={cbcLogo} alt=""/><span><strong>CLOVIS BRAY</strong><small>TERMINAL ARCHIVE</small></span></button>
      <div className="terminal-top-actions">{rootUnlocked?<button className="terminal-root-button" onClick={root}>◆ SIVA // ROOT</button>:null}{admin?<button className="terminal-admin-button" onClick={openAdmin}>NEW / MANAGE FILES</button>:null}
        <div className="account-container"><button className="account-button" type="button" onClick={()=>setAccountOpen(x=>!x)}><img src={avatar()} alt={`${name}'s Discord avatar`}/><span>{name}</span></button>{accountOpen&&user?<div className="account-menu"><div className="account-menu-user"><img src={avatar()} alt=""/><div><strong>{name}</strong><span>@{user.username}</span></div></div><div className="account-menu-divider"/><button type="button" className="account-menu-profile" onClick={()=>window.location.href=API+"/account"}>Account</button><button type="button" className="account-menu-logout" onClick={()=>window.location.href=API+"/api/auth/logout"}>Log Out</button></div>:null}</div>
      </div></header>
    <section className="terminal-command-zone"><form onSubmit={execute}><span>&gt;</span><input ref={input} value={command} onChange={e=>{setCommand(e.target.value);if(message)setMessage("")}} placeholder="ENTER TERMINAL CODE" autoComplete="off" autoCapitalize="off" spellCheck={false}/><button>EXECUTE</button></form><div className="terminal-message">{message||"\u00a0"}</div></section>
    <section className="terminal-workspace"><aside className="terminal-library"><div className="terminal-section-heading"><span>MY FILES</span><small>{String(files.length).padStart(2,"0")}</small></div><div className="terminal-library-list">{files.length===0?<div className="terminal-empty">NO ARCHIVE RECORDS DISCOVERED</div>:files.map(f=><button key={f.id} className={selected===f.id?"terminal-file-row active":"terminal-file-row"} onClick={()=>{setAdminOpen(false);setSelected(f.id)}}><span>{f.title}</span><small>{f.classification||"UNCLASSIFIED"}</small></button>)}</div></aside>
      <article className="terminal-reader">{adminOpen&&admin?<div className="terminal-admin"><div className="terminal-reader-header"><div><span>ADMINISTRATOR // USER 1</span><h1>{draft.id===null?"CREATE TERMINAL FILE":"EDIT TERMINAL FILE"}</h1></div><button onClick={()=>setAdminOpen(false)}>CLOSE</button></div>
        <form className="terminal-admin-form" onSubmit={save}>{(["code","title","subtitle","classification"] as const).map(k=><label key={k}>{k.toUpperCase()}<input value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})} required={k==="code"||k==="title"}/></label>)}<label className="terminal-admin-content">CONTENT<textarea rows={14} value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})}/></label><div className="terminal-admin-actions"><button> {draft.id===null?"CREATE FILE":"SAVE CHANGES"}</button><button type="button" onClick={()=>setDraft(blank)}>CLEAR</button></div></form><div className="terminal-message">{adminMessage||"\u00a0"}</div>
        <div className="terminal-admin-existing"><h2>ALL TERMINAL FILES</h2>{adminFiles.length===0?<div className="terminal-empty">DATABASE EMPTY</div>:adminFiles.map(f=><div className="terminal-admin-file-row" key={f.id}><div><strong>{f.title}</strong><small>{f.code}</small></div><button onClick={()=>setDraft({id:f.id,code:f.code??"",title:f.title,subtitle:f.subtitle,classification:f.classification,content:f.content})}>EDIT</button><button onClick={()=>remove(f)}>DELETE</button></div>)}</div></div>
      :current?<><div className="terminal-reader-header"><div><span>{current.classification||"UNCLASSIFIED"}</span><h1>{current.title}</h1>{current.subtitle?<p>{current.subtitle}</p>:null}</div><small>RECORD {String(current.id).padStart(4,"0")}</small></div><div className="terminal-document">{document(current.content)}</div></>
      :<div className="terminal-reader-empty"><img src={cbcLogo} alt=""/><span>CLOVIS BRAY // ARCHIVE</span><p>ENTER AN ACCESS CODE OR SELECT A DISCOVERED FILE.</p></div>}</article>
    </section></main>;
}
