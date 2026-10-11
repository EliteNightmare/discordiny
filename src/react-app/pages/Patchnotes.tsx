import { useCallback, useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import { markdownToBlocks, parseBlocks, renderBlock, type Block } from "./ArticleBlocks";
import "./Patchnotes.css";

type Patch = {id:number;slug:string;title:string;subtitle:string;category:string;cover_url:string;banner_url?:string;body:string;status:string;published_at:string|null};
const displayDate=(raw:string|null)=>{if(!raw)return "DRAFT";const date=new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(raw)?raw:raw.replace(" ","T")+"Z");return Number.isNaN(date.getTime())?"DATE UNKNOWN":new Intl.DateTimeFormat("en-US",{month:"2-digit",day:"2-digit",year:"numeric",timeZone:"UTC"}).format(date)};
const blocksOf=(body:string):Block[]=>parseBlocks(body)??markdownToBlocks(body);
export default function Patchnotes(){
 const slug=decodeURIComponent(window.location.pathname.match(/^\/patchnotes\/([^/]+)\/?$/)?.[1]??"");
 const [items,setItems]=useState<Patch[]>([]),[current,setCurrent]=useState<Patch|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[page,setPage]=useState(1);
 const load=useCallback(async()=>{setLoading(true);setError("");try{
  const r=await fetch("/api/news/articles",{credentials:"include"});if(!r.ok)throw Error("Could not load patchnotes");const data=await r.json();setItems((data.articles??[]).filter((x:Patch)=>x.category==="PATCHNOTES"&&x.status==="published"));
  if(slug){const detail=await fetch(`/api/news/articles/${encodeURIComponent(slug)}`,{credentials:"include"});if(!detail.ok)throw Error("Patchnotes not found");const found=(await detail.json()).article as Patch;if(found.category!=="PATCHNOTES"||found.status!=="published")throw Error("Patchnotes not found");setCurrent(found);}else setCurrent(null);
 }catch(e){setError(e instanceof Error?e.message:"Unable to load patchnotes")}finally{setLoading(false)}},[slug]);
 useEffect(()=>{void load()},[load]);
 const perPage=8;const pageCount=Math.max(1,Math.ceil(items.length/perPage));const shown=items.slice((page-1)*perPage,page*perPage);
 return <div className="dc-patch-page"><TopBar/>{slug&&current?.banner_url&&<div className="dc-patch-banner"><img src={current.banner_url} alt=""/></div>}<main className="dc-patch-shell">
 <div className="dc-patch-eyebrow">DISCORDINY / RELEASE NOTES</div>
 {loading?<p>Loading patchnotes…</p>:error?<p role="alert">{error}</p>:slug&&current?<article className="dc-patch-detail"><a className="dc-patch-back" href="/patchnotes">← ALL PATCHNOTES</a><header><h1>{current.title}</h1><p className="dc-patch-meta">{displayDate(current.published_at)} · DISCORDINY TEAM</p>{current.subtitle&&<p className="dc-patch-summary">{current.subtitle}</p>}</header><div className="dc-patch-body">{blocksOf(current.body).map((b,i)=><div key={b.id||i} className={`dc-patch-block dc-patch-${b.type.toLowerCase().replace(/[^a-z]+/g,"-")}`}>{renderBlock(b)}</div>)}</div></article>:<><header className="dc-patch-index-heading"><h1>PATCHNOTES</h1><p>Updates, fixes, balancing changes, and improvements to Discordiny.</p></header><div className="dc-patch-list">{shown.map(a=><a key={a.id} className="dc-patch-entry" href={`/patchnotes/${encodeURIComponent(a.slug)}`}>{a.cover_url&&<img src={a.cover_url} alt="" loading="lazy"/>}<div><span className="dc-patch-entry-date">{displayDate(a.published_at)} · PATCHNOTES</span><h2>{a.title}</h2><p>{a.subtitle}</p><span className="dc-patch-open">READ PATCHNOTES ↗</span></div></a>)}</div>{!items.length&&<p>No patchnotes have been published yet.</p>}{pageCount>1&&<nav className="dc-patch-pages" aria-label="Patchnotes pages"><button disabled={page===1} onClick={()=>setPage(x=>x-1)}>← Previous</button><span>{page} / {pageCount}</span><button disabled={page===pageCount} onClick={()=>setPage(x=>x+1)}>Next →</button></nav>}</>}
 </main></div>;
}
