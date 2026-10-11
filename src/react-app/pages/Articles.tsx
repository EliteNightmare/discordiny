import { useCallback, useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import { parseBlocks, renderBlock } from "./ArticleBlocks";
import "./Articles.css";

type Article = {
  id: number; slug: string; title: string; subtitle: string; category: string;
  cover_url: string; banner_url: string; body: string; featured: number;
  status: "draft" | "published"; published_at: string | null; updated_at: string;
};

function formatPublishedAt(value: string | null): string {
  if (!value) return "DRAFT";
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value.replace(" ", "T") + "Z";
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "DRAFT";
  // Explicit US English + UTC makes the same published timestamp display consistently.
  const date = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(d);
  return `${date} · ${time} UTC`;
}

function ArticleBody({ body }: { body: string }) {
  const blocks = parseBlocks(body);
  if (blocks) return <>{blocks.map(block => <div key={block.id}>{renderBlock(block)}</div>)}</>;
  return <>{body.split(/\n\n+/).map((chunk, i) => {
    const heading = chunk.match(/^(#{1,3})\s+(.+)$/);
    if (heading) return heading[1].length === 1 ? <h2 key={i}>{heading[2]}</h2> : <h3 key={i}>{heading[2]}</h3>;
    const image = chunk.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    if (image) return <img key={i} src={image[2]} alt={image[1]} loading="lazy" />;
    return <p key={i}>{chunk}</p>;
  })}</>;
}

export default function Articles() {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1] ?? "");
  const [items, setItems] = useState<Article[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const load = useCallback(async () => {
    setLoading(true); setError("");
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
  const categories = ["ALL", ...Array.from(new Set(items.filter(x => x.status === "published").map(x => x.category)))];
  const visible = items.filter(x => x.status === "published" && (filter === "ALL" || x.category === filter));
  const featured = visible.find(x => x.featured) ?? visible[0];
  const others = visible.filter(x => x.id !== featured?.id);
  const card = (item: Article, lead = false) => <a key={item.id} className={`news-card ${lead ? "news-card-lead" : ""}`} href={`/articles/${encodeURIComponent(item.slug)}`}>
    <div className="news-card-art" style={item.cover_url ? { backgroundImage: `linear-gradient(0deg,rgba(5,8,13,.82),rgba(5,8,13,.08)),url("${item.cover_url.replace(/"/g, "%22")}")` } : undefined}>
      <span className="news-category">{item.category}</span>
    </div>
    <div className="news-card-copy"><span className="news-date">{formatPublishedAt(item.published_at)}</span>
      <h2>{item.title}</h2><p>{item.subtitle}</p><span className="news-read">READ ARTICLE ↗</span>
    </div>
  </a>;
  return <div className="news-page"><TopBar />
    {slug && article?.banner_url && <div className="news-article-banner"><img src={article.banner_url} alt="" /></div>}
    <main className={`news-shell ${slug ? "news-shell-detail" : ""}`}>
      {!slug && <header className="news-header"><div><div className="news-eyebrow">DISCORDINY / NEWS</div><h1>Articles</h1><p>The latest stories, announcements and developments from Discordiny.</p></div></header>}
      {error && <div className="news-error" role="alert">{error}</div>}
      {loading ? <div className="news-empty">LOADING ARTICLES...</div> : slug ? article && <article className="news-article">
        <a className="news-back" href="/articles">← ALL ARTICLES</a>
        <div className="news-article-meta">{article.category} <span>·</span> {formatPublishedAt(article.published_at)}</div>
        <h1 className="news-article-title">{article.title}</h1>
        {article.subtitle && <p className="news-article-subtitle">{article.subtitle}</p>}
        <div className="news-article-body"><ArticleBody body={article.body} /></div>
      </article> : <>
        <div className="news-filters">{categories.map(c => <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>{c}</button>)}</div>
        {featured && <><div className="news-section-label">FEATURED STORY</div>{card(featured, true)}</>}
        {!!others.length && <><div className="news-section-label">MORE STORIES</div><div className="news-grid">{others.map(x => card(x))}</div></>}
        {!visible.length && <div className="news-empty">NO ARTICLES PUBLISHED YET.</div>}
      </>}
    </main>
  </div>;
}
