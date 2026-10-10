import { IdCard, UserRound, Landmark, User, UsersRound, Briefcase, GraduationCap, PhoneCall, FileUp, FileText, CalendarDays, Settings2, Plane } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatDate, resolveAsset } from '../../services/format';
import { STEPS, KIND_LABEL, formatAddress } from '../employeeForm/constants';

export const PROFILE_TABS = STEPS.map((s) => ({ id: s.id, label: s.label }));

export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-700 dark:text-slate-200">{value || '—'}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <Card>
      <div className="flex items-start gap-3 border-b px-5 py-4 dark:border-slate-700">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {Icon && <Icon className="h-4 w-4" />}
        </div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function Grid({ children }) {
  return <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</div>;
}

function Empty({ label = 'No information provided' }) {
  return <p className="py-2 text-sm text-slate-400">{label}</p>;
}

function ListItem({ title, fields }) {
  const rows = fields.filter((f) => f.value || f.value === 0);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="border-b px-4 py-2.5 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      </div>
      <div className="p-4">
        {rows.length ? (
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{rows.map((r) => <Row key={r.label} {...r} />)}</div>
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}

export function BasicDetailsSectionView({ emp }) {
  return (
    <SectionCard title="Basic Details" icon={IdCard}>
      <Grid>
        <Row icon={FileText} label="Employee ID" value={emp.employeeId} />
        <Row icon={FileText} label="Full Name" value={`${emp.firstName || ''} ${emp.lastName || ''}`.trim()} />
        <Row icon={FileText} label="Work Email" value={emp.email} />
        <Row icon={FileText} label="Mobile Number" value={emp.phone} />
        <Row icon={FileText} label="Department" value={emp.department?.name} />
        <Row icon={FileText} label="Designation" value={emp.designation?.name} />
        <Row icon={FileText} label="Status" value={emp.status} />
        <Row icon={FileText} label="Joining Date" value={formatDate(emp.joiningDate)} />
      </Grid>
    </SectionCard>
  );
}

export function ContactSectionView({ emp }) {
  const addr = formatAddress(emp.contact?.address) || emp.address;
  return (
    <SectionCard title="Contact" icon={UserRound}>
      <Grid>
        <Row icon={FileText} label="Personal Email" value={emp.contact?.personalEmail} />
        <Row icon={FileText} label="Alternate Mobile" value={emp.contact?.alternatePhone} />
        <Row icon={FileText} label="Full Address" value={addr} />
      </Grid>
    </SectionCard>
  );
}

export function BankDetailsSectionView({ emp }) {
  const b = emp.bankDetails || {};
  return (
    <SectionCard title="Bank Details" icon={Landmark}>
      {Object.keys(b).length ? (
        <Grid>
          <Row icon={FileText} label="Account Holder" value={b.accountHolderName} />
          <Row icon={FileText} label="Bank Name" value={b.bankName} />
          <Row icon={FileText} label="Account Number" value={b.accountNumber} />
          <Row icon={FileText} label="IFSC Code" value={b.ifscCode} />
          <Row icon={FileText} label="Branch" value={b.branchName} />
          <Row icon={FileText} label="Account Type" value={b.accountType} />
        </Grid>
      ) : <Empty />}
    </SectionCard>
  );
}

export function PersonalSectionView({ emp }) {
  const p = emp.personal || {};
  return (
    <SectionCard title="Personal" icon={User}>
      <Grid>
        <Row icon={FileText} label="Date of Birth" value={formatDate(emp.dateOfBirth)} />
        <Row icon={FileText} label="Gender" value={emp.gender} />
        <Row icon={FileText} label="Marital Status" value={p.maritalStatus} />
        <Row icon={FileText} label="Blood Group" value={p.bloodGroup} />
        <Row icon={FileText} label="Nationality" value={p.nationality} />
      </Grid>
    </SectionCard>
  );
}

export function FamilySectionView({ emp }) {
  return (
    <SectionCard title="Family" icon={UsersRound}>
      <div className="space-y-4">
        {(emp.family || []).length ? (
          emp.family.map((m, i) => (
            <ListItem
              key={i}
              title={`${m.fullName || 'Member'}${m.relationship ? ` · ${m.relationship}` : ''}`}
              fields={[
                { icon: FileText, label: 'Full Name', value: m.fullName },
                { icon: FileText, label: 'Relationship', value: m.relationship },
                { icon: FileText, label: 'Date of Birth', value: formatDate(m.dateOfBirth) },
                { icon: FileText, label: 'Phone Number', value: m.phoneNumber },
                { icon: FileText, label: 'Occupation', value: m.occupation },
                { icon: FileText, label: 'Address', value: m.address },
              ]}
            />
          ))
        ) : <Empty />}
      </div>
    </SectionCard>
  );
}

export function ExperienceSectionView({ emp }) {
  return (
    <SectionCard title="Experience" icon={Briefcase}>
      <div className="space-y-4">
        {(emp.experience || []).length ? (
          emp.experience.map((x, i) => {
            const period = x.currentlyWorking ? `${formatDate(x.startDate)} — Present` : [formatDate(x.startDate), formatDate(x.endDate)].filter((d) => d !== '—').join(' — ');
            return (
              <ListItem
                key={i}
                title={`${x.company || 'Company'}${x.jobTitle ? ` · ${x.jobTitle}` : ''}`}
                fields={[
                  { icon: FileText, label: 'Company', value: x.company },
                  { icon: FileText, label: 'Job Title', value: x.jobTitle },
                  { icon: FileText, label: 'Employment Type', value: x.employmentType },
                  { icon: FileText, label: 'Period', value: period },
                  { icon: FileText, label: 'Location', value: x.location },
                  { icon: FileText, label: 'Description', value: x.description },
                ]}
              />
            );
          })
        ) : <Empty />}
      </div>
    </SectionCard>
  );
}

export function WeekOffSectionView({ emp }) {
  const w = emp.weekOff || {};
  const workingDays = Array.isArray(w.workingDays) && w.workingDays.length ? w.workingDays : [];
  return (
    <SectionCard title="Week Off" icon={CalendarDays}>
      <Grid>
        <Row icon={FileText} label="Weekly Off Day" value={w.weeklyOffDay} />
        <Row icon={FileText} label="Second Weekly Off" value={w.secondWeeklyOffDay} />
        <div className="sm:col-span-2">
          <Row icon={FileText} label="Working Days" value={workingDays.length ? workingDays.join(', ') : '—'} />
        </div>
      </Grid>
    </SectionCard>
  );
}

export function QualificationSectionView({ emp }) {
  return (
    <SectionCard title="Qualification" icon={GraduationCap}>
      <div className="space-y-4">
        {(emp.qualifications || []).length ? (
          emp.qualifications.map((q, i) => (
            <ListItem
              key={i}
              title={`${q.degree || 'Degree'}${q.institution ? ` · ${q.institution}` : ''}`}
              fields={[
                { icon: FileText, label: 'Degree', value: q.degree },
                { icon: FileText, label: 'Institution', value: q.institution },
                { icon: FileText, label: 'Field of Study', value: q.fieldOfStudy },
                { icon: FileText, label: 'Years', value: [q.startYear, q.endYear].filter(Boolean).join(' — ') },
                { icon: FileText, label: 'Grade', value: q.grade },
                { icon: FileText, label: 'Description', value: q.description },
              ]}
            />
          ))
        ) : <Empty />}
      </div>
    </SectionCard>
  );
}

export function EmergencyContactSectionView({ emp }) {
  const e = emp.emergencyContact || {};
  return (
    <SectionCard title="Emergency Contact" icon={PhoneCall}>
      {Object.keys(e).length ? (
        <Grid>
          <Row icon={FileText} label="Full Name" value={e.fullName} />
          <Row icon={FileText} label="Relationship" value={e.relationship} />
          <Row icon={FileText} label="Primary Phone" value={e.primaryPhone} />
          <Row icon={FileText} label="Alternate Phone" value={e.alternatePhone} />
          <Row icon={FileText} label="Email" value={e.email} />
          <Row icon={FileText} label="Address" value={e.address} />
        </Grid>
      ) : <Empty />}
    </SectionCard>
  );
}

export function AdminSectionView({emp}){const a=emp.admin||{};return(<SectionCard title="Admin" icon={Settings2}>{Object.keys(a).length?(<Grid>{Object.entries(a).map(([k,v])=>(<Row key={k} icon={FileText} label={k} value={typeof v==='boolean'?(v?'Yes':'No'):v}/>))}</Grid>):<Empty/>}</SectionCard>);}
export function ImmigrationSectionView({emp}){const list=emp.immigration||[];return(<SectionCard title="Immigration" icon={Plane}>{list.length?list.map((imm,i)=>(<div key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 mb-3"><Grid>{[{l:'Document Type',v:imm.documentType},{l:'Document Number',v:imm.documentNumber},{l:'Issuing Country',v:imm.issuingCountry},{l:'Issue Date',v:formatDate(imm.issueDate)},{l:'Expiry Date',v:formatDate(imm.expiryDate)},{l:'Remarks',v:imm.remarks}].map(x=>(<Row key={x.l} icon={FileText} label={x.l} value={x.v}/>))}</Grid></div>)):<Empty/>}</SectionCard>);}

export function DocumentsSectionView({ emp, onPreview, onDownload }) {
  const docs = emp.documents || [];
  return (
    <SectionCard title="Documents" icon={FileUp}>
      {docs.length ? (
        <div className="space-y-3">
          {docs.map((d) => (
            <div key={d._id || d.path} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{KIND_LABEL[d.kind] || 'Document'}</p>
                  <p className="truncate text-xs text-slate-400">
                    {d.originalName}
                    {d.size ? ` · ${formatFileSize(d.size)}` : ''}
                    {d.updatedAt || d.createdAt ? ` · ${formatDate(d.updatedAt || d.createdAt)}` : ''}
                  </p>
                </div>
              </div>
              {d.path && (
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => onPreview?.(d)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    View
                  </button>
                  <a
                    href={resolveAsset(d.path)}
                    download={d.originalName || true}
                    className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-300"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : <Empty />}
    </SectionCard>
  );
}