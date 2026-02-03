import { useState, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportData {
    headers: string[];
    rows: (string | number)[][];
    filename: string;
    title?: string;
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

    const exportToPDF = useCallback((data: ExportData) => {
        setExporting(true);

        try {
            // Create PDF document
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });

            // Add header
            const title = data.title || 'Report';
            const date = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            // Title
            doc.setFontSize(20);
            doc.setTextColor(33, 33, 33);
            doc.text(title, 14, 20);

            // Subtitle with date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on ${date}`, 14, 28);

            // Add table using autoTable
            autoTable(doc, {
                head: [data.headers],
                body: data.rows.map(row => row.map(cell => String(cell))),
                startY: 35,
                theme: 'striped',
                headStyles: {
                    fillColor: [59, 130, 246], // Primary blue
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [50, 50, 50],
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250],
                },
                styles: {
                    cellPadding: 3,
                    overflow: 'linebreak',
                },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                },
                margin: { top: 35, right: 14, bottom: 20, left: 14 },
                didDrawPage: (pageData) => {
                    // Footer with page number
                    const pageCount = doc.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(
                        `Page ${pageData.pageNumber} of ${pageCount}`,
                        doc.internal.pageSize.width / 2,
                        doc.internal.pageSize.height - 10,
                        { align: 'center' }
                    );
                    doc.text(
                        'TaskOPS 2.0',
                        14,
                        doc.internal.pageSize.height - 10
                    );
                },
            });

            // Save PDF
            doc.save(`${data.filename}.pdf`);
        } catch (error) {
            console.error("PDF export failed:", error);
        } finally {
            setExporting(false);
        }
    }, []);

    return { exporting, exportToCSV, exportToJSON, exportToPDF };
};
