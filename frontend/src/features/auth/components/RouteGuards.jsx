import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// Only logged-in users can enter
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/" replace />;
};

// Logged-in users are redirected AWAY from login/signup to /home
export const PublicRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? <Outlet /> : <Navigate to="/home" replace />;
};
