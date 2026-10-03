import React, { useState } from "react";
import { Bookmark, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiRequest } from "../../lib/api.js";

export default function EngagementActions({ story, onRefresh }) {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function toggleEngagement(kind, active) {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }
    setBusy(kind);
    setError("");
    try {
      await apiRequest(
        `/blogs/${story.id}/${kind}`,
        { method: active ? "DELETE" : "POST" },
        token,
      );
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="engagement-actions">
      <button
        type="button"
        className={story.is_liked ? "engagement-active" : ""}
        aria-label={story.is_liked ? `Unlike story, ${story.like_count} likes` : `Like story, ${story.like_count} likes`}
        aria-pressed={story.is_liked}
        disabled={Boolean(busy)}
        onClick={() => toggleEngagement("like", story.is_liked)}
      >
        <Heart size={17} aria-hidden="true" />
        <span>{story.like_count} {story.like_count === 1 ? "like" : "likes"}</span>
      </button>
      <button
        type="button"
        className={story.is_bookmarked ? "engagement-active" : ""}
        aria-label={story.is_bookmarked ? "Remove bookmark" : "Bookmark story"}
        aria-pressed={story.is_bookmarked}
        disabled={Boolean(busy)}
        onClick={() => toggleEngagement("bookmark", story.is_bookmarked)}
      >
        <Bookmark size={17} aria-hidden="true" />
        <span>{story.is_bookmarked ? "Bookmarked" : "Bookmark"}</span>
      </button>
      {error && <span className="engagement-error" role="alert">{error}</span>}
    </div>
  );
}
