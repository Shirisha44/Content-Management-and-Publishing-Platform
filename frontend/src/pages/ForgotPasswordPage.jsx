import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, Mail } from "lucide-react";
import { apiRequest } from "../lib/api.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="editor-modal login-modal" onSubmit={submit} aria-labelledby="reset-request-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT RECOVERY</div>
            <h1 id="reset-request-title">Forgot your password?</h1>
          </div>
        </div>
        {submitted ? (
          <>
            <p className="login-intro" role="status">
              If an account uses that email, a one-time reset link is on its way. Check your inbox.
            </p>
            <Link className="text-button" to="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="login-intro">
              Enter the recovery email on your account and we’ll send you a secure reset link.
            </p>
            <label className="form-label">
              RECOVERY EMAIL
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <div className="modal-footer">
              <Link className="auth-switch" to="/login">Back to sign in</Link>
              <button className="write-button" type="submit" disabled={busy || !email}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />}
                Send reset link
              </button>
            </div>
          </>
        )}
      </form>
    </main>
  );
}
