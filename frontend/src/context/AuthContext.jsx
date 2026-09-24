import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS_KEY, SESSION_KEY, DARKMODE_KEY, COLOR_THEME_KEY } from '../constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [userProfile, setUserProfile] = useState({ fullName: '', currency: 'USD' });
    const [darkMode, setDarkMode] = useState(false);
    const [colorTheme, setColorThemeState] = useState('emerald');
    const [authLoading, setAuthLoading] = useState(true);

    // Load session and keep the site in its light appearance.
    useEffect(() => {
        try {
            localStorage.setItem(DARKMODE_KEY, 'false');
            localStorage.setItem(COLOR_THEME_KEY, 'emerald');
            setDarkMode(false);
            document.body.classList.remove('dark');
            setColorThemeState('emerald');
            document.documentElement.setAttribute('data-theme', 'emerald');

            const sessionUsername = localStorage.getItem(SESSION_KEY);
            if (sessionUsername) {
                const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                const found = users.find(u => u.username.toLowerCase() === sessionUsername.toLowerCase());
                if (found) {
                    setCurrentUser(found.username);
                    setUserRole(found.role || 'user');
                    setUserProfile(found.profile || { fullName: found.username, currency: 'USD' });
                }
            }
        } catch (e) {
            console.error('Error initializing auth state:', e);
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const setColorTheme = (theme) => {
        setColorThemeState('emerald');
        localStorage.setItem(COLOR_THEME_KEY, 'emerald');
        document.documentElement.setAttribute('data-theme', 'emerald');
    };

    const toggleDarkMode = () => {
        setDarkMode(false);
        localStorage.setItem(DARKMODE_KEY, 'false');
        document.body.classList.remove('dark');
    };

    const login = async (identifier, password) => {
        const cleanId = identifier.trim().toLowerCase();

        // Keep a valid saved account responsive even if the API/DB is slow.
        // The server login still runs so API-only features receive a JWT when it responds.
        let cachedUsers = [];
        try {
            cachedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        } catch {
            cachedUsers = [];
        }
        const cachedUser = cachedUsers.find(u =>
            (u.email && u.email.toLowerCase() === cleanId) ||
            (u.username && u.username.toLowerCase() === cleanId)
        );
        if (cachedUser && cachedUser.password === password) {
            localStorage.setItem(SESSION_KEY, cachedUser.username);
            setCurrentUser(cachedUser.username);
            setUserRole(cachedUser.role || 'user');
            setUserProfile(cachedUser.profile || { fullName: cachedUser.username, currency: 'USD' });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanId, password }),
                signal: controller.signal
            }).then(async apiRes => {
                if (!apiRes.ok) return;
                const data = await apiRes.json();
                if (data.accessToken) {
                    localStorage.setItem('fintrack_jwt_access', data.accessToken);
                    if (data.refreshToken) localStorage.setItem('fintrack_jwt_refresh', data.refreshToken);
                    window.dispatchEvent(new Event('fintrack:api-session-ready'));
                }
            }).catch(() => {
                // Local sign-in has already completed; API features can reconnect later.
            }).finally(() => clearTimeout(timeoutId));

            return cachedUser;
        }

        // 1. Attempt backend API authentication first
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const apiRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanId, password }),
                signal: controller.signal
            });
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data.accessToken) {
                    localStorage.setItem('fintrack_jwt_access', data.accessToken);
                    if (data.refreshToken) localStorage.setItem('fintrack_jwt_refresh', data.refreshToken);

                    // Decode the JWT to get user info
                    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
                    const username = payload.email ? payload.email.split('@')[0] : payload.sub;
                    const displayName = data.user?.name || username;

                    // Sync to localStorage for offline/profile use
                    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                    let existingUser = users.find(u =>
                        (u.email && u.email.toLowerCase() === cleanId) ||
                        (u.username && u.username.toLowerCase() === cleanId)
                    );
                    if (!existingUser) {
                        existingUser = {
                            username: username,
                            email: payload.email || cleanId,
                            password,
                            role: data.user?.role || 'user',
                            profile: { fullName: displayName, currency: 'USD' }
                        };
                        users.push(existingUser);
                        localStorage.setItem(USERS_KEY, JSON.stringify(users));
                    } else if (data.user?.role) {
                        existingUser.role = data.user.role;
                        localStorage.setItem(USERS_KEY, JSON.stringify(users));
                    }

                    localStorage.setItem(SESSION_KEY, existingUser.username);
                    setCurrentUser(existingUser.username);
                    setUserRole(existingUser.role || 'user');
                    setUserProfile(existingUser.profile || { fullName: displayName, currency: 'USD' });
                    return existingUser;
                }
            } else if (apiRes.status === 401) {
                // Backend explicitly rejected credentials
                throw new Error('Invalid email/username or password.');
            }
        } catch (err) {
            // If it's our own thrown error, re-throw it
            if (err.message === 'Invalid email/username or password.') throw err;
            // Otherwise server is offline — fall through to localStorage
        } finally {
            clearTimeout(timeoutId);
        }

        // 2. Fallback: Local storage authentication (offline mode)
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find(u =>
            (u.email && u.email.toLowerCase() === cleanId) ||
            (u.username && u.username.toLowerCase() === cleanId)
        );

        if (!user || user.password !== password) {
            throw new Error('Invalid email/username or password.');
        }

        localStorage.setItem(SESSION_KEY, user.username);
        setCurrentUser(user.username);
        setUserRole(user.role || 'user');
        setUserProfile(user.profile || { fullName: user.username, currency: 'USD' });
        return user;
    };

    const register = async (username, email, password) => {
        const cleanUser = username.trim();
        const cleanEmail = (email || '').trim().toLowerCase();

        if (!cleanUser || !password) {
            throw new Error('Please fill in all required fields.');
        }

        if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            throw new Error('Please provide a valid email address.');
        }

        // 1. Attempt backend API registration first
        let backendSuccess = false;
        try {
            const apiRes = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: cleanEmail || `${cleanUser}@fintracker.local`,
                    password,
                    name: cleanUser
                })
            });
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data.accessToken) {
                    localStorage.setItem('fintrack_jwt_access', data.accessToken);
                    if (data.refreshToken) localStorage.setItem('fintrack_jwt_refresh', data.refreshToken);
                }
                backendSuccess = true;
            } else {
                const errData = await apiRes.json().catch(() => ({}));
                if (apiRes.status === 400 || apiRes.status === 409) {
                    throw new Error(errData.error || 'Registration failed. Email may already be in use.');
                }
            }
        } catch (err) {
            if (err.message && !err.message.includes('fetch')) throw err;
            // Server offline — fall through to localStorage
        }

        // 2. Also save to localStorage for offline profile/session use
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        if (!backendSuccess) {
            // Only check localStorage duplicates if backend wasn't used
            if (users.some(u => u.username.toLowerCase() === cleanUser.toLowerCase())) {
                throw new Error('That username is already registered.');
            }
            if (cleanEmail && users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
                throw new Error('An account with this email address already exists.');
            }
        }

        const newUser = {
            username: cleanUser,
            email: cleanEmail || `${cleanUser}@fintracker.local`,
            password,
            profile: {
                fullName: cleanUser,
                currency: 'USD'
            }
        };

        // Avoid duplicating in localStorage
        if (!users.some(u => (u.email && u.email.toLowerCase() === newUser.email.toLowerCase()))) {
            users.push(newUser);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
        return newUser;
    };


    const logout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setUserRole('user');
        localStorage.removeItem('fintrack_jwt_access');
        localStorage.removeItem('fintrack_jwt_refresh');
    };

    const updateProfile = (fullName, currency) => {
        if (!currentUser) return;
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const userIndex = users.findIndex(u => u.username.toLowerCase() === currentUser.toLowerCase());

        const newProfile = {
            fullName: fullName || currentUser,
            currency: currency || 'USD'
        };

        if (userIndex !== -1) {
            users[userIndex].profile = newProfile;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }

        setUserProfile(newProfile);
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            userRole,
            userProfile,
            isAuthenticated: Boolean(currentUser),
            authLoading,
            darkMode,
            toggleDarkMode,
            colorTheme,
            setColorTheme,
            login,
            register,
            logout,
            updateProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
