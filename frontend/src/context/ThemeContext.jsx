import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Check localStorage or default to 'system'
    const getInitialTheme = () => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const savedTheme = window.localStorage.getItem('appTheme');
            if (savedTheme) {
                return savedTheme;
            }
        }
        return 'system';
    };

    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        
        const applyTheme = (resolvedTheme) => {
            if (resolvedTheme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        if (theme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(systemPrefersDark ? 'dark' : 'light');

            // Add event listener for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e) => applyTheme(e.matches ? 'dark' : 'light');
            
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            applyTheme(theme);
        }
        
        // Save to localStorage
        window.localStorage.setItem('appTheme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
