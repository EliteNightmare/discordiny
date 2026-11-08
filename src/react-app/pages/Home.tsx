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
function FeaturedOperation() {
  return <a className="dh-operation" href="/events">
    <div className="dh-operation-header"><SectionLabel>COMMUNITY OPERATIONS</SectionLabel><span className="dh-red-dot" aria-hidden="true" /></div>
    <div className="dh-operation-copy"><span className="dh-muted">PLAGUELANDS // SIVA</span><h3>Operation: CLEANSE</h3><p>Enter the Plaguelands and discover the ongoing community operation.</p></div>
    <span className="dh-operation-link">VIEW OPERATIONS <span aria-hidden="true">↗</span></span>
  </a>;
}
function GuestLanding() {
  return <div className="dh-container dh-guest">
    <section className="dh-hero" aria-labelledby="dh-hero-title">
      <div className="dh-hero-copy"><SectionLabel>DISCORDINY // THE FRONTIER AWAITS</SectionLabel>
        <h1 id="dh-hero-title">BECOME<br /><em>LEGEND.</em></h1>
        <p>Explore distant destinations. Collect Legendary weapons. Conquer challenging activities. Discover the secrets of Discordiny.</p>
        <div className="dh-actions"><ActionLink href="/profile" primary>BEGIN YOUR JOURNEY</ActionLink><ActionLink href="#discover">EXPLORE THE UNIVERSE</ActionLink></div>
      </div>
      <div className="dh-hero-image" role="img" aria-label="Europa, a frozen destination in the Discordiny universe" />
      <div className="dh-hero-index">01 / DISCOVER YOUR PATH</div>
    </section>
    <section id="discover" className="dh-section" aria-labelledby="dh-discover-title">
      <div className="dh-section-heading"><div><SectionLabel>YOUR JOURNEY BEGINS HERE</SectionLabel><h2 id="dh-discover-title">A UNIVERSE TO EXPLORE</h2></div><p>Choose your destination. Shape your arsenal. Find your next challenge.</p></div>
      <div className="dh-destination-grid">{destinations.map((destination, index) => <a href="/profile" className="dh-destination" key={destination.name} style={{ backgroundImage: `linear-gradient(180deg,transparent 28%,rgba(4,8,14,.94)),url('${imageForDestination(destination.name)}')` }}><span className="dh-destination-number">0{index + 1} / DESTINATION</span><strong>{destination.name}</strong><span className="dh-destination-cta">EXPLORE ↗</span></a>)}</div>
    </section>
    <section className="dh-section dh-experience" aria-labelledby="dh-experience-title"><div className="dh-section-heading"><div><SectionLabel>YOUR LEGEND, YOUR WAY</SectionLabel><h2 id="dh-experience-title">THE EXPERIENCE</h2></div></div><div className="dh-feature-grid">
      <a href="/profile" className="dh-feature"><span className="dh-feature-icon">◇</span><span className="dh-muted">01 / PROGRESSION</span><h3>GROW YOUR GUARDIAN</h3><p>Earn experience, build Power and track your journey across the system.</p><span className="dh-feature-arrow">↗</span></a>
      <a href="/armory" className="dh-feature"><span className="dh-feature-icon">✦</span><span className="dh-muted">02 / ARSENAL</span><h3>COLLECT YOUR LEGACY</h3><p>Discover Legendary weapons, develop your loadout and build your collection.</p><span className="dh-feature-arrow">↗</span></a>
      <a href="/activities" className="dh-feature"><span className="dh-feature-icon">⌁</span><span className="dh-muted">03 / OPERATIONS</span><h3>FACE THE UNKNOWN</h3><p>Take on activities, dangerous encounters and greater challenges.</p><span className="dh-feature-arrow">↗</span></a>
    </div></section>
    <section className="dh-bottom-grid"><FeaturedOperation /><div className="dh-transmission"><SectionLabel>YOUR NEXT OPERATION</SectionLabel><h3>THE FRONTIER AWAITS</h3><p>There is always another destination to discover and another challenge to face.</p><a href="/activities" className="dh-text-link">EXPLORE ACTIVITIES ↗</a></div></section>
    <section className="dh-final-cta"><SectionLabel>THE NEXT CHAPTER IS YOURS</SectionLabel><h2>YOUR LEGEND STARTS HERE.</h2><ActionLink href="/profile" primary>ENTER DISCORDINY</ActionLink></section>
    <footer className="dh-footer"><span>DISCORDINY // SYSTEM ONLINE</span><div><a href="/about">ABOUT</a><a href="/patchnotes">PATCH NOTES</a><a href="/events">EVENTS</a></div></footer>
  </div>;
}
function GuardianDashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exploration, setExploration] = useState<Exploration | null>(null);
  const [explorationError, setExplorationError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
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
      const result = await response.json() as { success?: boolean; error?: string; xp?: number; weapon?: { dropped?: boolean; name?: string | null }; rewards?: Record<string, number> };
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to claim exploration rewards");
      const materials = Object.entries(result.rewards ?? {}).filter(([, count]) => count > 0).map(([name, count]) => `${count} ${name}`).join(", ");
      setClaimMessage(`Rewards claimed! ${result.xp ?? 0} XP${result.weapon?.dropped && result.weapon.name ? ` · ${result.weapon.name}` : ""}${materials ? ` · ${materials}` : ""}`);
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
    </section><div className="dh-quick-section"><div className="dh-section-heading"><div><SectionLabel>GUARDIAN NETWORK</SectionLabel><h2>QUICK ACCESS</h2></div></div><div className="dh-quick-grid"><a href="/activities"><span>⚔</span><strong>ACTIVITIES</strong><small>ENTER AN OPERATION</small></a><a href="/vault"><span>◇</span><strong>THE VAULT</strong><small>MANAGE YOUR WEAPONS</small></a><a href="/armory"><span>✦</span><strong>ARMORY</strong><small>VIEW THE ARSENAL</small></a><a href="/profile"><span>⌖</span><strong>DESTINATIONS</strong><small>TRAVEL THE SYSTEM</small></a></div></div></div><aside className="dh-dashboard-side"><FeaturedOperation /><div className="dh-side-panel"><SectionLabel>NETWORK UPDATES</SectionLabel><h3>STAY INFORMED</h3><p>Discover the latest updates, changes and stories from Discordiny.</p><a href="/patchnotes" className="dh-text-link">PATCH NOTES ↗</a><a href="/articles" className="dh-text-link">LATEST ARTICLES ↗</a></div>{terminalUnlocked && <div className="dh-side-panel dh-side-terminal"><SectionLabel>UNKNOWN SIGNAL</SectionLabel><p className="dh-terminal-lines">&gt; CONNECTION AVAILABLE<br />&gt; AWAITING INPUT _</p><a href="https://terminal.discordiny.com" className="dh-text-link">OPEN TERMINAL ↗</a></div>}</aside></div>
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
