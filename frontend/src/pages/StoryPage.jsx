import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Link, useParams } from "react-router-dom";
import EngagementActions from "../components/stories/EngagementActions.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

function readTime(content) {
  return `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220))} min read`;
}

export default function StoryPage() {
  const { storyId } = useParams();
  const { token } = useAuth();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStory(await apiRequest(`/blogs/${storyId}`, {}, token));
    } catch (requestError) {
      setError(requestError.message);
      setStory(null);
    } finally {
      setLoading(false);
    }
  }, [storyId, token]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  if (loading) {
    return <main className="content-section"><div className="loading-state" role="status">Loading story…</div></main>;
  }
  if (error || !story) {
    return (
      <main className="content-section">
        {error && <div className="error-banner" role="alert">{error}</div>}
        {!error && <h1>Story not found</h1>}
        <Link className="text-button" to="/"><ArrowLeft size={15} /> Back to Explore</Link>
      </main>
    );
  }

  return (
    <main className="content-section story-page">
      <Link className="text-button" to="/"><ArrowLeft size={15} /> Back to Explore</Link>
      <article className="selected-card" aria-labelledby="story-title">
        <div className="selected-meta"><Clock3 size={14} /> {readTime(story.content)}</div>
        <h1 id="story-title">{story.title}</h1>
        <EngagementActions
          story={story}
          onRefresh={loadStory}
        />
        <div className="selected-content markdown-content">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{story.content}</ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
