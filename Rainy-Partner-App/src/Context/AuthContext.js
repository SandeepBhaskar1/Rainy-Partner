import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { BACKEND_URL_LOCAL } from '@env';
import { navigate } from 'expo-router/build/global-state/routing';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuthStatus = async () => {
        try {
            const storedToken = await SecureStore.getItemAsync('access_token');
            const storedUser = await AsyncStorage.getItem('user_data');

            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                parsedUser.access_token = storedToken;
                setUser(parsedUser);
                setToken(storedToken);
            } 
        } catch (error) {
            console.error('❌ Error checking auth status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Request OTP
    const requestOtp = async (identifier) => {
        try {
            console.log('🟢 Sending OTP request to:', `${BACKEND_URL_LOCAL}/auth/send-otp`, 'with identifier:', identifier);

            const response = await axios.post(`${BACKEND_URL_LOCAL}/auth/send-otp`, { identifier });

            console.log('📨 OTP API response:', response.data);

            const otp = response.data?.otp; // Make sure we use response.data
            console.log('✅ OTP from response:', otp);

            return response.data;
        } catch (error) {
            console.error('❌ Error requesting OTP:', error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || 'Failed to request OTP');
        }
    };

    // Login function to save token & user
    const login = async (accessToken, userData) => {
        try {
            await SecureStore.setItemAsync('access_token', accessToken);
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));

            const userWithToken = { ...userData, access_token: accessToken };
            setUser(userWithToken);
            setToken(accessToken);

            return true;
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    };

    // Verify OTP
    const loginWithOTP = async (identifier, otp) => {
        try {
            console.log('🟢 Verifying OTP for identifier:', identifier, 'OTP:', otp);

            const response = await axios.post(`${BACKEND_URL_LOCAL}/auth/verify-otp`, {
                identifier,
                otp
            });

            const data = response.data;
            if (!data || !data.access_token || !data.user) {
                console.error('❌ Invalid response from backend:', data);
                throw new Error('Invalid response from server');
            }

            return await login(data.access_token, data.user);
        } catch (error) {
            console.error('❌ Login error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || 'Login failed');
        }
    };

    // Logout
    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync('access_token');
            await AsyncStorage.clear();
            setUser(null);
            setToken(null);
            navigate('login');
            console.log('✅ User logged out');
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            if (mounted) {
                console.log('🟢 Initializing auth status');
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
        token,
        isLoading,
        requestOtp,
        login,
        loginWithOTP,
        logout,
        checkAuthStatus,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
