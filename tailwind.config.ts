import type { Config } from 'tailwindcss';

export default {
    darkMode: 'class',
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: '1rem',
                sm: '1.5rem',
                lg: '2rem',
            },
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            fontFamily: {
                body: ['Inter', 'sans-serif'],
                display: ['Cormorant Garamond', 'Tiempos Headline', 'Georgia', 'serif'],
            },
            colors: {
                background: 'var(--color-background)',
                foreground: 'var(--color-foreground)',
                card: {
                    DEFAULT: 'var(--color-card)',
                    foreground: 'var(--color-card-foreground)',
                },
                elevated: 'var(--color-elevated)',
                primary: {
                    DEFAULT: 'var(--color-primary)',
                    foreground: 'var(--color-primary-foreground)',
                    hover: 'var(--color-primary-hover)',
                    active: 'var(--color-primary-active)',
                },
                secondary: {
                    DEFAULT: 'var(--color-secondary)',
                    foreground: 'var(--color-secondary-foreground)',
                },
                muted: {
                    DEFAULT: 'var(--color-muted)',
                    foreground: 'var(--color-muted-foreground)',
                },
                accent: {
                    DEFAULT: 'var(--color-accent)',
                    foreground: 'var(--color-accent-foreground)',
                    soft: 'var(--color-accent-soft)',
                },
                destructive: {
                    DEFAULT: 'var(--color-destructive)',
                    foreground: 'var(--color-destructive-foreground)',
                    hover: 'var(--color-destructive-hover)',
                },
                success: 'var(--color-success)',
                warning: 'var(--color-warning)',
                info: 'var(--color-info)',
                border: 'var(--color-border)',
                input: {
                    DEFAULT: 'var(--color-input)',
                    border: 'var(--color-input-border)',
                    focus: 'var(--color-input-focus)',
                },
                ring: 'var(--color-ring)',
                placeholder: 'var(--color-placeholder)',
            },
            borderRadius: {
                lg: '0.5rem',
                md: 'calc(0.5rem - 2px)',
                sm: 'calc(0.5rem - 4px)',
            },
        },
    },
    plugins: [],
} satisfies Config;
