import React, { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/password/reset", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setComplete(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="editor-modal login-modal" onSubmit={submit} aria-labelledby="reset-password-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT RECOVERY</div>
            <h1 id="reset-password-title">Choose a new password</h1>
          </div>
        </div>
        {complete ? (
          <>
            <p className="login-intro" role="status">
              Your password has been updated. You can now sign in with the new password.
            </p>
            <Link className="text-button" to="/login">Go to sign in</Link>
          </>
        ) : !token ? (
          <>
            <p className="login-intro" role="alert">
              This reset link is missing its token. Request a new password reset link to continue.
            </p>
            <Link className="text-button" to="/forgot-password">Request another link</Link>
          </>
        ) : (
          <>
            <p className="login-intro">Use at least 12 characters for your new password.</p>
            <label className="form-label">
              NEW PASSWORD
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <div className="modal-footer">
              <Link className="auth-switch" to="/login">Back to sign in</Link>
              <button className="write-button" type="submit" disabled={busy || !password}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />}
                Reset password
              </button>
            </div>
          </>
        )}
      </form>
    </main>
  );
}
