import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import { fetchProfileSnapshot } from "../lib/profileRequest";
import ArsenalLayout from "../components/arsenal/ArsenalLayout";
import WeaponVault, { type WeaponTier } from "./WeaponVault";
import { VAULT_CATEGORIES, type VaultCategory } from "../data/vaultCategories";
import "./Vault.css";
import "./VaultCollections.css";

const SHORT_NAMES: Record<string, string> = {
  "Infiltrations":"Infils", "Pinnacle Showdowns":"Showdowns", "Daily Showdowns":"Showdowns", "Daily Dungeons":"Dungeons", "Daily Raids":"Raids",
  "Vow of the Disciple":"VotD", "Vault of Glass":"VoG", "Last Wish":"LW", "Leviathan":"Levi", "Cosmodrome":"Cosmo", "European Dead Zone":"EDZ",
  "Dreaming City":"DreamingC", "The Pale Heart":"PaleH", "Neomuna":"Neom", "Throne World":"ThroneW", "Warlord's Ruin":"WR",
  "Eater of Worlds":"EoW", "Crown of Sorrow":"CoS", "Spire of Stars":"SoS", "Grasp of Avarice":"GoA", "Spire of the Watcher":"SotW",
  "King's Fall":"KF", "Crota's End":"CE", "Garden of Salvation":"GoS", "Deepstone Crypt":"DSC", "Root of Nightmares":"RoN",
  "Salvation's Edge":"SE", "Scourge of the Past":"SotP", "Ghosts of the Deep":"GotD", "Shattered Throne":"ST", "Pit of Heresy":"PoH",
  "Vesper's Host":"VH", "Sundered Doctrine":"SD", "Battlegrounds":"BGs", "Empire Hunt":"Empire", "Nightmare Hunt":"Nightmare",
  "Exo Challenge":"Exo", "Great Hunt":"Hunt", "Lucent Fireteam":"Lucent", "Kells Contest":"Kells", "The Nether":"Nether",
  "Grandmasters":"GMs", "Nightfalls":"NFs", "Plaguelands":"Plague", "Equilibrium":"EQ", "Ultimate DP":"UDP",
};
const shortName = (name: string) => SHORT_NAMES[name] ?? name;
const isAdeptFavorite = (name: string) => /\((Adept|Timelost|Harrowed)\)\s*$/i.test(name);
type VaultRecentWeapon = { name: string; source: string; masterwork: number; acquiredAt: string };
type VaultOverview = {
  recent: VaultRecentWeapon[];
  favorites: string[];
  favoriteWeapons: { name: string; source: string; masterwork?: number }[];
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
  const [activeGroup, setActiveGroup] = useState<string | null>(VAULT_CATEGORIES[0].activities?.[0]?.group ?? null);
  const pendingScrollY = useRef<number | null>(null);

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

  useEffect(() => {
    const refreshAfterMasterwork = () => {
      void fetch('/api/game/vault/overview', { credentials: 'include' })
        .then(response => response.ok ? response.json() as Promise<VaultOverview> : Promise.reject(new Error('Vault refresh failed')))
        .then(data => setOverview(data))
        .catch(() => { /* Keep existing collection data if refresh fails. */ });
    };
    window.addEventListener('discordiny:weapon-masterworked', refreshAfterMasterwork);
    return () => window.removeEventListener('discordiny:weapon-masterworked', refreshAfterMasterwork);
  }, []);

  // Preserve viewport when swapping collections with different weapon counts.
  useEffect(() => {
    if (pendingScrollY.current === null) return;
    const previous = pendingScrollY.current;
    pendingScrollY.current = null;
    requestAnimationFrame(() => window.scrollTo({ top: previous, behavior: "instant" }));
  }, [category, activitySlug]);

  function openCategory(next: VaultCategory) {
    pendingScrollY.current = window.scrollY;
    setFocusWeapon(undefined);
    setCategory(next);
    setActivitySlug(next.activities?.[0]?.slug);
    setActiveGroup(next.activities?.[0]?.group ?? null);
    setTier("normal");
    setAnimationKey(value => value + 1);
  }

  function selectActivity(slug: string) {
    if (slug === activitySlug) return;
    pendingScrollY.current = window.scrollY;
    setFocusWeapon(undefined);
    setActivitySlug(slug);
    setAnimationKey(value => value + 1);
  }

  function jumpToWeapon(weapon: VaultRecentWeapon | { name: string; source: string }) {
    const location = sourceLocation(weapon.source);
    if (!location) return;
    setCategory(location.category);
    setActiveGroup(location.category.activities?.find(a => a.slug === location.activity)?.group ?? null);
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
      const data = await response.json() as { favorites?: string[]; favoriteWeapons?: { name: string; source: string; masterwork?: number }[]; error?: string };
      if (!response.ok || !data.favorites) throw new Error(data.error || 'Could not update favorites');
      setOverview(current => current ? { ...current, favorites: data.favorites!, favoriteWeapons: data.favoriteWeapons ?? current.favoriteWeapons } : current);
      setOverviewError('');
    } catch (error) { setOverviewError(error instanceof Error ? error.message : 'Could not update favorites'); }
    finally { setFavoritesBusy(false); }
  }

  const groups = Array.from(new Set((category.activities ?? []).map(activity => activity.group).filter((group): group is string => Boolean(group))));
  const visibleActivities = groups.length ? category.activities?.filter(activity => activity.group === (activeGroup ?? groups[0])) : category.activities;
  const normalFavorites = overview?.favorites.filter(name => !isAdeptFavorite(name)) ?? [];
  const adeptFavorites = overview?.favorites.filter(isAdeptFavorite) ?? [];
  const selectedActivity = category.activities?.find((item) => item.slug === activitySlug);
  const selectedSource = selectedActivity?.weaponSource ?? category.directSource;
  const selectedSourceStats = selectedSource ? overview?.sources[selectedSource.toLowerCase()] : undefined;
  const selectedStats = selectedSourceStats ? { total: selectedSourceStats.normal.total + selectedSourceStats.adept.total, owned: selectedSourceStats.normal.owned + selectedSourceStats.adept.owned, maxed: selectedSourceStats.normal.maxed + selectedSourceStats.adept.maxed } : undefined;
  const hasCollection = Boolean(category.directSource || selectedActivity);

  const recentWeapons = overview?.recent.slice(0, 15) ?? [];
  const collectionTotals = Object.values(overview?.sources ?? {}).reduce(
    (total, source) => ({
      owned: total.owned + source.normal.owned + source.adept.owned,
      maxed: total.maxed + source.normal.maxed + source.adept.maxed,
      possible: total.possible + source.normal.total + source.adept.total,
    }), { owned: 0, maxed: 0, possible: 0 },
  );
  const renderRecentStrip = () => (
    <section className="collections-recent-strip" aria-label="15 most recent weapon drops">
      <div className="collections-strip-label"><strong>RECENT DROPS</strong></div>
      {overviewError && <small className="vault-overview-error">{overviewError}</small>}
      <div className="collections-recent-viewport">
      <div className="collections-recent-slots" style={{ "--recent-duration": `${Math.max(18, recentWeapons.length * 4)}s` } as React.CSSProperties}>
        {(recentWeapons.length > 1 ? [...recentWeapons, ...recentWeapons] : recentWeapons).map((weapon, index) => {
          const adept = isAdeptFavorite(weapon.name);
          const favorite = overview?.favorites.includes(weapon.name) ?? false;
          const full = (adept ? adeptFavorites : normalFavorites).length >= 4;
          const icon = weaponIcon(weapon.source, weapon.name);
          return <div key={`${weapon.name}-${index}`} className={`collections-recent-tile${adept ? " adept" : ""}`}>
            <button type="button" className="collections-recent-open" title={weapon.name} onClick={() => jumpToWeapon(weapon)}>
              {icon ? <img src={icon} alt="" /> : <span>◆</span>}
              <span className="collections-recent-name">{weapon.name}</span>
            </button>
            <button type="button" className={`collections-recent-fav${favorite ? " active" : ""}`} aria-label={`${favorite ? "Remove" : "Add"} ${weapon.name} ${favorite ? "from" : "to"} favourites`} disabled={favoritesBusy || (!favorite && full)} title={!favorite && full ? "Four favourites per tier" : "Toggle favourite"} onClick={() => void toggleFavorite(weapon.name)}>{favorite ? "★" : "☆"}</button>
          </div>;
        })}
        {!recentWeapons.length && <span className="collections-recent-empty">No recent drops yet</span>}
      </div>
      </div>
    </section>
  );

  const renderFavoriteSlots = () => (
    <div className="collections-favorite-slots" aria-label="Favourite weapons">
      <span className="collections-favorite-heading">★ FAVOURITED WEAPONS</span>
      {([['NORMAL', normalFavorites], ['ADEPT', adeptFavorites]] as const).map(([label, names]) => <div className="collections-favorite-tier" key={label}>
        <span className="collections-favorite-tier-label">{label}</span>
        <div className="collections-favorite-row">{Array.from({ length: 4 }, (_, index) => {
          const name = names[index];
          const weapon = name ? overview?.favoriteWeapons.find(item => item.name === name) : undefined;
          const icon = weapon ? weaponIcon(weapon.source, weapon.name) : undefined;
          const rank = Math.min(77, Math.max(0, weapon?.masterwork ?? 0));
          const maxed = rank >= 77;
          return <button type="button" key={`${label}-${index}`} className={`collections-favorite-slot${name ? " filled" : ""}${label === 'ADEPT' ? " adept" : ""}${maxed ? " maxed" : ""}`} disabled={!weapon} title={name ? `${name} · ${rank}/77 masterworked` : `${label} slot ${index + 1}`} aria-label={name ? `View ${name}` : `Empty ${label} favourite slot`} onClick={() => weapon && jumpToWeapon(weapon)}>
            {name && <span className="collections-favorite-fill" style={{ "--masterwork-progress": `${rank / 77 * 100}%` } as React.CSSProperties} aria-hidden="true" />}
            {icon ? <img src={icon} alt="" /> : <span>{name ? "★" : "+"}</span>}
          </button>;
        })}</div>
      </div>) }
    </div>
  );

  return (
    <div className="vault-screen">
      <TopBar />
      <div className="vault-page">
        {loading ? <div className="vault-status">Loading Vault...</div> : error || !profile ? (
          <div className="vault-status vault-status-error">{error || "Failed to load Vault."}</div>
        ) : (
          <ArsenalLayout left={null}
            right={null}>
            <div className="collections-page">
              <div className="collections-topline"><div className="collections-title-group"><span className="collections-emblem">✦</span><div><span className="vault-eyebrow">ARSENAL / COLLECTIONS</span><h1>WEAPON COLLECTIONS</h1><div className="collections-total-progress"><span><strong>{collectionTotals.owned}/{collectionTotals.possible}</strong> OBTAINED</span><span><strong>{collectionTotals.maxed}/{collectionTotals.possible}</strong> MASTERWORKED</span></div></div></div>{renderFavoriteSlots()}</div>
              {renderRecentStrip()}
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
                  <header className="collections-heading">
                    <div className="collections-source-title"><span className="vault-eyebrow">{category.name.toUpperCase()}</span><h2>{selectedActivity?.name ?? category.name}</h2></div>
                    {groups.length > 0 && <nav className="collections-group-tabs" aria-label={`${category.name} activity types`}>
                      {groups.map(group => <button type="button" key={group} className={group === (activeGroup ?? groups[0]) ? "selected" : ""} aria-pressed={group === (activeGroup ?? groups[0])} onClick={() => {
                        if (group === activeGroup) return;
                        pendingScrollY.current = window.scrollY;
                        setActiveGroup(group);
                        const first = category.activities?.find(activity => activity.group === group);
                        if (first) { setActivitySlug(first.slug); setFocusWeapon(undefined); setAnimationKey(value => value + 1); }
                      }}><span className="collections-full-name">{group}</span><span className="collections-short-name">{shortName(group)}</span></button>)}
                    </nav>}
                  </header>
                  <div className="collections-workspace">
                    <nav className="collections-subnav" aria-label={`${category.name} loot pools`}>
                      <span className="collections-label">{category.name.toUpperCase()}</span>
                      {visibleActivities?.map(activity => {
                        const sourceStats = overview?.sources[activity.weaponSource.toLowerCase()];
                        const stats = sourceStats ? { total: sourceStats.normal.total + sourceStats.adept.total, owned: sourceStats.normal.owned + sourceStats.adept.owned, maxed: sourceStats.normal.maxed + sourceStats.adept.maxed } : undefined;
                        const complete = Boolean(stats && stats.total > 0 && stats.owned >= stats.total);
                        const mastered = Boolean(complete && stats && stats.maxed >= stats.total);
                        return <button key={activity.slug} type="button" aria-pressed={activity.slug === activitySlug}
                          className={`collections-subcategory${activity.slug === activitySlug ? " selected" : ""}${mastered ? " mastered" : complete ? " complete" : ""}`}
                          onClick={() => selectActivity(activity.slug)}><span className="collections-full-name">{activity.name}</span><span className="collections-short-name">{shortName(activity.name)}</span>
                          {stats && stats.total > 0 && <small>{complete ? `${stats.maxed}/${stats.total} MAXED` : `${stats.owned}/${stats.total} UNLOCKED`}</small>}
                        </button>;
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
