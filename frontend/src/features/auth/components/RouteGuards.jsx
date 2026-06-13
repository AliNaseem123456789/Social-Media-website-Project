// ProtectedRoute.jsx - COMPLETE REWRITE

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";  // ✅ CHANGE: Use useAuth

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();  // ✅ CHANGE: Get from context

  if (loading) {
    return <div>Loading...</div>; // Or a spinner
  }

  // ✅ CHANGE: Use isAuthenticated from context, not localStorage
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;