/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                primary: {
                    DEFAULT: 'var(--primary)',
                    dark: 'var(--primary-dark)',
                },
            },
            fontFamily: {
                serif: ['var(--font-century)', 'Century', 'Century Schoolbook', 'Libre Baskerville', 'Georgia', 'Times New Roman', 'serif'],
                sans: ['var(--font-century)', 'Century', 'Century Schoolbook', 'Libre Baskerville', 'Georgia', 'serif'],
            },
        },
    },
    plugins: [],
}
