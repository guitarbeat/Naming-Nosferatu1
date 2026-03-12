import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: "class",
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			fontFamily: {
				sans: ["var(--font-sans)"],
				serif: ["var(--font-serif)"],
				mono: ["var(--font-mono)"],
				display: ["var(--font-display)"],
				whimsical: ["var(--font-whimsical)"],
			},
			colors: {
				"background-light": "#f7f6f8",
				"background-dark": "#080820",
				glass: "rgba(255, 255, 255, 0.05)",
				stardust: "#4DC8F5",

				charcoal: "hsl(var(--charcoal))",
				"blue-gray": "hsl(var(--blue-gray))",
				mimosa: "hsl(var(--mimosa))",
				gold: "hsl(var(--gold))",
				"neon-cyan": "hsl(var(--neon-cyan))",
				"hot-pink": "hsl(var(--hot-pink))",
				"fire-red": "hsl(var(--fire-red))",
				coral: "hsl(var(--coral))",
				"rose-pink": "hsl(var(--rose-pink))",
				lavender: "hsl(var(--lavender))",
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
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"fade-in": "fadeIn 0.2s ease-out",
			},
		},
	},
	plugins: [heroui()],
};
