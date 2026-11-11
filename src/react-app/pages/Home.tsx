import { useEffect, useRef, useState } from "react";
import "./Home.css";
import background from "../assets/background.jpg";
import TopBar from "../components/TopBar";
import ActivityLootOverlay, { type ActivityLootPayload, type LevelProgress } from "../components/ActivityLootOverlay";

type User = { id: number; username: string; global_name: string | null; avatar: string | null };
type Profile = {
  profile: { level: number; power: number; zone: string };
  level: { percentage: number; currentXp: number; nextXp: number };
  weapons: { owned: number; masterworked: number; total: number };
};
type Exploration = { player: { destination: string; explore: { elapsedSeconds: number; maxSeconds: number } } };
type NewsItem = { id: number; slug: string; title: string; subtitle?: string; category: string; status: string; published_at: string | null };
function formatDuration(seconds: number) { const s = Math.max(0,Math.floor(seconds)); return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function DailyCountdown() {
  const [remaining,setRemaining] = useState(() => 86400 - Math.floor(Date.now()/1000)%86400);
  useEffect(() => { const update = () => setRemaining(86400 - Math.floor(Date.now()/1000)%86400); update(); const id = window.setInterval(update,1000); return () => window.clearInterval(id); },[]);
  return <span className="dh-rotation-timer" aria-label="Time until next daily rotation">ROTATES IN {formatDuration(remaining)} UTC</span>;
}
function NewsPreview() {
  const [items,setItems] = useState<NewsItem[]>([]);
  useEffect(() => { const controller = new AbortController(); fetch('/api/news/articles',{ credentials:'include',signal:controller.signal }).then(r => r.ok ? r.json() : null).then(data => { if(!controller.signal.aborted) setItems((data?.articles ?? []).filter((item: NewsItem) => item.status === 'published')); }).catch(() => {}); return () => controller.abort(); },[]);
  const latestArticle = items.find(item => item.category !== 'PATCHNOTES');
  const latestPatch = items.find(item => item.category === 'PATCHNOTES');
  return <section className="dh-news-preview dh-section" aria-labelledby="dh-news-title"><div className="dh-section-heading"><div><SectionLabel>TRANSMISSIONS</SectionLabel><h2 id="dh-news-title">LATEST NEWS</h2></div></div><div className="dh-news-grid">{[{item:latestArticle, label:'ARTICLES',path:'/articles'},{item:latestPatch,label:'PATCHNOTES',path:'/patchnotes'}].map(({item,label,path}) => <a key={label} className="dh-news-card" href={item ? `${path}/${encodeURIComponent(item.slug)}` : path}><SectionLabel>{label}</SectionLabel><h3>{item?.title ?? (label === 'ARTICLES' ? 'READ ARTICLES' : 'READ PATCHNOTES')}</h3><p>{item?.subtitle ?? 'See the latest published updates from Discordiny.'}</p><span>READ {label} ↗</span></a>)}</div></section>;
}
type Session = { status: "loading" | "guest" | "authenticated" | "error"; user?: User };

const DESTINATIONS = ["Cosmodrome", "EDZ", "Nessus", "Dreaming City", "Moon", "Europa", "Throne World", "Neomuna", "Pale Heart", "Plaguelands"] as const;
const fishingImage = import.meta.glob("../assets/general/fishbg.png", { eager: true, import: "default", query: "?url" }) as Record<string,string>;
const fishBackground = Object.values(fishingImage)[0];
const destinationImages: Record<string, string> = {
  "cosmodrome": "cosmodrome", "edz": "edz", "plaguelands": "plaguelands",
  "nessus": "nessus", "dreaming city": "dreaming_city", "moon": "moon",
  "europa": "europa", "throne world": "throne_world", "neomuna": "neomuna", "pale heart": "pale_heart",
};
function imageForDestination(name: string) {
  const key = destinationImages[name.trim().toLowerCase()] ?? "cosmodrome";
  return `/destinations/${key}.png`;
}
function ActionLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <a className={`dh-action ${primary ? "dh-action-primary" : ""}`} href={href}>{children}<span aria-hidden="true">↗</span></a>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="dh-eyebrow">{children}</span>;
}
function FeaturedOperation({ interactive = true }: { interactive?: boolean }) {
  const [featured,setFeatured] = useState<{slug:string;title:string;description:string;cover_url:string;theme:string}[]>([]);
  useEffect(()=>{const controller=new AbortController();fetch('/api/event-hub',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!controller.signal.aborted)setFeatured((d?.events??[]).filter((e:{status:string;featured_slot:number})=>e.status==='ACTIVE'&&e.featured_slot>0).sort((a:{featured_slot:number},b:{featured_slot:number})=>a.featured_slot-b.featured_slot).slice(0,2));}).catch(()=>{});return()=>controller.abort();},[]);
  const content = <><div className="dh-operation-header"><SectionLabel>FEATURED EVENTS</SectionLabel></div>{featured.length ? featured.map(e=><div key={e.slug} className="dh-operation-copy" style={e.cover_url ? {backgroundImage:`linear-gradient(90deg,rgba(10,13,19,.94),rgba(10,13,19,.55)),url("${e.cover_url}")`,backgroundSize:'cover',backgroundPosition:'center',padding:'12px'}:undefined}><span className="dh-muted">LIVE EVENT</span><h3>{e.title}</h3><p>{e.description}</p><a href={`/events/${e.slug}`} className="dh-operation-link">OPEN EVENT ↗</a></div>) : <div className="dh-operation-copy"><span className="dh-muted">EVENT NETWORK</span><h3>Upcoming events</h3><p>Check the event hub for scheduled operations.</p></div>}</>;
  return interactive ? <div className="dh-operation">{content}</div> : <div className="dh-operation">{content}</div>;
}
function GuestLanding() {
  return <div className="dh-container dh-guest">
    <section className="dh-hero" aria-labelledby="dh-hero-title"><div className="dh-hero-copy"><SectionLabel>DISCORDINY // THE FRONTIER AWAITS</SectionLabel><h1 id="dh-hero-title">BECOME<br/><em>LEGEND.</em></h1><p>Explore distant destinations. Collect Legendary weapons. Conquer challenging activities. Discover the secrets of Discordiny.</p><div className="dh-actions"><ActionLink href="/api/auth/login" primary>BEGIN YOUR JOURNEY</ActionLink><ActionLink href="/about">EXPLORE THE UNIVERSE</ActionLink></div></div><div className="dh-hero-image" role="img" aria-label="Europa, a frozen destination"/><div className="dh-hero-index">01 / DISCOVER YOUR PATH</div></section>
    <section className="dh-section dh-guest-operations" aria-labelledby="dh-guest-operations-title"><div className="dh-section-heading"><div><SectionLabel>YOUR NEXT ADVENTURE</SectionLabel><h2 id="dh-guest-operations-title">ACTIVITIES & OPERATIONS</h2></div><p>A preview of the experiences waiting for your Guardian.</p></div><div className="dh-guest-operations-grid"><div className="dh-guest-activity-card"><SectionLabel>01 / ACTIVITIES</SectionLabel><h3>ACTIVITIES</h3><p>Vanguard operations, challenging encounters, and rewards to earn.</p><span className="dh-guest-card-bottom">GUARDIAN OPERATIONS</span></div><div className="dh-guest-activity-card dh-guest-daily"><SectionLabel>02 / DAILY ROTATION</SectionLabel><h3>DAILY ACTIVITIES</h3><p>Showdowns, Dungeons and Raids rotate daily. Check back for new challenges.</p><DailyCountdown/></div><FeaturedOperation interactive={false}/></div></section>
    <section className="dh-section dh-experience" aria-labelledby="dh-experience-title"><div className="dh-section-heading"><div><SectionLabel>YOUR LEGEND, YOUR WAY</SectionLabel><h2 id="dh-experience-title">THE EXPERIENCE</h2></div></div><div className="dh-feature-grid"><div className="dh-feature"><span className="dh-feature-icon">◇</span><SectionLabel>01 / PROGRESSION</SectionLabel><h3>GROW YOUR GUARDIAN</h3><p>Earn experience, build Power and track your journey across the system.</p></div><div className="dh-feature"><span className="dh-feature-icon">✦</span><SectionLabel>02 / ARSENAL</SectionLabel><h3>COLLECT YOUR LEGACY</h3><p>Discover Legendary weapons, develop your loadout and build your collection.</p></div><div className="dh-feature"><span className="dh-feature-icon">⌁</span><SectionLabel>03 / EXPLORATION</SectionLabel><h3>EXPLORE THE FRONTIER</h3><p>Travel to destinations and collect offline exploration rewards.</p></div></div></section>
    <NewsPreview/>
    <section className="dh-final-cta"><SectionLabel>THE NEXT CHAPTER IS YOURS</SectionLabel><h2>YOUR LEGEND STARTS HERE.</h2><ActionLink href="/api/auth/login" primary>ENTER DISCORDINY</ActionLink></section>
    <footer className="dh-footer"><span>DISCORDINY // SYSTEM ONLINE</span><span>YOUR LEGEND AWAITS</span></footer>
  </div>;
}

function GuardianDashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exploration, setExploration] = useState<Exploration | null>(null);
  const [explorationError, setExplorationError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const travelRef = useRef<HTMLDivElement>(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [lootDrop, setLootDrop] = useState<{ id: number; loot: ActivityLootPayload; before: LevelProgress | null } | null>(null);
  const lootDropCounter = useRef(0);
  const [terminalUnlocked, setTerminalUnlocked] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setElapsedTick(t => t + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/terminal/status", { credentials: "include", signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!controller.signal.aborted) setTerminalUnlocked(data?.terminalUnlocked === true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  async function loadExploration(signal?: AbortSignal) {
    const response = await fetch("/api/game/activities", { credentials: "include", signal });
    if (!response.ok) throw new Error("Exploration status unavailable");
    const data = await response.json() as Exploration;
    if (!data.player?.explore) throw new Error("Exploration status unavailable");
    if (!signal?.aborted) { setExploration(data); setElapsedTick(0); setExplorationError(""); }
  }
  useEffect(() => {
    const controller = new AbortController();
    loadExploration(controller.signal).catch(() => { if (!controller.signal.aborted) setExplorationError("Exploration status unavailable. Open Activities to check your rewards."); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (travelRef.current && !travelRef.current.contains(event.target as Node)) setTravelOpen(false);
    }
    function onEscape(event: KeyboardEvent) { if (event.key === "Escape") setTravelOpen(false); }
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEscape);
    return () => { document.removeEventListener("mousedown", onOutsideClick); document.removeEventListener("keydown", onEscape); };
  }, []);
  async function travel(destination: string) {
    if (!exploration || traveling || destination === exploration.player.destination) { setTravelOpen(false); return; }
    setTraveling(true); setTravelOpen(false); setExplorationError("");
    try {
      const response = await fetch("/api/game/travel", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to travel.");
      await Promise.all([
        loadExploration(),
        fetch("/api/game/profile", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(data => { if (data) setProfile(data); }),
      ]);
    } catch (error) {
      setExplorationError(error instanceof Error ? error.message : "Failed to travel.");
    } finally { setTraveling(false); }
  }
  async function claimExploration() {
    if (!exploration || claiming || elapsed < 25) return;
    setClaiming(true); setClaimMessage("");
    let before: LevelProgress | null = null;
    try {
      const profileResponse = await fetch("/api/game/profile", { credentials: "include" });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        before = profileData?.level ?? null;
      }
    } catch { /* Loot notification still displays if profile lookup fails. */ }
    try {
      const response = await fetch("/api/game/explore/claim", { method: "POST", credentials: "include" });
      const result = await response.json() as { success?: boolean; error?: string; destination?: string; elapsedSeconds?: number; xp?: number; weapon?: { dropped?: boolean; name?: string | null }; weapons?: Array<{name:string;rarity:string|null;adept:boolean}>; rewards?: Record<string, number> };
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to claim exploration rewards");
      const weapons = result.weapons ?? (result.weapon?.dropped && result.weapon.name
        ? [{ name: result.weapon.name, rarity: null, adept: /\(Adept\)$/i.test(result.weapon.name) }]
        : []);
      setLootDrop({
        id: ++lootDropCounter.current,
        before,
        loot: {
          weapons: weapons.map((weapon: { name: string; rarity: string | null; adept: boolean }) => ({
            dropped: true,
            name: weapon.name,
            rarity: weapon.rarity,
            adept: weapon.adept,
          })),
          materials: result.rewards ?? {},
          xp: result.xp ?? 0,
        },
      });
      await Promise.all([loadExploration(), fetch("/api/game/profile", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(data => { if (data) setProfile(data); })]);
    } catch (error) { setClaimMessage(error instanceof Error ? error.message : "Claim failed"); }
    finally { setClaiming(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    setProfileError(false);
    fetch("/api/game/profile", { credentials: "include", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Profile unavailable"); return response.json() as Promise<Profile>; })
      .then(data => { if (!controller.signal.aborted) setProfile(data); })
      .catch(() => { if (!controller.signal.aborted) setProfileError(true); });
    return () => controller.abort();
  }, [retry]);
  const displayName = user.global_name || user.username;
  const zone = exploration?.player.destination || profile?.profile.zone || "Cosmodrome";
  const elapsed = Math.min(exploration?.player.explore.maxSeconds ?? 86400, (exploration?.player.explore.elapsedSeconds ?? 0) + elapsedTick);
  const maxSeconds = exploration?.player.explore.maxSeconds || 86400;
  const explorePercentage = Math.min(100, Math.max(0, elapsed / maxSeconds * 100));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = Math.floor(elapsed % 60);
  const explorationTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return <div className="dh-container dh-dashboard">
    <section className="dh-dashboard-heading"><div><SectionLabel>DISCORDINY // GUARDIAN COMMAND CENTER</SectionLabel><h1>WELCOME BACK, <span>{displayName}</span></h1><p>Your journey continues. Choose your next move.</p></div><a className="dh-profile-link" href="/profile">VIEW GUARDIAN ↗</a></section>
    {profileError ? <div className="dh-error" role="alert">Guardian data couldn't be loaded. <button type="button" onClick={() => setRetry(value => value + 1)}>RETRY</button></div> : null}
    <div className="dh-stats" aria-label="Guardian statistics"><div className="dh-stat"><SectionLabel>GUARDIAN POWER</SectionLabel><strong>{profile ? profile.profile.power.toLocaleString() : "—"}</strong><span>COMBINED POWER</span></div><div className="dh-stat"><SectionLabel>GUARDIAN LEVEL</SectionLabel><strong>{profile?.profile.level ?? "—"}</strong><span className="dh-xp-count">{profile ? `${profile.level.currentXp.toLocaleString()} / ${profile.level.nextXp.toLocaleString()} XP` : "LOADING XP"}</span><div className="dh-level-track"><div style={{ width: `${Math.min(100, Math.max(0, profile?.level.percentage ?? 0))}%` }} /></div></div><div className="dh-stat"><SectionLabel>WEAPONS COLLECTED</SectionLabel><strong>{profile?.weapons.owned ?? "—"}</strong><span>{profile ? `${profile.weapons.masterworked} MASTERWORKED` : "LOADING ARSENAL"}</span></div></div>
    <div className="dh-dashboard-grid"><div className="dh-dashboard-main"><section className="dh-current-destination exploration-rewards" style={{ backgroundImage: `linear-gradient(100deg,rgba(8,11,17,.57),rgba(8,11,17,.14)),url('${imageForDestination(zone)}')` }}>
      <div className="dh-exploration-content">
        <SectionLabel>EXPLORATION REWARDS // CURRENT DESTINATION</SectionLabel>
        <div className="dh-destination-title-row"><h2>{profile ? zone : "CONNECTING..."}</h2>
          <div className="activity-travel dh-travel" ref={travelRef}>
            <button type="button" className="activity-travel-button" disabled={!exploration || traveling} aria-expanded={travelOpen} aria-haspopup="true" onClick={() => setTravelOpen(open => !open)}>
              {traveling ? "TRAVELING..." : "TRAVEL"}{!traveling && <span className={`activity-travel-arrow ${travelOpen ? "open" : ""}`}>▼</span>}
            </button>
            {travelOpen && <div className="activity-travel-menu">{DESTINATIONS.map(destination => <button key={destination} type="button" className={["activity-travel-option",destination === zone ? "active" : "",destination === "Plaguelands" ? "plaguelands" : ""].filter(Boolean).join(" ")} onClick={() => void travel(destination)}><span>{destination}</span>{destination === zone && <small>CURRENT</small>}</button>)}</div>}
          </div></div>
        <p>Rewards accumulate while exploring your current destination, up to 24 hours.</p>
        <div className="dh-exploration-time"><strong>{exploration ? explorationTime : "--:--:--"}</strong><span> / 24h</span></div>
        <div className="exploration-progress"><div className="exploration-progress-fill" style={{ width: `${explorePercentage}%` }}><span /></div></div>
        <div className="dh-exploration-footer"><span>{exploration ? (explorePercentage >= 100 ? "MAXIMUM REWARDS READY" : "EXPLORING") : "LOADING EXPLORATION"} · {Math.floor(explorePercentage)}%</span>
          <button type="button" className="exploration-claim-button" disabled={!exploration || claiming || elapsed < 25} onClick={() => void claimExploration()}>{claiming ? "CLAIMING..." : "CLAIM"}</button>
        </div>
        {explorationError && <p className="dh-exploration-message" role="alert">{explorationError}</p>}
        {claimMessage && <p className="dh-exploration-message" role="status">{claimMessage}</p>}
        <button className="dh-offline-activities" type="button" disabled title="Coming soon">CLAIM OFFLINE ACTIVITIES · COMING SOON</button>
      </div>
    </section><div className="dh-quick-section"><div className="dh-section-heading"><div><SectionLabel>GUARDIAN NETWORK</SectionLabel><h2>QUICK ACCESS</h2></div></div><div className="dh-quick-grid"><a href="/activities"><span>⚔</span><strong>ACTIVITIES</strong><small>ENTER AN OPERATION</small></a><a href="/vault"><span>◇</span><strong>THE VAULT</strong><small>MANAGE YOUR WEAPONS</small></a><a href="/armory"><span>✦</span><strong>ARMORY</strong><small>VIEW THE ARSENAL</small></a><button type="button" className="dh-fishing fishing-activity-card" style={{backgroundImage: `linear-gradient(180deg,rgba(4,8,14,.18),rgba(4,8,14,.48) 58%,rgba(4,8,14,.9)),url("${fishBackground ?? ""}")`}} aria-label="Fishing — coming soon" title="Fishing is coming soon"><span className="fishing-bubbles" aria-hidden="true">{Array.from({length:14},(_,index)=><i key={index}/>)}</span><span className="fishing-activity-card-content"><span className="fishing-activity-eyebrow">PLAY CATCH</span><strong>FISHING</strong><small>COMING SOON</small></span><span className="fishing-activity-status">SOON</span></button></div></div></div><aside className="dh-dashboard-side"><FeaturedOperation /><div className="dh-side-panel"><SectionLabel>NETWORK UPDATES</SectionLabel><h3>STAY INFORMED</h3><p>Discover the latest updates, changes and stories from Discordiny.</p><a href="/patchnotes" className="dh-text-link">PATCH NOTES ↗</a><a href="/articles" className="dh-text-link">LATEST ARTICLES ↗</a></div>{terminalUnlocked && <div className="dh-side-panel dh-side-terminal"><SectionLabel>UNKNOWN SIGNAL</SectionLabel><p className="dh-terminal-lines">&gt; CONNECTION AVAILABLE<br />&gt; AWAITING INPUT _</p><a href="https://terminal.discordiny.com" className="dh-text-link">OPEN TERMINAL ↗</a></div>}</aside></div>
    {lootDrop && (
      <ActivityLootOverlay
        key={lootDrop.id}
        loot={lootDrop.loot}
        before={lootDrop.before}
        onDone={() => setLootDrop(current => current?.id === lootDrop.id ? null : current)}
      />
    )}
    <footer className="dh-footer"><span>DISCORDINY // GUARDIAN ONLINE</span><div><a href="/about">ABOUT</a><a href="/patchnotes">PATCH NOTES</a><a href="/events">EVENTS</a></div></footer>
  </div>;
}
export default function Home() {
  const [session, setSession] = useState<Session>({ status: "loading" });
  const sivaAnimationDisabled = (() => { try { return window.localStorage.getItem("discordiny:siva-animation") === "off"; } catch { return false; } })();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { credentials: "include", signal: controller.signal })
      .then(async response => {
        if (response.status === 401) { setSession({ status: "guest" }); return; }
        if (!response.ok) throw new Error("Authentication unavailable");
        const data = await response.json() as { authenticated?: boolean; user?: User };
        if (!controller.signal.aborted) setSession(data.authenticated && data.user ? { status: "authenticated", user: data.user } : { status: "guest" });
      })
      .catch(() => { if (!controller.signal.aborted) setSession({ status: "error" }); });
    return () => controller.abort();
  }, []);
  return <main className={`home-page dh-page ${sivaAnimationDisabled ? "home-siva-animation-off" : ""}`} style={{ backgroundImage: `linear-gradient(180deg,rgba(5,8,13,.24),rgba(5,8,13,.34)),url(${background})` }}><TopBar />
    {session.status === "loading" ? <div className="dh-loading" role="status">ESTABLISHING CONNECTION<span className="dh-cursor">_</span></div> : null}
    {session.status === "error" ? <div className="dh-loading" role="alert">NETWORK CONNECTION UNAVAILABLE <button type="button" onClick={() => window.location.reload()}>RETRY</button></div> : null}
    {session.status === "guest" ? <GuestLanding /> : null}
    {session.status === "authenticated" && session.user ? <GuardianDashboard user={session.user} /> : null}
  </main>;
}
