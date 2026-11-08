import { useEffect, useRef, useState } from "react";
import "./ActivityLootOverlay.css";

type Weapon = { dropped: boolean; name: string | null; adept: boolean; rarity: string | null };
export type ActivityLootPayload = { weapons: Weapon[]; materials: Record<string, number>; xp: number };
export type LevelProgress = { current: number; currentXp: number; nextXp: number; percentage: number };
type Props = { loot: ActivityLootPayload; before: LevelProgress | null; onDone: () => void; durationMs?: number };

const weaponImages = import.meta.glob("../assets/icons/weapons/**/*.png", { eager: true, import: "default", query: "?url" }) as Record<string,string>;
const currencyImages = import.meta.glob("../assets/icons/{currencies,upgrade-materials,destination-materials,dungeon-materials,raid-materials}/*.png", { eager: true, import: "default", query: "?url" }) as Record<string,string>;
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
function imageFor(images: Record<string,string>, name: string) {
  return Object.entries(images).find(([path]) => normalize(path.split("/").pop()?.replace(/\.png$/i,"") ?? "") === normalize(name))?.[1];
}
function weaponIcon(name: string) {
  return imageFor(weaponImages,name) ?? (/\(Adept\)/i.test(name) ? imageFor(weaponImages,name.replace(/\s*\(Adept\)\s*$/i,"")) : undefined);
}
const fmt = (value:number) => Math.max(0,Math.round(value)).toLocaleString();

export default function ActivityLootOverlay({loot,before,onDone,durationMs=9500}:Props) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [after,setAfter] = useState<LevelProgress|null>(null);
  const [fill,setFill] = useState(0);
  const [elapsed,setElapsed] = useState(0);
  useEffect(() => {
    let alive = true;
    void fetch("/api/game/profile",{credentials:"include"})
      .then(r=>r.ok?r.json():null)
      .then(data=>{if(alive && data?.level) setAfter(data.level as LevelProgress);})
      .catch(()=>{});
    const timers = [window.setTimeout(()=>setFill(1),150),window.setTimeout(()=>setElapsed(1),3000),window.setTimeout(()=>setElapsed(2),7000),window.setTimeout(()=>doneRef.current(),durationMs)];
    return ()=>{alive=false;timers.forEach(window.clearTimeout);};
  },[durationMs]);
  const earned = Object.entries(loot.materials).filter(([,count])=>Number.isFinite(count)&&count>0);
  const levelsGained = before && after ? Math.max(0,after.current-before.current) : 0;
  const startingPercent = before ? Math.min(100,Math.max(0,before.percentage)) : 0;
  const endingPercent = after ? Math.min(100,Math.max(0,after.percentage)) : startingPercent;
  const currentLevel = elapsed>=1 && after ? after.current : (before?.current ?? after?.current ?? 0);
  const progress = fill ? (levelsGained>0 && elapsed<1 ? 100 : endingPercent) : startingPercent;
  return <div className="activity-loot-hud" aria-live="polite">
    <div className="activity-loot-drop-stack">
    {loot.weapons.length>0 && <div className="activity-loot-weapons" aria-label="Weapon drops">
      {loot.weapons.filter(weapon => weapon.dropped).map((weapon,index)=><div className="activity-loot-weapon" key={`${weapon.name}-${index}`} style={{animationDelay:`${index*230}ms`}}>
        <div className="activity-loot-weapon-art">{weapon.name && weaponIcon(weapon.name) ? <img src={weaponIcon(weapon.name)} alt=""/> : <span>✦</span>}</div>
        <div className="activity-loot-weapon-details"><span>{weapon.adept ? "ADEPT WEAPON ACQUIRED" : "WEAPON ACQUIRED"}</span><strong>{weapon.name}</strong><small>{weapon.rarity ?? "LEGENDARY"}</small></div>
      </div>)}
    </div>}
    {earned.length>0 && <div className="activity-loot-materials" aria-label="Materials acquired">
      {earned.map(([name,amount],index)=><div className="activity-loot-material" key={name} style={{animationDelay:`${index*110}ms`}}>
        {imageFor(currencyImages,name) && <img src={imageFor(currencyImages,name)} alt=""/>}
        <div><strong>{name}</strong><span>+{fmt(amount)}</span></div>
      </div>)}
    </div>}
    </div>
    {loot.xp>0 && <div className="activity-loot-xp">
      {levelsGained>0 && elapsed>=1 && elapsed<2 && <div className="activity-loot-levelup" role="status"><span>LEVEL UP</span><strong>LEVEL {after?.current}</strong>{levelsGained>1 && <small>+{levelsGained} levels</small>}</div>}
      <div className="activity-loot-xp-head"><strong>LEVEL {currentLevel || "—"}</strong><span>+{fmt(loot.xp)} XP</span></div>
      <div className="activity-loot-xp-track"><div className="activity-loot-xp-fill" style={{width:`${progress}%`}}/></div>
      <div className="activity-loot-xp-foot"><span>GUARDIAN PROGRESSION</span><span>{after && elapsed>=1 ? `${fmt(after.currentXp)} / ${fmt(after.nextXp)} XP` : "XP ACQUIRED"}</span></div>
    </div>}
  </div>;
}
