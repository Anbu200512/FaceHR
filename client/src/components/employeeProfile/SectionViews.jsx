import { IdCard, UserRound, Landmark, User, UsersRound, Briefcase, GraduationCap, PhoneCall, FileUp, FileText, CalendarDays, Settings2, Plane, Mail, Phone, MapPin, Heart, Building2 } from 'lucide-react';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../Avatar';
import { formatDate, resolveAsset } from '../../services/format';
import { STEPS, KIND_LABEL, formatAddress, employeeFullName, managerLabel } from '../employeeForm/constants';

export const PROFILE_TABS = STEPS.map((s) => ({ id: s.id, label: s.label }));

export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900/40">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {Icon ? <Icon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{value || '-'}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, subtitle, children }) {
  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm dark:border-slate-700/80">
      <div className="flex items-start gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-5 py-4 dark:border-slate-700/80 dark:from-slate-800/50 dark:to-slate-900">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}

function Grid({ children }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Empty({ label = 'No information provided' }) {
  return <p className="py-3 text-sm text-slate-400">{label}</p>;
}

function ListItem({ title, fields }) {
  const rows = fields.filter((f) => f.value || f.value === 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/30">
      <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2">{rows.map((r) => <Row key={r.label} {...r} />)}</div>
      ) : (
        <Empty />
      )}
    </div>
  );
}

export function BasicDetailsSectionView({ emp }) {
  return (
    <SectionCard title="Basic Details" icon={IdCard}>
      <Grid>
        <Row icon={FileText} label="Employee ID" value={emp.employeeId} />
        <Row icon={FileText} label="Full Name" value={[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')} />
        <Row icon={FileText} label="Work Email" value={emp.email} />
        <Row icon={FileText} label="Mobile Number" value={emp.phone} />
        <Row icon={FileText} label="Department" value={emp.department?.name} />
        <Row icon={FileText} label="Designation" value={emp.designation?.name} />
        <Row icon={FileText} label="Employment Type" value={emp.employmentType || emp.category} />
        {emp.employmentType === 'Intern' && (
          <Row icon={FileText} label="Intern End Date" value={formatDate(emp.internEndDate)} />
        )}
        <Row icon={FileText} label="Reporting Manager" value={managerLabel(emp.manager1, emp.reportingManager)} />
        <Row icon={FileText} label="Roles" value={(emp.roles || []).join(', ')} />
        <Row icon={FileText} label="Status" value={emp.status} />
        <Row icon={FileText} label="Joining Date" value={formatDate(emp.joiningDate)} />
      </Grid>
    </SectionCard>
  );
}

export function RoleBadges({ roles, className }) {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className || ''}`}>
      {roles.map((role) => <Badge key={role} tone="violet">{role}</Badge>)}
    </div>
  );
}

export function ReportingManagerCard({ emp }) {
  const managers = [
    { key: 'manager1', label: 'Reporting Manager', person: emp.manager1, fallback: emp.reportingManager },
    { key: 'manager2', label: 'Reporting Manager 2', person: emp.manager2, fallback: emp.reportingManager2 },
  ].filter((m) => m.person || m.fallback);

  if (!managers.length) return null;

  return (
    <SectionCard title="Reporting Managers" icon={UsersRound}>
      <div className="grid gap-4 sm:grid-cols-2">
        {managers.map(({ key, label, person, fallback }) => (
          <div key={key} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
            {person ? (
              <>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar name={employeeFullName(person)} src={resolveAsset(person.profilePhoto)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{employeeFullName(person) || '-'}</p>
                    <p className="break-words text-xs text-slate-400">
                      {[person.employeeId, person.designation?.name, person.department?.name].filter(Boolean).join(' · ') || '-'}
                    </p>
                  </div>
                </div>
                {(person.email || person.phone) && (
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {person.email && (
                      <p className="flex min-w-0 items-start gap-2">
                        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="break-all">{person.email}</span>
                      </p>
                    )}
                    {person.phone && (
                      <p className="flex min-w-0 items-start gap-2">
                        <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="break-words">{person.phone}</span>
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">{fallback}</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ContactSectionView({ emp }) {
  const addr = formatAddress(emp.contact?.address) || emp.address;
  return (
    <SectionCard title="Contact" subtitle="Reach-out details for this employee" icon={UserRound}>
      <Grid>
        <Row icon={Mail} label="Personal Email" value={emp.contact?.personalEmail || emp.email} />
        <Row icon={Phone} label="Alternate Mobile" value={emp.contact?.alternatePhone || emp.phone} />
        <Row icon={MapPin} label="Full Address" value={addr} />
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
    <SectionCard title="Family" subtitle="Emergency and family references" icon={UsersRound}>
      <div className="space-y-4">
        {(emp.family || []).length ? (
          emp.family.map((m, i) => (
            <ListItem
              key={i}
              title={`${m.fullName || 'Member'}${m.relationship ? ` · ${m.relationship}` : ''}`}
              fields={[
                { icon: User, label: 'Full Name', value: m.fullName },
                { icon: Heart, label: 'Relationship', value: m.relationship },
                { icon: CalendarDays, label: 'Date of Birth', value: formatDate(m.dateOfBirth) },
                { icon: Phone, label: 'Phone Number', value: m.phoneNumber },
                { icon: Briefcase, label: 'Occupation', value: m.occupation },
                { icon: MapPin, label: 'Address', value: m.address },
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
    <SectionCard title="Experience" subtitle="Previous employment history" icon={Briefcase}>
      <div className="space-y-4">
        {(emp.experience || []).length ? (
          emp.experience.map((x, i) => {
            const period = x.currentlyWorking ? `${formatDate(x.startDate)} - Present` : [formatDate(x.startDate), formatDate(x.endDate)].filter((d) => d !== '-').join(' - ');
            return (
              <ListItem
                key={i}
                title={`${x.company || 'Company'}${x.jobTitle ? ` · ${x.jobTitle}` : ''}`}
                fields={[
                  { icon: Building2, label: 'Company', value: x.company },
                  { icon: Briefcase, label: 'Job Title', value: x.jobTitle },
                  { icon: FileText, label: 'Employment Type', value: x.employmentType },
                  { icon: CalendarDays, label: 'Period', value: period },
                  { icon: MapPin, label: 'Location', value: x.location },
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
          <Row icon={FileText} label="Working Days" value={workingDays.length ? workingDays.join(', ') : '-'} />
        </div>
      </Grid>
    </SectionCard>
  );
}

export function QualificationSectionView({ emp }) {
  return (
    <SectionCard title="Qualification" subtitle="Education and academic background" icon={GraduationCap}>
      <div className="space-y-4">
        {(emp.qualifications || []).length ? (
          emp.qualifications.map((q, i) => (
            <ListItem
              key={i}
              title={`${q.degree || 'Degree'}${q.institution ? ` · ${q.institution}` : ''}`}
              fields={[
                { icon: GraduationCap, label: 'Degree', value: q.degree },
                { icon: Building2, label: 'Institution', value: q.institution },
                { icon: FileText, label: 'Field of Study', value: q.fieldOfStudy },
                { icon: CalendarDays, label: 'Years', value: [q.startYear, q.endYear].filter(Boolean).join(' - ') },
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