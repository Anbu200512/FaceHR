import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, resolveAsset } from './format';

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

function fmtTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtMinutes(minutes) {
  const m = Number(minutes || 0);
  if (!m) return '-';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${String(mm).padStart(2, '0')}m`;
}

function normalizeAttendanceRow(r) {
  return {
    employeeId: r?.employeeId || '',
    employeeName: r?.employeeName || '',
    department: r?.department || '',
    date: r?.date || '',
    checkInTime: r?.checkIn ?? r?.checkInTime ?? null,
    checkOutTime: r?.checkOut ?? r?.checkOutTime ?? null,
    workingHoursMinutes: r?.workingHoursMinutes ?? 0,
    status: r?.status || '',
  };
}

/**
 * Export rows to CSV. `columns` = [{ key, label, render? }].
 */
export function exportCSV(filename, columns, rows) {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const body = (rows || [])
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
  doc.text(String(title || 'Report'), 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`FaceHR - Generated ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: (rows || []).map((row) => columns.map((c) => (c.render ? c.render(row) : row[c.key] ?? ''))),
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 67, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [243, 244, 248] },
  });

  doc.save(filename);
}

/** Convenience builders for attendance report export. */
export function buildAttendanceExportPayload(summary, rows) {
  const normalized = (rows || []).map(normalizeAttendanceRow);
  const columns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'date', label: 'Date' },
    { key: 'checkInTime', label: 'Check In', render: (r) => fmtTime(r.checkInTime) },
    { key: 'checkOutTime', label: 'Check Out', render: (r) => fmtTime(r.checkOutTime) },
    { key: 'workingHoursMinutes', label: 'Working Hours', render: (r) => fmtMinutes(r.workingHoursMinutes) },
    { key: 'status', label: 'Status' },
  ];
  const from = summary?.range?.from || '';
  const to = summary?.range?.to || '';
  return {
    columns,
    title: `Attendance Report - ${from} to ${to}`,
    fileBase: `facehr-attendance-${from}-${to}`,
    rows: normalized,
  };
}

/**
 * Export a flat attendance rows array to CSV.
 */
export function exportAttendanceToCsv(rows, fileBase) {
  const normalized = (rows || []).map(normalizeAttendanceRow);
  const columns = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'date', label: 'Date' },
    { key: 'checkInTime', label: 'Check In', render: (r) => fmtTime(r.checkInTime) },
    { key: 'checkOutTime', label: 'Check Out', render: (r) => fmtTime(r.checkOutTime) },
    { key: 'workingHoursMinutes', label: 'Working Hours', render: (r) => fmtMinutes(r.workingHoursMinutes) },
    { key: 'status', label: 'Status' },
  ];
  exportCSV(`${fileBase}.csv`, columns, normalized);
}

/**
 * Export a flat attendance rows array to PDF.
 */
export function exportAttendanceToPdf(rows, summary) {
  const { columns, title, fileBase } = buildAttendanceExportPayload(summary, rows || []);
  exportPDF(`${fileBase}.pdf`, title, columns, (rows || []).map(normalizeAttendanceRow));
}

function val(v, fallback = '-') {
  if (v === null || v === undefined || v === '') return fallback;
  if (Array.isArray(v)) return v.length ? v.join(', ') : fallback;
  return String(v);
}

function fullNameOf(emp) {
  return [emp?.firstName, emp?.middleName, emp?.lastName].filter(Boolean).join(' ').trim() || emp?.name || '-';
}

function addrText(a) {
  if (!a) return '-';
  if (typeof a === 'string') return a.trim() || '-';
  const parts = [a.line1, a.line2, a.city, a.state, a.country, a.pincode].filter(Boolean);
  return parts.length ? parts.join(', ') : '-';
}

function maskAccount(n) {
  const s = String(n || '').trim();
  if (!s) return '-';
  if (s.length <= 4) return s;
  return `${'*'.repeat(Math.min(s.length - 4, 8))}${s.slice(-4)}`;
}

