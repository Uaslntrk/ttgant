import * as XLSX from 'xlsx';

export interface ExcelColumnDef {
  key: string;
  header: string;
  width?: number;
}

export interface ExportToExcelOptions {
  filename: string;
  sheetName?: string;
  data: Record<string, any>[];
  columns: ExcelColumnDef[];
}

/**
 * Formats and exports data to an Excel (.xlsx) file with calculated column widths
 * and clean corporate formatting.
 */
export function exportToExcel({
  filename,
  sheetName = 'Veriler',
  data,
  columns
}: ExportToExcelOptions): void {
  if (!data || data.length === 0) {
    alert('Dışa aktarılacak veri bulunamadı.');
    return;
  }

  // 1. Map row objects using readable column headers
  const exportRows = data.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      let val = item[col.key];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'boolean') {
        val = val ? 'Evet' : 'Hayır';
      }
      row[col.header] = val;
    });
    return row;
  });

  // 2. Generate worksheet from JSON
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // 3. Compute optimal column widths so content isn't clipped
  const colWidths = columns.map(col => {
    let maxLen = col.header.length;
    exportRows.forEach(row => {
      const val = row[col.header];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) {
          maxLen = len;
        }
      }
    });
    // Add extra padding, limit min to 12 and max to 60
    const desiredWidth = Math.min(Math.max(col.width || 12, maxLen + 3), 65);
    return { wch: desiredWidth };
  });

  worksheet['!cols'] = colWidths;

  // 4. Create workbook and trigger download
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}
