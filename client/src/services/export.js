import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function triggerDownload(content, filename, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Export rows to CSV. `columns` = [{ key, label }].
 */
export function exportCSV(filename, columns, rows) {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(c.render ? c.render(row) : row[c.key])).join(','))
    .join('\n');
  triggerDownload(`${header}\n${body}`, filename);
}

/**
 * Export rows to PDF with autoTable. `columns` = [{ key, label, render? }].
 */
export function exportPDF(filename, title, columns, rows) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.setTextColor(37, 67, 235);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const now = new Date().toLocaleString();
  doc.text(`FaceHR · Generated ${now}`, 14, 22);

  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => (c.render ? c.render(row) : row[c.key]))),
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 67, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [243, 244, 248] },
  });

  doc.save(filename);
}

/** Convenience builders for the two main report shapes. */
export function buildAttendanceExportPayload(summary, rows) {
  const columns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'date', label: 'Date' },
    { key: 'checkInTime', label: 'Check In', render: (r) => (r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—') },
    { key: 'checkOutTime', label: 'Check Out', render: (r) => (r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—') },
    {
      key: 'workingHoursMinutes',
      label: 'Working Hours',
      render: (r) => {
        if (!r.workingHoursMinutes) return '—';
        const h = Math.floor(r.workingHoursMinutes / 60);
        const m = r.workingHoursMinutes % 60;
        return `${h}h ${String(m).padStart(2, '0')}m`;
      },
    },
    { key: 'status', label: 'Status' },
  ];
  return {
    columns,
    title: `Attendance Report · ${summary.range.from} to ${summary.range.to}`,
    fileBase: `facehr-attendance-${summary.range.from}-${summary.range.to}`,
    rows,
  };
}

/**
 * Export a flat attendance rows array (from buildAttendanceExportPayload shape)
 * to CSV using the shared report columns.
 */
export function exportAttendanceToCsv(rows, fileBase) {
  const columns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'date', label: 'Date' },
    { key: 'checkIn', label: 'Check In' },
    { key: 'checkOut', label: 'Check Out' },
    { key: 'hours', label: 'Working Hours' },
    { key: 'status', label: 'Status' },
  ];
  exportCSV(`${fileBase}.csv`, columns, rows);
}

/**
 * Export a flat attendance rows array to a captioned PDF table.
 */
export function exportAttendanceToPdf(rows, summary) {
  const { columns, title, fileBase } = buildAttendanceExportPayload(summary, rows);
  const mapped = rows.map((r) => ({
    ...r,
    checkInTime: r.checkIn,
    checkOutTime: r.checkOut,
    workingHoursMinutes: null,
  }));
  exportPDF(`${fileBase}.pdf`, title, columns, mapped);
}