import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import api from "../api/axiosInstence";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const checkAuth = async () => {
    try {
      const res = await api.get(
        `/auth/verify`,
      );
      if (res.data.loggedIn) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      if (user) console.warn("Session expired or invalid token:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  checkAuth();
}, []);


  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
