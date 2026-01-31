import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea as BaseTextarea, TextareaProps } from "@/components/ui/textarea";

export const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, value, onChange, ...props }, ref) => {
        const internalRef = React.useRef<HTMLTextAreaElement>(null);

        // Combine refs
        React.useImperativeHandle(ref, () => internalRef.current!);

        const adjustHeight = () => {
            const textarea = internalRef.current;
            if (textarea) {
                textarea.style.height = "auto";
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        };

        React.useEffect(() => {
            adjustHeight();
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            adjustHeight();
            onChange?.(e);
        };

        return (
            <BaseTextarea
                ref={internalRef}
                value={value}
                onChange={handleChange}
                className={cn("resize-none overflow-hidden", className)}
                {...props}
            />
        );
    }
);
AutoResizeTextarea.displayName = "AutoResizeTextarea";
