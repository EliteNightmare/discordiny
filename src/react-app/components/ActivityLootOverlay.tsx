import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import "./ActivityLootOverlay.css";
type Weapon = { dropped: boolean; name: string | null; adept: boolean; rarity: string | null };
export type ActivityLootPayload = { weapons: Weapon[]; materials: Record<string, number>; xp: number };
export type LevelProgress = { current: number; currentXp: number; nextXp: number; percentage: number };
type Props = { loot: ActivityLootPayload; before: LevelProgress | null; onDone: () => void; durationMs?: number };
type Entry = Props & { id: number };
const weaponImages = import.meta.glob("../assets/icons/weapons/**/*.png", { eager:true, import:"default", query:"?url" }) as Record<string,string>;
const materialImages = import.meta.glob("../assets/icons/{currencies,upgrade-materials,destination-materials,dungeon-materials,raid-materials}/*.png", { eager:true, import:"default", query:"?url" }) as Record<string,string>;
const norm = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
const asset = (images:Record<string,string>,name:string) => Object.entries(images).find(([path])=>norm(path.split("/").pop()?.replace(/\.png$/i,"") ?? "")===norm(name))?.[1];
const weaponIcon = (name:string) => asset(weaponImages,name) ?? (/\(Adept\)/i.test(name) ? asset(weaponImages,name.replace(/\s*\(Adept\)\s*$/i,"")) : undefined);
const fmt = (n:number) => Math.max(0,Math.round(n)).toLocaleString();
function CountingAmount({amount}:{amount:number}) {
  const [display,setDisplay]=useState(amount);
  const previous=useRef(amount);
  useEffect(()=>{
    const from=previous.current;
    previous.current=amount;
    if(from===amount) return;
    const started=performance.now();
    let frame=0;
    const animate=(now:number)=>{
      const progress=Math.min(1,(now-started)/500);
      setDisplay(Math.round(from+(amount-from)*(1-Math.pow(1-progress,3))));
      if(progress<1) frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return ()=>cancelAnimationFrame(frame);
  },[amount]);
  return <span>+{fmt(display)}</span>;
}

let root:Root|null = null;
let publish:((e:Entry)=>void)|null = null;
const pending:Entry[] = [];
let counter=0;
function enqueue(e:Entry) {
  if (!root) {
    const host=document.createElement("div");
    host.id="discordiny-loot-hud-root";
    document.body.appendChild(host);
    root=createRoot(host);
    root.render(<LootManager/>);
  }
  if (publish) publish(e); else pending.push(e);
}
export default function ActivityLootOverlay({loot,before,onDone,durationMs=9500}:Props) {
  const callback=useRef(onDone);
  callback.current=onDone;
  useEffect(()=>{
    enqueue({id:++counter,loot,before,durationMs,onDone:()=>callback.current()});
    // The shared manager owns the notification even after its source modal unmounts.
  },[]);
  return null;
}
function LootManager() {
  const [entries,setEntries]=useState<Entry[]>([]);
  useEffect(()=>{
    publish=e=>setEntries(items=>{
      // Merge matching currencies into the existing visible notification,
      // preserving its first appearance and adding newly acquired amounts.
      const incoming={...e.loot.materials};
      const updated=items.map(item=>{
        const materials={...item.loot.materials};
        for(const [name,amount] of Object.entries(incoming)){
          if(amount>0 && materials[name]!==undefined){
            materials[name]+=amount;
            delete incoming[name];
          }
        }
        return {...item,loot:{...item.loot,materials}};
      });
      const remainder={...e,loot:{...e.loot,materials:incoming}};
      const hasNewLoot=e.loot.weapons.some(w=>w.dropped)||Object.values(incoming).some(n=>n>0)||e.loot.xp>0;
      if (!hasNewLoot) queueMicrotask(e.onDone);
      return hasNewLoot?[remainder,...updated]:updated;
    });
    if(pending.length){const waiting=[...pending];pending.length=0;waiting.forEach(e=>publish?.(e));}
    return ()=>{publish=null;};
  },[]);
  return <div className="activity-loot-hud" aria-live="polite">
    <div className="activity-loot-batch-rail">
      {entries.map(e=><LootBatch key={e.id} entry={e} expire={()=>{
        setEntries(items=>items.filter(item=>item.id!==e.id));
        e.onDone();
      }}/>) }
    </div>
    {entries.filter(e=>e.loot.xp>0).slice(0,1).map(e=><XpNotice key={e.id} entry={e}/>)}
  </div>;
}
function LootBatch({entry,expire}:{entry:Entry;expire:()=>void}) {
  const expireRef=useRef(expire);expireRef.current=expire;
  useEffect(()=>{const t=window.setTimeout(()=>expireRef.current(),entry.durationMs ?? 9500);return ()=>window.clearTimeout(t);},[entry.id,entry.durationMs]);
  const weapons=entry.loot.weapons.filter(w=>w.dropped);
  const materials=Object.entries(entry.loot.materials).filter(([,n])=>Number.isFinite(n)&&n>0);
  if(!weapons.length&&!materials.length)return null;
  return <div className="activity-loot-batch">
    {weapons.map((w,i)=><div className="activity-loot-weapon" key={`${w.name}-${i}`} style={{animationDelay:`${i*90}ms`}}>
      <div className="activity-loot-weapon-art">{w.name&&weaponIcon(w.name)?<img src={weaponIcon(w.name)} alt=""/>:<span>✦</span>}</div>
      <div className="activity-loot-weapon-details"><span>{w.adept?"ADEPT WEAPON ACQUIRED":"WEAPON ACQUIRED"}</span><strong>{w.name}</strong><small>{w.rarity??"LEGENDARY"}</small></div>
    </div>)}
    {materials.map(([name,amount],i)=><div className="activity-loot-material" key={name} style={{animationDelay:`${(weapons.length+i)*90}ms`}}>
      {asset(materialImages,name)&&<img src={asset(materialImages,name)} alt=""/>}<div><strong>{name}</strong><CountingAmount amount={amount}/></div>
    </div>)}
  </div>;
}
function XpNotice({entry}:{entry:Entry}) {
  const [after,setAfter]=useState<LevelProgress|null>(null);
  const [fill,setFill]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{
    let active=true;
    void fetch("/api/game/profile",{credentials:"include"}).then(r=>r.ok?r.json():null).then(d=>{if(active&&d?.level)setAfter(d.level as LevelProgress);}).catch(()=>{});
    const timers=[window.setTimeout(()=>setFill(true),150),window.setTimeout(()=>setElapsed(1),3000),window.setTimeout(()=>setElapsed(2),7000)];
    return ()=>{active=false;timers.forEach(window.clearTimeout);};
  },[entry.id]);
  const before=entry.before;
  const gained=before&&after?Math.max(0,after.current-before.current):0;
  const start=before?Math.min(100,Math.max(0,before.percentage)):0;
  const end=after?Math.min(100,Math.max(0,after.percentage)):start;
  const percent=fill?(gained>0&&elapsed<1?100:end):start;
  const level=elapsed>=1&&after?after.current:(before?.current??after?.current??0);
  return <div className="activity-loot-xp">
    {gained>0&&elapsed>=1&&elapsed<2&&<div className="activity-loot-levelup" role="status"><span>LEVEL UP</span><strong>LEVEL {after?.current}</strong>{gained>1&&<small>+{gained} levels</small>}</div>}
    <div className="activity-loot-xp-head"><strong>LEVEL {level||"—"}</strong><span>+{fmt(entry.loot.xp)} XP</span></div>
    <div className="activity-loot-xp-track"><div className="activity-loot-xp-fill" style={{width:`${percent}%`}}/></div>
    <div className="activity-loot-xp-foot"><span>GUARDIAN PROGRESSION</span><span>{after&&elapsed>=1?`${fmt(after.currentXp)} / ${fmt(after.nextXp)} XP`:"XP ACQUIRED"}</span></div>
  </div>;
}
