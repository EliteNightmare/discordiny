import "./ArticleBlockStyles.css";
import { useState, type ReactNode } from "react";
export type Block = { id:string; type:string; text?:string; url?:string; caption?:string; items?:string[]; columns?:string[]; title?:string; tone?:string; level?:number };
export const BLOCK_TYPES = ["Paragraph","Title","Image","Divider","Bullet List","Numbered List","Row","Gallery","Quote","Author","Callout","Video","Tweet","Accordion","Table","Tabs","Embed","Conversation","Audio","Button","Community Challenge","Weapon Set"];
export const isBlockBody = (body:string) => body.startsWith("DISCORDINY_BLOCKS_V1\n");
export function parseBlocks(body:string):Block[] | null { if (!isBlockBody(body)) return null; try { const v=JSON.parse(body.slice("DISCORDINY_BLOCKS_V1\n".length));return Array.isArray(v)?v:null; } catch {return null;} }
export const serializeBlocks=(blocks:Block[])=>"DISCORDINY_BLOCKS_V1\n"+JSON.stringify(blocks);
export function markdownToBlocks(body:string):Block[]{return body.split(/\n\n+/).filter(Boolean).map((part,i)=>{const heading=part.match(/^(#{1,3})\s+([\s\S]+)$/);const image=part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);return {id:`legacy-${i}`,type:heading?"Title":image?"Image":part.startsWith("- ")?"Bullet List":"Paragraph",text:heading?heading[2]:part,url:image?.[2],caption:image?.[1],level:heading?.[1].length,items:part.startsWith("- ")?part.split("\n").map(x=>x.replace(/^- /,"")):undefined};});}
const safeUrl=(url?:string)=>{try{const u=new URL(url??"");return u.protocol==="https:"||u.protocol==="http:"?u.href:""}catch{return ""}};
function GalleryBlock({images, caption}:{images:string[];caption?:string}) {
 const [index,setIndex]=useState(0);
 if(!images.length)return null;
 const active=Math.min(index,images.length-1);
 return <figure className="dc-media-gallery"><div className="dc-gallery-stage"><img src={images[active]} alt={`${caption||"Gallery image"} ${active+1} of ${images.length}`} loading="lazy"/>{images.length>1&&<><button type="button" className="dc-gallery-prev" aria-label="Previous image" onClick={()=>setIndex((active+images.length-1)%images.length)}>‹</button><button type="button" className="dc-gallery-next" aria-label="Next image" onClick={()=>setIndex((active+1)%images.length)}>›</button></>}</div>{caption&&<figcaption>{caption}</figcaption>}{images.length>1&&<div className="dc-gallery-dots" aria-label="Gallery slides">{images.map((_,i)=><button type="button" key={i} aria-label={`Show image ${i+1}`} aria-current={i===active?"true":undefined} className={i===active?"active":""} onClick={()=>setIndex(i)}/>)}</div>}</figure>;
}
function getYouTubeId(raw:string){try{const u=new URL(raw);const h=u.hostname.toLowerCase();if(h==="youtu.be"||h==="www.youtu.be")return u.pathname.split("/")[1]||"";if(h==="youtube.com"||h==="www.youtube.com"||h==="m.youtube.com"||h==="youtube-nocookie.com"||h==="www.youtube-nocookie.com"){if(u.pathname==="/watch")return u.searchParams.get("v")||"";const m=u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/);return m?.[1]||"";}}catch{}return ""}
export function renderBlock(b:Block):ReactNode {const url=safeUrl(b.url);const lines=b.items??(b.text??"").split("\n").filter(Boolean);switch(b.type){
case "Title":return b.level===1?<h1>{b.text}</h1>:b.level===3?<h3>{b.text}</h3>:<h2>{b.text}</h2>;
case "Image":return url?<figure className="dc-media-image"><img src={url} alt={b.caption||""} loading="lazy"/>{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>:null;
case "Gallery":return <GalleryBlock images={lines.map(x=>safeUrl(x.trim())).filter(Boolean)} caption={b.caption}/>;
case "Divider":return <hr/>;
case "Bullet List":return <ul className="dc-block-bullets">{lines.map((x,i)=><li key={i}>{x}</li>)}</ul>;
case "Numbered List":return <ol>{lines.map((x,i)=><li key={i}>{x}</li>)}</ol>;
case "Quote":return <blockquote>{b.text}<footer>{b.caption}</footer></blockquote>;
case "Callout":return <aside className="dc-block-callout"><strong>{b.title||"NOTICE"}</strong><p>{b.text}</p></aside>;
case "Row":return <div className="dc-block-row">{(b.columns??lines).map((x,i)=><p key={i}>{x}</p>)}</div>;
case "Table":{const rows=lines.map(x=>x.split("|"));return <div className="dc-block-table"><table><tbody>{rows.map((r,i)=><tr key={i}>{r.map((cell,j)=>i===0?<th key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
case "Accordion":return <details><summary>{b.title||"Read more"}</summary><p>{b.text}</p></details>;
case "Button":return url?<a className="dc-block-button" href={url} target="_blank" rel="noopener noreferrer">{b.title||"Learn more"}</a>:null;
case "Audio":return url?<audio controls src={url}/>:null;
case "Video":{if(!url)return null;const id=getYouTubeId(url);return <figure className="dc-media-video">{id?<iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`} title={b.title||"YouTube video"} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<video src={url} controls preload="metadata"/>}{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>;}
case "Tweet": {
 const match=url.match(/^https?:\\/\\/(?:www\\.|mobile\\.)?(?:x\\.com|twitter\\.com)\\/[^/]+\\/status\\/(\\d+)/i);
 return match?<div className="dc-block-tweet"><iframe title="X post" src={`https://platform.twitter.com/embed/Tweet.html?id=${match[1]}&theme=dark`} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer-when-downgrade"/><a href={url} target="_blank" rel="noopener noreferrer">View post on X ↗</a></div>:url?<a href={url} target="_blank" rel="noopener noreferrer">View post on X ↗</a>:null;
}
case "Embed":return url?<a href={url} target="_blank" rel="noopener noreferrer">Open linked content ↗</a>:null;
case "Tabs":return <div className="dc-block-callout"><strong>{b.title||"Sections"}</strong>{lines.map((x,i)=><p key={i}>{x}</p>)}</div>;
case "Author":return <div className="dc-block-author">{url?<img src={url} alt="" loading="lazy"/>:<span className="dc-author-fallback">◈</span>}<div><strong>{b.title||"Author"}</strong>{(b.caption||b.text)&&<p>{b.caption||b.text}</p>}</div></div>;
case "Community Challenge":return <aside className="dc-block-callout"><strong>{b.title||"Community challenge"}</strong><p>{b.text}</p><small>Editorial information · not live progress</small></aside>;
case "Weapon Set":return <aside className="dc-block-callout"><strong>{b.title||"Weapon set"}</strong><p>{b.text}</p><small>Editorial listing · not connected to the weapon catalog</small></aside>;
case "Conversation":return <div>{lines.map((x,i)=><blockquote key={i}>{x}</blockquote>)}</div>;
default:return <p className="dc-block-paragraph">{b.text}</p>;
}}
export function renderArticleBody(body:string){const blocks=parseBlocks(body)??markdownToBlocks(body);return blocks.map(b=><div className="dc-render-block" key={b.id}>{renderBlock(b)}</div>);}
