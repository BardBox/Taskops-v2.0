
import { saveAs } from 'file-saver';

export const generateFocusModeDocumentation = (): string => {
    return `# Focus Mode Feature - Complete Implementation Guide

## Table of Contents
1. [Overview & Purpose](#1-overview--purpose)
2. [Architecture](#2-architecture-diagram)
3. [React Context Implementation](#3-react-context-implementation)
4. [UI Component Integration](#4-ui-component-integration)
5. [Keyboard Shortcuts](#5-keyboard-shortcuts)
6. [CSS/Styling Changes](#6-cssstyling-patterns)
7. [App.tsx Setup](#7-apptsx-setup)
8. [Implementation Steps](#8-step-by-step-implementation-guide)

## 1. Overview & Purpose
- Maximizes screen real estate for power users
- Hides non-essential UI elements (Breadcrumbs, Filters, Metrics, Sidebar elements)
- Triggers browser fullscreen mode
- Persists preference in \`localStorage\`

## 2. Architecture Diagram

\`\`\`mermaid
graph TD
    A[User triggers Focus Mode] -->|Click or Shortcut| B(FocusModeContext)
    B -->|Set State| C{isFocusMode}
    C -->|True| D[Request Fullscreen API]
    C -->|False| E[Exit Fullscreen API]
    B -->|Broadcast State| F[App Components]
    F -->|AppHeader| G[Shrink Height / Hide Elements]
    F -->|Sidebar| H[Collapse / Hide Stats]
    F -->|Dashboard| I[Hide Metrics / Filters / Increase Spacing]
\`\`\`

## 3. React Context Implementation

### \`src/context/FocusModeContext.tsx\` (Complete Code)

\`\`\`tsx
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";

interface FocusModeContextType {
    isFocusMode: boolean;
    toggleFocusMode: () => void;
    enableFocusMode: () => void;
    disableFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | null>(null);

export const useFocusMode = () => {
    const context = useContext(FocusModeContext);
    if (!context) {
        throw new Error("useFocusMode must be used within a FocusModeProvider");
    }
    return context;
};

export const FocusModeProvider = ({ children }: { children: ReactNode }) => {
    // Initialize from localStorage to persist state across reloads
    const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
        const saved = localStorage.getItem("focusMode");
        return saved === "true";
    });

    // Helper to actually trigger browser fullscreen
    const triggerFullscreen = useCallback(async (enable: boolean) => {
        try {
            if (enable) {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }
            } else {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            }
        } catch (error) {
            console.error("Fullscreen toggle failed:", error);
            // Non-critical error, suppressing toast to avoid annoyance
        }
    }, []);

    const enableFocusMode = useCallback(() => {
        setIsFocusMode(true);
        localStorage.setItem("focusMode", "true");
        triggerFullscreen(true);
        toast.info("Focus Mode Enabled", {
            description: "Press 'F' or click the icon to exit.",
            duration: 2000,
        });
    }, [triggerFullscreen]);

    const disableFocusMode = useCallback(() => {
        setIsFocusMode(false);
        localStorage.setItem("focusMode", "false");
        triggerFullscreen(false);
        toast.info("Focus Mode Disabled");
    }, [triggerFullscreen]);

    const toggleFocusMode = useCallback(() => {
        if (isFocusMode) {
            disableFocusMode();
        } else {
            enableFocusMode();
        }
    }, [isFocusMode, enableFocusMode, disableFocusMode]);

    // Keyboard Shortcut Listener (Global 'f' or 'F')
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input, textarea, or contentEditable
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key.toLowerCase() === "f") {
                e.preventDefault();
                toggleFocusMode();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleFocusMode]);

    // Sync with browser fullscreen changes (e.g. user presses Esc)
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && isFocusMode) {
                // User exited fullscreen manually (e.g. Esc key), so we disable focus mode
                setIsFocusMode(false);
                localStorage.setItem("focusMode", "false");
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [isFocusMode]);

    return (
        <FocusModeContext.Provider value={{ isFocusMode, toggleFocusMode, enableFocusMode, disableFocusMode }}>
            {children}
        </FocusModeContext.Provider>
    );
};
\`\`\`

## 4. UI Component Integration

### \`src/components/AppHeader.tsx\` Changes

1.  **Consume Context**:
    \`\`\`tsx
    const { isFocusMode, toggleFocusMode } = useFocusMode();
    \`\`\`

2.  **Conditional Height**:
    Change the header container class to dynamically switch height.
    \`\`\`tsx
    className={cn(
        "border-b border-border/40 backdrop-blur-xl bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 transition-all duration-300",
        isFocusMode ? "h-10 px-2" : "h-14 px-4" // Taller in normal mode, compact in focus mode
    )}
    \`\`\`

3.  **Toggle Button**:
    Add the toggle button to the header actions area.
    \`\`\`tsx
    <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleFocusMode}
        title={isFocusMode ? "Exit Focus Mode (F)" : "Enter Focus Mode (F)"}
        className={cn("transition-all", isFocusMode ? "h-8 w-8" : "h-9 w-9")}
    >
        {isFocusMode ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
    </Button>
    \`\`\`

4.  **Hide Elements**:
    Wrap non-essential elements (like User Avatar, Notifications, Branding) in a conditional check or CSS class.
    \`\`\`tsx
    {/* Branding */}
    <div className={cn("transition-all duration-300", isFocusMode ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
        <span className="font-bold">TaskOPS</span>
    </div>
    \`\`\`

### \`src/components/layout/WorkSessionBar.tsx\` Changes

Completely hide this bar when in focus mode to save vertical space.

\`\`\`tsx
const { isFocusMode } = useFocusMode();

if (isFocusMode) return null; // Early return to render nothing
\`\`\`

### \`src/pages/Dashboard.tsx\` Changes

1.  **Hide Breadcrumbs & Metrics**:
    \`\`\`tsx
    {!isFocusMode && (
        <>
            <Breadcrumbs />
            <DashboardMetrics />
        </>
    )}
    \`\`\`

2.  **Adjust Container Padding**:
    \`\`\`tsx
    <div className={cn("container", isFocusMode ? "p-2 max-w-full" : "p-4 md:p-8")}>
    \`\`\`

### \`src/components/TaskTable.tsx\` Changes

1.  **Prop Drilling**: Accept \`isFocusMode\` as a prop or consume context directly.
2.  **Compact Density**:
    \`\`\`tsx
    <TableCell className={cn("transition-all", isFocusMode ? "py-1" : "py-3")}>
        {/* Cell Content */}
    </TableCell>
    \`\`\`

## 5. Keyboard Shortcuts
The keyboard shortcut logic is handled directly in the \`FocusModeContext.tsx\` logic above using \`window.addEventListener('keydown')\`.

- **Shortcut**: \`F\` (case-insensitive)
- **Safety**: Automatically ignored when user is typing in forms.

## 6. CSS/Styling Patterns
- **Transitions**: Use \`transition-all duration-300 ease-in-out\` on all layout containers (Header, Sidebar, Main Content) to make the switch feel premium and smooth.
- **Conditional Classes**: Use the \`cn()\` utility (clsx + tailwind-merge) for clean conditional logic.
  \`\`\`tsx
  cn("base-class", isFocusMode && "focus-mode-class")
  \`\`\`
- **Backdrop Blur**: Ensure standard headers use \`backdrop-blur-xl\` so content scrolling underneath looks good even in compact mode.

## 7. App.tsx Setup

Wrap your application (or at least the MainLayout routes) with the provider:

\`\`\`tsx
// App.tsx
import { FocusModeProvider } from "@/context/FocusModeContext";

export default function App() {
  return (
    <Router>
       <FocusModeProvider>
          <Routes>
             {/* ... your routes ... */}
          </Routes>
       </FocusModeProvider>
    </Router>
  );
}
\`\`\`

## 8. Step-by-Step Implementation Guide

1.  **Create Context**: Copy the code from Section 3 into \`src/context/FocusModeContext.tsx\`.
2.  **Install Provider**: Add \`<FocusModeProvider>\` to \`src/App.tsx\` wrapping your routes.
3.  **Update Header**: Modify \`src/components/AppHeader.tsx\` to consume the context and add the \`<Button>\` with the Zap icon.
4.  **Hide Extras**: Go through \`Dashboard.tsx\` and \`MainLayout.tsx\` and add \`!isFocusMode && ...\` checks around non-critical UI elements.
5.  **Test**: Press 'F' on your keyboard to toggle. Verify Fullscreen triggers and persistent UI elements shrink/disappear.
`;
};

export const downloadFocusModeDocs = () => {
    const content = generateFocusModeDocumentation();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, 'Focus_Mode_Implementation_Guide.md');
};
