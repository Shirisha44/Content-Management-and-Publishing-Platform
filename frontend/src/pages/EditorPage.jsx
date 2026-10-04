import React, { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MarkdownEditor from "../components/editor/MarkdownEditor.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest, mediaUrl } from "../lib/api.js";

export default function EditorPage() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [plainText, setPlainText] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [backgroundImageAlt, setBackgroundImageAlt] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(Boolean(storyId));
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [inlineImageBusy, setInlineImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [coverError, setCoverError] = useState("");
  const [backgroundError, setBackgroundError] = useState("");

  useEffect(() => {
    if (!storyId) return undefined;
    let active = true;
    apiRequest(`/blogs/${storyId}`, {}, token)
      .then((story) => {
        if (!active) return;
        setTitle(story.title);
        setContent(story.content);
        setPlainText(story.content.replace(/<[^>]*>/g, " ").replace(/!\[[^\]]*]\([^)]*\)/g, " "));
        setCoverImageUrl(story.cover_image_url || "");
        setCoverImageAlt(story.cover_image_alt || "");
        setBackgroundImageUrl(story.background_image_url || "");
        setBackgroundImageAlt(story.background_image_alt || "");
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

  async function uploadStoryImage(event, setImageUrl, setImageAlt, setBusy, setUploadError) {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;
    setBusy(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("image", image);
      const uploaded = await apiRequest("/images", { method: "POST", body: formData }, token);
      setImageUrl(uploaded.url);
      setImageAlt(image.name.replace(/\.[^.]+$/, ""));
    } catch (requestError) {
      setUploadError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveStory(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest(
        storyId ? `/blogs/${storyId}` : "/blogs",
        {
          method: storyId ? "PUT" : "POST",
          body: JSON.stringify({
            title,
            content,
            status,
            cover_image_url: coverImageUrl || null,
            cover_image_alt: coverImageUrl ? coverImageAlt : null,
            background_image_url: backgroundImageUrl || null,
            background_image_alt: backgroundImageUrl ? backgroundImageAlt : null,
          }),
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
        <section className="cover-image-editor" aria-labelledby="cover-image-heading">
          <div>
            <h2 id="cover-image-heading">COVER IMAGE</h2>
            <p>Shown with your story and at the top of its page.</p>
          </div>
          <label className={`image-upload-button${coverBusy ? " upload-busy" : ""}`}>
            {coverBusy ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />}
            {coverBusy ? "Uploading…" : coverImageUrl ? "Change cover image" : "Add cover image"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(event) => uploadStoryImage(
                event,
                setCoverImageUrl,
                setCoverImageAlt,
                setCoverBusy,
                setCoverError,
              )}
              disabled={coverBusy}
            />
          </label>
          {coverError && <div className="error-banner" role="alert">{coverError}</div>}
          {coverImageUrl && (
            <div className="cover-image-preview">
              <img src={mediaUrl(coverImageUrl)} alt={coverImageAlt} />
              <label className="form-label">
                IMAGE DESCRIPTION (ALT TEXT)
                <input
                  maxLength={250}
                  required
                  value={coverImageAlt}
                  onChange={(event) => setCoverImageAlt(event.target.value)}
                  placeholder="Describe the image"
                />
              </label>
              <button
                className="icon-button"
                type="button"
                aria-label="Remove cover image"
                onClick={() => {
                  setCoverImageUrl("");
                  setCoverImageAlt("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </section>
        <section className="cover-image-editor" aria-labelledby="background-image-heading">
          <div>
            <h2 id="background-image-heading">STORY BACKGROUND IMAGE</h2>
            <p>Displayed softly behind the story text to keep it easy to read.</p>
          </div>
          <label className={`image-upload-button${backgroundBusy ? " upload-busy" : ""}`}>
            {backgroundBusy ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />}
            {backgroundBusy ? "Uploading…" : backgroundImageUrl ? "Change background image" : "Add background image"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(event) => uploadStoryImage(
                event,
                setBackgroundImageUrl,
                setBackgroundImageAlt,
                setBackgroundBusy,
                setBackgroundError,
              )}
              disabled={backgroundBusy}
            />
          </label>
          {backgroundError && <div className="error-banner" role="alert">{backgroundError}</div>}
          {backgroundImageUrl && (
            <div className="cover-image-preview">
              <img src={mediaUrl(backgroundImageUrl)} alt={backgroundImageAlt} />
              <label className="form-label">
                IMAGE DESCRIPTION (ALT TEXT)
                <input
                  maxLength={250}
                  required
                  value={backgroundImageAlt}
                  onChange={(event) => setBackgroundImageAlt(event.target.value)}
                  placeholder="Describe the image"
                />
              </label>
              <button
                className="icon-button"
                type="button"
                aria-label="Remove background image"
                onClick={() => {
                  setBackgroundImageUrl("");
                  setBackgroundImageAlt("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </section>
        <MarkdownEditor
          content={content}
          onChange={(html, text) => {
            setContent(html);
            setPlainText(text);
          }}
          token={token}
          onUploadStateChange={setInlineImageBusy}
        />
        <div className="modal-footer editor-submit">
          <span>{plainText.trim().split(/\s+/).filter(Boolean).length} words</span>
          <button className="write-button" type="submit" disabled={busy || coverBusy || backgroundBusy || inlineImageBusy || !title.trim() || !plainText.trim()}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            {status === "published" ? "Publish story" : "Save draft"}
          </button>
        </div>
      </form>
    </main>
  );
}
