import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

export default function AdminMembersPage() {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/users", {}, token)
      .then((result) => {
        if (active) setMembers(result);
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

  async function changeRole(userId, role) {
    setError("");
    try {
      const updated = await apiRequest(
        `/users/${userId}/role`,
        { method: "PATCH", body: JSON.stringify({ role }) },
        token,
      );
      setMembers((current) => current.map((member) => (
        member.id === updated.id ? updated : member
      )));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="content-section admin-members-page">
      <div className="eyebrow"><span className="eyebrow-line" /> ADMINISTRATION</div>
      <h1><Users size={25} /> Manage members</h1>
      <p className="dashboard-summary">Public signup cannot create admin accounts.</p>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {loading ? (
        <div className="loading-state" role="status">Loading members…</div>
      ) : (
        <div className="member-list">
          {members.map((member) => (
            <div className="member-row" key={member.id}>
              <div className="member-avatar" aria-hidden="true">
                {member.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="member-identity">
                <strong>{member.username}</strong>
                <span>Member #{member.id}</span>
              </div>
              <label className="member-role-label">
                <span className="sr-only">Role for {member.username}</span>
                <select
                  value={member.role}
                  aria-label={`Role for ${member.username}`}
                  onChange={(event) => changeRole(member.id, event.target.value)}
                >
                  <option value="reader">Reader</option>
                  <option value="writer">Writer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
