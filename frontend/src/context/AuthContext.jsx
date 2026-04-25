import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as loginApi, register as registerApi } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            setUserInfo(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            setError(null);
            const data = await loginApi(email, password);
            // Backend returns { status, message, data: { ...user, token } }
            setUserInfo(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
            return true;
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            return false;
        }
    };

    const register = async (name, email, password) => {
        try {
            setError(null);
            const data = await registerApi(name, email, password);
            setUserInfo(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
            return true;
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            return false;
        }
    };

    const loginAsRider = async (phone, password) => {
        try {
            setError(null);
            const { loginRider } = await import('../services/api');
            const data = await loginRider(phone, password);
            // Store as riderInfo for RiderDashboard + other rider pages
            localStorage.setItem('riderInfo', JSON.stringify(data));
            // Also set in userInfo context so role-based routing works
            const packagedData = { status: 'success', data: { ...data, role: 'rider' } };
            setUserInfo(packagedData);
            localStorage.setItem('userInfo', JSON.stringify(packagedData));
            return true;
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            return false;
        }
    };

    const logout = () => {
        setUserInfo(null);
        localStorage.removeItem('userInfo');
        localStorage.removeItem('riderInfo');
    };

    return (
        <AuthContext.Provider value={{ userInfo, login, register, loginAsRider, logout, error, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
