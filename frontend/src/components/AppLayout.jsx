import React from "react";
import { Feather, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Inkwell home">
          <span className="brand-mark"><Feather size={18} /></span>
          <span>inkwell<span className="brand-period">.</span></span>
        </Link>
        <nav className="top-nav" aria-label="Main navigation">
          <NavLink to="/" end>Explore</NavLink>
          {user && ["writer", "admin"].includes(user.role) && (
            <NavLink to="/writer">My writing</NavLink>
          )}
          {user && <NavLink to="/profile">Profile</NavLink>}
          {user?.role === "admin" && <NavLink to="/admin/members">Members</NavLink>}
        </nav>
        <div className="top-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {user ? (
            <>
              <span className="editor-status" aria-label={`Signed in as ${user.username}, ${user.role}`}>
                <span /> {user.username} · {user.role}
              </span>
              <button className="icon-button" type="button" aria-label="Sign out" onClick={logout}>
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link className="login-button" to="/login" aria-busy={loading}>
              <LogIn size={16} /> Sign in
            </Link>
          )}
          {!user && <Link className="write-button" to="/signup">Join Inkwell</Link>}
        </div>
      </header>

      <Outlet />

      <footer className="footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark"><Feather size={15} /></span>
          <span>inkwell<span className="brand-period">.</span></span>
        </Link>
        <span>A place for stories still being written.</span>
        <a href="#top" onClick={(event) => {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}>Back to top ↑</a>
      </footer>
    </div>
  );
}
