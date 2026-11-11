import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import { fetchProfileSnapshot } from "../lib/profileRequest";
import ArsenalLayout from "../components/arsenal/ArsenalLayout";
import VaultMaterials from "../components/arsenal/VaultMaterials";
import WeaponVault, { WeaponTierControl, type WeaponTier } from "./WeaponVault";
import { VAULT_CATEGORIES, type VaultCategory } from "../data/vaultCategories";
import "./Vault.css";
import "./VaultCollections.css";

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
  const [category, setCategory] = useState<VaultCategory>(VAULT_CATEGORIES[0]);
  const [activitySlug, setActivitySlug] = useState<string | undefined>(VAULT_CATEGORIES[0].activities?.[0]?.slug);
  const [animationKey, setAnimationKey] = useState(0);
  const [tier, setTier] = useState<WeaponTier>("normal");
  const [mobileQuickView, setMobileQuickView] = useState<"closed" | "recent" | "favorites">("closed");

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
    let active = true;
    fetch('/api/game/vault/overview', { credentials: 'include' })
      .then(async response => { if (!response.ok) throw new Error('Vault overview unavailable'); return response.json() as Promise<VaultOverview>; })
      .then(data => { if (active) setOverview(data); })
      .catch(() => { if (active) setOverviewError('Recent drops and favorites are unavailable. Apply the included D1 migration.'); });
    return () => { active = false; };
  }, []);

  function openCategory(next: VaultCategory) {
    setFocusWeapon(undefined);
    setCategory(next);
    setActivitySlug(next.activities?.[0]?.slug);
    setTier("normal");
    setAnimationKey(value => value + 1);
  }

  function selectActivity(slug: string) {
    if (slug === activitySlug) return;
    setFocusWeapon(undefined);
    setActivitySlug(slug);
    setAnimationKey(value => value + 1);
  }

  function jumpToWeapon(weapon: VaultRecentWeapon | { name: string; source: string }) {
    setMobileQuickView("closed");
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

  const selectedActivity = category.activities?.find((item) => item.slug === activitySlug);
  const selectedSource = selectedActivity?.weaponSource ?? category.directSource;
  const selectedStats = selectedSource ? overview?.sources[selectedSource.toLowerCase()]?.[tier] : undefined;
  const hasCollection = Boolean(category.directSource || selectedActivity);

  const renderRecent = (limit: number) => (
    <div className="vault-recent-column"><span className="vault-eyebrow">WEAPON HISTORY</span>
              <h2>Recent Drops</h2>
              <p>Latest acquired weapons</p>
              {overviewError && <p className="vault-overview-error">{overviewError}</p>}
              {!overview && !overviewError && <p>Loading...</p>}
              {overview?.recent.length === 0 && <p>No recorded drops yet.</p>}
              {overview?.recent.slice(0, limit).map((weapon, index) => <button type="button" key={`${weapon.name}-${index}`} className="vault-recent-item" onClick={() => jumpToWeapon(weapon)}>
                {weaponIcon(weapon.source, weapon.name) ? <img src={weaponIcon(weapon.source, weapon.name)} alt="" /> : <span className="vault-recent-placeholder">◆</span>}
                <span><strong>{weapon.name}</strong><small>{sourceLocation(weapon.source)?.category.name ?? weapon.source}</small></span>
                <span aria-hidden="true">›</span>
              </button>)}
              </div>
  );

  const renderFavorites = () => (
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
  );

  return (
    <div className="vault-screen">
      <TopBar />
      <div className="vault-page">
        {loading ? <div className="vault-status">Loading Vault...</div> : error || !profile ? (
          <div className="vault-status vault-status-error">{error || "Failed to load Vault."}</div>
        ) : (
          <ArsenalLayout left={<VaultMaterials currencies={profile.currencies} upgradeMaterials={profile.upgradeMaterials} />}
            right={<aside className="vault-recent-panel collections-desktop-history">{renderRecent(10)}{renderFavorites()}</aside>}>
            <div className="collections-page">
              <div className="collections-topline"><span className="collections-emblem">✦</span><div><span className="vault-eyebrow">ARSENAL / COLLECTIONS</span><h1>WEAPON COLLECTIONS</h1></div></div>
              <div className="collections-mobile-quick" aria-label="Recent drops and favourites">
                <div className="collections-quick-controls">
                  <button type="button" aria-expanded={mobileQuickView === "recent"} className={mobileQuickView === "recent" ? "active" : ""} onClick={() => setMobileQuickView(v => v === "recent" ? "closed" : "recent")}>Recent Drops <span>▾</span></button>
                  <button type="button" aria-expanded={mobileQuickView === "favorites"} className={mobileQuickView === "favorites" ? "active" : ""} onClick={() => setMobileQuickView(v => v === "favorites" ? "closed" : "favorites")}>Favourites <span>▾</span></button>
                </div>
                {mobileQuickView !== "closed" && <div className="collections-quick-panel">
                  {mobileQuickView === "recent" ? renderRecent(5) : renderFavorites()}
                </div>}
              </div>
              <div className="collections-layout">
                <nav className="collections-main-nav" aria-label="Collection categories">
                  <span className="collections-label">CATEGORIES</span>
                  {VAULT_CATEGORIES.map(item => {
                    const sources = item.directSource ? [item.directSource] : (item.activities ?? []).map(a => a.weaponSource);
                    const rows = sources.map(source => overview?.sources[source.toLowerCase()]).filter((row): row is NonNullable<typeof row> => Boolean(row));
                    const total = rows.reduce((n,row) => n + row.normal.total + row.adept.total, 0);
                    const owned = rows.reduce((n,row) => n + row.normal.owned + row.adept.owned, 0);
                    const maxed = rows.reduce((n,row) => n + row.normal.maxed + row.adept.maxed, 0);
                    return <button key={item.slug} type="button" aria-current={category.slug === item.slug ? "page" : undefined}
                      className={`collections-category${category.slug === item.slug ? " selected" : ""}${total > 0 && maxed >= total && rows.length === sources.length ? " mastered" : ""}`}
                      onClick={() => openCategory(item)}><strong>{item.name.toUpperCase()}</strong>
                      {overview && total > 0 && <small>{owned >= total ? `${maxed}/${total} MAXED` : `${owned}/${total} UNLOCKED`}</small>}
                    </button>;
                  })}
                </nav>
                <div className="collections-main">
                  <header className="collections-heading"><div><span className="vault-eyebrow">{category.name.toUpperCase()} / {selectedActivity?.group?.toUpperCase() ?? "COLLECTIONS"}</span><h2>{selectedActivity?.name ?? category.name}</h2></div><WeaponTierControl tier={tier} onChange={setTier} /></header>
                  <div className="collections-workspace">
                    <nav className="collections-subnav" aria-label={`${category.name} loot pools`}>
                      <span className="collections-label">{category.name.toUpperCase()}</span>
                      {category.activities?.map((activity, index) => {
                        const stats = overview?.sources[activity.weaponSource.toLowerCase()]?.[tier];
                        const complete = Boolean(stats && stats.total > 0 && stats.owned >= stats.total);
                        const mastered = Boolean(complete && stats && stats.maxed >= stats.total);
                        const groupStart = Boolean(activity.group && (index === 0 || category.activities?.[index - 1]?.group !== activity.group));
                        return <div key={activity.slug}>
                          {groupStart && <div className="collections-subgroup">{activity.group}</div>}
                          <button type="button" aria-pressed={activity.slug === activitySlug}
                            className={`collections-subcategory${activity.slug === activitySlug ? " selected" : ""}${mastered ? " mastered" : complete ? " complete" : ""}`}
                            onClick={() => selectActivity(activity.slug)}><span>{activity.name}</span>
                            {stats && stats.total > 0 && <small>{complete ? `${stats.maxed}/${stats.total} MAXED` : `${stats.owned}/${stats.total} UNLOCKED`}</small>}
                          </button>
                        </div>;
                      })}
                      {!category.activities?.length && <p className="collections-empty">Collections coming soon.</p>}
                    </nav>
                    <div className="collections-grid-panel">
                      {selectedStats && selectedStats.total > 0 && <div className="collections-progress">{selectedStats.owned >= selectedStats.total ? `${selectedStats.maxed}/${selectedStats.total} MAXED` : `${selectedStats.owned}/${selectedStats.total} UNLOCKED`}</div>}
                      {hasCollection && (selectedActivity || category.directSource) ? <div key={`${category.slug}-${animationKey}`} className="collections-weapon-content">
                        <WeaponVault embedded focusWeapon={focusWeapon} favorites={overview?.favorites ?? []} onToggleFavorite={toggleFavorite} selectedTier={tier} onTierChange={setTier} categorySlug={category.slug} activitySlug={selectedActivity?.slug} />
                      </div> : <div className="collections-empty">No weapon collections configured yet.</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ArsenalLayout>
        )}
      </div>
    </div>
  );
}

export default Vault;
