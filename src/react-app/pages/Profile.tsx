import { fetchProfileSnapshot, invalidateProfileSnapshot } from "../lib/profileRequest";
import { fetchGlobalActivityFeed } from "../lib/globalFeedRequest";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  weapons: { owned:number; total:number; masterworked?:number };
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
const weaponImages = import.meta.glob("../assets/icons/weapons/**/*.png", { eager: true, query: "?url", import: "default" }) as Record<string,string>;
const getWeaponImage = (name: string) => {
  const canonical = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const exact = canonical(name);
  const normal = canonical(name.replace(/\s*\(Adept\)\s*$/i, ""));
  const find = (target: string) => Object.entries(weaponImages).find(([path]) =>
    canonical(path.split("/").pop()?.replace(/\.png$/i, "") || "") === target)?.[1];
  return find(exact) ?? (exact !== normal ? find(normal) : undefined);
};
function formatFeedTime(createdAt:string, now:number):string {
  const parsed=Date.parse(createdAt.includes("T")?createdAt:`${createdAt.replace(" ","T")}Z`);
  if(!Number.isFinite(parsed))return "";
  const seconds=Math.max(0,Math.floor((now-parsed)/1000));
  if(seconds<60)return "JUST NOW";
  const minutes=Math.floor(seconds/60);if(minutes<60)return `${minutes}M AGO`;
  const hours=Math.floor(minutes/60);if(hours<24)return `${hours}H AGO`;
  const days=Math.floor(hours/24);if(days<7)return `${days}D AGO`;
  return new Date(parsed).toLocaleDateString(undefined,{month:"short",day:"numeric"}).toUpperCase();
}
const fmt=(value:number)=>Number(value||0).toLocaleString();
const pretty=(s:string)=>s.replace(/[_-]/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const destinationImage=(name:string)=>`/destinations/${DESTINATIONS.find(d=>d[0].toLowerCase()===name.toLowerCase())?.[1]||"cosmodrome"}.png`;
function Profile(){
  const [data,setData]=useState<ProfileResponse|null>(null);
  const [feed,setFeed]=useState<FeedEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [traveling,setTraveling]=useState(false);
  const [travelOpen,setTravelOpen]=useState(false);
  const [titleOpen,setTitleOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [sivaEnabled,setSivaEnabled]=useState(()=>{try{return window.localStorage.getItem("discordiny:siva-animation")!=="off";}catch{return true;}});
  const [feedError,setFeedError]=useState(false);
  const [feedLoading,setFeedLoading]=useState(true);
  const [feedClock,setFeedClock]=useState(Date.now());
  const [isMobileFeed,setIsMobileFeed]=useState(()=>typeof window!=="undefined"&&window.matchMedia("(max-width: 650px)").matches);
  const feedRefreshingRef=useRef(false);
  const profileMainRef=useRef<HTMLDivElement|null>(null);
  const globalFeedRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    let active=true;
    async function load(){
      try {
        const result=await fetchProfileSnapshot<ProfileResponse>(0);
        if(!result.authenticated)throw new Error("Please sign in to view your profile.");
        if(active){setData(result);}
      }catch(e){if(active)setError(e instanceof Error?e.message:"Could not load profile");}
      finally{if(active)setLoading(false);}
    }
    void load();
    return ()=>{active=false;};
  },[]);
  const loadGlobalActivityFeed=useCallback(async()=>{
    if(feedRefreshingRef.current)return;
    feedRefreshingRef.current=true;
    try{
      const response=await fetchGlobalActivityFeed();
      const result=await response.json() as {authenticated?:boolean;events?:FeedEvent[]};
      if(!response.ok||!result.authenticated)throw new Error("Unable to load feed");
      setFeed(Array.isArray(result.events)?result.events:[]);setFeedError(false);
    }catch{setFeedError(true);}
    finally{feedRefreshingRef.current=false;setFeedLoading(false);}
  },[]);
  useEffect(()=>{
    if(!data)return;
    void loadGlobalActivityFeed();
    const refresh=window.setInterval(()=>{if(document.visibilityState==="visible")void loadGlobalActivityFeed();},60000);
    const onVisible=()=>{if(document.visibilityState==="visible")void loadGlobalActivityFeed();};
    document.addEventListener("visibilitychange",onVisible);
    const clock=window.setInterval(()=>setFeedClock(Date.now()),30000);
    return ()=>{document.removeEventListener("visibilitychange",onVisible);window.clearInterval(refresh);window.clearInterval(clock);};
  },[data?.user.id,loadGlobalActivityFeed]);
  useEffect(()=>{
    const media=window.matchMedia("(max-width: 650px)");
    const update=()=>setIsMobileFeed(media.matches);
    update();media.addEventListener("change",update);
    return ()=>media.removeEventListener("change",update);
  },[]);
  useEffect(()=>{
    if(!data)return;
    const main=profileMainRef.current,rail=globalFeedRef.current;
    if(!main||!rail)return;
    const sync=()=>rail.style.setProperty("--global-feed-max-height",`${Math.max(0,Math.floor(main.getBoundingClientRect().height))}px`);
    sync();
    const observer=new ResizeObserver(sync);observer.observe(main);
    window.addEventListener("resize",sync);
    return ()=>{observer.disconnect();window.removeEventListener("resize",sync);};
  },[data,travelOpen]);
  const currencies=useMemo(()=>Object.entries(data?.currencies||{}).sort(([a],[b])=>a.localeCompare(b)),[data]);
  const materials=useMemo(()=>Object.entries(data?.upgradeMaterials||{}).sort(([a],[b])=>a.localeCompare(b)),[data]);
  async function travel(destination:string){
    if(!data||destination===data.profile.zone||traveling)return;
    setTraveling(true);setError("");
    try{
      const response=await fetch("/api/game/travel",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({destination})});
      const result=await response.json() as {success?:boolean;zone?:string;error?:string};
      if(!response.ok||!result.success)throw new Error(result.error||"Travel failed");
      invalidateProfileSnapshot();
      setData(previous=>previous?{...previous,profile:{...previous.profile,zone:result.zone||destination}}:previous);
      setTravelOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Travel failed");}
    finally{setTraveling(false);}
  }
  if(loading)return <><TopBar/><main className="profile-page profile-page-static"><div className="profile-loading">Loading Guardian profile…</div></main></>;
  if(!data)return <><TopBar/><main className="profile-page profile-page-static"><div className="profile-error">{error||"Profile unavailable"}</div></main></>;
  const name=data.user.global_name||data.user.username;
  const avatar=data.user.avatar?`https://cdn.discordapp.com/avatars/${data.user.discord_id}/${data.user.avatar}.png?size=128`:null;
  const capped=data.level.current>=250;
  function changeSivaEnabled(enabled:boolean){setSivaEnabled(enabled);try{window.localStorage.setItem("discordiny:siva-animation",enabled?"on":"off");}catch{/* Storage may be unavailable. */}}
  return <div className="profile-screen"><TopBar/><main className="profile-page profile-page-static"><div className="profile-container profile-redesign">
    <div className="profile-main-and-feed"><div className="profile-main-stack" ref={profileMainRef}>
    <header className="guardian-hero">
      <div className="guardian-identity">{avatar?<img className="profile-avatar" src={avatar} alt=""/>:<div className="profile-avatar profile-avatar-placeholder">{name.slice(0,1)}</div>}
        <div><div className="profile-eyebrow">GUARDIAN DOSSIER</div><h1>{name}</h1><div className="profile-title">NO TITLE EQUIPPED</div><div className="guardian-subtitle">LEVEL {fmt(data.level.current)}</div><div className="profile-collection-stats"><span>{fmt(data.weapons.owned)} / {fmt(data.weapons.total)} Unlocked</span><span>{data.weapons.masterworked===undefined?"—":fmt(data.weapons.masterworked)} / {fmt(data.weapons.total)} Masterworked</span></div><div className="profile-hero-actions"><button type="button" onClick={()=>setTitleOpen(true)}>Change Title</button><button type="button" onClick={()=>setSettingsOpen(true)}>⚙ Settings</button></div></div></div>
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
      {travelOpen&&<div className="travel-director-menu"><div className="travel-destination-grid">{DESTINATIONS.map(([name,image])=><button key={name} type="button" className={`travel-destination-tile ${name==="Plaguelands"?"travel-destination-tile-siva":""} ${data.profile.zone===name?"travel-destination-tile-selected":""}`} onClick={()=>void travel(name)} disabled={traveling||data.profile.zone===name} aria-pressed={data.profile.zone===name}>
        <span className="travel-tile-image" style={{backgroundImage:`linear-gradient(0deg,rgba(4,9,18,.9),rgba(4,9,18,.04)),url("/destinations/${image}.png")`}}/><span className="travel-tile-label">{name}</span>{data.profile.zone===name&&<span className="travel-tile-current">CURRENT</span>}
      </button>)}</div>
      <div className="travel-director-footer"><span>{traveling?"Traveling…":"Select a destination to travel immediately."}</span></div></div>}
    </section>
    <section className="profile-block"><div className="profile-block-header"><div><div className="profile-eyebrow">WALLET</div><h2>All Currencies</h2></div><span className="profile-chip">{currencies.length} TYPES</span></div>
      {currencies.length?<div className="currency-grid">{currencies.map(([name,amount])=><div className="currency-card" key={name}><div className="currency-card-label">{CURRENCY_ICONS[name]?<img className="currency-icon" src={CURRENCY_ICONS[name]} alt=""/>:<span className="currency-fallback">◆</span>}<span className="currency-name">{name}</span></div><strong>{fmt(amount)}</strong></div>)}</div>:<p className="profile-help">No currency balances recorded.</p>}
    </section>
    <div className="profile-duo"><section className="profile-block"><div className="profile-block-header"><div><div className="profile-eyebrow">RESOURCES</div><h2>Upgrade Materials</h2></div><span className="profile-chip">{materials.length} TYPES</span></div>
      {materials.length?<div className="currency-grid">{materials.map(([name,amount])=><div className="currency-card" key={name}><span className="currency-card-label">{getUpgradeMaterialIcon(name) && <img className="currency-icon" src={getUpgradeMaterialIcon(name)} alt="" loading="lazy" />}<span className="currency-name">{pretty(name)}</span></span><strong>{fmt(amount)}</strong></div>)}</div>:<p className="profile-help">No upgrade materials recorded.</p>}
    </section>
    <section className="profile-block"><div className="profile-block-header"><div><div className="profile-eyebrow">COLLECTIONS</div><h2>Fishing Catalogue</h2></div><span className="profile-chip">COMING SOON</span></div>
      <div className="profile-coming-soon"><strong>Coming Soon</strong><p>Fishing Catalogue is not available yet.</p></div>
    </section></div></div>
    <aside ref={globalFeedRef} className="global-activity-feed profile-live-feed" aria-label="Global weapon drops">
      <div className="global-activity-feed-inner">
        <div className="global-activity-feed-heading"><span>LIVE DROPS</span><h2>Global Weapon Drops</h2></div>
        {feedError&&<p className="profile-help">Feed temporarily unavailable. Retrying automatically.</p>}
        {(isMobileFeed?feed.slice(0,5):feed).length>0?(
          <div className="global-activity-feed-events">
            {(isMobileFeed?feed.slice(0,5):feed).map(event=><article className={`global-activity-event${event.weapon?.adept ? " global-activity-event-adept" : ""}`} key={event.id}>
              <div className="global-activity-event-top">
                <div className="global-activity-event-player-row">
                  {event.avatarUrl&&<img className="global-activity-event-avatar" src={event.avatarUrl} alt="" aria-hidden="true"/>}
                  <strong className="global-activity-event-player">{event.player}</strong>
                </div>
                <span className="global-activity-event-time">{formatFeedTime(event.createdAt,feedClock)}</span>
              </div>
              <span className="global-activity-event-activity">{event.activity}</span>
              <span className={`global-activity-event-result ${event.result.toLowerCase()}`}>{event.result}</span>
              {event.weapon&&<div className={`global-activity-event-weapon${event.weapon.adept ? " global-activity-event-weapon-adept" : ""}`}>
                {getWeaponImage(event.weapon.name)&&<img className="global-activity-event-weapon-icon" src={getWeaponImage(event.weapon.name)} alt="" aria-hidden="true"/>}
                <div><span>WEAPON DROP</span><strong>{event.weapon.name}{event.weapon.adept&&!event.weapon.name.toLowerCase().includes("(adept)")?" (Adept)":""}</strong></div>
              </div>}
            </article>)}
          </div>
        ):<div className="global-activity-feed-empty"><span className="global-activity-feed-pulse" aria-hidden="true"/><strong>{feedLoading?"CONNECTING TO FEED":"WAITING FOR WEAPON DROPS"}</strong><p>Weapon drops earned today by players appear here.</p></div>}
      </div>
    </aside></div>
    {titleOpen&&<div className="profile-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setTitleOpen(false);}}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title-dialog"><div className="profile-modal-heading"><h2 id="profile-title-dialog">Change Title</h2><button type="button" aria-label="Close" onClick={()=>setTitleOpen(false)}>×</button></div><p>No titles are available yet.</p><div className="profile-coming-soon"><strong>Coming Soon</strong><p>Titles will appear here once they are added to Discordiny.</p></div></section></div>}
    {settingsOpen&&<div className="profile-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false);}}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-settings-dialog"><div className="profile-modal-heading"><h2 id="profile-settings-dialog">Settings</h2><button type="button" aria-label="Close" onClick={()=>setSettingsOpen(false)}>×</button></div><label className="profile-setting-row"><span><strong>Homepage SIVA animation</strong><small>Show the animated SIVA effects on the homepage.</small></span><input type="checkbox" checked={sivaEnabled} onChange={e=>changeSivaEnabled(e.target.checked)}/></label><p className="profile-help">Your preference is saved on this device.</p></section></div>}
  </div></main></div>;
}
export default Profile;
