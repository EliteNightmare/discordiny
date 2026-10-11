import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import "./About.css";

type Panel = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  symbol: string;
  tone: string;
  action?: { label: string; href: string };
};

// Set your official community URLs here when ready.
const LINKS = {
  discord: "", // e.g. https://discord.gg/your-invite
  patreon: "https://www.patreon.com/cw/discordiny", // e.g. https://www.patreon.com/your-page
  communityHub: "https://d2communityhub.com", // Official D2CommunityHub link
};

const PANELS: Panel[] = [
  {
    number: "01", eyebrow: "THE EXPERIENCE", title: "WHAT IS DISCORDINY?",
    description: "A Destiny-inspired adventure built for Discord.",
    detail: "Collect weapons, build your Power, explore destinations, take on activities, and shape your Guardian's journey. Discordiny brings progression and discovery into the communities where you already play.",
    symbol: "✦", tone: "cyan",
  },
  {
    number: "02", eyebrow: "THE COMMUNITY", title: "FIND YOUR FIRETEAM.",
    description: "More than a bot. A place to belong.",
    detail: "The Discord is where Guardians connect, share discoveries, report issues, suggest features, and see what's coming next. Join the conversation and help shape Discordiny's future.",
    symbol: "◇", tone: "violet",
    ...(LINKS.discord ? { action: { label: "JOIN THE DISCORD", href: LINKS.discord } } : {}),
  },
  {
    number: "03", eyebrow: "SUPPORT THE PROJECT", title: "FUEL THE NEXT CHAPTER.",
    description: "Independent projects grow through community support.",
    detail: "Patreon is a way to support the time, care, and development behind Discordiny. Every contribution helps keep the project moving forward. Visit our Patreon for current support options and details.",
    symbol: "✧", tone: "gold",
    ...(LINKS.patreon ? { action: { label: "VISIT PATREON", href: LINKS.patreon } } : {}),
  },
  {
    number: "04", eyebrow: "BEHIND THE CODE", title: "THE LEAD DEVELOPER.",
    description: "One vision, built piece by piece.",
    detail: "Discordiny is driven by its Lead Developer, from the systems behind the bot to the experience across the website. It's an ongoing passion project shaped by iteration, feedback, and a love for the world that inspired it.",
    symbol: "⌘", tone: "cyan",
  },
  {
    number: "05", eyebrow: "COMMUNITY CONNECTIONS", title: "D2COMMUNITYHUB.",
    description: "Building stronger connections across the Destiny community.",
    detail: "Discordiny is proud to recognize its partnership with D2CommunityHub. We're excited to connect communities through a shared enthusiasm for Destiny and the people who make it special.",
    symbol: "⬡", tone: "red",
    ...(LINKS.communityHub ? { action: { label: "EXPLORE D2COMMUNITYHUB", href: LINKS.communityHub } } : {}),
  },
];

function RevealSection({ panel, index }: { panel: Panel; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(element);
      }
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`about-panel about-panel--${index % 2 ? "right" : "left"} about-panel--${panel.tone} ${visible ? "is-visible" : ""}`}
      aria-labelledby={`about-heading-${index}`}
    >
      <div className="about-panel-art" aria-hidden="true">
        <span className="about-panel-orbit" />
        <span className="about-panel-glyph">{panel.symbol}</span>
        <span className="about-panel-art-number">{panel.number}</span>
      </div>
      <div className="about-panel-copy">
        <span className="about-eyebrow"><span className="about-eyebrow-line" /> {panel.number} / {panel.eyebrow}</span>
        <h2 id={`about-heading-${index}`}>{panel.title}</h2>
        <h3>{panel.description}</h3>
        <p>{panel.detail}</p>
        {panel.action && (
          <a className="about-action" href={panel.action.href} target="_blank" rel="noopener noreferrer">
            {panel.action.label} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </section>
  );
}

export default function About() {
  return (
    <div className="about-screen">
      <TopBar />
      <main className="about-page">
        <header className="about-hero">
          <div className="about-hero-grid" aria-hidden="true" />
          <span className="about-hero-kicker">DISCORDINY // THE STORY SO FAR</span>
          <h1>MORE THAN<br /><em>A DESTINATION.</em></h1>
          <p>Forged for Guardians. Powered by community. Always evolving.</p>
          <a href="#about-story" className="about-scroll">DISCOVER THE STORY <span aria-hidden="true">↓</span></a>
          <span className="about-hero-coordinate" aria-hidden="true">TRANSMISSION // 001</span>
        </header>
        <div id="about-story" className="about-story">
          {PANELS.map((panel, index) => <RevealSection key={panel.number} panel={panel} index={index} />)}
        </div>
        <footer className="about-footer">
          <span>THE JOURNEY CONTINUES.</span>
          <h2>SEE YOU STARSIDE.</h2>
          <a href="/" className="about-action">RETURN HOME <span aria-hidden="true">↗</span></a>
          <p>Discordiny is a fan-made, Destiny-inspired project and is not affiliated with Bungie.</p>
        </footer>
      </main>
    </div>
  );
}
