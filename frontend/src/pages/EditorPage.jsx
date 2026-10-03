import React, { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MarkdownEditor from "../components/editor/MarkdownEditor.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

export default function EditorPage() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [mode, setMode] = useState("edit");
  const [loading, setLoading] = useState(Boolean(storyId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storyId) return undefined;
    let active = true;
    apiRequest(`/blogs/${storyId}`, {}, token)
      .then((story) => {
        if (!active) return;
        setTitle(story.title);
        setContent(story.content);
        setStatus(story.status);
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
  }, [storyId, token]);

  async function saveStory(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest(
        storyId ? `/blogs/${storyId}` : "/blogs",
        {
          method: storyId ? "PUT" : "POST",
          body: JSON.stringify({ title, content, status }),
        },
        token,
      );
      navigate("/writer", {
        replace: true,
        state: { notice: result.status === "published" ? "Story published." : "Draft saved." },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="content-section"><div className="loading-state" role="status">Loading story…</div></main>;
  }

  return (
    <main className="content-section editor-page">
      <Link className="text-button" to="/writer"><ArrowLeft size={15} /> Back to my stories</Link>
      <form className="editor-form" onSubmit={saveStory}>
        <div className="section-heading editor-page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> THE WRITING DESK</div>
            <h1>{storyId ? "Edit story" : "New story"}</h1>
          </div>
          <label className="status-select">
            STORY STATUS
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="draft">Draft — private</option>
              <option value="published">Published — public</option>
            </select>
          </label>
        </div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <label className="form-label title-input">
          STORY TITLE
          <input
            autoFocus={!storyId}
            maxLength={200}
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your story a title"
          />
        </label>
        <MarkdownEditor
          content={content}
          onChange={setContent}
          mode={mode}
          onModeChange={setMode}
        />
        <div className="modal-footer editor-submit">
          <span>{content.trim().split(/\s+/).filter(Boolean).length} words</span>
          <button className="write-button" type="submit" disabled={busy || !title.trim() || !content.trim()}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            {status === "published" ? "Publish story" : "Save draft"}
          </button>
        </div>
      </form>
    </main>
  );
}
