import { useEffect, useState } from "react";
import "./Home.css";
import background from "../assets/background.jpg";
import TopBar from "../components/TopBar";

type User = { id: number; username: string; global_name: string | null; avatar: string | null };
type Profile = {
  profile: { level: number; power: number; zone: string };
  level: { percentage: number; currentXp: number; nextXp: number };
  weapons: { owned: number; masterworked: number; total: number };
};
type Exploration = { player: { destination: string; explore: { elapsedSeconds: number; maxSeconds: number } } };
type ClaimSummary = { destination: string; elapsedSeconds: number; xp: number; rewards: Record<string, number>; weapons: Array<{ name: string; rarity: string | null; adept: boolean }> };
type NewsItem = { id: number; slug: string; title: string; subtitle?: string; category: string; status: string; published_at: string | null };
const rewardImages = import.meta.glob('../assets/icons/{currencies,upgrade-materials,destination-materials}/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string,string>;
const weaponImages = import.meta.glob('../assets/weapons/**/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string,string>;
function normalizeAssetName(value: string) { return value.toLowerCase().replace(/\(adept\)/gi, '').replace(/[^a-z0-9]/g, ''); }
function findAsset(images: Record<string,string>, name: string) { const normalized = normalizeAssetName(name); return Object.entries(images).find(([path]) => normalizeAssetName(path.split('/').pop()?.replace(/\.png$/i,'') ?? '') === normalized)?.[1]; }
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

const destinations = [
  { name: "Cosmodrome", image: "cosmodrome" },
  { name: "Europa", image: "europa" },
  { name: "Dreaming City", image: "dreaming_city" },
  { name: "Plaguelands", image: "plaguelands" },
];
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
  const contents = <>
    <div className="dh-operation-header"><SectionLabel>COMMUNITY OPERATIONS</SectionLabel><span className="dh-red-dot" aria-hidden="true" /></div>
    <div className="dh-operation-copy"><span className="dh-muted">PLAGUELANDS // SIVA</span><h3>Operation: CLEANSE</h3><p>Enter the Plaguelands and discover the ongoing community operation.</p></div>
    <span className="dh-operation-link">OPERATION: CLEANSE <span aria-hidden="true">✦</span></span>
  </>;
  return interactive ? <a className="dh-operation" href="/events">{contents}</a> : <div className="dh-operation" aria-label="Operation CLEANSE preview">{contents}</div>;
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
function ClaimRewardsModal({ summary, onClose }: { summary: ClaimSummary; onClose: () => void }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if(event.key === 'Escape') onClose(); }; window.addEventListener('keydown',onKey); return () => window.removeEventListener('keydown',onKey); },[onClose]);
  return <div className="dh-rewards-backdrop" onMouseDown={event => { if(event.target === event.currentTarget) onClose(); }}><section className="dh-rewards-modal" role="dialog" aria-modal="true" aria-labelledby="dh-rewards-title" style={{backgroundImage:`linear-gradient(140deg,rgba(12,17,25,.88),rgba(7,10,16,.96)),url('${imageForDestination(summary.destination)}')`}}><button type="button" className="dh-rewards-x" onClick={onClose} aria-label="Close rewards">×</button><SectionLabel>EXPLORATION COMPLETE</SectionLabel><h2 id="dh-rewards-title">{summary.destination}</h2><p>Explored for {formatDuration(summary.elapsedSeconds)}</p><div className="dh-rewards-xp"><span>XP EARNED</span><strong>+{summary.xp.toLocaleString()}</strong></div><h3>MATERIALS</h3><div className="dh-rewards-list">{Object.entries(summary.rewards).filter(([,n])=>n>0).length ? Object.entries(summary.rewards).filter(([,n])=>n>0).map(([name,count]) => <div className="dh-reward-row" key={name}><span>{findAsset(rewardImages,name) && <img src={findAsset(rewardImages,name)} alt=""/>}{name}</span><strong>+{count.toLocaleString()}</strong></div>) : <p>No materials earned this time.</p>}</div><h3>DESTINATION WEAPONS</h3><div className="dh-rewards-list">{summary.weapons.length ? summary.weapons.map((weapon,index) => <div className="dh-reward-row" key={`${weapon.name}-${index}`}><span>{findAsset(weaponImages,weapon.name) && <img src={findAsset(weaponImages,weapon.name)} alt=""/>}{weapon.name}{weapon.adept && !/\(adept\)/i.test(weapon.name) ? ' (Adept)' : ''}</span><strong>ACQUIRED</strong></div>) : <p>No weapon found this time.</p>}</div><button type="button" className="dh-rewards-continue" onClick={onClose}>CONTINUE</button></section></div>;
}
function GuardianDashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exploration, setExploration] = useState<Exploration | null>(null);
  const [explorationError, setExplorationError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimSummary,setClaimSummary] = useState<ClaimSummary | null>(null);
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
  async function claimExploration() {
    if (!exploration || claiming || elapsed < 25) return;
    setClaiming(true); setClaimMessage("");
    try {
      const response = await fetch("/api/game/explore/claim", { method: "POST", credentials: "include" });
      const result = await response.json() as { success?: boolean; error?: string; destination?: string; elapsedSeconds?: number; xp?: number; weapon?: { dropped?: boolean; name?: string | null }; weapons?: Array<{name:string;rarity:string|null;adept:boolean}>; rewards?: Record<string, number> };
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to claim exploration rewards");
      setClaimSummary({ destination: result.destination ?? exploration.player.destination, elapsedSeconds: result.elapsedSeconds ?? elapsed, xp: result.xp ?? 0, rewards: result.rewards ?? {}, weapons: result.weapons ?? (result.weapon?.dropped && result.weapon.name ? [{name:result.weapon.name,rarity:null,adept:/\(Adept\)$/i.test(result.weapon.name)}] : []) });
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
        <h2>{profile ? zone : "CONNECTING..."}</h2>
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
    </section><div className="dh-quick-section"><div className="dh-section-heading"><div><SectionLabel>GUARDIAN NETWORK</SectionLabel><h2>QUICK ACCESS</h2></div></div><div className="dh-quick-grid"><a href="/activities"><span>⚔</span><strong>ACTIVITIES</strong><small>ENTER AN OPERATION</small></a><a href="/vault"><span>◇</span><strong>THE VAULT</strong><small>MANAGE YOUR WEAPONS</small></a><a href="/armory"><span>✦</span><strong>ARMORY</strong><small>VIEW THE ARSENAL</small></a><a href="/profile"><span>⌖</span><strong>DESTINATIONS</strong><small>TRAVEL THE SYSTEM</small></a><button type="button" className="dh-fishing" disabled title="Fishing is coming soon"><span>♒</span><strong>FISHING</strong><small>COMING SOON</small></button></div></div></div><aside className="dh-dashboard-side"><FeaturedOperation /><div className="dh-side-panel"><SectionLabel>NETWORK UPDATES</SectionLabel><h3>STAY INFORMED</h3><p>Discover the latest updates, changes and stories from Discordiny.</p><a href="/patchnotes" className="dh-text-link">PATCH NOTES ↗</a><a href="/articles" className="dh-text-link">LATEST ARTICLES ↗</a></div>{terminalUnlocked && <div className="dh-side-panel dh-side-terminal"><SectionLabel>UNKNOWN SIGNAL</SectionLabel><p className="dh-terminal-lines">&gt; CONNECTION AVAILABLE<br />&gt; AWAITING INPUT _</p><a href="https://terminal.discordiny.com" className="dh-text-link">OPEN TERMINAL ↗</a></div>}</aside></div>
    {claimSummary && <ClaimRewardsModal summary={claimSummary} onClose={() => setClaimSummary(null)}/>}
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
