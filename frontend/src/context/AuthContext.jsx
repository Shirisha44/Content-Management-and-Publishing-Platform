import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("inkwell_token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    apiRequest("/users/me", {}, token)
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("inkwell_token");
        setToken("");
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const login = useCallback(async (credentials) => {
    const result = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    localStorage.setItem("inkwell_token", result.access_token);
    setToken(result.access_token);
    setUser(result.user);
    return result.user;
  }, []);

  const signup = useCallback(async (credentials) => {
    await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return login({
      username: credentials.username,
      password: credentials.password,
    });
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem("inkwell_token");
    setToken("");
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (currentPassword) => {
    await apiRequest(
      "/users/me",
      {
        method: "DELETE",
        body: JSON.stringify({ current_password: currentPassword }),
      },
      token,
    );
    logout();
  }, [logout, token]);

  const value = useMemo(
    () => ({ token, user, loading, login, signup, logout, deleteAccount }),
    [token, user, loading, login, signup, logout, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
