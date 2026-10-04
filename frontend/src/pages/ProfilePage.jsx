import React, { useEffect, useState } from "react";
import { Bookmark, CircleUserRound, LoaderCircle, Mail, Save, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

export default function ProfilePage() {
  const { user, token, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setRecoveryEmail(user?.email || "");
  }, [user?.email]);

  useEffect(() => {
    let active = true;
    apiRequest("/users/me/bookmarks", {}, token)
      .then((result) => {
        if (active) setBookmarks(result);
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
  }, [token]);

  async function updateRecoveryEmail(event) {
    event.preventDefault();
    setEmailBusy(true);
    setEmailError("");
    setEmailMessage("");
    try {
      const updatedUser = await apiRequest(
        "/users/me/email",
        {
          method: "PATCH",
          body: JSON.stringify({
            email: recoveryEmail,
            current_password: currentPassword,
          }),
        },
        token,
      );
      setRecoveryEmail(updatedUser.email || "");
      setCurrentPassword("");
      setEmailMessage("Your recovery email has been saved.");
    } catch (requestError) {
      setEmailError(requestError.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function removeAccount(event) {
    event.preventDefault();
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword);
      navigate("/", { replace: true });
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <main className="content-section profile-page">
      <div className="eyebrow"><span className="eyebrow-line" /> YOUR INKWELL</div>
      <h1>Your profile</h1>
      <section className="profile-summary" aria-labelledby="profile-summary-title">
        <CircleUserRound size={22} aria-hidden="true" />
        <div>
          <h2 id="profile-summary-title">{user?.username}</h2>
          <p>Account type: {user?.role}</p>
        </div>
      </section>

      <section className="bookmarks-section" aria-labelledby="recovery-email-title">
        <h2 id="recovery-email-title"><Mail size={19} /> Recovery email</h2>
        <p className="login-intro">
          We’ll use this address only to help you recover your account.
        </p>
        <form className="editor-modal" onSubmit={updateRecoveryEmail}>
          <label className="form-label">
            EMAIL ADDRESS
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
            />
          </label>
          <label className="form-label">
            CURRENT PASSWORD
            <PasswordInput
              autoComplete="current-password"
              maxLength={72}
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          {emailError && <div className="error-banner" role="alert">{emailError}</div>}
          {emailMessage && <div className="success-banner" role="status">{emailMessage}</div>}
          <div className="modal-footer">
            <span>{user?.email ? "Confirm your password to change it." : "Add an email to enable password recovery."}</span>
            <button className="write-button" type="submit" disabled={emailBusy || !recoveryEmail || !currentPassword}>
              {emailBusy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              Save email
            </button>
          </div>
        </form>
      </section>

      <section className="bookmarks-section" aria-labelledby="bookmarks-title">
        <h2 id="bookmarks-title"><Bookmark size={19} /> Bookmarks</h2>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {loading ? (
          <div className="loading-state" role="status">Loading bookmarks…</div>
        ) : bookmarks.length ? (
          <div className="story-list">
            {bookmarks.map((bookmark) => (
              <article className="story-row" key={bookmark.id}>
                <Link className="story-main" to={`/stories/${bookmark.id}`}>
                  <div className="story-meta">
                    <span>Saved {new Date(bookmark.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3>{bookmark.title}</h3>
                  <span className="read-link">Read story</span>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No bookmarks yet</h3>
            <p>Bookmark a published story to find it here.</p>
            <Link className="text-button" to="/">Explore stories</Link>
          </div>
        )}
      </section>

      <section className="delete-account-section" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title"><Trash2 size={19} /> Delete account</h2>
        <p>
          This permanently removes your account and bookmarks. Your published stories will
          remain available without your account attached; drafts will remain private and
          can only be accessed by an admin.
        </p>
        <form onSubmit={removeAccount}>
          <label className="form-label">
            CURRENT PASSWORD
            <PasswordInput
              autoComplete="current-password"
              maxLength={72}
              required
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </label>
          {deleteError && <div className="error-banner" role="alert">{deleteError}</div>}
          <button className="delete-account-button" type="submit" disabled={deleteBusy || !deletePassword}>
            {deleteBusy ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
            Delete my account
          </button>
        </form>
      </section>
    </main>
  );
}
