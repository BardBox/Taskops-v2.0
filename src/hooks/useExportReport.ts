import { useState, useCallback } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportData {
    headers: string[];
    rows: (string | number)[][];
    filename: string;
}

// ============================================================================
// HOOK
// ============================================================================

export const useExportReport = () => {
    const [exporting, setExporting] = useState(false);

    const exportToCSV = useCallback((data: ExportData) => {
        setExporting(true);

        try {
            // Build CSV content
            const csvContent = [
                data.headers.join(","),
                ...data.rows.map(row =>
                    row.map(cell => {
                        // Escape quotes and wrap in quotes if contains comma
                        const cellStr = String(cell);
                        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
                            return `"${cellStr.replace(/"/g, '""')}"`;
                        }
                        return cellStr;
                    }).join(",")
                )
            ].join("\n");

            // Create blob and download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${data.filename}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setExporting(false);
        }
    }, []);

    const exportToJSON = useCallback((data: ExportData) => {
        setExporting(true);

        try {
            // Convert to array of objects
            const jsonData = data.rows.map(row => {
                const obj: Record<string, string | number> = {};
                data.headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });

            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${data.filename}.json`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setExporting(false);
        }
    }, []);

    return { exporting, exportToCSV, exportToJSON };
};
