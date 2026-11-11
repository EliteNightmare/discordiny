import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import { type HubEvent, eventImage, displayDate } from "./EventHubTypes";
import "./Events.css";

export default function Events() {
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/event-hub', { signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error('Unable to load events');
      return r.json() as Promise<{ events: HubEvent[] }>;
    }).then(d => setEvents(d.events ?? [])).catch(e => { if (!controller.signal.aborted) setError(String(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const slug = decodeURIComponent(window.location.pathname.split('/')[2] ?? '');
  const selected = slug ? events.find(e => e.slug === slug) : undefined;
  const featured = events.filter(e => e.featured_slot > 0 && e.status === 'ACTIVE').sort((a,b) => a.featured_slot - b.featured_slot);
  const list = [...events].sort((a,b) => ({ ACTIVE:0, UPCOMING:1, CONCLUDED:2, CANCELLED:3 }[a.status] - { ACTIVE:0, UPCOMING:1, CONCLUDED:2, CANCELLED:3 }[b.status]));
  function card(e: HubEvent, large = false) { return <a key={e.slug} href={`/events/${e.slug}`} className={`eh-card eh-theme-${e.theme}${large ? ' eh-large' : ''}`} style={eventImage(e.cover_url) ? { backgroundImage:`linear-gradient(90deg,rgba(8,12,19,.94),rgba(8,12,19,.18)),url("${eventImage(e.cover_url)}")` } : undefined}>
    <span className="eh-kicker">{e.eyebrow || 'DISCORDINY EVENT'}</span><span className={`eh-status eh-${e.status.toLowerCase()}`}>{e.status}</span>
    <h2>{e.title}</h2><p>{e.description}</p><small>{displayDate(e.start_at)} — {displayDate(e.end_at)}</small><strong>EXPLORE EVENT ↗</strong>
  </a>; }
  return <div className="events-screen"><TopBar/><main className="eh-shell">
    {loading ? <p>Loading events…</p> : error ? <p role="alert">{error}</p> : slug ? selected ? <>
      <a className="eh-back" href="/events">← ALL EVENTS</a>
      <header className={`eh-hero eh-theme-${selected.theme}`} style={eventImage(selected.cover_url) ? { backgroundImage:`linear-gradient(90deg,rgba(8,12,19,.94),rgba(8,12,19,.28)),url("${eventImage(selected.cover_url)}")` } : undefined}>
        <span className="eh-kicker">{selected.eyebrow || 'LIMITED-TIME EVENT'}</span><span className={`eh-status eh-${selected.status.toLowerCase()}`}>{selected.status}</span><h1>{selected.title}</h1><p>{selected.description}</p><div className="eh-dates">{displayDate(selected.start_at)} — {displayDate(selected.end_at)}</div>
      </header><section className="eh-section"><div className="eh-section-head"><span>EVENT DESTINATIONS</span><h2>CHOOSE YOUR ACTIVITY</h2></div><div className="eh-activities">{selected.activities.map((a,i) => <a href={a.path} key={`${a.path}-${i}`} className="eh-activity"><span>0{i+1} / ACTIVITY</span><h3>{a.title}</h3><strong>ENTER ACTIVITY ↗</strong></a>)}{!selected.activities.length && <p>No activities have been assigned yet.</p>}</div></section>
    </> : <><a href="/events" className="eh-back">← ALL EVENTS</a><p>Event not found.</p></> : <>
      <header className="eh-page-title"><span className="eh-kicker">DISCORDINY / LIVE OPERATIONS</span><h1>EVENT HUB</h1><p>Limited-time events, upcoming operations and event activities.</p></header>
      {featured.length > 0 && <section className="eh-section"><div className="eh-section-head"><span>SPOTLIGHT</span><h2>FEATURED EVENTS</h2></div><div className="eh-featured">{featured.map(e => card(e,true))}</div></section>}
      <section className="eh-section"><div className="eh-section-head"><span>EVENT DIRECTORY</span><h2>ALL EVENTS</h2></div><div className="eh-list">{list.map(e => card(e))}{!list.length && <div className="eh-empty">No events are currently published. Check back soon.</div>}</div></section>
    </>}
  </main></div>;
}
