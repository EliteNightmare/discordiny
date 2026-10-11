import { useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import "./Profile.css";
import glimmerIcon from "../assets/icons/currencies/glimmer.png";
import lumiaLeavesIcon from "../assets/icons/currencies/lumia-leaves.png";
import armorPlatingIcon from "../assets/icons/currencies/armor-plating.png";
import synthweaveIcon from "../assets/icons/currencies/synthweave.png";
import spoilsIcon from "../assets/icons/currencies/spoils-of-conquest.png";

type ProfileResponse = {
  authenticated: boolean;
  user: { id:number; discord_id:string; username:string; global_name:string|null; avatar:string|null };
  profile: { level:number; exp:number; power:number; zone:string };
  level: { current:number; max:number|null; powerBonusCap?:number; totalXp:number; currentXp:number; nextXp:number; percentage:number };
  power: { total:number; breakdown:{ weapons:number; armor:number; artifacts:number; level:number } };
  weapons: { owned:number; total:number };
  currencies: Record<string,number>;
  upgradeMaterials: Record<string,number>;
};
type FeedEvent = { id:number; player:string; avatarUrl:string|null; activity:string; activityType:string; result:string; weapon:{name:string;adept:boolean}|null; createdAt:string };
const DESTINATIONS = [
  ["Cosmodrome","cosmodrome"],["EDZ","edz"],["Nessus","nessus"],["Dreaming City","dreaming_city"],
  ["Moon","moon"],["Europa","europa"],["Throne World","throne_world"],["Neomuna","neomuna"],
  ["Pale Heart","pale_heart"],["Plaguelands","plaguelands"]
] as const;
const CURRENCY_ICONS: Record<string,string> = {"Glimmer":glimmerIcon,"Lumia Leaves":lumiaLeavesIcon,"Armor Plating":armorPlatingIcon,"Synthweave":synthweaveIcon,"Spoils of Conquest":spoilsIcon};
// Discover existing upgrade-material icons at build time; no extra assets required.
const upgradeMaterialIconFiles = import.meta.glob("../assets/icons/upgrade-materials/*.{png,jpg,jpeg,webp,svg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const normalizeMaterialName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const upgradeMaterialIcons = Object.fromEntries(
  Object.entries(upgradeMaterialIconFiles).map(([path, url]) => [
    normalizeMaterialName(path.split("/").pop()?.replace(/\.[^.]+$/, "") || ""), url,
  ]),
);
const getUpgradeMaterialIcon = (name: string) => upgradeMaterialIcons[normalizeMaterialName(name)];
const fmt=(value:number)=>Number(value||0).toLocaleString();
const pretty=(s:string)=>s.replace(/[_-]/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const destinationImage=(name:string)=>`/destinations/${DESTINATIONS.find(d=>d[0].toLowerCase()===name.toLowerCase())?.[1]||"cosmodrome"}.png`;
function Profile(){
  const [data,setData]=useState<ProfileResponse|null>(null);
  const [fish,setFish]=useState<Record<string,number>>({});
  const [feed,setFeed]=useState<FeedEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [traveling,setTraveling]=useState(false);
  const [selected,setSelected]=useState("");
  const [travelOpen,setTravelOpen]=useState(false);
  const [fishSearch,setFishSearch]=useState("");
  const [feedError,setFeedError]=useState(false);
  useEffect(()=>{
    let active=true;
    async function load(){
      try {
        const response=await fetch("/api/game/profile",{credentials:"include"});
        if(!response.ok)throw new Error("Please sign in to view your profile.");
        const result=await response.json() as ProfileResponse;
        if(!result.authenticated)throw new Error("Please sign in to view your profile.");
        if(active){setData(result);setSelected(result.profile.zone);}
      }catch(e){if(active)setError(e instanceof Error?e.message:"Could not load profile");}
      finally{if(active)setLoading(false);}
    }
    void load();
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!data)return;
    let active=true;
    const refresh=async()=>{
      try {
        const [fishResponse,feedResponse]=await Promise.all([
          fetch("/api/game/fish",{credentials:"include"}),
          fetch("/api/game/activity/feed",{credentials:"include"})
        ]);
        if(active&&fishResponse.ok){const result=await fishResponse.json() as {fish?:Record<string,number>};setFish(result.fish||{});}
        if(active&&feedResponse.ok){const result=await feedResponse.json() as {events?:FeedEvent[]};setFeed(result.events||[]);setFeedError(false);}
        else if(active)setFeedError(true);
      }catch{if(active)setFeedError(true);}
    };
    void refresh();
    const timer=window.setInterval(()=>{void refresh();},60000);
    return ()=>{active=false;window.clearInterval(timer);};
  },[data?.user.id]);
  const currencies=useMemo(()=>Object.entries(data?.currencies||{}).sort(([a],[b])=>a.localeCompare(b)),[data]);
  const materials=useMemo(()=>Object.entries(data?.upgradeMaterials||{}).sort(([a],[b])=>a.localeCompare(b)),[data]);
  const fishes=useMemo(()=>Object.entries(fish).filter(([name])=>name.toLowerCase().includes(fishSearch.toLowerCase())).sort(([a],[b])=>a.localeCompare(b)),[fish,fishSearch]);
  async function travel(){
    if(!data||!selected||selected===data.profile.zone||traveling)return;
    setTraveling(true);setError("");
    try{
      const response=await fetch("/api/game/travel",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({destination:selected})});
      const result=await response.json() as {success?:boolean;zone?:string;error?:string};
      if(!response.ok||!result.success)throw new Error(result.error||"Travel failed");
      setData(previous=>previous?{...previous,profile:{...previous.profile,zone:result.zone||selected}}:previous);
      setTravelOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Travel failed");}
    finally{setTraveling(false);}
  }
  if(loading)return <><TopBar/><main className="profile-page profile-page-static"><div className="profile-loading">Loading Guardian profile…</div></main></>;
  if(!data)return <><TopBar/><main className="profile-page profile-page-static"><div className="profile-error">{error||"Profile unavailable"}</div></main></>;
  const name=data.user.global_name||data.user.username;
  const avatar=data.user.avatar?`https://cdn.discordapp.com/avatars/${data.user.discord_id}/${data.user.avatar}.png?size=128`:null;
  const capped=data.level.current>=250;
  return <div className="profile-screen"><TopBar/><main className="profile-page profile-page-static"><div className="profile-container profile-redesign">
    <header className="guardian-hero">
      <div className="guardian-identity">{avatar?<img className="profile-avatar" src={avatar} alt=""/>:<div className="profile-avatar profile-avatar-placeholder">{name.slice(0,1)}</div>}
        <div><div className="profile-eyebrow">GUARDIAN DOSSIER</div><h1>{name}</h1><div className="profile-title">Title: <span>COMING SOON</span></div><div className="guardian-subtitle">LEVEL {fmt(data.level.current)} <span>·</span> {fmt(data.weapons.owned)} / {fmt(data.weapons.total)} WEAPONS</div></div></div>
      <div className="guardian-power"><span>TOTAL POWER</span><strong>{fmt(data.power.total)}</strong></div>
    </header>
    {error&&<div className="travel-error" role="alert">{error}</div>}
    <div className="profile-duo">
      <section className="profile-block guardian-level"><div className="profile-block-header"><div><div className="profile-eyebrow">PROGRESSION</div><h2>Level {fmt(data.level.current)}</h2></div><span className="profile-chip">NO LEVEL CAP</span></div>
        <div className="xp-header"><span>XP TO LEVEL {fmt(data.level.current+1)}</span><span>{fmt(data.level.currentXp)} / {fmt(data.level.nextXp)}</span></div>
        <div className="xp-bar"><div className="xp-bar-fill" style={{width:`${Math.min(100,Math.max(0,data.level.percentage))}%`}}/></div>
        <div className="guardian-metrics"><div><span>TOTAL XP</span><strong>{fmt(data.level.totalXp)}</strong></div><div><span>LEVEL POWER</span><strong>+{fmt(data.power.breakdown.level)}</strong></div></div>
        <p className="profile-help">{capped?"Level-based Power is capped at Level 250. You can continue leveling indefinitely.":"Every level grants Power until Level 250. XP progression continues after that."}</p>
      </section>
      <section className="profile-block"><div className="profile-block-header"><div><div className="profile-eyebrow">POWER SOURCES</div><h2>Power Breakdown</h2></div></div>
        <div className="guardian-metrics power-metrics">{Object.entries(data.power.breakdown).map(([key,value])=><div key={key}><span>{pretty(key)}</span><strong>{fmt(value)}</strong></div>)}</div>
      </section>
    </div>
    <section className="profile-block travel-director"><div className="profile-block-header"><div><div className="profile-eyebrow">DESTINATION DIRECTOR</div><h2>Travel</h2></div><span className="profile-chip">CURRENT: {data.profile.zone}</span></div>
      <button className="travel-director-trigger" type="button" aria-expanded={travelOpen} onClick={()=>setTravelOpen(open=>!open)}>
        <span className="travel-trigger-image" style={{backgroundImage:`linear-gradient(90deg,rgba(5,12,22,.1),rgba(5,12,22,.85)),url("${destinationImage(data.profile.zone)}")`}}/>
        <span className="travel-trigger-copy"><small>CURRENT DESTINATION</small><strong>{data.profile.zone}</strong><em>{travelOpen?"CLOSE DIRECTOR ↑":"SELECT DESTINATION ↓"}</em></span>
      </button>
      {travelOpen&&<div className="travel-director-menu"><div className="travel-destination-grid">{DESTINATIONS.map(([name,image])=><button key={name} type="button" className={`travel-destination-tile ${name==="Plaguelands"?"travel-destination-tile-siva":""} ${selected===name?"travel-destination-tile-selected":""}`} onClick={()=>setSelected(name)} aria-pressed={selected===name}>
        <span className="travel-tile-image" style={{backgroundImage:`linear-gradient(0deg,rgba(4,9,18,.9),rgba(4,9,18,.04)),url("/destinations/${image}.png")`}}/><span className="travel-tile-label">{name}</span>{data.profile.zone===name&&<span className="travel-tile-current">CURRENT</span>}
      </button>)}</div>
      <div className="travel-director-footer"><span>DESTINATION: <strong>{selected}</strong></span><button type="button" disabled={traveling||selected===data.profile.zone} onClick={()=>void travel()}>{traveling?"TRAVELING…":selected===data.profile.zone?"CURRENT LOCATION":"TRAVEL →"}</button></div></div>}
    </section>
    <section className="profile-block"><div className="profile-block-header"><div><div className="profile-eyebrow">WALLET</div><h2>All Currencies</h2></div><span className="profile-chip">{currencies.length} TYPES</span></div>
      {currencies.length?<div className="currency-grid">{currencies.map(([name,amount])=><div className="currency-card" key={name}><div className="currency-card-label">{CURRENCY_ICONS[name]?<img className="currency-icon" src={CURRENCY_ICONS[name]} alt=""/>:<span className="currency-fallback">◆</span>}<span className="currency-name">{name}</span></div><strong>{fmt(amount)}</strong></div>)}</div>:<p className="profile-help">No currency balances recorded.</p>}
    </section>
    <div className="profile-main-and-feed"><div className="profile-main-stack"><div className="profile-duo"><section className="profile-block"><div className="profile-block-header"><div><div className="profile-eyebrow">RESOURCES</div><h2>Upgrade Materials</h2></div><span className="profile-chip">{materials.length} TYPES</span></div>
      {materials.length?<div className="currency-grid">{materials.map(([name,amount])=><div className="currency-card" key={name}><span className="currency-card-label">{getUpgradeMaterialIcon(name) && <img className="currency-icon" src={getUpgradeMaterialIcon(name)} alt="" loading="lazy" />}<span className="currency-name">{pretty(name)}</span></span><strong>{fmt(amount)}</strong></div>)}</div>:<p className="profile-help">No upgrade materials recorded.</p>}
    </section>
    <section className="profile-block"><div className="profile-block-header"><div><div className="profile-eyebrow">COLLECTIONS</div><h2>Fishing Catalogue</h2></div><span className="profile-chip">{Object.keys(fish).length} DISCOVERED</span></div>
      <input className="fish-search" value={fishSearch} onChange={e=>setFishSearch(e.target.value)} placeholder="Search your fish collection…" aria-label="Search fish"/>
      <div className="fish-catalogue">{fishes.length?fishes.map(([name,amount])=><div className="fish-entry" key={name}><span>◇ {pretty(name)}</span><strong>× {fmt(amount)}</strong></div>):<p className="profile-help">{fishSearch?"No matching fish.":"No fish recorded yet."}</p>}</div>
      <p className="profile-help">Shows collected fish reported by your account. Undiscovered species require a complete fish catalogue.</p>
    </section></div></div>
    <section className="profile-block profile-feed-rail"><div className="profile-block-header"><div><div className="profile-eyebrow">COMMUNITY NETWORK</div><h2>Global Activity Feed</h2></div><span className="profile-chip">LATEST 30 · AUTO-REFRESH</span></div>
      {feedError&&<p className="profile-help">The activity feed is temporarily unavailable.</p>}
      <div className="global-feed">{feed.map(event=><article className="feed-entry" key={event.id}>{event.avatarUrl?<img className="feed-avatar" src={event.avatarUrl} alt=""/>:<div className="feed-avatar feed-placeholder">◇</div>}<div className="feed-content"><div><strong>{event.player}</strong><span className="feed-type">{pretty(event.activityType||"Activity")}</span></div><p>{event.activity} · {pretty(event.result)}{event.weapon?` · ${event.weapon.name}${event.weapon.adept?" (Adept)":""}`:""}</p></div><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-US",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false})}</time></article>)}{!feed.length&&!feedError&&<p className="profile-help">No global activity recorded yet.</p>}</div>
    </section></div>
  </div></main></div>;
}
export default Profile;
