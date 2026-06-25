/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                heading: ['"Space Grotesk"', 'Inter', 'sans-serif'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
                },
                warning: {
                    DEFAULT: "hsl(var(--warning))",
                    foreground: "hsl(var(--warning-foreground))",
                },
                info: {
                    DEFAULT: "hsl(var(--info))",
                    foreground: "hsl(var(--info-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            boxShadow: {
                'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                // Elevation scale — 2-layer (ambient + direct) for real depth.
                // Use shadow-e2 in light, dark:shadow-e2-dark in dark.
                'e1': '0 1px 2px rgba(2, 6, 23, 0.04), 0 1px 3px rgba(2, 6, 23, 0.06)',
                'e2': '0 2px 4px rgba(2, 6, 23, 0.04), 0 4px 12px rgba(2, 6, 23, 0.08)',
                'e3': '0 4px 8px rgba(2, 6, 23, 0.05), 0 12px 28px rgba(2, 6, 23, 0.10)',
                'e4': '0 8px 16px rgba(2, 6, 23, 0.06), 0 24px 48px rgba(2, 6, 23, 0.14)',
                'e1-dark': '0 1px 2px rgba(0, 0, 0, 0.40), 0 1px 3px rgba(0, 0, 0, 0.50)',
                'e2-dark': '0 2px 6px rgba(0, 0, 0, 0.45), 0 6px 16px rgba(0, 0, 0, 0.55)',
                'e3-dark': '0 6px 14px rgba(0, 0, 0, 0.50), 0 14px 32px rgba(0, 0, 0, 0.60)',
                'e4-dark': '0 10px 22px rgba(0, 0, 0, 0.55), 0 28px 56px rgba(0, 0, 0, 0.70)',
            },
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
                'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
                'in-out-soft': 'cubic-bezier(0.45, 0, 0.15, 1)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 1.6s cubic-bezier(0.45, 0, 0.15, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                }
            }
        },
    },
    plugins: [],
}
