import { useEffect, useState, type ReactNode } from "react";
import TopBar from "./TopBar";
import background from "../assets/background.jpg";
import { PREVIEW_CLOSED, PREVIEW_REGULAR, isPreviewEnabled, setPreviewEnabled } from "./betaPreview";

type BetaStatus = { active: boolean; hasAccess: boolean; isAdmin: boolean; betaEnvironment: boolean };

export default function BetaAccessGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewTick, setPreviewTick] = useState(0);
  useEffect(() => { const update = () => setPreviewTick(t => t + 1); window.addEventListener("discordiny-preview-changed", update); return () => window.removeEventListener("discordiny-preview-changed", update); }, []);
  useEffect(() => {
    let mounted = true;
    fetch("/api/beta/status", { credentials: "include", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Beta status unavailable");
        return response.json() as Promise<BetaStatus>;
      })
      .then(value => { if (mounted) setStatus(value); })
      .catch(() => { if (mounted) setStatus(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const admin = status?.isAdmin === true;
  const previewClosed = admin && isPreviewEnabled(PREVIEW_CLOSED);
  const previewRegular = admin && isPreviewEnabled(PREVIEW_REGULAR);
  void previewTick;
  if (!loading && status?.betaEnvironment && status.active && !previewClosed && ((admin && !previewRegular) || (!previewRegular && status.hasAccess))) {
    return <>{children}</>;
  }

  const closed = status?.betaEnvironment && (status.active === false || previewClosed);
  return <>
    <TopBar />
    <main style={{ minHeight: "100dvh", padding: "150px 24px 80px", boxSizing: "border-box", backgroundImage: `linear-gradient(rgba(7,8,13,.82),rgba(7,8,13,.94)),url("${background}")`, backgroundSize: "cover", backgroundPosition: "center", color: "#fff", textAlign: "center" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "36px 22px", background: "rgba(10,12,19,.88)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 12 }}>
        <p style={{ letterSpacing: ".22em", color: "#c4a28b" }}>DISCORDINY // RESTRICTED ACCESS</p>
        <h1 style={{ fontSize: "clamp(2rem,6vw,4rem)", margin: "16px 0" }}>DISCORDINY BETA</h1>
        <h2>{loading ? "CHECKING ACCESS…" : closed ? "BETA CURRENTLY DISABLED" : "BETA ACCESS REQUIRED"}</h2>
        <p>{loading ? "Verifying your beta invitation." : closed ? "The beta has been disabled. All beta pages and gameplay are unavailable, including for administrators." : "Enter your 15-digit invitation code in your production Discordiny Account page to gain access."}</p>
        {!closed && !loading && <a href="https://discordiny.com/account" style={{ display: "inline-block", marginTop: 18, padding: "12px 22px", border: "1px solid #c4a28b", borderRadius: 6, color: "#fff", textDecoration: "none" }}>ENTER CODE IN ACCOUNT FOR ACCESS</a>}
        {admin && (previewClosed || previewRegular) && <button type="button" onClick={() => { setPreviewEnabled(PREVIEW_CLOSED, false); setPreviewEnabled(PREVIEW_REGULAR, false); window.location.href = "/"; }} style={{ padding: "10px 18px", cursor: "pointer" }}>Exit preview / Restore admin view</button>}
        <p style={{ opacity: .6, fontSize: 13, marginTop: 24 }}>Navigation remains available above. Restricted pages will not load until beta access is enabled.</p>
      </div>
    </main>
  </>;
}
