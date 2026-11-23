import { PlayerManagement, EventManagement, AuditManagement } from "./AdminManagement";
import { useEffect, useState, type FormEvent } from "react";
import TopBar from "../components/TopBar";
import ArticleManagement from "./ArticleManagement";
import "./AdminPanel.css";
import { PREVIEW_CLOSED, PREVIEW_REGULAR, setPreviewEnabled } from "../components/betaPreview";

type Asset = { path: string; url: string; mime_type: string; byte_size: number; created_at: string };
const betaHost = window.location.hostname.startsWith("beta.");
const subdomain = (name: string) => `https://${betaHost ? "beta." : ""}${name}.discordiny.com`;
const links = [
  { name: "Terminal", description: "Manage terminal files and discoveries", url: subdomain("terminal") + "/" },
  { name: "Root", description: "Manage the Root filesystem", url: subdomain("root") + "/5dfg46df4gs4gs6" },
  { name: "Events", description: "View current operations", url: "/events" },
];


type BetaCode = { code: string | null; code_id: string; created_at: string; created_by_discord_id: string; redeemed_by_discord_id: string | null; redeemed_at: string | null; used: boolean };
function BetaAdministration() {
  const [codes, setCodes] = useState<BetaCode[]>([]);
  const [filter, setFilter] = useState<"all" | "used" | "unused">("all");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  async function refresh() {
    const [listResponse, statusResponse] = await Promise.all([
      fetch("/api/beta/admin/codes", { credentials: "include" }),
      fetch("/api/beta/status", { credentials: "include" }),
    ]);
    if (!listResponse.ok || !statusResponse.ok) throw new Error("Unable to load beta administration");
    const [list, status] = await Promise.all([listResponse.json(), statusResponse.json()]);
    setCodes(list.codes ?? []);
    setActive(status.active === true);
  }
  useEffect(() => { void refresh().catch(e => setError(String(e))); }, []);
  async function action(path: string, body: object) {
    setBusy(true); setError("");
    try {
      const response = await fetch(path, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      if (data.code) setNewCode(data.code);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setBusy(false); }
  }
  const visible = codes.filter(code => filter === "all" || (filter === "used" ? code.used : !code.used));
  return <section className="dc-admin-panel">
    <h2>Beta Access Management</h2>
    <p>Access is controlled by production account #1. Invitations are stored in the production access registry and remain available after beta resets.</p>
    <p>Beta status: <strong>{active ? "Open to invited testers" : "Closed (administrator only)"}</strong></p>
    <div className="dc-admin-form" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <button disabled={busy} onClick={() => void action("/api/beta/admin/generate", {})}>Generate invitation code</button>
      <button disabled={busy} onClick={() => void action("/api/beta/admin/toggle", { enabled: !active })}>{active ? "Close beta" : "Open beta"}</button>
      <button disabled={busy} onClick={() => void refresh().catch(e => setError(String(e)))}>Refresh list</button>
      {betaHost && <button type="button" onClick={() => { setPreviewEnabled(PREVIEW_REGULAR, false); setPreviewEnabled(PREVIEW_CLOSED, true); window.location.href = "/"; }}>Preview closed beta (no actual shutdown)</button>}
      {betaHost && <button type="button" onClick={() => { setPreviewEnabled(PREVIEW_CLOSED, false); setPreviewEnabled(PREVIEW_REGULAR, true); window.location.href = "/"; }}>Preview regular account (no code)</button>}
    </div>
    {newCode && <p role="status">New invitation code: <strong>{newCode}</strong> <button onClick={() => void navigator.clipboard.writeText(newCode)}>Copy</button><br/><small>New codes are now retained in the administrator-only invitation list.</small></p>}
    <div className="dc-admin-list-head"><h2>Invitations ({codes.length})</h2><label>Show <select aria-label="Filter beta invitations" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="all">All</option><option value="used">Used</option><option value="unused">Unused</option></select></label></div>
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", textAlign: "left", borderSpacing: "0 12px" }}><thead><tr><th>Invitation code</th><th>Status</th><th>Created</th><th>Redeemed by Discord ID</th><th>Redeemed</th></tr></thead><tbody>{visible.map(code => <tr key={code.code_id}><td>{code.code ? <><code>{code.code}</code> <button type="button" onClick={() => void navigator.clipboard.writeText(code.code!)}>Copy</button></> : <span title={`Legacy hash reference: ${code.code_id}`}>Legacy code — unavailable</span>}</td><td>{code.used ? "Used" : "Unused"}</td><td>{code.created_at}</td><td>{code.redeemed_by_discord_id ?? "—"}</td><td>{code.redeemed_at ?? "—"}</td></tr>)}</tbody></table>{visible.length === 0 && <p>No matching invitations.</p>}</div>
    {error && <p role="alert">{error}</p>}
  </section>;
}

/** Convert supported still images to real WebP bytes before uploading. */
async function convertToWebP(source: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(source.type)) {
    throw new Error("Select a JPG, PNG, WebP or AVIF image. Animated GIF conversion is not supported.");
  }
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image conversion is unavailable in this browser.");
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.88));
    if (!blob || blob.type !== "image/webp") throw new Error("This browser could not encode WebP.");
    if (blob.size > 10 * 1024 * 1024) throw new Error("Converted WebP exceeds the 10 MB upload limit.");
    return new File([blob], source.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } finally { bitmap.close(); }
}

function webpPath(value: string, source: File): string {
  const input = value.trim().replace(/^\/+/, "");
  const candidate = input || source.name;
  return /\.[a-z0-9]+$/i.test(candidate)
    ? candidate.replace(/\.[^.\/]+$/, ".webp")
    : candidate + ".webp";
}

