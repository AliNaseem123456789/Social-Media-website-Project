// ProtectedRoute.jsx - COMPLETE REWRITE

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";  

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();  

  if (loading) {
    return <div>Loading...</div>; 
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;