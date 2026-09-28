import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingScreen from "../../../components/ui/LoadingScreen";
import { useAuth } from "../context/AuthContext";

export function RequireAuth() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <LoadingScreen />;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location }} />;
  if (user && !user.onboardingCompleted && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <LoadingScreen />;
  if (status === "authenticated") return <Navigate to={location.state?.from?.pathname || "/home"} replace />;
  return <Outlet />;
}

export default RequireAuth;
