import { useEffect } from "react";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { toast } from "sonner";

export const useTimeTrackingSessionHandler = () => {
    const { state, pauseWork } = useTimeTracking();

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.hidden && state.status === 'active') {
                // Auto-pause on tab switch/minimize?
                // Documentation says "Auto-pause Timer on session end/break".
                // Does it say on Visibility Change?
                // Doc 4.4: "Hook that handles: Page visibility changes (auto-pause? or just sync?), BeforeUnload (ensure sync)."
                // Section 3.1: "Status changes -> Trigger -> Pause/Resume".
                // If user closes tab, we might want to pause work session?
                // Usually "Auto-pause on inactivity" is common. "Auto-pause on hide" might be aggressive.
                // Let's implement BeforeUnload to ensure we log out or sync?
                // Actually, db triggers handle "timeout" if we had a heartbeat. We don't have a heartbeat yet.
                // Let's implement: If page hidden for X minutes, pause?
                // For now, let's just log or sync on beforeunload.
                // And maybe pause work if the user explicitly leaves the app window for too long?

                // Let's stick to the prompt: "handle page visibility changes... for reliable timer pausing".
                // I will implement auto-pause on visibility hidden + toast. (Maybe aggressive but safe).

                try {
                    await pauseWork();
                    toast.info("Work session auto-paused due to background/inactive tab.");
                } catch (e) {
                    console.error("Auto-pause failed", e);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        // window.addEventListener("beforeunload", ... ); // Pause on close?

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [state.status, pauseWork]);
};
