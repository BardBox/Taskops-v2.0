import { useEffect, useState, useRef } from "react";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Play, Clock, LogOut, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "auto_clock_out_state_";

interface AutoClockOutState {
    type: 'continue' | 'extend';
    nextCheck?: number;
}

export const AutoClockOutManager = () => {
    const { state, clockOut } = useTimeTracking();
    const [isOpen, setIsOpen] = useState(false);
    const clockOutTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Constants
    const TARGET_HOUR = 18; // 6 PM
    const TARGET_MINUTE = 10; // 10 minutes
    const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    // For development/testing, you can override these check functions if needed
    const isTargetTimeReached = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        return currentHour > TARGET_HOUR || (currentHour === TARGET_HOUR && currentMinute >= TARGET_MINUTE);
    };

    useEffect(() => {
        // Check every minute
        const checkInterval = setInterval(() => {
            performTimeCheck();
        }, 60000);

        // Also check immediately on mount/state change
        performTimeCheck();

        return () => {
            clearInterval(checkInterval);
            if (clockOutTimerRef.current) clearTimeout(clockOutTimerRef.current);
        };
    }, [state.status, state.sessionId]);

    const performTimeCheck = () => {
        // Only run if user is actively working
        if (state.status !== 'active' || !state.sessionId) return;

        // If already showing modal, don't do anything
        if (isOpen) return;

        // Check if we reached the target time (6:10 PM)
        if (!isTargetTimeReached()) return;

        // Check local storage for existing decisions for this session
        const storedStateStr = localStorage.getItem(STORAGE_KEY_PREFIX + state.sessionId);
        if (storedStateStr) {
            try {
                const storedState: AutoClockOutState = JSON.parse(storedStateStr);

                // If user chose "Continue", suppress forever for this session
                if (storedState.type === 'continue') return;

                // If user chose "Extend", suppress until nextCheck
                if (storedState.type === 'extend' && storedState.nextCheck) {
                    if (Date.now() < storedState.nextCheck) return;
                }
            } catch (e) {
                console.error("Failed to parse auto clock out state", e);
            }
        }

        // If we got here, we should trigger the reminder
        triggerReminder();
    };

    const triggerReminder = () => {
        setIsOpen(true);

        // Start auto-clock-out timer (10 mins)
        if (clockOutTimerRef.current) clearTimeout(clockOutTimerRef.current);
        clockOutTimerRef.current = setTimeout(() => {
            handleAutoClockOut();
        }, IDLE_TIMEOUT_MS);
    };

    const handleAutoClockOut = () => {
        toast.info("Auto clocked out due to inactivity after 6:10 PM reminder.");
        clockOut();
        setIsOpen(false);
        if (clockOutTimerRef.current) clearTimeout(clockOutTimerRef.current);
    };

    const handleContinue = () => {
        // "Continue" -> No further reminders for that session
        saveDecision({ type: 'continue' });
        closeDialog();
        toast.success("Clock continuing... Work hard!");
    };

    const handleExtendSession = () => {
        // "Extend" -> Remind again in 30 minutes
        const thirtyMinutesLater = Date.now() + (30 * 60 * 1000);
        saveDecision({ type: 'extend', nextCheck: thirtyMinutesLater });
        closeDialog();
        toast.info("Extended for 30 minutes.");
    };

    const handleClockOutUser = () => {
        // "Clock Out"
        clockOut();
        closeDialog();
    };

    const saveDecision = (decision: AutoClockOutState) => {
        if (!state.sessionId) return;
        localStorage.setItem(STORAGE_KEY_PREFIX + state.sessionId, JSON.stringify(decision));
    };

    const closeDialog = () => {
        setIsOpen(false);
        if (clockOutTimerRef.current) clearTimeout(clockOutTimerRef.current);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Prevent closing via escape or click outside
        }}>
            <DialogContent
                className="sm:max-w-[480px] border-none shadow-2xl bg-white/95 backdrop-blur-md pb-8"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                hideCloseButton={true}
            >
                <div className="flex flex-col items-center text-center space-y-4 pt-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-20" />
                        <div className="bg-yellow-100 p-3 rounded-full relative">
                            <Clock className="w-8 h-8 text-yellow-600 animate-[wiggle_1s_ease-in-out_infinite]" />
                        </div>
                    </div>

                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl font-bold text-slate-800">End of Day Check</DialogTitle>
                        <DialogDescription className="text-base text-slate-600">
                            It's past 6:10 PM. Would you like to wrap up for the day?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="text-xs font-medium text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                        Auto-clock out in 10 minutes
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-8">
                    {/* Continue Button */}
                    <Button
                        variant="ghost"
                        onClick={handleContinue}
                        className={cn(
                            "w-full h-14 rounded-full border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                            "flex items-center justify-between px-6 transition-all duration-300 group"
                        )}
                    >
                        <span className="font-semibold text-slate-700 flex flex-col items-start leading-tight">
                            <span>Continue Working</span>
                            <span className="text-[10px] font-normal text-slate-400">Don't ask again today</span>
                        </span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Play className="w-4 h-4 text-blue-500 fill-blue-500" />
                        </div>
                    </Button>

                    {/* Extend Button */}
                    <Button
                        variant="ghost"
                        onClick={handleExtendSession}
                        className={cn(
                            "w-full h-14 rounded-full border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                            "flex items-center justify-between px-6 transition-all duration-300 group"
                        )}
                    >
                        <span className="font-semibold text-slate-700 flex flex-col items-start leading-tight">
                            <span>Extend 30 Mins</span>
                            <span className="text-[10px] font-normal text-slate-400">Ask again in 30m</span>
                        </span>
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <Coffee className="w-4 h-4 text-purple-500" />
                        </div>
                    </Button>

                    {/* Clock Out Button */}
                    <Button
                        onClick={handleClockOutUser}
                        className={cn(
                            "w-full h-14 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border-2 border-transparent hover:border-red-100 shadow-none",
                            "flex items-center justify-between px-6 mt-2 transition-all duration-300 group"
                        )}
                    >
                        <span className="font-semibold flex flex-col items-start leading-tight">
                            <span>Clock Out Now</span>
                            <span className="text-[10px] font-normal text-red-400 opacity-80">End session</span>
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white/80 transition-colors">
                            <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
