import ExcelJS from 'exceljs';

interface ColumnDef {
    header: string;
    key: string;
    width?: number;
    dropdown?: string[];
}

export const generateExcelTemplate = async (columns: ColumnDef[], sheetName: string, filename: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 20,
    }));

    // Add data validation
    columns.forEach((col, index) => {
        if (col.dropdown && col.dropdown.length > 0) {
            // Apply validation to a reasonable number of rows (e.g., 1000)
            for (let i = 2; i <= 1000; i++) {
                const cell = worksheet.getCell(i, index + 1);
                cell.dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`"${col.dropdown.join(',')}"`],
                    showErrorMessage: true,
                    errorStyle: 'error',
                    errorTitle: 'Invalid Selection',
                    error: 'Please select a value from the list.'
                };
            }
        }
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).commit();

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const parseExcel = async <T>(file: File): Promise<T[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    const data: T[] = [];
    const headers: string[] = [];

    // Get headers from first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value ? cell.value.toString() : '';
    });

    // Iterate rows (start from 2)
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
                // Handle rich text or other types if necessary, mostly toString works for simple data
                rowData[header] = cell.value;
            }
        });

        // Only push if not empty
        if (Object.keys(rowData).length > 0) {
            data.push(rowData as T);
        }
    });

    return data;
};
