/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#f8cb46',
                secondary: '#0c831f',
                dark: '#1c1c1c',
            }
        },
    },
    plugins: [],
}
