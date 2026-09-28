import { useMemo, useState } from "react";
import "./Root.css";
import { ROOT_FILES, ROOT_LAYOUT } from "./rootData";

type NavNode = { directories: readonly { name:string; node:NavNode }[]; files: readonly string[] };
type Login = { name:string; username:string; password:string; level:number };

const LOGINS: Login[] = [
  {name:"ADMIN",username:"admin",password:"admin",level:1},
  {name:"WILHELMINA",username:"wlhlm.bray",password:"XJ57-4BA6-QSM9",level:2},
  {name:"CLOVIS",username:"The Lord of Logic, King of Code",password:"Tell yourself a story... Let the story twist in unlikely directions",level:3},
];

const ID_IMAGES:Record<string,string>={
  "C.-BRAY-I.id":"/assets/root/ids/clovisbrayI.png",
  "C.-BRAY-II.id":"/assets/root/ids/clovisbrayII.png",
  "Alt.-BRAY.id":"/assets/root/ids/altonbray.png",
  "Whm.-BRAY.id":"/assets/root/ids/wilhelminabray.png",
  "Esb.-BRAY.id":"/assets/root/ids/elsiebray.png",
  "Ans.-BRAY.id":"/assets/root/ids/anabray.png",
  "Z.-SHIRAZI.id":"/assets/root/ids/zshirazi.png",
  "A.-FALTSKOG.id":"/assets/root/ids/afaltskog.png",
  "H.-ABRAM.id":"/assets/root/ids/habram.png",
  "H.-RASMUSSEN.id":"/assets/root/ids/hrasmussen.png",
  "E.-RUIZ.id":"/assets/root/ids/eruiz.png",
  "J.-WONG.id":"/assets/root/ids/jwong.png",
};
const ASSET=(value?:string|null)=>{
  if(!value)return null;
  const marker="assets/root/";
  const i=value.toLowerCase().indexOf(marker);
  return i>=0?"/assets/root/"+value.slice(i+marker.length):null;
};
const keyNorm=(s:string)=>s.replaceAll("#U26a0#Ufe0f","⚠️").toLocaleLowerCase();
function getRecord(path:string){
  const exact=ROOT_FILES[path]; if(exact)return exact;
  const k=Object.keys(ROOT_FILES).find(x=>keyNorm(x)===keyNorm(path));
  return k?ROOT_FILES[k]:null;
}
function getNode(parts:string[]):NavNode{
  let node:NavNode=ROOT_LAYOUT as unknown as NavNode;
  for(const p of parts){
    const next=node.directories.find(d=>d.name===p);
    if(!next)break; node=next.node;
  }
  return node;
}
function inline(s:string){
  const bits=s.split(/(\*\*.*?\*\*|`.*?`)/g);
  return bits.map((x,i)=>x.startsWith("**")&&x.endsWith("**")?<strong key={i}>{x.slice(2,-2)}</strong>:x.startsWith("`")&&x.endsWith("`")?<code key={i}>{x.slice(1,-1)}</code>:x);
}
function Text({value}:{value:string}){
  const chunks=value.split(/(```[\s\S]*?```)/g);
  return <>{chunks.map((x,i)=>x.startsWith("```")?<pre key={i}>{x.slice(3,-3).replace(/^text\n/,"").replace(/^\n/,"")}</pre>:x.split("\n").map((line,j)=><div className="root-line" key={`${i}-${j}`}>{inline(line||"\u00a0")}</div>))}</>;
}
export default function Root(){
  const [login,setLogin]=useState<Login|null>(null);
  const [user,setUser]=useState(""),[pass,setPass]=useState(""),[error,setError]=useState("");
  const [path,setPath]=useState<string[]>([]),[file,setFile]=useState<string|null>(null);
  const node=useMemo(()=>getNode(path),[path]);
  const logical=file?[...path,file].join("/"):null;
  const data=logical?getRecord(logical):null;
  const level=Number(data?.authorization?.required_level??1);
  const allowed=!!login && login.level>=level && !["denied","unauthorized","blocked","revoked","forbidden","disabled"].includes(String(data?.authorization?.status??"").toLowerCase());

  function submit(e:React.FormEvent){e.preventDefault();const found=LOGINS.find(x=>x.username===user.trim()&&x.password===pass.trim());if(!found){setError("AUTHENTICATION FAILURE // INVALID ROOT CREDENTIALS");return}setLogin(found);setError("");}
  function openDir(name:string){setPath(p=>[...p,name]);setFile(null)}
  function back(){if(file){setFile(null);return}setPath(p=>p.slice(0,-1))}
  const image=file?(ID_IMAGES[file]??ASSET(data?.image)):null;

  if(!login)return <main className="root-shell"><div className="root-browserbar"><i/><i/><i/><span>*@3t@mainframe</span></div><section className="root-login"><div className="root-mark">▮</div><form onSubmit={submit}><div>ROOT ACCESS TERMINAL</div><small>AUTHORIZED INITIALIZATION NODE</small><label>LOGIN<input value={user} onChange={e=>setUser(e.target.value)} autoFocus/></label><label>PASSWORD<input type="password" value={pass} onChange={e=>setPass(e.target.value)}/></label><button>============= ROOT =============</button>{error?<p>{error}</p>:null}</form></section></main>;

  return <main className="root-shell">
    <div className="root-browserbar"><i/><i/><i/><span>*@3t@mainframe</span></div>
    <div className="root-stage">
      <div className="root-cursor">▮</div>
      <header className="root-session"><span>ROOT://{path.join("/")||"MAINFRAME"}</span><span>AUTH LVL {login.level} // {login.name}</span></header>
      {file?<section className="root-file">
        <button className="root-link root-back" onClick={back}>[..] RETURN</button>
        <div className="root-file-title">{logical}</div>
        {!data?<div className="root-denied">FILE NOT FOUND // ARCHIVE INDEX MISMATCH</div>:!allowed?<div className="root-denied">ACCESS DENIED<br/>LEVEL {level} AUTHORIZATION REQUIRED</div>:<>
          <div className="root-file-status">{data.authorization?.status??"AUTHORIZED"} // LEVEL {level}</div>
          {data.title?<h1>{data.title}</h1>:null}
          {data.description?<div className="root-copy"><Text value={String(data.description)}/></div>:null}
          {data.embed?.description?<h2>{data.embed.description}</h2>:null}
          {image?<img className="root-file-image" src={image} alt=""/>:null}
          <div className="root-fields">{(data.embed?.fields??[]).map((f:any,i:number)=><article key={i}><h3>{f.name}</h3><Text value={String(f.value??"")}/></article>)}</div>
          {data.content?<div className="root-copy"><Text value={Array.isArray(data.content)?data.content.join("\n"):String(data.content)}/></div>:null}
        </>}
      </section>:<section className="root-directory">
        {path.length?<button className="root-link root-back" onClick={back}>[..] PARENT DIRECTORY</button>:null}
        <div className="root-list">
          {node.directories.map(d=><button className="root-link root-dir" key={d.name} onClick={()=>openDir(d.name)}>[DIR] {d.name}/</button>)}
          {node.files.map(f=>{const rec=getRecord([...path,f].join("/"));const req=Number(rec?.authorization?.required_level??1);return <button className={`root-link root-entry ${req>login.level?"root-locked":""}`} key={f} onClick={()=>setFile(f)}>{f}{req>login.level?<span> [LVL {req}]</span>:""}</button>})}
        </div>
      </section>}
      <footer>BRAYTECH ROOT NETWORK // SESSION ACTIVE</footer>
    </div>
  </main>
}
