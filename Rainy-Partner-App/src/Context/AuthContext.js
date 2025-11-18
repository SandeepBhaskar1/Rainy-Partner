import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { navigate } from "expo-router/build/global-state/routing";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [Backend_url, setBackend_url] = useState(null);
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_BACKEND_URL;
    setBackend_url(url);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("access_token");
      const storedUser = await AsyncStorage.getItem("user_data");

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.access_token = storedToken;
        setUser(parsedUser);
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const isAgreementRequest =
          error.config?.url?.includes("/plumber/agreement");
        const isProfileRequest = error.config?.url?.includes("/profile");

        if (
          error.response?.status === 401 &&
          !isAgreementRequest &&
          !isProfileRequest
        ) {
          console.warn("Token Expired, logging out...");
          await logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const requestOtp = async (identifier) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/auth/send-otp`, {
        identifier,
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error requesting OTP:",
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.detail || "Failed to request OTP");
    }
  };

  const login = async (accessToken, userData) => {
    try {
      await SecureStore.setItemAsync("access_token", accessToken);
      await AsyncStorage.setItem("user_data", JSON.stringify(userData));

      const userWithToken = { ...userData, access_token: accessToken };
      setUser(userWithToken);
      setToken(accessToken);

      return true;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const loginWithOTP = async (identifier, otp) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/auth/verify-otp`, {
        identifier,
        otp,
      });

      const data = response.data;
      if (!data || !data.access_token || !data.user) {
        console.error("Invalid response from backend:", data);
        throw new Error("Invalid response from server");
      }

      return await login(data.access_token, data.user);
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || "Login failed");
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("access_token");
      await AsyncStorage.clear();
      setUser(null);
      setToken(null);
      navigate("login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (mounted) {
        await checkAuthStatus();
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const contextValue = {
    user,
    setUser,
    token,
    setToken,
    isLoading,
    requestOtp,
    login,
    loginWithOTP,
    logout,
    checkAuthStatus,
    Backend_url,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
