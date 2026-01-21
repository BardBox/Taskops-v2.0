import { useEffect } from "react";

export const useTimeTrackingSessionHandler = () => {

    useEffect(() => {
        // Previously handled auto-pause on visibility change.
        // Logic removed as per user request (it was too aggressive).
        // We can add other session lifecycle handlers here if needed (e.g. beforeUnload).

        const handleBeforeUnload = () => {
            // Optional: ensure state is saved, but we rely on realtime db mostly.
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);
};
