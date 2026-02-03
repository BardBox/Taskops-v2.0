import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileJson, Loader2, ChevronDown } from "lucide-react";
import { useExportReport, ExportData } from "@/hooks/useExportReport";

// ============================================================================
// TYPES
// ============================================================================

interface ExportButtonProps {
    getData: () => ExportData;
    className?: string;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExportButton({
    getData,
    className,
    variant = "outline",
    size = "sm"
}: ExportButtonProps) {
    const { exporting, exportToCSV, exportToJSON } = useExportReport();
    const [open, setOpen] = useState(false);

    const handleExportCSV = () => {
        const data = getData();
        exportToCSV(data);
        setOpen(false);
    };

    const handleExportJSON = () => {
        const data = getData();
        exportToJSON(data);
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    className={cn("gap-2", className)}
                    disabled={exporting}
                >
                    {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    Export
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON} className="gap-2 cursor-pointer">
                    <FileJson className="h-4 w-4 text-blue-500" />
                    Export JSON
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
