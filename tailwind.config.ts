import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['system-ui', '-apple-system', 'sans-serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
  		},
  		fontSize: {
  			// Headings
  			'h1': ['2.5rem', { lineHeight: '3.5rem', fontWeight: '700', letterSpacing: '-0.02em' }], // 40px
  			'h2': ['2rem', { lineHeight: '2.75rem', fontWeight: '700', letterSpacing: '-0.01em' }], // 32px
  			'h3': ['1.5rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em' }], // 24px
  			'h4': ['1.25rem', { lineHeight: '1.875rem', fontWeight: '600', letterSpacing: '0' }], // 20px
  			'h5': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600', letterSpacing: '0' }], // 18px
  			'h6': ['1rem', { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '0' }], // 16px
  			
  			// Body
  			'body-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400', letterSpacing: '0' }], // 18px
  			'body-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '400', letterSpacing: '0' }], // 16px
  			'body-sm': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400', letterSpacing: '0' }], // 14px
  			
  			// Captions & Labels
  			'caption': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '500', letterSpacing: '0.02em' }], // 12px
  			'label': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '500', letterSpacing: '0' }], // 14px
  			
  			// Numeric/Stats
  			'stat-lg': ['2rem', { lineHeight: '2.5rem', fontWeight: '700', letterSpacing: '-0.01em' }], // 32px
  			'stat-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '700', letterSpacing: '0' }], // 24px
  			'stat-sm': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '700', letterSpacing: '0' }], // 18px
  			
  			// Mono (for code)
  			'mono-sm': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400', letterSpacing: '0' }],
  			'mono-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '400', letterSpacing: '0' }],
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
