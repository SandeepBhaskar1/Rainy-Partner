import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axiosInstence";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ADDED: First check sessionStorage for quick load
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setLoading(false); // CHANGED: Set loading false immediately with cached user
          
          // ADDED: Verify in background without blocking UI
          verifyTokenInBackground();
          return;
        }

        // No cached user - verify with backend
        const res = await api.get(`/auth/verify`);
        
        if (res.data.loggedIn) {
          setUser(res.data.user);
          sessionStorage.setItem("user", JSON.stringify(res.data.user));
        } else {
          setUser(null);
          sessionStorage.removeItem("user");
        }
      } catch (err) {
        // CHANGED: Only log non-401 errors
        if (err.response?.status !== 401) {
          console.warn("Session check failed:", err);
        }
        setUser(null);
        sessionStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    // ADDED: Background verification function
    const verifyTokenInBackground = async () => {
      try {
        const res = await api.get(`/auth/verify`);
        if (res.data.loggedIn) {
          setUser(res.data.user);
          sessionStorage.setItem("user", JSON.stringify(res.data.user));
        } else {
          setUser(null);
          sessionStorage.removeItem("user");
        }
      } catch (err) {
        if (err.response?.status === 401) {
          // Token expired - clear session
          setUser(null);
          sessionStorage.removeItem("user");
        }
      }
    };
    
    checkAuth();
  }, []);

  // Helper function to update user
  const updateUser = (userData) => {
    setUser(userData);
    if (userData) {
      sessionStorage.setItem("user", JSON.stringify(userData));
    } else {
      sessionStorage.removeItem("user");
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      sessionStorage.removeItem("user");
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser: updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);