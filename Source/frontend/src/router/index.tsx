import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { LandingPage } from "../pages/LandingPage";
import { AdminRoute } from "../components/auth/AdminRoute";

const DashboardPage = lazy(() => import("../pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const NoteBoardPage = lazy(() => import("../pages/NoteBoardPage").then((m) => ({ default: m.NoteBoardPage })));
const ProjectsPage = lazy(() => import("../pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import("../pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const CalendarsPage = lazy(() => import("../pages/CalendarsPage").then((m) => ({ default: m.CalendarsPage })));
const ChalkBoardsPage = lazy(() => import("../pages/ChalkBoardsPage").then((m) => ({ default: m.ChalkBoardsPage })));
const BoardsPage = lazy(() => import("../pages/BoardsPage").then((m) => ({ default: m.BoardsPage })));
const NotebooksPage = lazy(() => import("../pages/NotebooksPage").then((m) => ({ default: m.NotebooksPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("../pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const RegisterPage = lazy(() => import("../pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsAndConditionsPage = lazy(() => import("../pages/TermsAndConditionsPage").then((m) => ({ default: m.TermsAndConditionsPage })));
const AboutPage = lazy(() => import("../pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("../pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const FaqPage = lazy(() => import("../pages/FaqPage").then((m) => ({ default: m.FaqPage })));
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
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />

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
