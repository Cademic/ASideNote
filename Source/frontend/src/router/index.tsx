import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { LandingPage } from "../pages/LandingPage";
import { DashboardPage } from "../pages/DashboardPage";
import { NoteBoardPage } from "../pages/NoteBoardPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ProjectDetailPage } from "../pages/ProjectDetailPage";
import { CalendarsPage } from "../pages/CalendarsPage";
import { ChalkBoardsPage } from "../pages/ChalkBoardsPage";
import { BoardsPage } from "../pages/BoardsPage";
import { NotebooksPage } from "../pages/NotebooksPage";
import { SettingsPage } from "../pages/SettingsPage";
import { ProfilePage } from "../pages/ProfilePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RegisterPage } from "../pages/RegisterPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import { PrivacyPolicyPage } from "../pages/PrivacyPolicyPage";
import { TermsAndConditionsPage } from "../pages/TermsAndConditionsPage";
import { AdminRoute } from "../components/auth/AdminRoute";

const ChalkBoardPage = lazy(() => import("../pages/ChalkBoardPage").then((m) => ({ default: m.ChalkBoardPage })));
const NotebookEditorPage = lazy(() => import("../pages/NotebookEditorPage").then((m) => ({ default: m.NotebookEditorPage })));
const AdminPage = lazy(() => import("../pages/AdminPage").then((m) => ({ default: m.AdminPage })));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-hidden>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsAndConditionsPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notebooks" element={<NotebooksPage />} />
            <Route path="/notebooks/:notebookId" element={<NotebookEditorPage />} />
            <Route path="/boards" element={<BoardsPage />} />
            <Route path="/boards/:boardId" element={<NoteBoardPage />} />
            <Route path="/chalkboards/:boardId" element={<ChalkBoardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/calendar" element={<CalendarsPage />} />
            <Route path="/chalkboards" element={<ChalkBoardsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