function loadImageAsDataUrl(url) {
  if (!url || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) return resolve(null);
        const size = Math.min(iw, ih);
        const sx = (iw - size) / 2;
        const sy = (ih - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (_e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function exportEmployeeProfilePdf(emp) {
  if (!emp) return;
  const photoUrl = resolveAsset(emp.profilePhoto);
  const photoDataUrl = photoUrl ? await loadImageAsDataUrl(photoUrl) : null;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 16;
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const ensureSpace = (need = 20) => {
    if (y + need > 282) { doc.addPage(); y = 16; }
  };
  const sectionTitle = (title) => {
    ensureSpace(14);
    doc.setFontSize(11);
    doc.setTextColor(37, 67, 235);
    doc.text(title, margin, y);
    y += 4;
  };
  const kvTable = (rows) => {
    const body = (rows || []).map(([k, v]) => [k, val(v)]);
    if (!body.length) return;
    ensureSpace(20);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['Field', 'Details']],
      body,
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 67, 235], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold', textColor: [51, 65, 85] }, 1: { cellWidth: contentW - 55 } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 8;
  };
  const dataTable = (head, body) => {
    if (!body || !body.length) return;
    ensureSpace(20);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [head],
      body,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 67, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 8;
  };

  const name = fullNameOf(emp);
  const photoSize = 28;
  const photoX = pageW - margin - photoSize;
  const photoY = 12;

  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'JPEG', photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(226, 232, 240);
      doc.rect(photoX, photoY, photoSize, photoSize);
    } catch (_e) {
      // ignore image draw errors
    }
  }

  doc.setFontSize(16);
  doc.setTextColor(37, 67, 235);
  doc.text('Employee Profile Report', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`${name}${emp.employeeId ? ` (${emp.employeeId})` : ''}`, margin, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`FaceHR - Generated ${new Date().toLocaleString()}`, margin, y);
  y += 8;
  if (photoDataUrl) y = Math.max(y, photoY + photoSize + 6);

  const mgr = (p, fb) => {
    if (p) return `${fullNameOf(p)}${p.employeeId ? ` (${p.employeeId})` : ''}`;
    return fb || '-';
  };

  sectionTitle('Employment Details');
  kvTable([
    ['Employee ID', emp.employeeId],
    ['Full Name', name],
    ['Status', emp.status],
    ['Work Email', emp.email],
    ['Phone', emp.phone || emp.contact?.mobileNumber],
    ['Department', emp.department?.name],
    ['Designation', emp.designation?.name],
    ['Branch / Office', emp.office?.name],
    ['Employment Type', emp.employmentType || emp.category],
    ['Category', emp.category],
    ['Date of Joining', formatDate(emp.joiningDate)],
    ['Intern End Date', emp.employmentType === 'Intern' ? formatDate(emp.internEndDate) : '-'],
    ['Reporting Manager', mgr(emp.manager1, emp.reportingManager)],
    ['Reporting Manager 2', mgr(emp.manager2, emp.reportingManager2)],
    ['Roles', Array.isArray(emp.roles) && emp.roles.length ? emp.roles.join(', ') : '-'],
    ['Face Registered', emp.face ? 'Yes' : 'No'],
  ]);

  sectionTitle('Contact Information');
  kvTable([
    ['Personal Email', emp.contact?.personalEmail],
    ['Alternate Email', emp.contact?.alternateEmail],
    ['Mobile Number', emp.contact?.mobileNumber || emp.phone],
    ['Alternate Phone', emp.contact?.alternatePhone],
    ['Current Address', addrText(emp.contact?.address) !== '-' ? addrText(emp.contact?.address) : (emp.address || '-')],
    ['Permanent Address', emp.contact?.sameAsCurrent ? 'Same as current address' : (emp.contact?.permanentAddress || '-')],
  ]);

  const p = emp.personal || {};
  sectionTitle('Personal Information');
  kvTable([
    ['Date of Birth', formatDate(emp.dateOfBirth)],
    ['Gender', emp.gender],
    ['Marital Status', p.maritalStatus],
    ['Blood Group', p.bloodGroup],
    ['Nationality', p.nationality],
  ]);

  const b = emp.bankDetails || {};
  sectionTitle('Bank Details');
  kvTable([
    ['Account Holder', b.accountHolderName],
    ['Bank Name', b.bankName],
    ['Account Number', maskAccount(b.accountNumber)],
    ['IFSC Code', b.ifscCode],
    ['Branch Name', b.branchName],
    ['Account Type', b.accountType],
  ]);

  const w = emp.weekOff || {};
  sectionTitle('Week Off');
  kvTable([
    ['Weekly Off Day', w.weeklyOffDay],
    ['Second Weekly Off', w.secondWeeklyOffDay],
    ['Working Days', Array.isArray(w.workingDays) && w.workingDays.length ? w.workingDays.join(', ') : '-'],
  ]);

  const family = Array.isArray(emp.family) ? emp.family : [];
  if (family.length) {
    sectionTitle('Family Members');
    dataTable(
      ['Name', 'Relationship', 'DOB', 'Phone', 'Occupation'],
      family.map((f) => [val(f.fullName), val(f.relationship), f.dateOfBirth ? formatDate(f.dateOfBirth) : '-', val(f.phoneNumber), val(f.occupation)])
    );
  }

  let emergencies = Array.isArray(emp.emergencyContacts) ? emp.emergencyContacts : [];
  if (!emergencies.length && emp.emergencyContact && Object.values(emp.emergencyContact).some(Boolean)) emergencies = [emp.emergencyContact];
  if (emergencies.length) {
    sectionTitle('Emergency Contacts');
    dataTable(
      ['Name', 'Relationship', 'Primary Phone', 'Alternate Phone', 'Email'],
      emergencies.map((e) => [val(e.fullName), val(e.relationship), val(e.primaryPhone), val(e.alternatePhone), val(e.email)])
    );
  }

  const exp = Array.isArray(emp.experience) ? emp.experience : [];
  if (exp.length) {
    sectionTitle('Experience');
    dataTable(
      ['Company', 'Job Title', 'Type', 'Start', 'End', 'Location'],
      exp.map((x) => [val(x.company), val(x.jobTitle), val(x.employmentType), x.startDate ? formatDate(x.startDate) : '-', x.currentlyWorking ? 'Present' : (x.endDate ? formatDate(x.endDate) : '-'), val(x.location)])
    );
  }

  const quals = Array.isArray(emp.qualifications) ? emp.qualifications : [];
  if (quals.length) {
    sectionTitle('Qualifications');
    dataTable(
      ['Degree', 'Institution', 'Field of Study', 'Years', 'Grade'],
      quals.map((q) => [val(q.degree), val(q.institution), val(q.fieldOfStudy), [q.startYear, q.endYear].filter(Boolean).join(' - ') || '-', val(q.grade)])
    );
  }

  const docs = Array.isArray(emp.documents) ? emp.documents : [];
  if (docs.length) {
    sectionTitle('Documents');
    dataTable(
      ['Type', 'File Name', 'Uploaded'],
      docs.map((d) => [val(d.kind || d.type || d.documentType), val(d.originalName || d.name || d.fileName || d.path), d.createdAt || d.uploadedAt ? formatDate(d.createdAt || d.uploadedAt) : '-'])
    );
  }

  const fileId = String(emp.employeeId || emp.id || 'employee').trim().replace(/[\\/:*?"<>|]/g, '_') || 'employee';
  doc.save(`${fileId} profile.pdf`);
}