import type { ReactNode } from "react";
export type Block = { id:string; type:string; text?:string; url?:string; caption?:string; items?:string[]; columns?:string[]; title?:string; tone?:string; level?:number };
export const BLOCK_TYPES = ["Paragraph","Title","Image","Divider","Bullet List","Numbered List","Row","Gallery","Quote","Author","Callout","Video","Tweet","Accordion","Table","Tabs","Embed","Conversation","Audio","Button","Community Challenge","Weapon Set"];
export const isBlockBody = (body:string) => body.startsWith("DISCORDINY_BLOCKS_V1\n");
export function parseBlocks(body:string):Block[] | null { if (!isBlockBody(body)) return null; try { const v=JSON.parse(body.slice("DISCORDINY_BLOCKS_V1\n".length));return Array.isArray(v)?v:null; } catch {return null;} }
export const serializeBlocks=(blocks:Block[])=>"DISCORDINY_BLOCKS_V1\n"+JSON.stringify(blocks);
export function markdownToBlocks(body:string):Block[]{return body.split(/\n\n+/).filter(Boolean).map((part,i)=>{const heading=part.match(/^(#{1,3})\s+([\s\S]+)$/);const image=part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);return {id:`legacy-${i}`,type:heading?"Title":image?"Image":part.startsWith("- ")?"Bullet List":"Paragraph",text:heading?heading[2]:part,url:image?.[2],caption:image?.[1],level:heading?.[1].length,items:part.startsWith("- ")?part.split("\n").map(x=>x.replace(/^- /,"")):undefined};});}
const safeUrl=(url?:string)=>{try{const u=new URL(url??"");return u.protocol==="https:"||u.protocol==="http:"?u.href:""}catch{return ""}};
export function renderBlock(b:Block):ReactNode {const url=safeUrl(b.url);const lines=b.items??(b.text??"").split("\n").filter(Boolean);switch(b.type){
case "Title":return b.level===1?<h1>{b.text}</h1>:b.level===3?<h3>{b.text}</h3>:<h2>{b.text}</h2>;
case "Image":return url?<figure><img src={url} alt={b.caption||""} loading="lazy"/>{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>:null;
case "Gallery":return <div className="dc-block-gallery">{lines.map((x,i)=>safeUrl(x)?<img key={i} src={safeUrl(x)} alt="" loading="lazy"/>:null)}</div>;
case "Divider":return <hr/>;
case "Bullet List":return <ul>{lines.map((x,i)=><li key={i}>{x}</li>)}</ul>;
case "Numbered List":return <ol>{lines.map((x,i)=><li key={i}>{x}</li>)}</ol>;
case "Quote":return <blockquote>{b.text}<footer>{b.caption}</footer></blockquote>;
case "Callout":return <aside className="dc-block-callout"><strong>{b.title||"Notice"}</strong><p>{b.text}</p></aside>;
case "Row":return <div className="dc-block-row">{(b.columns??lines).map((x,i)=><p key={i}>{x}</p>)}</div>;
case "Table":{const rows=lines.map(x=>x.split("|"));return <div className="dc-block-table"><table><tbody>{rows.map((r,i)=><tr key={i}>{r.map((cell,j)=>i===0?<th key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
case "Accordion":return <details><summary>{b.title||"Read more"}</summary><p>{b.text}</p></details>;
case "Button":return url?<a className="dc-block-button" href={url} target="_blank" rel="noopener noreferrer">{b.title||"Learn more"} ↗</a>:null;
case "Audio":return url?<audio controls src={url}/>:null;
case "Video":return url?<a href={url} target="_blank" rel="noopener noreferrer">Watch video ↗</a>:null;
case "Tweet":return url?<a href={url} target="_blank" rel="noopener noreferrer">View post on X ↗</a>:null;
case "Embed":return url?<a href={url} target="_blank" rel="noopener noreferrer">Open linked content ↗</a>:null;
case "Tabs":return <div className="dc-block-callout"><strong>{b.title||"Sections"}</strong>{lines.map((x,i)=><p key={i}>{x}</p>)}</div>;
case "Author":return <div className="dc-block-author"><strong>{b.title||"Author"}</strong><p>{b.text}</p>{url&&<img src={url} alt="" width="64"/>}</div>;
case "Community Challenge":return <aside className="dc-block-callout"><strong>{b.title||"Community challenge"}</strong><p>{b.text}</p><small>Editorial information · not live progress</small></aside>;
case "Weapon Set":return <aside className="dc-block-callout"><strong>{b.title||"Weapon set"}</strong><p>{b.text}</p><small>Editorial listing · not connected to the weapon catalog</small></aside>;
case "Conversation":return <div>{lines.map((x,i)=><blockquote key={i}>{x}</blockquote>)}</div>;
default:return <p>{b.text}</p>;
}}
export function renderArticleBody(body:string){const blocks=parseBlocks(body)??markdownToBlocks(body);return blocks.map(b=><div className="dc-render-block" key={b.id}>{renderBlock(b)}</div>);}
