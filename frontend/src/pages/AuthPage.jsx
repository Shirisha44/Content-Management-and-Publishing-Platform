import React, { useState } from "react";
import { CircleUserRound, LoaderCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { login, signup } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [role, setRole] = useState("reader");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isSignup) {
        await signup({ ...form, role });
      } else {
        await login(form);
      }
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="editor-modal login-modal" onSubmit={submit} aria-labelledby="auth-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR INKWELL ACCOUNT</div>
            <h1 id="auth-title">{isSignup ? "Create an account" : "Welcome back"}</h1>
          </div>
        </div>
        <p className="login-intro">
          {isSignup
            ? "Choose Reader to explore stories or Writer to publish your own."
            : "Sign in to continue to your account."}
        </p>
        <label className="form-label">
          USERNAME
          <input
            autoComplete="username"
            minLength={isSignup ? 3 : 1}
            maxLength={64}
            pattern={isSignup ? "[A-Za-z0-9_.-]+" : undefined}
            required
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>
        {isSignup && (
          <label className="form-label">
            RECOVERY EMAIL
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
        )}
        <label className="form-label">
          PASSWORD
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 12 : undefined}
            maxLength={72}
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        {isSignup && (
          <fieldset className="role-choice">
            <legend>How will you use Inkwell?</legend>
            <label>
              <input
                type="radio"
                name="signup-role"
                value="reader"
                checked={role === "reader"}
                onChange={() => setRole("reader")}
              />
              <span><strong>Reader</strong><small>Browse and read stories</small></span>
            </label>
            <label>
              <input
                type="radio"
                name="signup-role"
                value="writer"
                checked={role === "writer"}
                onChange={() => setRole("writer")}
              />
              <span><strong>Writer</strong><small>Publish and manage your stories</small></span>
            </label>
          </fieldset>
        )}
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="modal-footer">
          <div>
            <Link className="auth-switch" to={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Have an account? Sign in" : "New here? Create account"}
            </Link>
            {!isSignup && (
              <div>
                <Link className="auth-switch" to="/forgot-password">Forgot password?</Link>
              </div>
            )}
          </div>
          <button
            className="write-button"
            type="submit"
            disabled={busy || !form.username || !form.password || (isSignup && !form.email)}
          >
            {busy ? <LoaderCircle className="spin" size={16} /> : <CircleUserRound size={16} />}
            {isSignup ? "Create account" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}
