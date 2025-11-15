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
          todo: "hsl(var(--status-todo))",
          "todo-foreground": "hsl(var(--status-todo-foreground))",
          doing: "hsl(var(--status-doing))",
          "doing-foreground": "hsl(var(--status-doing-foreground))",
          done: "hsl(var(--status-done))",
          "done-foreground": "hsl(var(--status-done-foreground))",
          approved: "hsl(var(--status-approved))",
          "approved-foreground": "hsl(var(--status-approved-foreground))",
          hold: "hsl(var(--status-hold))",
          "hold-foreground": "hsl(var(--status-hold-foreground))",
          cancelled: "hsl(var(--status-cancelled))",
          "cancelled-foreground": "hsl(var(--status-cancelled-foreground))",
        },
        urgency: {
          low: "hsl(var(--urgency-low))",
          "low-foreground": "hsl(var(--urgency-low-foreground))",
          medium: "hsl(var(--urgency-medium))",
          "medium-foreground": "hsl(var(--urgency-medium-foreground))",
          high: "hsl(var(--urgency-high))",
          "high-foreground": "hsl(var(--urgency-high-foreground))",
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