export default function AdminPanel() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [path, setPath] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState<"overview" | "articles" | "assets" | "players" | "events" | "audit" | "beta">("overview");
  async function loadAssets() {
    const res = await fetch("/api/admin/assets", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load assets");
    setAssets(data.assets ?? []);
  }
  useEffect(() => {
    let alive = true;
    fetch(betaHost ? "/api/beta/status" : "/api/admin/status", { credentials: "include" })
      .then(async r => { const d = await r.json(); if (alive) setAuthorized(r.ok && d.isAdmin === true); })
      .catch(() => { if (alive) setAuthorized(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (authorized && !betaHost) void loadAssets().catch(e => setMessage(String(e))); }, [authorized]);
  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true); setMessage("");
    try {
      const converted = await convertToWebP(file);
      const targetPath = webpPath(path, file);
      const data = new FormData(); data.append("path", targetPath); data.append("file", converted);
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
  if (betaHost) return <><TopBar/><main className="dc-admin"><div className="dc-admin-wrap"><header className="dc-admin-head"><div><span>DISCORDINY // BETA</span><h1>BETA ADMIN COMMAND CENTER</h1><p>Production administrator identity verified</p></div></header><BetaAdministration/></div></main></>;
  return <><TopBar/><main className="dc-admin"><div className="dc-admin-wrap">
    <header className="dc-admin-head"><div><span>DISCORDINY // RESTRICTED</span><h1>ADMIN COMMAND CENTER</h1><p>Central administration · Account #1</p></div><b>◆</b></header>
    <nav className="dc-admin-tabs"><button className={active === "overview" ? "selected" : ""} onClick={() => setActive("overview")}>Overview</button><button className={active === "articles" ? "selected" : ""} onClick={() => setActive("articles")}>Articles</button><button className={active === "assets" ? "selected" : ""} onClick={() => setActive("assets")}>Assets ({assets.length})</button><button className={active === "players" ? "selected" : ""} onClick={() => setActive("players")}>Player Accounts</button><button className={active === "events" ? "selected" : ""} onClick={() => setActive("events")}>Events</button><button className={active === "audit" ? "selected" : ""} onClick={() => setActive("audit")}>Audit Log</button><button className={active === "beta" ? "selected" : ""} onClick={() => setActive("beta")}>Beta Access</button></nav>
    {active === "beta" ? <BetaAdministration/> : active === "articles" ? <ArticleManagement/> : active === "players" ? <PlayerManagement/> : active === "events" ? <EventManagement/> : active === "audit" ? <AuditManagement/> : active === "overview" ? <><section className="dc-admin-grid">
      {links.map(link => <a className="dc-admin-card" href={link.url} key={link.name}><span>ADMIN MODULE</span><h2>{link.name} ↗</h2><p>{link.description}</p></a>)}
      <button className="dc-admin-card" onClick={() => setActive("articles")}><span>EDITORIAL MANAGEMENT</span><h2>Articles ↗</h2><p>Create, edit and publish news inside the Command Center</p></button><button className="dc-admin-card" onClick={() => setActive("players")}><span>PLAYER MANAGEMENT</span><h2>Account Access ↗</h2><p>Search players and grant items</p></button><button className="dc-admin-card" onClick={() => setActive("events")}><span>EVENT MANAGEMENT</span><h2>Create Events ↗</h2><p>Publish new community events</p></button><button className="dc-admin-card" onClick={() => setActive("assets")}><span>ASSET MANAGEMENT</span><h2>Assets ↗</h2><p>Upload images to your custom asset domain</p></button>
    </section><p className="dc-admin-note">Create and manage articles directly in the Articles tab. Root and Terminal remain linked to their existing tools.</p></> : <>
    <section className="dc-admin-panel"><h2>Upload a new asset</h2><p>Choose an unused public path on assets.discordiny.com. JPG, PNG, WebP and AVIF are converted to WebP before upload. Maximum 10 MB after conversion. Animated GIF is not supported.</p>
      <form className="dc-admin-form" onSubmit={upload}><label>Asset path<input value={path} onChange={e => setPath(e.target.value)} placeholder="events/beta-banner.webp"/></label><label>Image<input id="admin-asset-file" type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={e => setFile(e.target.files?.[0] ?? null)} required/></label><button disabled={uploading || !file} type="submit">{uploading ? "Uploading…" : "Upload image"}</button></form>
      {path && <p className="dc-admin-preview-url">URL: https://assets.discordiny.com/{file ? webpPath(path, file) : path}</p>}
    </section><section className="dc-admin-panel"><div className="dc-admin-list-head"><h2>Asset library</h2><input aria-label="Filter assets" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search paths…"/></div>
      <div className="dc-admin-assets">{assets.filter(a => a.path.toLowerCase().includes(filter.toLowerCase())).map(asset => <article key={asset.path} className="dc-admin-asset"><img src={asset.url} alt="" loading="lazy"/><div><strong>{asset.path}</strong><a href={asset.url} target="_blank" rel="noreferrer">{asset.url}</a><small>{(asset.byte_size / 1024).toFixed(1)} KB · {asset.mime_type}</small></div><button onClick={() => void navigator.clipboard.writeText(asset.url)}>Copy URL</button><button className="danger" onClick={() => void remove(asset)}>Delete</button></article>)}{!assets.length && <p>No assets uploaded yet.</p>}</div>
    </section></>}
    {message && <p className="dc-admin-message" role="status">{message}</p>}
  </div></main></>;
}
