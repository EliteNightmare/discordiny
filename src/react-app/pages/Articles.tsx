import { useCallback, useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import "./Articles.css";
import { renderArticleBody } from "./ArticleBlocks";

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
const date = (value: string | null) => value ? new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z")).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "DRAFT";

export default function Articles() {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1] ?? "");
  const [items, setItems] = useState<Article[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const listing = await fetch("/api/news/articles", { credentials: "include" });
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

  const categories = ["ALL", ...Array.from(new Set(items.map(x => x.category)))];
  const visible = items.filter(x => x.status === "published" && (filter === "ALL" || x.category === filter));
  const featured = visible.find(x => x.featured && x.status === "published") ?? visible.find(x => x.status === "published");
  const others = visible.filter(x => x.id !== featured?.id && x.status === "published");
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

    </header>
    {error && <div className="news-error" role="alert">{error}</div>}
    {loading ? <div className="news-empty">LOADING ARTICLES...</div> : slug ? article && <article className="news-article">
      <a className="news-back" href="/articles">← ALL ARTICLES</a><div className="news-article-meta">{article.category} <span>·</span> {date(article.published_at)}</div>
      {article.cover_url && <img className="news-article-cover" src={article.cover_url} alt="" />}
      <div className="news-article-body">{renderArticleBody(article.body)}</div>
    </article> : <>
      <div className="news-filters">{categories.map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>{c}</button>)}</div>
      {featured ? <><div className="news-section-label">FEATURED STORY</div>{card(featured, true)}</> : null}
      {others.length ? <><div className="news-section-label">MORE STORIES</div><div className="news-grid">{others.map(x => card(x))}</div></> : null}
      {!visible.length && <div className="news-empty">NO ARTICLES PUBLISHED YET.</div>}
    </>}
  </main></div>;
}
