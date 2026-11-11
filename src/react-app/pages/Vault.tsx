import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import { fetchProfileSnapshot } from "../lib/profileRequest";
import ArsenalLayout from "../components/arsenal/ArsenalLayout";
import VaultMaterials from "../components/arsenal/VaultMaterials";
import WeaponVault, { WeaponTierControl, type WeaponTier } from "./WeaponVault";
import { VAULT_CATEGORIES, type VaultCategory } from "../data/vaultCategories";
import "./Vault.css";

type VaultProfileResponse = {
  authenticated: boolean;
  currencies: Record<string, number>;
  upgradeMaterials: Record<string, number>;
};

function Vault() {
  const [profile, setProfile] = useState<VaultProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<VaultCategory | null>(null);
  const [activitySlug, setActivitySlug] = useState<string | undefined>();
  const [animationKey, setAnimationKey] = useState(0);
  const [tier, setTier] = useState<WeaponTier>("normal");
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchProfileSnapshot<VaultProfileResponse>();
        if (!result.authenticated) throw new Error("You must be logged in to view your Vault.");
        if (active) setProfile(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load Vault.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!category) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Weapon Masterwork dialog, when open, owns Escape handling.
        if (document.querySelector(".weapon-masterwork-backdrop")) return;
        setCategory(null);
      }
      if (event.key === "Tab") {
        const modal = document.querySelector<HTMLElement>(".vault-collection-dialog");
        const focusables = modal?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [category]);

  function openCategory(next: VaultCategory, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setCategory(next);
    setActivitySlug(next.activities?.[0]?.slug);
    setTier("normal");
    setAnimationKey((value) => value + 1);
  }

  function selectActivity(slug: string) {
    if (slug === activitySlug) return;
    setActivitySlug(slug);
    setAnimationKey((value) => value + 1);
  }

  const selectedActivity = category?.activities?.find((item) => item.slug === activitySlug);
  const hasCollection = Boolean(category?.directSource || selectedActivity);

  return (
    <div className="vault-screen">
      <TopBar />
      <div className="vault-page">
        {loading ? <div className="vault-status">Loading Vault...</div> : error || !profile ? (
          <div className="vault-status vault-status-error">{error || "Failed to load Vault."}</div>
        ) : (
          <ArsenalLayout left={<VaultMaterials currencies={profile.currencies} upgradeMaterials={profile.upgradeMaterials} />}>
            <div className="vault-content">
              <section className="vault-block vault-legendary">
                <div className="vault-block-header"><div>
                  <span className="vault-eyebrow">ARSENAL</span>
                  <h1>Legendary Vault</h1>
                  <p>Select a collection to open its weapon archives.</p>
                </div></div>
                <div className="vault-category-grid">
                  {VAULT_CATEGORIES.map((item) => (
                    <button key={item.slug} type="button" className="vault-category"
                      onClick={(event) => openCategory(item, event.currentTarget)}>
                      <span className="vault-category-name">{item.name}</span>
                      <span className="vault-category-description">{item.description}</span>
                      <span className="vault-category-arrow">›</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="vault-block vault-exotic">
                <div className="vault-block-header"><div>
                  <span className="vault-eyebrow">ARSENAL</span>
                  <h2>Exotic Vault</h2>
                  <p>Exotic weapon collection.</p>
                </div></div>
                <div className="vault-coming-soon"><span>EXOTIC VAULT</span><strong>COMING SOON</strong></div>
              </section>
            </div>
          </ArsenalLayout>
        )}
      </div>
      {category && (
        <div className="vault-collection-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCategory(null);
        }}>
          <section className="vault-collection-dialog" role="dialog" aria-modal="true" aria-labelledby="vault-dialog-title">
            <header className="vault-collection-header">
              <div className="vault-collection-title"><span className="vault-eyebrow">LEGENDARY ARCHIVES</span><h2 id="vault-dialog-title">{category.name}</h2><p>{category.description}</p></div>
              <WeaponTierControl tier={tier} onChange={setTier} />
              <button ref={closeRef} type="button" className="vault-collection-close" aria-label="Close collection" onClick={() => setCategory(null)}>×</button>
            </header>
            {Boolean(category.activities?.length) && (
              <nav className="vault-collection-activities" aria-label={`${category.name} loot pools`}>
                {category.activities?.map((activity) => (
                  <button key={activity.slug} type="button" aria-pressed={activity.slug === activitySlug}
                    className={activity.slug === activitySlug ? "vault-activity-tab active" : "vault-activity-tab"}
                    onClick={() => selectActivity(activity.slug)}>{activity.name}</button>
                ))}
              </nav>
            )}
            <div className="vault-collection-body">
              {hasCollection ? (
                <div className="vault-collection-swoosh" key={`${category.slug}-${animationKey}`}>
                  <WeaponVault embedded selectedTier={tier} onTierChange={setTier} categorySlug={category.slug} activitySlug={selectedActivity?.slug} />
                </div>
              ) : <div className="vault-collection-empty">This collection does not have any configured loot pools yet.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Vault;
