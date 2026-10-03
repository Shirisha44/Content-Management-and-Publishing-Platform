import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AdminMembersPage from "./pages/AdminMembersPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import StoryPage from "./pages/StoryPage.jsx";
import WriterDashboardPage from "./pages/WriterDashboardPage.jsx";

function NotFoundPage() {
  return (
    <main className="content-section">
      <h1>Page not found</h1>
      <Link className="text-button" to="/">Return to Explore</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/stories/:storyId" element={<StoryPage />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute allowedRoles={["writer", "admin"]} />}>
          <Route path="/writer" element={<WriterDashboardPage />} />
          <Route path="/writer/stories/new" element={<EditorPage />} />
          <Route path="/writer/stories/:storyId/edit" element={<EditorPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["reader", "writer", "admin"]} />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/members" element={<AdminMembersPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
