import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem("user_id");
    const savedUsername = localStorage.getItem("username");
    if (savedUserId) {
      setUser({ id: savedUserId, username: savedUsername });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem("user_id", userData.id);
    localStorage.setItem("username", userData.username);
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);