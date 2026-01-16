
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
