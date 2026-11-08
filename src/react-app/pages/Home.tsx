import { useEffect, useState } from "react";
import "./Home.css";
import background from "../assets/background.jpg";
import TopBar from "../components/TopBar";

type User = { id: number; username: string; global_name: string | null; avatar: string | null };
type Profile = {
  profile: { level: number; power: number; zone: string };
  level: { percentage: number };
  weapons: { owned: number; masterworked: number; total: number };
};
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
    <section className="dh-bottom-grid"><FeaturedOperation /><div className="dh-transmission"><SectionLabel>INCOMING TRANSMISSION</SectionLabel><div className="dh-terminal-lines"><span>&gt; CONNECTION ESTABLISHED</span><span>&gt; SIGNAL ORIGIN: UNKNOWN</span><span>&gt; AWAITING INPUT <b className="dh-cursor">_</b></span></div><a href="https://terminal.discordiny.com" className="dh-text-link">ACCESS TERMINAL ↗</a></div></section>
    <section className="dh-final-cta"><SectionLabel>THE NEXT CHAPTER IS YOURS</SectionLabel><h2>YOUR LEGEND STARTS HERE.</h2><ActionLink href="/profile" primary>ENTER DISCORDINY</ActionLink></section>
    <footer className="dh-footer"><span>DISCORDINY // SYSTEM ONLINE</span><div><a href="/about">ABOUT</a><a href="/patchnotes">PATCH NOTES</a><a href="/events">EVENTS</a></div></footer>
  </div>;
}
function GuardianDashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [retry, setRetry] = useState(0);
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
  const zone = profile?.profile.zone || "Cosmodrome";
  return <div className="dh-container dh-dashboard">
    <section className="dh-dashboard-heading"><div><SectionLabel>DISCORDINY // GUARDIAN COMMAND CENTER</SectionLabel><h1>WELCOME BACK, <span>{displayName}</span></h1><p>Your journey continues. Choose your next move.</p></div><a className="dh-profile-link" href="/profile">VIEW GUARDIAN ↗</a></section>
    {profileError ? <div className="dh-error" role="alert">Guardian data couldn't be loaded. <button type="button" onClick={() => setRetry(value => value + 1)}>RETRY</button></div> : null}
    <div className="dh-stats" aria-label="Guardian statistics"><div className="dh-stat"><SectionLabel>GUARDIAN POWER</SectionLabel><strong>{profile ? profile.profile.power.toLocaleString() : "—"}</strong><span>COMBINED POWER</span></div><div className="dh-stat"><SectionLabel>GUARDIAN LEVEL</SectionLabel><strong>{profile?.profile.level ?? "—"}</strong><div className="dh-level-track"><div style={{ width: `${Math.min(100, Math.max(0, profile?.level.percentage ?? 0))}%` }} /></div></div><div className="dh-stat"><SectionLabel>WEAPONS COLLECTED</SectionLabel><strong>{profile?.weapons.owned ?? "—"}</strong><span>{profile ? `${profile.weapons.masterworked} MASTERWORKED` : "LOADING ARSENAL"}</span></div></div>
    <div className="dh-dashboard-grid"><div className="dh-dashboard-main"><section className="dh-current-destination" style={{ backgroundImage: `linear-gradient(90deg,rgba(8,13,20,.97),rgba(8,13,20,.62)),url('${imageForDestination(zone)}')` }}><SectionLabel>YOUR CURRENT DESTINATION</SectionLabel><h2>{profile ? zone : "CONNECTING..."}</h2><p>Explore your destination, gather resources and work toward your next reward.</p><ActionLink href="/profile" primary>OPEN DESTINATION</ActionLink></section><div className="dh-quick-section"><div className="dh-section-heading"><div><SectionLabel>GUARDIAN NETWORK</SectionLabel><h2>QUICK ACCESS</h2></div></div><div className="dh-quick-grid"><a href="/activities"><span>⚔</span><strong>ACTIVITIES</strong><small>ENTER AN OPERATION</small></a><a href="/vault"><span>◇</span><strong>THE VAULT</strong><small>MANAGE YOUR WEAPONS</small></a><a href="/armory"><span>✦</span><strong>ARMORY</strong><small>VIEW THE ARSENAL</small></a><a href="/profile"><span>⌖</span><strong>DESTINATIONS</strong><small>TRAVEL THE SYSTEM</small></a></div></div></div><aside className="dh-dashboard-side"><FeaturedOperation /><div className="dh-side-panel"><SectionLabel>NETWORK UPDATES</SectionLabel><h3>STAY INFORMED</h3><p>Discover the latest updates, changes and stories from Discordiny.</p><a href="/patchnotes" className="dh-text-link">PATCH NOTES ↗</a><a href="/articles" className="dh-text-link">LATEST ARTICLES ↗</a></div><div className="dh-side-panel dh-side-terminal"><SectionLabel>UNKNOWN SIGNAL</SectionLabel><p className="dh-terminal-lines">&gt; CONNECTION AVAILABLE<br />&gt; AWAITING INPUT _</p><a href="https://terminal.discordiny.com" className="dh-text-link">OPEN TERMINAL ↗</a></div></aside></div>
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
  return <main className={`home-page dh-page ${sivaAnimationDisabled ? "home-siva-animation-off" : ""}`} style={{ backgroundImage: `linear-gradient(180deg,rgba(5,8,13,.94),rgba(5,8,13,.98)),url(${background})` }}><TopBar />
    {session.status === "loading" ? <div className="dh-loading" role="status">ESTABLISHING CONNECTION<span className="dh-cursor">_</span></div> : null}
    {session.status === "error" ? <div className="dh-loading" role="alert">NETWORK CONNECTION UNAVAILABLE <button type="button" onClick={() => window.location.reload()}>RETRY</button></div> : null}
    {session.status === "guest" ? <GuestLanding /> : null}
    {session.status === "authenticated" && session.user ? <GuardianDashboard user={session.user} /> : null}
  </main>;
}
