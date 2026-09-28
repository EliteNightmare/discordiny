import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import cbcLogo from "../assets/cbclogo.png";
import discordIcon from "../assets/discord_icon.png";
import relicStage1 from "../assets/root/relic/stage1.png";
import relicStage2 from "../assets/root/relic/stage2.png";
import relicStage3 from "../assets/root/relic/stage3.png";
import relicStage4 from "../assets/root/relic/stage4.png";
import relicStage5 from "../assets/root/relic/stage5.png";
import "./Terminal.css";
const API = "https://discordiny.com";
const ROOT = "https://root.discordiny.com/5dfg46df4gs4gs6";
type User = {
    id: number;
    discord_id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
};
type FileRow = {
    id: number;
    title: string;
    subtitle: string;
    classification: string;
    content: string;
    code?: string;
    discovered_at?: string;
};
type Draft = {
    id: number | null;
    code: string;
    title: string;
    subtitle: string;
    classification: string;
    content: string;
};
const blank: Draft = { id: null, code: "", title: "", subtitle: "", classification: "", content: "" };
type AdminUser = {
    id: number;
    discord_id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
};
type AdminDiscovery = {
    id: number;
    code: string;
    title: string;
    subtitle: string;
    classification: string;
    discovered_at: string;
};
type RelicState = {
    phase: number;
    phaseName: string;
    maskedCode: string;
    revealedCount: number;
    complete: boolean;
    final: null | {
        type: string;
        key: string;
        cipher: string;
    };
};
const relicStageImages = [relicStage1, relicStage2, relicStage3, relicStage4, relicStage5];
function inline(text: string): ReactNode[] {
    const re = /(\*\*[^*]+\*\*|~~[^~]+~~|\|\|[^|]+\|\||`[^`\n]+`|\*[^*\n]+\*)/g;
    return text.split(re).filter(Boolean).map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
            return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("~~") && p.endsWith("~~"))
            return <del key={i}>{p.slice(2, -2)}</del>;
        if (p.startsWith("||") && p.endsWith("||"))
            return <span key={i} className="term-spoiler">{p.slice(2, -2)}</span>;
        if (p.startsWith("`") && p.endsWith("`"))
            return <code key={i}>{p.slice(1, -1)}</code>;
        if (p.startsWith("*") && p.endsWith("*"))
            return <em key={i}>{p.slice(1, -1)}</em>;
        return p;
    });
}
function document(content: string) {
    return content.split(/(```[\s\S]*?```)/g).map((b, i) => b.startsWith("```") && b.endsWith("```")
        ? <pre key={i}><code>{b.slice(3, -3).replace(/^\n/, "")}</code></pre>
        : b.split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={`${i}-${j}`}>{p.split("\n").map((line, k, arr) => <span key={k}>{inline(line)}{k < arr.length - 1 ? <br /> : null}</span>)}</p>));
}
function UnknownSignalAutopost({ resolved }: { resolved: boolean }) {
    return (
        <section
            className={resolved ? "terminal-autopost terminal-autopost-resolved" : "terminal-autopost"}
            aria-label={resolved ? "Unknown signal resolved" : "Unknown signal"}
        >
            <div className="terminal-autopost-scan" aria-hidden="true" />
            <div className="terminal-autopost-noise" aria-hidden="true" />

            <div className="terminal-autopost-kicker">
                <span className="terminal-autopost-live-dot" />
                AUTOPOST // SIGNAL INTERCEPT
            </div>

            <div
                className="terminal-autopost-title"
                data-text={resolved ? "SIGNAL RESOLVED" : "UNKNOWN SIGNAL"}
            >
                {resolved ? "SIGNAL RESOLVED" : "UNKNOWN SIGNAL"}
            </div>

            <div className="terminal-autopost-divider" />

            <div className="terminal-autopost-copy">
                <span>TRANSMISSION SOURCE</span>
                <strong>{resolved ? "IDENTIFIED" : "UNRESOLVED"}</strong>
            </div>

            <div className="terminal-autopost-corruption" aria-hidden="true">
                {resolved
                    ? "✓ // SIGNAL LOCKED // ✓ // SIGNAL LOCKED // ✓"
                    : "█▓▒░ // 0x?? // S_V_ // █▓▒░"}
            </div>

            {resolved ? (
                <div className="terminal-autopost-resolved-message">
                    <strong>INTERCEPTED DATA DECRYPTED: UH3C // REPLICATE</strong>
                    <p>Please follow Terminal Instructions going forward.</p>
                </div>
            ) : (
                <>
                    <div className="terminal-autopost-payload">
                        <small>INTERCEPTED DATA</small>
                        <code data-text="vQWYX6lGvH4=">vQWYX6lGvH4=</code>
                    </div>

                    <div className="terminal-autopost-clue">
                        <span>CIPHER HINT</span>
                        <strong>TETRAODONTIDAE</strong>
                    </div>

                    <div className="terminal-autopost-clue">
                        <span>KEY</span>
                        <strong>REPLICATE</strong>
                    </div>
                </>
            )}

            <div className="terminal-autopost-footer">
                <span>DECRYPTION STATUS</span>
                <b>{resolved ? "RESOLVED" : "UNKNOWN"}</b>
            </div>
        </section>
    );
}

export default function Terminal() {
    const [loading, setLoading] = useState(true), [command, setCommand] = useState(""), [message, setMessage] = useState("");
    const [user, setUser] = useState<User | null>(null), [files, setFiles] = useState<FileRow[]>([]), [selected, setSelected] = useState<number | null>(null);
    const [rootUnlocked, setRootUnlocked] = useState(false), [admin, setAdmin] = useState(false), [accountOpen, setAccountOpen] = useState(false), [adminOpen, setAdminOpen] = useState(false), [mobileFilesOpen, setMobileFilesOpen] = useState(false);
    const [adminFiles, setAdminFiles] = useState<FileRow[]>([]), [draft, setDraft] = useState<Draft>(blank), [adminMessage, setAdminMessage] = useState("");
    const [adminUserName, setAdminUserName] = useState("");
    const [adminUserMatches, setAdminUserMatches] = useState<AdminUser[]>([]);
    const [adminSelectedUser, setAdminSelectedUser] = useState<AdminUser | null>(null);
    const [adminDiscoveries, setAdminDiscoveries] = useState<AdminDiscovery[]>([]);
    const [adminTargetRelic, setAdminTargetRelic] = useState<RelicState | null>(null);
    const [adminUserMessage, setAdminUserMessage] = useState("");
    const [adminUserSearching, setAdminUserSearching] = useState(false);
    const [backwashActive, setBackwashActive] = useState(false), [backwashPhase, setBackwashPhase] = useState(0);
    const [relicSwarmActive, setRelicSwarmActive] = useState(false);
    const [relicSwarmMessage, setRelicSwarmMessage] = useState("");
    const input = useRef<HTMLInputElement>(null), backwashTimers = useRef<number[]>([]), relicSwarmTimer = useRef<number | null>(null);
    const current = useMemo(() => files.find(f => f.id === selected) ?? null, [files, selected]);
    const [unknownSignalResolved, setUnknownSignalResolved] = useState(false);
    const [relic, setRelic] = useState<RelicState | null>(null);
    const request = (path: string, init?: RequestInit) => fetch(API + path, { ...init, credentials: "include", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) } });
    async function load() {
        const r = await request("/api/terminal/library"), d = await r.json();
        if (r.status === 401 || !d.authenticated) {
            window.location.href = API + "/api/auth/login";
            return;
        }
        if (!r.ok || !d.terminalUnlocked) {
            window.location.href = API + "/";
            return;
        }
        const next: FileRow[] = d.files ?? [];
        setUser(d.user ?? null);
        setFiles(next);
        setRootUnlocked(!!d.rootUnlocked);
        setUnknownSignalResolved(!!d.unknownSignalResolved);
        setRelic(d.relic ?? null);
        setAdmin(!!d.isAdmin);
        setSelected(x => x !== null && next.some(f => f.id === x) ? x : (next[0]?.id ?? null));
        setLoading(false);
    }
    useEffect(() => { void load().catch(() => { setMessage("TERMINAL CONNECTION FAILED"); setLoading(false); }); }, []);
    useEffect(() => { if (!loading)
        input.current?.focus(); }, [loading]);
    useEffect(() => () => {
        backwashTimers.current.forEach(t => window.clearTimeout(t));
        if (relicSwarmTimer.current !== null) window.clearTimeout(relicSwarmTimer.current);
    }, []);
    function runRelicSwarm(message: string, duration = 2300) {
        if (relicSwarmTimer.current !== null) window.clearTimeout(relicSwarmTimer.current);
        setRelicSwarmMessage(message);
        setRelicSwarmActive(false);
        window.requestAnimationFrame(() => setRelicSwarmActive(true));
        relicSwarmTimer.current = window.setTimeout(() => {
            setRelicSwarmActive(false);
            setRelicSwarmMessage("");
            relicSwarmTimer.current = null;
        }, duration);
    }
    function runBackwash() {
        if (backwashActive)
            return;
        backwashTimers.current.forEach(t => window.clearTimeout(t));
        backwashTimers.current = [];
        setCommand("");
        setMessage("");
        setBackwashActive(true);
        setBackwashPhase(1);
        const at = (ms: number, fn: () => void) => { backwashTimers.current.push(window.setTimeout(fn, ms)); };
        at(340, () => setBackwashPhase(2));
        at(650, () => setBackwashPhase(3));
        at(760, () => setBackwashPhase(4));
        at(835, () => setBackwashPhase(3));
        at(970, () => setBackwashPhase(5));
        at(1045, () => setBackwashPhase(3));
        at(1170, () => setBackwashPhase(4));
        at(1245, () => setBackwashPhase(6));
        at(1330, () => setBackwashPhase(3));
        at(1460, () => setBackwashPhase(5));
        at(1535, () => setBackwashPhase(7));
        at(1800, () => setBackwashPhase(8));
        at(2160, () => setBackwashPhase(9));
        at(2500, () => { setBackwashPhase(0); setBackwashActive(false); window.setTimeout(() => input.current?.focus(), 0); });
    }
    async function execute(e: FormEvent) {
        e.preventDefault();
        const code = command.trim();
        if (!code || backwashActive)
            return;
        if (code.toUpperCase() === "BACKWASH") {
            setCommand("");
            setMessage("");
            try {
                const r = await request("/api/terminal/execute", { method: "POST", body: JSON.stringify({ code: "BACKWASH" }) });
                const d = await r.json();
                if (!r.ok || !d.success) {
                    setMessage(d.error ?? "BACKWASH PROTOCOL FAILED");
                    return;
                }
                if (d.relic) setRelic(d.relic);
                runBackwash();
                if (d.relicAdvanced && d.relicTransition?.from === 2 && d.relicTransition?.to === 3) {
                    window.setTimeout(() => runRelicSwarm("RELIC PHASE SKIP 2 >> 3 INITIATED", 2550), 350);
                    window.setTimeout(() => setMessage("SUCCESS"), 2500);
                }
            }
            catch {
                setMessage("TERMINAL CONNECTION FAILED");
            }
            return;
        }
        setMessage("");
        try {
            const r = await request("/api/terminal/execute", { method: "POST", body: JSON.stringify({ code }) }), d = await r.json();
            if (!r.ok || !d.success) {
                setMessage(d.error ?? "ACCESS CODE NOT RECOGNIZED");
                setCommand("");
                return;
            }
            if (d.type === "root") {
                setRootUnlocked(true);
                window.location.assign(d.redirectUrl ?? ROOT);
                return;
            }
            if (d.unknownSignalResolved) {
                setUnknownSignalResolved(true);
            }
            if (d.relic) {
                setRelic(d.relic);
            }
            if (d.relicAdvanced && d.relicTransition?.from === 1 && d.relicTransition?.to === 2) {
                runRelicSwarm("R.E.L.I.C. PHASE 02 // CORRUPTION ACCEPTED");
            }
            if (d.relicAdvanced && d.relicTransition?.from === 3 && d.relicTransition?.to === 4) {
                runRelicSwarm("R.E.L.I.C. PHASE 04 // OVERRIDE ACCEPTED");
                window.setTimeout(() => setMessage("SUCCESS!"), 2100);
            }
            if (d.relicAdvanced && d.relicTransition?.from === 4 && d.relicTransition?.to === 5) {
                runRelicSwarm("R.E.L.I.C. CRACKED!", 3300);
                window.setTimeout(() => setMessage("SUCCESS!"), 3000);
            }

            if (d.file) {
                const discoveredFile: FileRow = d.file;

                setFiles(x =>
                    x.some(f => f.id === discoveredFile.id)
                        ? x.map(f =>
                            f.id === discoveredFile.id
                                ? { ...f, ...discoveredFile }
                                : f,
                        )
                        : [discoveredFile, ...x],
                );
                setSelected(discoveredFile.id);
                setMessage("FILE ADDED TO LIBRARY");
            }
            setCommand("");
        }
        catch {
            setMessage("TERMINAL CONNECTION FAILED");
        }
    }
    async function root() { const r = await request("/api/terminal/root-access", { method: "POST" }), d = await r.json(); if (r.ok && d.success)
        window.location.assign(d.redirectUrl ?? ROOT);
    else
        setMessage(d.error ?? "ROOT ACCESS REFUSED"); }
    const avatar = () => user?.avatar ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128` : discordIcon;
    const name = user?.global_name || user?.username || "ACCOUNT";
    async function loadAdmin() { const r = await request("/api/terminal/admin/files"), d = await r.json(); if (r.ok)
        setAdminFiles(d.files ?? []); }
    async function openAdmin() { setAdminOpen(true); setDraft(blank); setAdminMessage(""); await loadAdmin(); }
    async function searchAdminUsers(e: FormEvent) {
        e.preventDefault();
        const name = adminUserName.trim();
        if (!name)
            return;
        setAdminUserSearching(true);
        setAdminUserMessage("");
        setAdminSelectedUser(null);
        setAdminDiscoveries([]);
        setAdminTargetRelic(null);
        try {
            const r = await request(`/api/terminal/admin/users?name=${encodeURIComponent(name)}`);
            const d = await r.json();
            if (!r.ok) {
                setAdminUserMessage(d.error ?? "USER SEARCH FAILED");
                setAdminUserMatches([]);
                return;
            }
            setAdminUserMatches(d.users ?? []);
            if (!(d.users ?? []).length)
                setAdminUserMessage("NO USERS FOUND");
        }
        catch {
            setAdminUserMessage("USER SEARCH FAILED");
            setAdminUserMatches([]);
        }
        finally {
            setAdminUserSearching(false);
        }
    }
    async function selectAdminUser(target: AdminUser) {
        setAdminSelectedUser(target);
        setAdminUserMessage("");
        const r = await request(`/api/terminal/admin/users/${target.id}/discoveries`);
        const d = await r.json();
        if (!r.ok) {
            setAdminUserMessage(d.error ?? "DISCOVERY LOOKUP FAILED");
            setAdminDiscoveries([]);
            return;
        }
        setAdminDiscoveries(d.discoveries ?? []);
            setAdminTargetRelic(d.relic ?? null);
    }
    async function setAdminRelicPhase(phase: number) {
        if (!adminSelectedUser) return;
        setAdminUserMessage("");
        try {
            const r = await request(`/api/terminal/admin/users/${adminSelectedUser.id}/relic`, {
                method: "PUT",
                body: JSON.stringify({ phase }),
            });
            const d = await r.json();
            if (!r.ok || !d.success) {
                setAdminUserMessage(d.error ?? "R.E.L.I.C. PHASE UPDATE FAILED");
                return;
            }
            setAdminTargetRelic(d.relic ?? null);
            if (adminSelectedUser.id === user?.id && d.relic) setRelic(d.relic);
            setAdminUserMessage(`R.E.L.I.C. PHASE SET TO ${phase}`);
        }
        catch {
            setAdminUserMessage("R.E.L.I.C. PHASE UPDATE FAILED");
        }
    }
    async function resetAdminDiscovery(discovery: AdminDiscovery) {
        if (!adminSelectedUser)
            return;
        const display = adminSelectedUser.global_name || adminSelectedUser.username;
        if (!confirm(`Reset discovery "${discovery.code}" for ${display}?`))
            return;
        const r = await request(`/api/terminal/admin/users/${adminSelectedUser.id}/discoveries/${discovery.id}`, { method: "DELETE" });
        const d = await r.json();
        if (!r.ok) {
            setAdminUserMessage(d.error ?? "DISCOVERY RESET FAILED");
            return;
        }
        setAdminUserMessage(`DISCOVERY RESET // ${discovery.code}`);
        setAdminDiscoveries(current => current.filter(file => file.id !== discovery.id));
        if (adminSelectedUser.id === user?.id) {
            setFiles(current => current.filter(file => file.id !== discovery.id));
            if (selected === discovery.id)
                setSelected(null);
            if (discovery.code.trim().toUpperCase() === "UH3C")
                setUnknownSignalResolved(false);
        }
    }
    async function save(e: FormEvent) { e.preventDefault(); const path = draft.id === null ? "/api/terminal/admin/files" : `/api/terminal/admin/files/${draft.id}`; const r = await request(path, { method: draft.id === null ? "POST" : "PUT", body: JSON.stringify(draft) }), d = await r.json(); if (!r.ok) {
        setAdminMessage(d.error ?? "FILE SAVE FAILED");
        return;
    } setAdminMessage(draft.id === null ? "FILE CREATED" : "FILE UPDATED"); setDraft(blank); await loadAdmin(); await load(); }
    async function remove(f: FileRow) { if (!confirm(`Delete "${f.title}" permanently?`))
        return; const r = await request(`/api/terminal/admin/files/${f.id}`, { method: "DELETE" }), d = await r.json(); if (!r.ok) {
        setAdminMessage(d.error ?? "FILE DELETE FAILED");
        return;
    } setAdminMessage("FILE DELETED"); setDraft(blank); await loadAdmin(); await load(); }
    if (loading)
        return <main className="terminal-page terminal-loading"><div className="terminal-grid"/><div className="terminal-loading-copy"><img src={cbcLogo} alt=""/><span>CONNECTING TO ARCHIVE_</span></div></main>;
    return <main className={backwashActive ? `terminal-page terminal-backwash terminal-backwash-phase-${backwashPhase}` : "terminal-page"}><div className="terminal-grid"/>
    {backwashActive ? <div className="backwash-overlay" aria-hidden="true"><div className="backwash-scan"/><div className="backwash-noise"/><div className="backwash-slash backwash-slash-a"/><div className="backwash-slash backwash-slash-b"/><div className="backwash-status"><span>BACKWASH // CLEANSE PROTOCOL</span><strong>{backwashPhase < 3 ? "ISOLATING CONTAMINANT" : backwashPhase < 7 ? "PURGING RESIDUAL SIGNAL" : backwashPhase < 9 ? "RESTORING ARCHIVE" : "CLEAN"}</strong></div><div className="backwash-8556" data-text="8556">8556</div></div> : null}
    {relicSwarmActive ? <div className="relic-swarm-overlay" aria-hidden="true"><div className="relic-swarm-vignette"/><div className="relic-swarm-core"/>{Array.from({length:42},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>) }<div className="relic-swarm-copy"><span>SIVA // R.E.L.I.C. CORRUPTION SWARM</span><strong>{relicSwarmMessage}</strong><b>SUCCESS</b></div></div> : null}
    <header className="terminal-topbar"><button className="terminal-brand" onClick={() => { setSelected(null); setAdminOpen(false); }}><img src={cbcLogo} alt=""/><span><strong>CLOVIS BRAY</strong><small>TERMINAL ARCHIVE</small></span></button>
      <div className="terminal-top-actions">{rootUnlocked ? <button className="terminal-root-button" onClick={root}>◆ SIVA // ROOT</button> : null}{admin ? <button className="terminal-admin-button" onClick={openAdmin}>NEW / MANAGE FILES</button> : null}
        <div className="account-container"><button className="account-button" type="button" onClick={() => setAccountOpen(x => !x)}><img src={avatar()} alt={`${name}'s Discord avatar`}/><span>{name}</span></button>{accountOpen && user ? <div className="account-menu"><div className="account-menu-user"><img src={avatar()} alt=""/><div><strong>{name}</strong><span>@{user.username}</span></div></div><div className="account-menu-divider"/><button type="button" className="account-menu-profile" onClick={() => window.location.href = API + "/account"}>Account</button><button type="button" className="account-menu-logout" onClick={() => window.location.href = API + "/api/auth/logout"}>Log Out</button></div> : null}</div>
      </div></header>
    <section className="terminal-command-zone"><form onSubmit={execute}><span>&gt;</span><input ref={input} value={command} onChange={e => { setCommand(e.target.value); if (message)
        setMessage(""); }} placeholder="ENTER TERMINAL CODE" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={backwashActive}/><button disabled={backwashActive}>EXECUTE</button></form><div className="terminal-message">{message || "\u00a0"}</div></section>
    <section className="terminal-workspace"><aside className={mobileFilesOpen ? "terminal-library terminal-library-open" : "terminal-library"}><UnknownSignalAutopost resolved={unknownSignalResolved} /><button type="button" className="terminal-section-heading terminal-library-toggle" onClick={() => setMobileFilesOpen(x => !x)} aria-expanded={mobileFilesOpen}><span>MY FILES</span><span className="terminal-library-toggle-meta"><small>{String(files.length).padStart(2, "0")}</small><b aria-hidden="true">{mobileFilesOpen ? "▲" : "▼"}</b></span></button><div className="terminal-library-list">{files.length === 0 ? <div className="terminal-empty">NO ARCHIVE RECORDS DISCOVERED</div> : files.map(f => <button key={f.id} className={selected === f.id ? "terminal-file-row active" : "terminal-file-row"} onClick={() => { setAdminOpen(false); setSelected(f.id); setMobileFilesOpen(false); }}><span>{f.title}</span><small className="terminal-file-code">CODE // {f.code || "UNKNOWN"}</small><small>{f.classification || "UNCLASSIFIED"}</small></button>)}</div></aside>
      <article className="terminal-reader">{adminOpen && admin ? <div className="terminal-admin"><div className="terminal-reader-header"><div><span>ADMINISTRATOR // USER 1</span><h1>{draft.id === null ? "CREATE TERMINAL FILE" : "EDIT TERMINAL FILE"}</h1></div><button onClick={() => setAdminOpen(false)}>CLOSE</button></div>
        <form className="terminal-admin-form" onSubmit={save}>{(["code", "title", "subtitle", "classification"] as const).map(k => <label key={k}>{k.toUpperCase()}<input value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value })} required={k === "code" || k === "title"}/></label>)}<label className="terminal-admin-content">CONTENT<textarea rows={14} value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })}/></label><div className="terminal-admin-actions"><button>{draft.id === null ? "CREATE FILE" : "SAVE CHANGES"}</button><button type="button" onClick={() => setDraft(blank)}>CLEAR</button></div></form><div className="terminal-message">{adminMessage || "\u00a0"}</div>
        <div className="terminal-admin-existing"><h2>ALL TERMINAL FILES</h2>{adminFiles.length === 0 ? <div className="terminal-empty">DATABASE EMPTY</div> : adminFiles.map(f => <div className="terminal-admin-file-row" key={f.id}><div><strong>{f.title}</strong><small>{f.code}</small></div><button onClick={() => setDraft({ id: f.id, code: f.code ?? "", title: f.title, subtitle: f.subtitle, classification: f.classification, content: f.content })}>EDIT</button><button onClick={() => remove(f)}>DELETE</button></div>)}</div>
        <section className="terminal-admin-user-reset">
          <div className="terminal-admin-user-reset-heading"><span>ACCOUNT DISCOVERY CONTROL</span><h2>RESET USER FILE DISCOVERY</h2><p>Search Discordiny accounts by username or display name, select the account, then reset individual discovered Terminal files.</p></div>
          <form className="terminal-admin-user-search" onSubmit={searchAdminUsers}><label>USER NAME<input value={adminUserName} onChange={e => setAdminUserName(e.target.value)} placeholder="USERNAME OR DISPLAY NAME" autoComplete="off"/></label><button disabled={adminUserSearching || !adminUserName.trim()}>{adminUserSearching ? "SEARCHING..." : "FIND USER"}</button></form>
          <div className="terminal-message">{adminUserMessage || "\u00a0"}</div>
          {adminUserMatches.length > 0 ? <div className="terminal-admin-user-matches">{adminUserMatches.map(target => <button type="button" key={target.id} className={adminSelectedUser?.id === target.id ? "terminal-admin-user-match active" : "terminal-admin-user-match"} onClick={() => void selectAdminUser(target)}><strong>{target.global_name || target.username}</strong><span>@{target.username}</span><small>USER ID {target.id}</small></button>)}</div> : null}
          {adminSelectedUser ? <div className="terminal-admin-user-discoveries"><div className="terminal-admin-user-selected"><div><span>SELECTED ACCOUNT</span><strong>{adminSelectedUser.global_name || adminSelectedUser.username}</strong><small>@{adminSelectedUser.username} // USER ID {adminSelectedUser.id}</small></div><b>{adminDiscoveries.length} DISCOVERED</b></div>
            <div className="terminal-admin-relic-control"><div><span>PROJECT R.E.L.I.C.</span><strong>CURRENT PHASE {adminTargetRelic?.phase ?? "—"} / 5</strong><small>{adminTargetRelic?.phaseName ?? "LOADING RELIC STATE"}</small></div><div className="terminal-admin-relic-buttons">{[1,2,3,4,5].map(phase => <button type="button" key={phase} className={adminTargetRelic?.phase === phase ? "active" : ""} onClick={() => void setAdminRelicPhase(phase)}>PHASE {phase}</button>)}</div></div>
            {adminDiscoveries.length === 0 ? <div className="terminal-empty">NO TERMINAL FILES DISCOVERED</div> : adminDiscoveries.map(discovery => <div className="terminal-admin-discovery-row" key={discovery.id}><div><strong>{discovery.title}</strong><span>CODE // {discovery.code}</span><small>{discovery.classification || "UNCLASSIFIED"}</small></div><button type="button" onClick={() => void resetAdminDiscovery(discovery)}>RESET DISCOVERY</button></div>)}</div> : null}
        </section></div>
            : current ? <><div className="terminal-reader-header"><div><span>{current.classification || "UNCLASSIFIED"}</span><h1>{current.title}</h1>{current.subtitle ? <p>{current.subtitle}</p> : null}</div><small>RECORD {String(current.id).padStart(4, "0")}</small></div><div className="terminal-document">{document(current.content)}</div></>
                : <div className="terminal-reader-empty"><img src={cbcLogo} alt=""/><span>CLOVIS BRAY // ARCHIVE</span><p>ENTER AN ACCESS CODE OR SELECT A DISCOVERED FILE.</p></div>}</article>
      {relic ? <aside className={relic.complete ? "terminal-relic terminal-relic-complete" : "terminal-relic"} aria-label="Project R.E.L.I.C. progression">
        <div className="terminal-relic-scan" aria-hidden="true"/>
        <div className="terminal-relic-heading"><span>PROJECT R.E.L.I.C.</span><b>PHASE {String(relic.phase).padStart(2, "0")} / 05</b></div>
        <div className="terminal-relic-image-wrap"><img src={relicStageImages[Math.max(0, Math.min(4, relic.phase - 1))]} alt={`R.E.L.I.C. ${relic.phaseName}`}/></div>
        <div className="terminal-relic-phase"><small>CURRENT STATE</small><strong>{relic.phaseName}</strong></div>
        <div className="terminal-relic-code"><small>EMBLEM DECRYPTION // {relic.revealedCount}/12</small><code>{relic.maskedCode}</code></div>
        {relic.complete && relic.final ? <div className="terminal-relic-final">
          <div><small>TYPE</small><code>{relic.final.type}</code></div>
          <div><small>KEY</small><code>{relic.final.key}</code></div>
          <div><small>CIPHER</small><code>{relic.final.cipher}</code></div>
        </div> : <div className="terminal-relic-locked">ADDITIONAL DATA LOCKED // ADVANCE R.E.L.I.C. PHASE</div>}
      </aside> : null}
    </section></main>;
}

