import { useCallback, useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import "./Articles.css";

type Article = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  cover_url: string;
  body: string;
  featured: number;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};
type ArticleInput = Pick<Article, "title" | "subtitle" | "category" | "cover_url" | "body" | "featured" | "status">;
const blank: ArticleInput = { title: "", subtitle: "", category: "NEWS", cover_url: "", body: "", featured: 0, status: "draft" };
const date = (value: string | null) => value ? new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z")).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "DRAFT";

export default function Articles() {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1] ?? "");
  const [items, setItems] = useState<Article[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [admin, setAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ArticleInput>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [auth, listing] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/news/articles", { credentials: "include" }),
      ]);
      const isAdmin = Number(auth?.user?.id) === 1 && auth?.authenticated === true;
      setAdmin(isAdmin);
      if (!listing.ok) throw new Error("Could not load articles.");
      const result = await listing.json();
      setItems(result.articles ?? []);
      if (slug) {
        const response = await fetch(`/api/news/articles/${encodeURIComponent(slug)}`, { credentials: "include" });
        if (!response.ok) throw new Error(response.status === 404 ? "Article not found." : "Could not load article.");
        setArticle((await response.json()).article);
      } else setArticle(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load news."); }
    finally { setLoading(false); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  function beginEdit(item?: Article) {
    setEditingId(item?.id ?? null);
    setForm(item ? { title: item.title, subtitle: item.subtitle, category: item.category, cover_url: item.cover_url, body: item.body, featured: item.featured, status: item.status } : { ...blank });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save() {
    if (!form.title.trim() || !form.body.trim()) { setError("Title and article body are required."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(editingId ? `/api/news/admin/articles/${editingId}` : "/api/news/admin/articles", {
        method: editingId ? "PUT" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Save failed.");
      setEditing(false); await load();
      if (slug) window.location.href = "/articles";
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  }
  async function remove(id: number) {
    if (!window.confirm("Delete this article permanently?")) return;
    const response = await fetch(`/api/news/admin/articles/${id}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) { setError("Delete failed."); return; }
    window.location.href = "/articles";
  }
  const categories = ["ALL", ...Array.from(new Set(items.map(x => x.category)))];
  const visible = items.filter(x => filter === "ALL" || x.category === filter);
  const featured = visible.find(x => x.featured && x.status === "published") ?? visible.find(x => x.status === "published");
  const others = visible.filter(x => x.id !== featured?.id);
  const card = (item: Article, lead = false) => <a key={item.id} className={`news-card ${lead ? "news-card-lead" : ""}`} href={`/articles/${encodeURIComponent(item.slug)}`}>
    <div className="news-card-art" style={item.cover_url ? { backgroundImage: `linear-gradient(0deg,rgba(5,8,13,.82),rgba(5,8,13,.08)),url("${item.cover_url.replace(/"/g, "%22")}")` } : undefined}>
      <span className="news-category">{item.category}</span>
    </div>
    <div className="news-card-copy"><span className="news-date">{date(item.published_at)} {item.status === "draft" ? " · DRAFT" : ""}</span>
      <h2>{item.title}</h2><p>{item.subtitle}</p><span className="news-read">READ ARTICLE ↗</span>
    </div>
  </a>;

  return <div className="news-page"><TopBar /><main className="news-shell">
    <header className="news-header"><div><div className="news-eyebrow">DISCORDINY / NEWS</div><h1>{slug && article ? article.title : "Articles"}</h1><p>{slug && article ? article.subtitle : "The latest stories, announcements and developments from Discordiny."}</p></div>
      {admin && <button className="news-admin-button" onClick={() => beginEdit()}>+ NEW ARTICLE</button>}
    </header>
    {error && <div className="news-error" role="alert">{error}</div>}
    {editing && admin && <section className="news-editor"><div className="news-editor-heading"><h2>{editingId ? "Edit Article" : "New Article"}</h2><button onClick={() => setEditing(false)}>CLOSE ✕</button></div>
      <div className="news-editor-grid"><label>Title<input maxLength={160} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label><label>Category<input maxLength={40} value={form.category} onChange={e => setForm({ ...form, category: e.target.value.toUpperCase() })} /></label></div>
      <label>Subtitle / excerpt<textarea rows={2} maxLength={320} value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} /></label>
      <label>Cover image URL<input type="url" placeholder="https://..." value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })} /></label>
      <label>Article body (Markdown)<textarea className="news-body-editor" rows={15} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></label>
      <div className="news-editor-actions"><label className="news-check"><input type="checkbox" checked={!!form.featured} onChange={e => setForm({ ...form, featured: e.target.checked ? 1 : 0 })} /> Featured</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ArticleInput["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select><button disabled={saving} onClick={() => void save()}>{saving ? "SAVING..." : "SAVE ARTICLE"}</button></div>
      <p className="news-editor-hint">Supports Markdown headings, paragraphs, bold text, links, and images. Use a publicly accessible image URL.</p>
    </section>}
    {loading ? <div className="news-empty">LOADING ARTICLES...</div> : slug ? article && <article className="news-article">
      <a className="news-back" href="/articles">← ALL ARTICLES</a><div className="news-article-meta">{article.category} <span>·</span> {date(article.published_at)}</div>
      {article.cover_url && <img className="news-article-cover" src={article.cover_url} alt="" />}
      <div className="news-article-body">{article.body.split(/\n\n+/).map((block, i) => {
        const heading = block.match(/^(#{1,3})\s+(.+)$/);
        if (heading) return heading[1].length === 1 ? <h2 key={i}>{heading[2]}</h2> : <h3 key={i}>{heading[2]}</h3>;
        const image = block.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
        if (image) return <img key={i} src={image[2]} alt={image[1]} loading="lazy" />;
        return <p key={i}>{block}</p>;
      })}</div>
      {admin && <div className="news-manage"><button onClick={() => beginEdit(article)}>EDIT ARTICLE</button><button onClick={() => void remove(article.id)}>DELETE ARTICLE</button></div>}
    </article> : <>
      <div className="news-filters">{categories.map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>{c}</button>)}</div>
      {featured ? <><div className="news-section-label">FEATURED STORY</div>{card(featured, true)}</> : null}
      {others.length ? <><div className="news-section-label">MORE STORIES</div><div className="news-grid">{others.map(x => card(x))}</div></> : null}
      {!visible.length && <div className="news-empty">NO ARTICLES PUBLISHED YET.</div>}
      {admin && items.length > 0 && <section className="news-admin-list"><h2>MANAGE ARTICLES</h2>{items.map(x => <div key={x.id}><span>{x.title} <small>({x.status})</small></span><button onClick={() => beginEdit(x)}>EDIT</button><button onClick={() => void remove(x.id)}>DELETE</button></div>)}</section>}
    </>}
  </main></div>;
}
