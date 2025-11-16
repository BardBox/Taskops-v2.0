import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        status: {
          // Soft Blues
          "powder-blue": "hsl(var(--status-powder-blue))",
          "powder-blue-foreground": "hsl(var(--status-powder-blue-foreground))",
          "sky-blue": "hsl(var(--status-sky-blue))",
          "sky-blue-foreground": "hsl(var(--status-sky-blue-foreground))",
          periwinkle: "hsl(var(--status-periwinkle))",
          "periwinkle-foreground": "hsl(var(--status-periwinkle-foreground))",
          "ice-blue": "hsl(var(--status-ice-blue))",
          "ice-blue-foreground": "hsl(var(--status-ice-blue-foreground))",
          // Soft Greens
          mint: "hsl(var(--status-mint))",
          "mint-foreground": "hsl(var(--status-mint-foreground))",
          sage: "hsl(var(--status-sage))",
          "sage-foreground": "hsl(var(--status-sage-foreground))",
          seafoam: "hsl(var(--status-seafoam))",
          "seafoam-foreground": "hsl(var(--status-seafoam-foreground))",
          pistachio: "hsl(var(--status-pistachio))",
          "pistachio-foreground": "hsl(var(--status-pistachio-foreground))",
          // Soft Yellows/Oranges
          cream: "hsl(var(--status-cream))",
          "cream-foreground": "hsl(var(--status-cream-foreground))",
          peach: "hsl(var(--status-peach))",
          "peach-foreground": "hsl(var(--status-peach-foreground))",
          apricot: "hsl(var(--status-apricot))",
          "apricot-foreground": "hsl(var(--status-apricot-foreground))",
          buttercup: "hsl(var(--status-buttercup))",
          "buttercup-foreground": "hsl(var(--status-buttercup-foreground))",
          // Soft Pinks/Roses
          blush: "hsl(var(--status-blush))",
          "blush-foreground": "hsl(var(--status-blush-foreground))",
          rose: "hsl(var(--status-rose))",
          "rose-foreground": "hsl(var(--status-rose-foreground))",
          coral: "hsl(var(--status-coral))",
          "coral-foreground": "hsl(var(--status-coral-foreground))",
          mauve: "hsl(var(--status-mauve))",
          "mauve-foreground": "hsl(var(--status-mauve-foreground))",
          // Soft Purples
          lavender: "hsl(var(--status-lavender))",
          "lavender-foreground": "hsl(var(--status-lavender-foreground))",
          lilac: "hsl(var(--status-lilac))",
          "lilac-foreground": "hsl(var(--status-lilac-foreground))",
          "periwinkle-purple": "hsl(var(--status-periwinkle-purple))",
          "periwinkle-purple-foreground": "hsl(var(--status-periwinkle-purple-foreground))",
          // Soft Grays
          pearl: "hsl(var(--status-pearl))",
          "pearl-foreground": "hsl(var(--status-pearl-foreground))",
        },
        urgency: {
          "very-low": "hsl(var(--urgency-very-low))",
          "very-low-foreground": "hsl(var(--urgency-very-low-foreground))",
          low: "hsl(var(--urgency-low))",
          "low-foreground": "hsl(var(--urgency-low-foreground))",
          "low-medium": "hsl(var(--urgency-low-medium))",
          "low-medium-foreground": "hsl(var(--urgency-low-medium-foreground))",
          medium: "hsl(var(--urgency-medium))",
          "medium-foreground": "hsl(var(--urgency-medium-foreground))",
          "medium-high": "hsl(var(--urgency-medium-high))",
          "medium-high-foreground": "hsl(var(--urgency-medium-high-foreground))",
          high: "hsl(var(--urgency-high))",
          "high-foreground": "hsl(var(--urgency-high-foreground))",
          "very-high": "hsl(var(--urgency-very-high))",
          "very-high-foreground": "hsl(var(--urgency-very-high-foreground))",
          urgent: "hsl(var(--urgency-urgent))",
          "urgent-foreground": "hsl(var(--urgency-urgent-foreground))",
          critical: "hsl(var(--urgency-critical))",
          "critical-foreground": "hsl(var(--urgency-critical-foreground))",
          immediate: "hsl(var(--urgency-immediate))",
          "immediate-foreground": "hsl(var(--urgency-immediate-foreground))",
        },
        notification: {
          info: "hsl(var(--notification-info))",
          success: "hsl(var(--notification-success))",
          warning: "hsl(var(--notification-warning))",
          error: "hsl(var(--notification-error))",
        },
        star: "hsl(var(--star))",
        role: {
          owner: "hsl(var(--role-owner))",
          "owner-foreground": "hsl(var(--role-owner-foreground))",
          manager: "hsl(var(--role-manager))",
          "manager-foreground": "hsl(var(--role-manager-foreground))",
          member: "hsl(var(--role-member))",
          "member-foreground": "hsl(var(--role-member-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
