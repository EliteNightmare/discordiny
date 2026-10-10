import { PlayerManagement, EventManagement, AuditManagement } from "./AdminManagement";
import { useEffect, useState, type FormEvent } from "react";
import TopBar from "../components/TopBar";
import "./AdminPanel.css";

type Asset = { path: string; url: string; mime_type: string; byte_size: number; created_at: string };
const links = [
  { name: "Articles", description: "Write and publish news", url: "/articles" },
  { name: "Terminal", description: "Manage terminal files and discoveries", url: "https://terminal.discordiny.com/" },
  { name: "Root", description: "Manage the Root filesystem", url: "https://root.discordiny.com/5dfg46df4gs4gs6" },
  { name: "Events", description: "View current operations", url: "/events" },
];

export default function AdminPanel() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [path, setPath] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState<"overview" | "assets" | "players" | "events" | "audit">("overview");
  async function loadAssets() {
    const res = await fetch("/api/admin/assets", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load assets");
    setAssets(data.assets ?? []);
  }
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/status", { credentials: "include" })
      .then(async r => { const d = await r.json(); if (alive) setAuthorized(r.ok && d.isAdmin === true); })
      .catch(() => { if (alive) setAuthorized(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (authorized) void loadAssets().catch(e => setMessage(String(e))); }, [authorized]);
  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file || !path.trim() || uploading) return;
    setUploading(true); setMessage("");
    try {
      const data = new FormData(); data.append("path", path.trim()); data.append("file", file);
      const response = await fetch("/api/admin/assets", { method: "POST", credentials: "include", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setMessage(`Created: ${result.asset.url}`);
      setPath(""); setFile(null);
      const input = document.getElementById("admin-asset-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadAssets();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  }
  async function remove(asset: Asset) {
    if (!window.confirm(`Permanently delete ${asset.url}? Links using this image will break.`)) return;
    setMessage("");
    try {
      const response = await fetch("/api/admin/assets", {
        method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: asset.path }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Deletion failed");
      setMessage("Asset deleted"); await loadAssets();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Deletion failed"); }
  }
  if (authorized === null) return <><TopBar/><main className="dc-admin"><p>Verifying administrator session…</p></main></>;
  if (!authorized) return <><TopBar/><main className="dc-admin"><h1>Access denied</h1><p>This section is restricted to the Discordiny administrator.</p><a href="/">Return home</a></main></>;
  return <><TopBar/><main className="dc-admin"><div className="dc-admin-wrap">
    <header className="dc-admin-head"><div><span>DISCORDINY // RESTRICTED</span><h1>ADMIN COMMAND CENTER</h1><p>Central administration · Account #1</p></div><b>◆</b></header>
    <nav className="dc-admin-tabs"><button className={active === "overview" ? "selected" : ""} onClick={() => setActive("overview")}>Overview</button><button className={active === "assets" ? "selected" : ""} onClick={() => setActive("assets")}>Assets ({assets.length})</button><button className={active === "players" ? "selected" : ""} onClick={() => setActive("players")}>Player Accounts</button><button className={active === "events" ? "selected" : ""} onClick={() => setActive("events")}>Events</button><button className={active === "audit" ? "selected" : ""} onClick={() => setActive("audit")}>Audit Log</button></nav>
    {active === "players" ? <PlayerManagement/> : active === "events" ? <EventManagement/> : active === "audit" ? <AuditManagement/> : active === "overview" ? <><section className="dc-admin-grid">
      {links.map(link => <a className="dc-admin-card" href={link.url} key={link.name}><span>ADMIN MODULE</span><h2>{link.name} ↗</h2><p>{link.description}</p></a>)}
      <button className="dc-admin-card" onClick={() => setActive("players")}><span>PLAYER MANAGEMENT</span><h2>Account Access ↗</h2><p>Search players and grant items</p></button><button className="dc-admin-card" onClick={() => setActive("events")}><span>EVENT MANAGEMENT</span><h2>Create Events ↗</h2><p>Publish new community events</p></button><button className="dc-admin-card" onClick={() => setActive("assets")}><span>ASSET MANAGEMENT</span><h2>Assets ↗</h2><p>Upload images to your custom asset domain</p></button>
    </section><p className="dc-admin-note">Root, Terminal and Articles remain linked to their existing editors. Account grants and event creation are now available in this dashboard.</p></> : <>
    <section className="dc-admin-panel"><h2>Upload a new asset</h2><p>Choose an unused public path on assets.discordiny.com. Allowed: PNG, JPG, GIF, WebP, AVIF. Maximum 10 MB.</p>
      <form className="dc-admin-form" onSubmit={upload}><label>Asset path<input value={path} onChange={e => setPath(e.target.value)} placeholder="events/beta-banner.webp" required/></label><label>Image<input id="admin-asset-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={e => setFile(e.target.files?.[0] ?? null)} required/></label><button disabled={uploading || !file || !path.trim()} type="submit">{uploading ? "Uploading…" : "Upload image"}</button></form>
      {path && <p className="dc-admin-preview-url">URL: https://assets.discordiny.com/{path}</p>}
    </section><section className="dc-admin-panel"><div className="dc-admin-list-head"><h2>Asset library</h2><input aria-label="Filter assets" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search paths…"/></div>
      <div className="dc-admin-assets">{assets.filter(a => a.path.toLowerCase().includes(filter.toLowerCase())).map(asset => <article key={asset.path} className="dc-admin-asset"><img src={asset.url} alt="" loading="lazy"/><div><strong>{asset.path}</strong><a href={asset.url} target="_blank" rel="noreferrer">{asset.url}</a><small>{(asset.byte_size / 1024).toFixed(1)} KB · {asset.mime_type}</small></div><button onClick={() => void navigator.clipboard.writeText(asset.url)}>Copy URL</button><button className="danger" onClick={() => void remove(asset)}>Delete</button></article>)}{!assets.length && <p>No assets uploaded yet.</p>}</div>
    </section></>}
    {message && <p className="dc-admin-message" role="status">{message}</p>}
  </div></main></>;
}
