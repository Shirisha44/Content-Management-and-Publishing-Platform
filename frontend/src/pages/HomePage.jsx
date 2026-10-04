import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, mediaUrl } from "../lib/api.js";
import { prepareStoryContent } from "../lib/storyContent.js";

const PAGE_SIZE = 8;

function readTime(content) {
  const text = new DOMParser().parseFromString(prepareStoryContent(content), "text/html").body.textContent || content;
  return `${Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 220))} min read`;
}

function storyExcerpt(content) {
  const text = new DOMParser().parseFromString(prepareStoryContent(content), "text/html").body.textContent || "";
  return `${text.slice(0, 180)}${text.length > 180 ? "…" : ""}`;
}

export default function HomePage() {
  const [stories, setStories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      search,
    });
    setLoading(true);
    setError("");
    apiRequest(`/blogs?${params}`)
      .then((result) => {
        if (!active) return;
        setStories(result.data);
        setTotal(result.total);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, search]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main>
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> STORIES WORTH SHARING</div>
          <h1 id="home-title">Every story has a<br /><em>place here.</em></h1>
          <p className="hero-description">
            Thoughts, experiences and ideas from people who like to write.
          </p>
          <a className="explore-link" href="#stories">Start reading <ArrowRight size={15} /></a>
        </div>
      </section>

      <section className="content-section" id="stories" aria-labelledby="stories-title">
        <div className="section-heading">
          <div>
            <h2 id="stories-title">Explore stories <span>({total})</span></h2>
          </div>
          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search published stories"
              placeholder="Search stories"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
          </label>
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}
        {loading ? (
          <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
            Loading stories…
          </div>
        ) : stories.length ? (
          <div className="story-list">
            {stories.map((story) => (
              <article className="story-row" key={story.id}>
                <Link className="story-main" to={`/stories/${story.id}`}>
                  {story.cover_image_url && (
                    <img
                      className="story-cover-image"
                      src={mediaUrl(story.cover_image_url)}
                      alt={story.cover_image_alt || ""}
                    />
                  )}
                  <div className="story-meta">
                    <span>Story {String(story.id).padStart(2, "0")}</span>
                    <span aria-hidden="true">·</span>
                    <span>{readTime(story.content)}</span>
                  </div>
                  <h3>{story.title}</h3>
                  <p>{storyExcerpt(story.content)}</p>
                  <span className="read-link">Read story <ArrowRight size={14} /></span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon"><BookOpen size={22} /></span>
            <h3>{search ? "No stories found" : "No published stories yet"}</h3>
            <p>{search ? "Try another search." : "Published stories will appear here."}</p>
          </div>
        )}

        {!loading && total > PAGE_SIZE && (
          <nav className="pagination" aria-label="Story pages">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div>
              <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span aria-live="polite">{page} / {pageCount}</span>
              <button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </nav>
        )}
      </section>
    </main>
  );
}
