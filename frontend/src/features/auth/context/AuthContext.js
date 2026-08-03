// context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient from "../../../api/apiClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check session on app load
  const checkAuth = async () => {
    try {
      console.log("Checking authentication...");
      const response = await apiClient.get("/me");
      
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        console.log("User authenticated:", response.data.user.username);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log("No active session");
      }
    } catch (error) {
      console.error("Auth check failed:", error.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };
  const login = async (email, password) => {
    try {
      const response = await apiClient.post("/login", { email, password });
      
      if (response.data.success) {
        await checkAuth(); 
        return { success: true, user: response.data.user };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Login error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Login failed" 
      };
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await apiClient.post("/signup", { username, email, password });
      
      if (response.data.success) {
        await checkAuth(); 
        return { success: true, user: response.data.user };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Signup error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Signup failed" 
      };
    }
  };
  const googleLogin = async (credential) => {
    try {
      const response = await apiClient.post("/google", { token: credential });
      
      if (response.data.success) {
        await checkAuth();
        return { success: true, user: response.data.user };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error("Google login error:", error);
      return { success: false, message: "Google login failed" };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await apiClient.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        signup,
        googleLogin,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};