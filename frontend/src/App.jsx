import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Feather,
  FilePlus2,
  LoaderCircle,
  LogOut,
  PenLine,
  Search,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  X,
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const PAGE_SIZE = 5;

async function apiRequest(path, options = {}, token = "") {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(detail);
  }

  return response.json();
}

function getReadTime(content) {
  return `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220))} min read`;
}

function App() {
  const [blogs, setBlogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("inkwell_token") || "");
  const [theme, setTheme] = useState(() => localStorage.getItem("inkwell_theme") || "light");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        search,
      });
      const result = await apiRequest(`/blogs?${params}`);
      setBlogs(result.data);
      setTotal(result.total);
      setSelectedBlog((current) =>
        current ? result.data.find((blog) => blog.id === current.id) || null : null,
      );
    } catch (requestError) {
      setError(
        `${requestError.message}. Check that the FastAPI server is running at ${API_URL}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("inkwell_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openLogin() {
    setLoginError("");
    setLoginOpen(true);
  }

  async function enableEditing(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const result = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      localStorage.setItem("inkwell_token", result.access_token);
      setToken(result.access_token);
      setLoginOpen(false);
      setLoginForm({ username: "", password: "" });
      setNotice("Editor access enabled for this demo.");
    } catch (requestError) {
      setLoginError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("inkwell_token");
    setToken("");
    setNotice("You are now browsing as a reader.");
  }

  function openEditor(blog = null) {
    setEditingBlog(blog);
    setForm({ title: blog?.title || "", content: blog?.content || "" });
    setEditorOpen(true);
  }

  async function saveBlog(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = editingBlog ? `/blogs/${editingBlog.id}` : "/blogs";
      const result = await apiRequest(
        path,
        {
          method: editingBlog ? "PUT" : "POST",
          body: JSON.stringify(form),
        },
        token,
      );
      setEditorOpen(false);
      setSelectedBlog(result);
      setPage(1);
      if (page === 1) await loadBlogs();
      setNotice(editingBlog ? "Your story has been updated." : "Your story is published.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBlog(blog) {
    if (!window.confirm(`Delete “${blog.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/blogs/${blog.id}`, { method: "DELETE" }, token);
      setSelectedBlog(null);
      setNotice("Story deleted.");
      await loadBlogs();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const featuredBlog = blogs[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => setSelectedBlog(null)}>
          <span className="brand-mark"><Feather size={18} strokeWidth={2.2} /></span>
          <span>inkwell<span className="brand-period">.</span></span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <a className="nav-active" href="#stories">Stories</a>
          <a href="#about">About</a>
        </nav>
        <div className="top-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {token ? (
            <>
              <span className="editor-status"><span /> Editor mode</span>
              <button className="icon-button" aria-label="Sign out" onClick={logout}>
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <button className="login-button" onClick={openLogin} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <CircleUserRound size={16} />}
              Enable editor
            </button>
          )}
          {token && (
            <button className="write-button" onClick={() => openEditor()}>
              <PenLine size={16} /> Write a story
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero" id="about">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> AN INDEPENDENT JOURNAL</div>
            <h1>Ideas find a<br /><em>home here.</em></h1>
            <p className="hero-description">
              Essays, observations, and little sparks of curiosity. A slower corner of the internet, made for the things worth thinking about.
            </p>
            <a className="explore-link" href="#stories">Wander through the journal <ArrowDown size={15} /></a>
            <div className="hero-signoff"><span className="signoff-star">✳</span> A SMALL PUBLICATION FOR BIG THOUGHTS</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun-disc" />
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-sticker sticker-top"><Sparkles size={13} /> MADE OF CURIOSITY</div>
            <div className="art-paper">
              <div className="paper-topline"><span>THE JOURNAL · VOL. 01</span><span>✳</span></div>
              <div className="paper-rule" />
              <div className="paper-feature-label">{featuredBlog ? "LATEST STORY" : "A NOTE TO BEGIN"}</div>
              <div className="paper-scribble">{featuredBlog?.title || <>The practice<br /><i>of noticing</i></>}</div>
              <div className="paper-excerpt">{featuredBlog?.content?.slice(0, 88) || "Gather your thoughts. Follow the questions that stay with you."}{featuredBlog?.content?.length > 88 ? "…" : ""}</div>
              <div className="paper-bottom"><span>COLLECTED WITH CARE</span><span>01 — 26</span></div>
            </div>
            <div className="art-sticker sticker-bottom"><span className="sticker-orbit">✳</span> TAKE YOUR TIME</div>
            <div className="hero-art-caption">A LITTLE ROOM TO THINK</div>
          </div>
        </section>

        <section className="content-section" id="stories">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> THE JOURNAL</div>
              <h2>Latest stories <span>({total})</span></h2>
            </div>
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="Search stories"
                placeholder="Find a story..."
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                  setSelectedBlog(null);
                }}
              />
              {search && (
                <button type="button" aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={15} />
                </button>
              )}
            </label>
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}

          <div className="journal-layout">
            <div className="story-list">
              {loading ? (
                <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
                  <span className="sr-only">Loading stories</span>
                  <div className="skeleton-stack" aria-hidden="true">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div className="skeleton-story" key={index}>
                        <span className="skeleton-line skeleton-meta" />
                        <span className="skeleton-line skeleton-title" />
                        <span className="skeleton-line skeleton-copy" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : blogs.length ? (
                blogs.map((blog, index) => (
                  <article
                    className={`story-row ${selectedBlog?.id === blog.id ? "story-row-selected" : ""}`}
                    key={blog.id}
                  >
                    <button className="story-main" onClick={() => setSelectedBlog(blog)}>
                      <div className="story-meta">
                        <span className="story-number">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span>
                        <span>Story {String(blog.id).padStart(2, "0")}</span>
                        <span className="meta-dot">·</span>
                        <span>{getReadTime(blog.content)}</span>
                      </div>
                      <h3>{blog.title}</h3>
                      <p>{blog.content.slice(0, 150)}{blog.content.length > 150 ? "…" : ""}</p>
                      <span className="read-link">Read story <ArrowRight size={14} /></span>
                    </button>
                    {token && (
                      <button className="row-edit" aria-label={`Edit ${blog.title}`} onClick={() => openEditor(blog)}>
                        <PenLine size={15} />
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon"><BookOpen size={22} /></span>
                  <h3>{search ? "No stories found" : "A blank page, for now."}</h3>
                  <p>{search ? "Try another search term." : "The best collections start with a first story."}</p>
                  {token && !search && <button className="write-button" onClick={() => openEditor()}><FilePlus2 size={16} /> Write the first story</button>}
                </div>
              )}
              {!loading && total > PAGE_SIZE && (
                <nav className="pagination" aria-label="Story pages">
                  <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                  <div>
                    <button disabled={page === 1} aria-label="Previous page" onClick={() => setPage(page - 1)}><ArrowLeft size={16} /></button>
                    <span>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} aria-label="Next page" onClick={() => setPage(page + 1)}><ArrowRight size={16} /></button>
                  </div>
                </nav>
              )}
            </div>

            <aside className="side-column">
              <div className="note-card">
                <div className="note-heading"><span className="note-icon"><Sparkles size={15} /></span> A NOTE ON INKWELL</div>
                <p>A quiet place to collect the things you learn, notice, and want to share.</p>
                <div className="note-footer">CURATED WITH CARE <span>✳</span></div>
              </div>
              {selectedBlog ? (
                <div className="selected-card">
                  <div className="selected-card-top"><span>NOW READING</span><button onClick={() => setSelectedBlog(null)} aria-label="Close story"><X size={16} /></button></div>
                  <h3>{selectedBlog.title}</h3>
                  <div className="selected-meta"><Clock3 size={14} /> {getReadTime(selectedBlog.content)} <span>·</span> Story {String(selectedBlog.id).padStart(2, "0")}</div>
                  <p className="selected-content">{selectedBlog.content}</p>
                  {token && <div className="selected-actions">
                    <button onClick={() => openEditor(selectedBlog)}><PenLine size={14} /> Edit</button>
                    <button className="delete-action" onClick={() => deleteBlog(selectedBlog)} disabled={busy}><Trash2 size={14} /> Delete</button>
                  </div>}
                </div>
              ) : (
                <div className="start-card">
                  <div className="start-card-decoration">✳</div>
                  <div className="eyebrow">YOUR NEXT CHAPTER</div>
                  <h3>Every great idea starts somewhere.</h3>
                  <p>Make this the place yours begins.</p>
                  {token ? (
                    <button className="text-button" onClick={() => openEditor()}>Start writing <ArrowRight size={15} /></button>
                  ) : (
                    <button className="text-button" onClick={openLogin} disabled={busy}>Unlock the editor <ArrowRight size={15} /></button>
                  )}
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark"><Feather size={15} /></span><span>inkwell<span className="brand-period">.</span></span></a>
        <span>Made for the stories still being written.</span>
        <a href="#stories">Back to top <ChevronDown className="footer-up" size={14} /></a>
      </footer>

      {notice && <div className="toast"><Check size={16} /> {notice}</div>}

      {loginOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) setLoginOpen(false);
        }}>
          <form
            className="editor-modal login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onSubmit={enableEditing}
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> THE WRITING DESK</div>
                <h2 id="login-title">Editor sign in</h2>
              </div>
              <button type="button" className="icon-button" aria-label="Close sign in" onClick={() => setLoginOpen(false)}><X size={18} /></button>
            </div>
            <p className="login-intro">Sign in with your configured editor account to manage stories.</p>
            <label className="form-label">
              USERNAME
              <input
                autoFocus
                autoComplete="username"
                required
                value={loginForm.username}
                onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                placeholder="Your username"
              />
            </label>
            <label className="form-label">
              PASSWORD
              <input
                type="password"
                autoComplete="current-password"
                required
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="Your password"
              />
            </label>
            {loginError && <div className="error-banner" role="alert">{loginError}</div>}
            <div className="modal-footer">
              <span>Editor access</span>
              <button type="submit" className="write-button" disabled={busy || !loginForm.username || !loginForm.password}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <CircleUserRound size={16} />}
                Sign in
              </button>
            </div>
          </form>
        </div>
      )}

      {editorOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) setEditorOpen(false);
        }}>
          <form className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title" onSubmit={saveBlog}>
            <div className="modal-heading">
              <div><div className="eyebrow"><span className="eyebrow-line" /> THE WRITING DESK</div><h2 id="editor-title">{editingBlog ? "Edit your story" : "Write a story"}</h2></div>
              <button type="button" className="icon-button" aria-label="Close editor" onClick={() => setEditorOpen(false)}><X size={18} /></button>
            </div>
            <label className="form-label">TITLE<input autoFocus maxLength={200} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Give your story a name" /></label>
            <label className="form-label">YOUR STORY<textarea required rows={10} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Start with a thought..." /></label>
            <div className="modal-footer"><span>{form.content.trim().split(/\s+/).filter(Boolean).length} words</span><button type="submit" className="write-button" disabled={busy || !form.title.trim() || !form.content.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <PenLine size={16} />}{editingBlog ? "Save changes" : "Publish story"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
