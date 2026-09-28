import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoadingScreen from "./components/ui/LoadingScreen";
import AppShell from "./components/layout/AppShell";
import { GuestOnly, RequireAuth } from "./features/auth/components/RouteGuards";
import { useAuth } from "./features/auth/context/AuthContext";

const LandingPage = lazy(() => import("./features/landing/pages/LandingPage"));
const LoginPage = lazy(() => import("./features/auth/pages/LoginPage"));
const SignupPage = lazy(() => import("./features/auth/pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./features/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./features/auth/pages/VerifyEmailPage"));
const OnboardingPage = lazy(() => import("./features/onboarding/pages/OnboardingPage"));
const HomePage = lazy(() => import("./features/feed/pages/HomePage"));
const PostPage = lazy(() => import("./features/posts/pages/PostPage"));
const HashtagPage = lazy(() => import("./features/posts/pages/HashtagPage"));
const SavedPostsPage = lazy(() => import("./features/posts/pages/SavedPostsPage"));
const DraftsPage = lazy(() => import("./features/posts/pages/DraftsPage"));
const ProfilePage = lazy(() => import("./features/profile/pages/ProfilePage"));
const FollowListPage = lazy(() => import("./features/profile/pages/FollowListPage"));
const FriendsPage = lazy(() => import("./features/friends/pages/FriendsPage"));
const MessagesPage = lazy(() => import("./features/messages/pages/MessagesPage"));
const DirectRedirect = lazy(() => import("./features/messages/pages/DirectRedirect"));
const CallPage = lazy(() => import("./features/messages/pages/CallPage"));
const CallHistoryPage = lazy(() => import("./features/messages/pages/CallHistoryPage"));
const NotificationsPage = lazy(() => import("./features/notifications/pages/NotificationsPage"));
const SearchPage = lazy(() => import("./features/search/pages/SearchPage"));
const SettingsPage = lazy(() => import("./features/settings/pages/SettingsPage"));
const BlockedAccountsPage = lazy(() => import("./features/moderation/pages/BlockedAccountsPage"));
const ModerationQueuePage = lazy(() => import("./features/moderation/pages/ModerationQueuePage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const Chatbot = lazy(() => import("./pages/Chatbot"));

function LandingRoute() {
  const { status } = useAuth();
  if (status === "loading") return <LoadingScreen />;
  return status === "authenticated" ? <Navigate to="/home" replace /> : <LandingPage />;
}

function ChatbotWidget() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  if (!isAuthenticated || pathname.startsWith("/call/") || pathname === "/onboarding") return null;
  return (
    <Suspense fallback={null}>
      <Chatbot />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/guidelines" element={<LegalPage type="guidelines" />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/call/:roomId" element={<CallPage />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/posts/:id" element={<PostPage />} />
              <Route path="/tags/:tag" element={<HashtagPage />} />
              <Route path="/saved" element={<SavedPostsPage />} />
              <Route path="/drafts" element={<DraftsPage />} />
              <Route path="/u/:id" element={<ProfilePage />} />
              <Route path="/u/:id/followers" element={<FollowListPage mode="followers" />} />
              <Route path="/u/:id/following" element={<FollowListPage mode="following" />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/friends/requests" element={<Navigate to="/friends?tab=requests" replace />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/with/:userId" element={<DirectRedirect />} />
              <Route path="/messages/:conversationId" element={<MessagesPage />} />
              <Route path="/calls" element={<CallHistoryPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/blocked" element={<BlockedAccountsPage />} />
              <Route path="/moderation" element={<ModerationQueuePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <ChatbotWidget />
    </BrowserRouter>
  );
}
