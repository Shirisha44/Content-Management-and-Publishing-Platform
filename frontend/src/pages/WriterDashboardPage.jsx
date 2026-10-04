import React, { useCallback, useEffect, useState } from "react";
import { FilePlus2, PenLine, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";
import { prepareStoryContent } from "../lib/storyContent.js";

function storyExcerpt(content) {
  const text = new DOMParser().parseFromString(prepareStoryContent(content), "text/html").body.textContent || "";
  return `${text.slice(0, 180)}${text.length > 180 ? "…" : ""}`;
}

export default function WriterDashboardPage() {
  const { token } = useAuth();
  const location = useLocation();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStories(await apiRequest("/writer/stories", {}, token));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  async function deleteStory(story) {
    if (!window.confirm(`Delete “${story.title}”? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/blogs/${story.id}`, { method: "DELETE" }, token);
      await loadStories();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const drafts = stories.filter((story) => story.status === "draft").length;
  const published = stories.length - drafts;

  return (
    <main className="content-section writer-dashboard">
      <div className="section-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR WRITING SPACE</div>
          <h1>My stories</h1>
          <p className="dashboard-summary">{published} published · {drafts} drafts</p>
        </div>
        <Link className="write-button" to="/writer/stories/new">
          <FilePlus2 size={16} /> New story
        </Link>
      </div>

      {location.state?.notice && <div className="success-banner" role="status">{location.state.notice}</div>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      {loading ? (
        <div className="loading-state" role="status" aria-live="polite">Loading your stories…</div>
      ) : stories.length ? (
        <div className="story-list">
          {stories.map((story) => (
            <article className="story-row dashboard-story" key={story.id}>
              <div className="story-main">
                <div className="story-meta">
                  <span className={`status-badge status-${story.status}`}>{story.status}</span>
                  <span>Updated {new Date(story.updated_at).toLocaleDateString()}</span>
                </div>
                <h2>{story.title}</h2>
                <p>{storyExcerpt(story.content)}</p>
              </div>
              <div className="dashboard-actions">
                <Link
                  className="icon-button"
                  to={`/writer/stories/${story.id}/edit`}
                  aria-label={`Edit ${story.title}`}
                >
                  <PenLine size={16} />
                </Link>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Delete ${story.title}`}
                  onClick={() => deleteStory(story)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><FilePlus2 size={22} /></span>
          <h2>Your writing starts here</h2>
          <p>Save a draft or publish a story when you are ready.</p>
          <Link className="write-button" to="/writer/stories/new">Write your first story</Link>
        </div>
      )}
    </main>
  );
}
