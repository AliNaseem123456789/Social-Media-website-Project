import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { authService } from "../services/authService";

const ProtectedRoute = () => {
  const { userId } = authService.getCurrentUser();

  // If no user_id is found in localStorage, redirect to landing page
  if (!userId) {
    return <Navigate to="/" replace />;
  }

  // If user exists, render the "Outlet" (the child components)
  return <Outlet />;
};

export default ProtectedRoute;
