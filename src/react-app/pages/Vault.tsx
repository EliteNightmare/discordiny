import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import ArsenalLayout from "../components/arsenal/ArsenalLayout";
import VaultMaterials from "../components/arsenal/VaultMaterials";
import WeaponVault, { WeaponTierControl, type WeaponTier } from "./WeaponVault";
import { VAULT_CATEGORIES, type VaultCategory } from "../data/vaultCategories";
import "./Vault.css";

const isAdeptFavorite = (name: string) => /\((Adept|Timelost|Harrowed)\)\s*$/i.test(name);
type VaultRecentWeapon = { name: string; source: string; masterwork: number; acquiredAt: string };
type VaultOverview = {
  recent: VaultRecentWeapon[];
  favorites: string[];
  favoriteWeapons: { name: string; source: string }[];
  sources: Record<string, { normal: { owned: number; total: number; maxed: number }; adept: { owned: number; total: number; maxed: number } }>;
};
const weaponIcons = import.meta.glob('../assets/icons/weapons/**/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
function weaponIcon(source: string, name: string): string | undefined {
  const suffix = `/icons/weapons/${source.toLowerCase()}/${name.toLowerCase()}.png`;
  return Object.entries(weaponIcons).find(([path]) => path.toLowerCase().replace(/\\/g, '/').endsWith(suffix))?.[1];
}
function sourceLocation(source: string): { category: VaultCategory; activity?: string } | null {
  for (const category of VAULT_CATEGORIES) {
    if (category.directSource?.toLowerCase() === source.toLowerCase()) return { category };
    const activity = category.activities?.find(item => item.weaponSource.toLowerCase() === source.toLowerCase());
    if (activity) return { category, activity: activity.slug };
  }
  return null;
}
type VaultProfileResponse = {
  authenticated: boolean;
  currencies: Record<string, number>;
  upgradeMaterials: Record<string, number>;
};

function Vault() {
  const [overview, setOverview] = useState<VaultOverview | null>(null);
  const [overviewError, setOverviewError] = useState('');
  const [favoritesBusy, setFavoritesBusy] = useState(false);
  const [focusWeapon, setFocusWeapon] = useState<string | undefined>();
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
        const response = await fetch("/api/game/profile", { credentials: "include" });
        const result = (await response.json()) as VaultProfileResponse;
        if (!response.ok || !result.authenticated) throw new Error("You must be logged in to view your Vault.");
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
    let active = true;
    fetch('/api/game/vault/overview', { credentials: 'include' })
      .then(async response => { if (!response.ok) throw new Error('Vault overview unavailable'); return response.json() as Promise<VaultOverview>; })
      .then(data => { if (active) setOverview(data); })
      .catch(() => { if (active) setOverviewError('Recent drops and favorites are unavailable. Apply the included D1 migration.'); });
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
    setFocusWeapon(undefined);
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

  function jumpToWeapon(weapon: VaultRecentWeapon | { name: string; source: string }) {
    const location = sourceLocation(weapon.source);
    if (!location) return;
    setCategory(location.category);
    setActivitySlug(location.activity);
    setTier(/\((Adept|Timelost|Harrowed)\)$/i.test(weapon.name) ? 'adept' : 'normal');
    setFocusWeapon(weapon.name);
    setAnimationKey(value => value + 1);
  }

  async function toggleFavorite(name: string) {
    if (favoritesBusy || !overview) return;
    setFavoritesBusy(true);
    try {
      const response = await fetch('/api/game/vault/favorites', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weaponName: name, favorite: !overview.favorites.includes(name) }),
      });
      const data = await response.json() as { favorites?: string[]; favoriteWeapons?: { name: string; source: string }[]; error?: string };
      if (!response.ok || !data.favorites) throw new Error(data.error || 'Could not update favorites');
      setOverview(current => current ? { ...current, favorites: data.favorites!, favoriteWeapons: data.favoriteWeapons ?? current.favoriteWeapons } : current);
      setOverviewError('');
    } catch (error) { setOverviewError(error instanceof Error ? error.message : 'Could not update favorites'); }
    finally { setFavoritesBusy(false); }
  }

  const selectedActivity = category?.activities?.find((item) => item.slug === activitySlug);
  const selectedSource = selectedActivity?.weaponSource ?? category?.directSource;
  const selectedStats = selectedSource ? overview?.sources[selectedSource.toLowerCase()]?.[tier] : undefined;
  const hasCollection = Boolean(category?.directSource || selectedActivity);

  return (
    <div className="vault-screen">
      <TopBar />
      <div className="vault-page">
        {loading ? <div className="vault-status">Loading Vault...</div> : error || !profile ? (
          <div className="vault-status vault-status-error">{error || "Failed to load Vault."}</div>
        ) : (
          <ArsenalLayout left={<VaultMaterials currencies={profile.currencies} upgradeMaterials={profile.upgradeMaterials} />}
            right={<aside className="vault-recent-panel">
              <div className="vault-recent-column"><span className="vault-eyebrow">WEAPON HISTORY</span>
              <h2>Recent Drops</h2>
              <p>Last 10 newly acquired weapons</p>
              {overviewError && <p className="vault-overview-error">{overviewError}</p>}
              {!overview && !overviewError && <p>Loading...</p>}
              {overview?.recent.length === 0 && <p>No recorded drops yet.</p>}
              {overview?.recent.map((weapon, index) => <button type="button" key={`${weapon.name}-${index}`} className="vault-recent-item" onClick={() => jumpToWeapon(weapon)}>
                {weaponIcon(weapon.source, weapon.name) ? <img src={weaponIcon(weapon.source, weapon.name)} alt="" /> : <span className="vault-recent-placeholder">◆</span>}
                <span><strong>{weapon.name}</strong><small>{sourceLocation(weapon.source)?.category.name ?? weapon.source}</small></span>
                <span aria-hidden="true">›</span>
              </button>)}
              </div>
              <div className="vault-favorites-column">
              <span className="vault-eyebrow">PINNED WEAPONS</span>
              <h2>Favorites</h2>
              <p>4 Normal · 4 Adept</p>
              <div className="vault-favorites-header"><h3>Normal</h3><span>{overview?.favorites.filter(name => !isAdeptFavorite(name)).length ?? 0}/4</span></div>
              {overview?.favorites.filter(name => !isAdeptFavorite(name)).length === 0 && <p>No Normal favorites yet.</p>}
              {overview?.favorites.filter(name => !isAdeptFavorite(name)).map(name => {
                const weapon = overview.favoriteWeapons.find(item => item.name === name);
                const icon = weapon ? weaponIcon(weapon.source, weapon.name) : undefined;
                return <div className="vault-favorite-item" key={name}>
                  <button type="button" className="vault-recent-item vault-favorite-link" disabled={!weapon} onClick={() => weapon && jumpToWeapon(weapon)}>
                    {icon ? <img src={icon} alt="" /> : <span className="vault-recent-placeholder">◆</span>}
                    <span><strong>{name}</strong><small>{weapon ? (sourceLocation(weapon.source)?.category.name ?? weapon.source) : 'Weapon unavailable'}</small></span>
                    <span aria-hidden="true">›</span>
                  </button>
                  <button type="button" className="vault-favorite-remove" aria-label={`Unfavorite ${name}`} title="Remove from favorites" disabled={favoritesBusy} onClick={() => void toggleFavorite(name)}>★</button>
                </div>;
              })}
              <div className="vault-favorites-header"><h3>Adept</h3><span>{overview?.favorites.filter(isAdeptFavorite).length ?? 0}/4</span></div>
              {overview?.favorites.filter(isAdeptFavorite).length === 0 && <p>No Adept favorites yet.</p>}
              {overview?.favorites.filter(isAdeptFavorite).map(name => {
                const weapon = overview.favoriteWeapons.find(item => item.name === name);
                const icon = weapon ? weaponIcon(weapon.source, weapon.name) : undefined;
                return <div className="vault-favorite-item" key={name}>
                  <button type="button" className="vault-recent-item vault-favorite-link" disabled={!weapon} onClick={() => weapon && jumpToWeapon(weapon)}>
                    {icon ? <img src={icon} alt="" /> : <span className="vault-recent-placeholder">◆</span>}
                    <span><strong>{name}</strong><small>{weapon ? (sourceLocation(weapon.source)?.category.name ?? weapon.source) : 'Weapon unavailable'}</small></span>
                    <span aria-hidden="true">›</span>
                  </button>
                  <button type="button" className="vault-favorite-remove" aria-label={`Unfavorite ${name}`} title="Remove from favorites" disabled={favoritesBusy} onClick={() => void toggleFavorite(name)}>★</button>
                </div>;
              })}
              </div>
            </aside>}>
            <div className="vault-content">
              <section className="vault-block vault-legendary">
                <div className="vault-block-header"><div>
                  <span className="vault-eyebrow">ARSENAL</span>
                  <h1>Legendary Vault</h1>
                  <p>Select a collection to open its weapon archives.</p>
                </div></div>
                <div className="vault-category-grid">
                  {[...VAULT_CATEGORIES.filter((item) => item.slug !== "fishing"), ...VAULT_CATEGORIES.filter((item) => item.slug === "fishing")].map((item) => {
                    const sources = item.directSource ? [item.directSource] : (item.activities ?? []).map(activity => activity.weaponSource);
                    const rows = sources.map(source => overview?.sources[source.toLowerCase()]).filter((row): row is NonNullable<typeof row> => Boolean(row));
                    const owned = rows.reduce((sum, row) => sum + row.normal.owned + row.adept.owned, 0);
                    const total = rows.reduce((sum, row) => sum + row.normal.total + row.adept.total, 0);
                    const maxed = rows.reduce((sum, row) => sum + row.normal.maxed + row.adept.maxed, 0);
                    const complete = overview && total > 0 && rows.length === sources.length && owned >= total;
                    const mastered = complete && maxed >= total;
                    return (
                    <button key={item.slug} type="button" className={`vault-category${mastered ? " vault-category-mastered" : complete ? " vault-category-complete" : ""}`}
                      onClick={(event) => openCategory(item, event.currentTarget)}>
                      <span className="vault-category-name">{item.name}</span>
                      <span className="vault-category-stats">{overview ? `${owned}/${total} UNLOCKED · ${maxed}/${total} MAXED` : 'LOADING COLLECTION'}</span>
                      <span className="vault-category-arrow">›</span>
                    </button>
                    );
                  })}
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
              {selectedStats && <span className="vault-dialog-stats">{selectedStats.owned}/{selectedStats.total} UNLOCKED · {selectedStats.maxed}/{selectedStats.total} MAXED</span>}
              <WeaponTierControl tier={tier} onChange={setTier} />
              <button ref={closeRef} type="button" className="vault-collection-close" aria-label="Close collection" onClick={() => setCategory(null)}>×</button>
            </header>
            {Boolean(category.activities?.length) && (
              <nav className="vault-collection-activities" aria-label={`${category.name} loot pools`}>
                {category.activities?.map((activity) => (
                  (() => {
                    const source = overview?.sources[activity.weaponSource.toLowerCase()];
                    // Subcategory tabs reflect the tier currently being viewed.
                    // A fully masterworked Adept set should not depend on Normal weapons.
                    const stats = source?.[tier];
                    const total = stats?.total ?? 0;
                    const owned = stats?.owned ?? 0;
                    const maxed = stats?.maxed ?? 0;
                    const complete = total > 0 && owned >= total;
                    const mastered = complete && maxed >= total;
                    return (
                      <button key={activity.slug} type="button" aria-pressed={activity.slug === activitySlug}
                        className={`vault-activity-tab${activity.slug === activitySlug ? " active" : ""}${mastered ? " vault-activity-tab-mastered" : complete ? " vault-activity-tab-complete" : ""}`}
                        onClick={() => selectActivity(activity.slug)}>
                        {activity.name}
                        {stats && <small className="vault-tab-stats">{stats.owned}/{stats.total} UNLOCKED · {stats.maxed}/{stats.total} MAXED</small>}
                      </button>
                    );
                  })()
                ))}
              </nav>
            )}
            <div className="vault-collection-body">
              {hasCollection ? (
                <div className="vault-collection-swoosh" key={`${category.slug}-${animationKey}`}>
                  <WeaponVault embedded focusWeapon={focusWeapon} favorites={overview?.favorites ?? []} onToggleFavorite={toggleFavorite} selectedTier={tier} onTierChange={setTier} categorySlug={category.slug} activitySlug={selectedActivity?.slug} />
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
