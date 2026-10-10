import { useEffect, useState } from 'react';
import {
  UserRound,
  Landmark,
  User,
  UsersRound,
  PhoneCall,
  Briefcase,
  CalendarDays,
  GraduationCap,
  FileUp,
  Banknote,
  ShieldCheck,
  MapPin,
  Settings2,
  Plane,
  Plus,
  Trash2,
  Save,
  Camera,
  Download,
  Eye,
  RefreshCw,
  ScanFace,
} from 'lucide-react';
import { fetchAttendanceSettings } from '../../services/attendanceSettings';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Input, Select, Textarea } from '../ui/Form';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import Badge from '../ui/Badge';
import { SectionCard, CheckboxField } from '../employeeForm/steps/shared';
import {
  WEEK_DAYS,
  DOCUMENT_KINDS,
  KIND_LABEL,
  MARITAL_STATUSES,
  BLOOD_GROUPS,
  ACCOUNT_TYPES,
  RELATIONSHIPS,
  YEARS,
} from '../employeeForm/constants';
import { EMPLOYMENT_TYPES } from '../../services/static';
import { resolveAsset, formatDate, toInputDate } from '../../services/format';

function FieldGrid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function SaveBar({ onSave, saving, dirty, label = 'Save' }) {
  return (
    <div className="mt-5 flex flex-col-reverse items-stretch gap-3 border-t pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-end">
      <Button type="button" onClick={onSave} loading={saving} disabled={saving}>
        <Save className="h-4 w-4" /> {label}
        {dirty ? <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">unsaved</span> : null}
      </Button>
    </div>
  );
}

function useSectionSync(initialFrom) {
  const [form, setForm] = useState(() => initialFrom());
  useEffect(() => {
    setForm(initialFrom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialFrom())]);
  return [form, setForm];
}

function useSave(context) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const run = async ({ section, payload, onSaved, message }) => {
    setSaving(true);
    try {
      await api.patch(`/employees/${context.employeeId}/sections/${section}`, { data: payload });
      toast.success(message || 'Section saved');
      await onSaved?.();
    } catch (err) {
      toast.error(extractError(err, 'Could not save this section'));
    } finally {
      setSaving(false);
    }
  };
  return [run, saving];
}

export default function EmployeeSectionEditor({ section, emp, onSaved }) {
  const context = { employeeId: emp._id };
  switch (section) {
    case 'contact': return <ContactEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'bank': return <BankEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'admin': return <AdminEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'personal': return <PersonalEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'family': return <FamilyEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'emergency': return <EmergencyEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'experience': return <ExperienceEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'weekOff': return <WeekOffEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'qualification': return <QualificationEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'workLocation': return <WorkLocationEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'salary': return <SalaryEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'pf': return <PfEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'documents': return <DocumentsEditor emp={emp} ctx={context} onSaved={onSaved} />;
    case 'immigration': return <ImmigrationEditor emp={emp} ctx={context} onSaved={onSaved} />;
    default: return <EmptyState title="Unknown section" />;
  }
}

function ContactEditor({ emp, ctx, onSaved }) {
  const c = emp.contact || {};
  const [form, setForm] = useSectionSync(() => ({
    personalEmail: c.personalEmail || '',
    alternateEmail: c.alternateEmail || '',
    mobileNumber: c.mobileNumber || '',
    alternatePhone: c.alternatePhone || '',
    sameAsCurrent: c.sameAsCurrent !== false,
    address: { ...(c.address || EMPTY_ADDRESS) },
    permanentAddress: c.permanentAddress || '',
  }));
  const [save, saving] = useSave(ctx);
  const set = (path, v) => setForm((f) => ({ ...f, [path]: v }));
  const setAddr = (k, v) => setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));
  const [dirty, setDirty] = useState(false);
  const touch = () => setDirty(true);

  const onSave = () =>
    save({
      section: 'contact',
      payload: {
        personalEmail: form.personalEmail,
        alternateEmail: form.alternateEmail,
        mobileNumber: form.mobileNumber,
        alternatePhone: form.alternatePhone,
        sameAsCurrent: form.sameAsCurrent,
        address: form.address,
        permanentAddress: form.sameAsCurrent ? '' : form.permanentAddress,
      },
      onSaved,
      message: 'Contact details saved',
    });

  return (
    <SectionCard title="Contact" subtitle="How to reach the employee outside of work." icon={UserRound}>
      <FieldGrid>
        <Input label="Personal Email" name="personalEmail" type="email" value={form.personalEmail} onChange={(e) => { set('personalEmail', e.target.value); touch(); }} placeholder="personal@example.com" />
        <Input label="Alternate Email" name="alternateEmail" type="email" value={form.alternateEmail} onChange={(e) => { set('alternateEmail', e.target.value); touch(); }} placeholder="alternate@example.com" />
        <Input label="Mobile Number" name="mobileNumber" value={form.mobileNumber} onChange={(e) => { set('mobileNumber', e.target.value); touch(); }} placeholder="+91 98765 43210" />
        <Input label="Alternate Mobile Number" name="alternatePhone" value={form.alternatePhone} onChange={(e) => { set('alternatePhone', e.target.value); touch(); }} placeholder="+91 90000 00000" />
      </FieldGrid>

      <div className="mt-5">
        <p className="label">Current Address</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Address Line 1" name="line1" value={form.address.line1} onChange={(e) => { setAddr('line1', e.target.value); touch(); }} className="sm:col-span-2" placeholder="House no, street" />
          <Input label="Address Line 2" name="line2" value={form.address.line2} onChange={(e) => { setAddr('line2', e.target.value); touch(); }} placeholder="Area, landmark" />
          <Input label="City" name="city" value={form.address.city} onChange={(e) => { setAddr('city', e.target.value); touch(); }} placeholder="City" />
          <Input label="State" name="state" value={form.address.state} onChange={(e) => { setAddr('state', e.target.value); touch(); }} placeholder="State" />
          <Input label="Country" name="country" value={form.address.country} onChange={(e) => { setAddr('country', e.target.value); touch(); }} placeholder="Country" />
          <Input label="Pincode" name="pincode" value={form.address.pincode} onChange={(e) => { setAddr('pincode', e.target.value); touch(); }} placeholder="PIN / Zip" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <CheckboxField
          label="Same as Current Address"
          checked={form.sameAsCurrent}
          onChange={(v) => { set('sameAsCurrent', v); touch(); }}
          hint="Use the current address for the permanent address too."
        />
        {!form.sameAsCurrent && (
          <Textarea
            label="Permanent Address"
            name="permanentAddress"
            value={form.permanentAddress}
            onChange={(e) => { set('permanentAddress', e.target.value); touch(); }}
            placeholder="Permanent street, city, state"
          />
        )}
      </div>

      <SaveBar onSave={onSave} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

const EMPTY_ADDRESS = { line1: '', line2: '', city: '', state: '', country: '', pincode: '' };

function BankEditor({ emp, ctx, onSaved }) {
  const b = emp.bankDetails || {};
  const [form, setForm] = useSectionSync(() => ({
    accountHolderName: b.accountHolderName || '',
    bankName: b.bankName || '',
    accountNumber: b.accountNumber || '',
    confirmAccountNumber: b.accountNumber || '',
    ifscCode: b.ifscCode || '',
    branchName: b.branchName || '',
    accountType: b.accountType || '',
  }));
  const [save, saving] = useSave(ctx);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const onSave = () => {
    const acct = String(form.accountNumber || '').trim();
    if (acct && String(form.confirmAccountNumber || '').trim() !== acct) {
      toast.error('Account numbers do not match.');
      return;
    }
    const { confirmAccountNumber, ...rest } = form;
    save({ section: 'bank', payload: rest, onSaved, message: 'Bank details saved' });
  };

  return (
    <SectionCard title="Bank Details" subtitle="Where payroll and reimbursements are sent. Not shown in the employee list." icon={Landmark}>
      <FieldGrid>
        <Input label="Account Holder Name" name="accountHolderName" value={form.accountHolderName} onChange={(e) => set('accountHolderName', e.target.value)} placeholder="Arul Prakash" />
        <Input label="Bank Name" name="bankName" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="HDFC Bank" />
        <Input label="Account Number" name="accountNumber" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} placeholder="01234567890123" />
        <Input label="Confirm Account Number" name="confirmAccountNumber" value={form.confirmAccountNumber} onChange={(e) => set('confirmAccountNumber', e.target.value)} placeholder="Re-enter account number" />
        <Input label="IFSC Code" name="ifscCode" value={form.ifscCode} onChange={(e) => set('ifscCode', e.target.value)} placeholder="HDFC0001234" />
        <Input label="Branch Name" name="branchName" value={form.branchName} onChange={(e) => set('branchName', e.target.value)} placeholder="Anna Nagar" />
        <Select label="Account Type" name="accountType" value={form.accountType} onChange={(e) => set('accountType', e.target.value)} placeholder="Select account type" options={ACCOUNT_TYPES} />
      </FieldGrid>
      <SaveBar onSave={onSave} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

const SALARY_ON_OPTIONS = [
  'Per Hour',
  'Per Day',
  'Working Hours (Monthly)',
  'Working Days (Monthly)',
  'Fixed (Monthly)',
  'Per Day (Include Public Holidays)',
  'Working Days (Include Public Holidays)',
];

const OT_APPLICABLE_OPTIONS = ['Not Applicable', 'Per Day', 'Per Week', 'Per Month', 'Fixed Hours (Monthly)'];
const ATTENDANCE_POLICY_OPTIONS = ['Standard (Mon–Fri)', '5.5-Day Week', '6-Day Week', 'Shift Based', 'Flexi Hours'];
const PAYMENT_MODE_OPTIONS = ['Bank Transfer', 'Cheque', 'Cash', 'Other'];
const WORKSHIFT_OPTIONS = ['Day Shift', 'Evening Shift', 'Night Shift', 'Rotational'];

const ADMIN_BOOLEAN_FIELDS = [
  ['ptApplicable', 'PT Applicable'],
  ['esicApplicable', 'ESIC Applicable'],
  ['pfAsPerGovernment', 'PF As Per Government'],
  ['pfOnTotalBasic', 'PF On Total Basic'],
  ['employerPfAsPerGovernment', 'Employer PF As Per Government'],
  ['pensionNotApplicable', 'Pension Not Applicable'],
  ['tdsApplicable', 'TDS Applicable'],
  ['compensatoryOffApplicable', 'Compensatory Off Applicable'],
  ['employerEsicApplicable', 'Employer ESIC Applicable'],
  ['employerPfOnTotalBasic', 'Employer PF On Total Basic'],
  ['gratuityApplicable', 'Gratuity Applicable'],
];

function AdminEditor({ emp, ctx, onSaved }) {
  const a = emp.admin || {};
  const pf = emp.pf || {};
  const [form, setForm] = useSectionSync(() => ({
    salaryOn: a.salaryOn || '',
    ptApplicable: Boolean(a.ptApplicable),
    esicApplicable: Boolean(a.esicApplicable),
    esiNo: a.esiNo || '',
    pfAsPerGovernment: Boolean(a.pfAsPerGovernment),
    pfOnTotalBasic: Boolean(a.pfOnTotalBasic),
    employerPfAsPerGovernment: Boolean(a.employerPfAsPerGovernment),
    pensionNotApplicable: Boolean(a.pensionNotApplicable),
    otApplicable: a.otApplicable || 'Not Applicable',
    attendancePolicy: a.attendancePolicy || '',
    workshift: a.workshift || '',
    paymentMode: a.paymentMode || '',
    rfidCardNo: a.rfidCardNo || '',
    tdsApplicable: Boolean(a.tdsApplicable),
    compensatoryOffApplicable: Boolean(a.compensatoryOffApplicable),
    employerEsicApplicable: Boolean(a.employerEsicApplicable),
    vpfPercentage: a.vpfPercentage ?? '',
    pfNo: a.pfNo || pf.pfNumber || '',
    uan: a.uan || pf.uan || '',
    employerPfOnTotalBasic: Boolean(a.employerPfOnTotalBasic),
    gratuityApplicable: Boolean(a.gratuityApplicable),
    gratuityNo: a.gratuityNo || '',
    aadhaarCardNo: a.aadhaarCardNo || '',
    fingerprintId: a.fingerprintId || '',
  }));
  const [save, saving] = useSave(ctx);
  const toast = useToast();
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const onSave = () => {
    const errs = {};
    if (!String(form.salaryOn || '').trim()) errs.salaryOn = 'Salary On is required';
    if (form.uan && !/^\d{12}$/.test(String(form.uan).trim())) errs.uan = 'UAN must be exactly 12 digits';
    if (form.aadhaarCardNo && !/^\d{12}$/.test(String(form.aadhaarCardNo).trim())) errs.aadhaarCardNo = 'Aadhaar must be exactly 12 digits';
    if (form.esiNo && !/^\d{10,20}$/.test(String(form.esiNo).trim().replace(/[- ]/g, ''))) errs.esiNo = 'ESI No. must be 10–20 digits';
    if (form.pfNo && !/^[A-Za-z0-9/.-]{4,32}$/.test(String(form.pfNo).trim())) errs.pfNo = 'Enter a valid PF number';
    if (form.rfidCardNo && !/^[A-Za-z0-9-]{4,24}$/.test(String(form.rfidCardNo).trim())) errs.rfidCardNo = 'Enter a valid RFID card number';
    if (form.fingerprintId && !/^[A-Za-z0-9_-]{1,32}$/.test(String(form.fingerprintId).trim())) errs.fingerprintId = 'Enter a valid fingerprint ID';
    if (form.gratuityNo && !/^[A-Za-z0-9/.-]{2,32}$/.test(String(form.gratuityNo).trim())) errs.gratuityNo = 'Enter a valid gratuity number';
    const vpf = String(form.vpfPercentage || '').trim();
    if (vpf !== '' && (Number.isNaN(Number(vpf)) || Number(vpf) < 0 || Number(vpf) > 100)) errs.vpfPercentage = 'Enter a value between 0 and 100';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    save({
      section: 'admin',
      payload: {
        ...form,
        vpfPercentage: vpf === '' ? '' : Number(vpf),
      },
      onSaved,
      message: 'Administrative details saved',
    });
  };

  return (
    <div className="space-y-6">
    <SectionCard title="Administrative Information" subtitle="Payroll, PF / ESI and identification configuration. Visible to admins only." icon={Settings2}>
      <FieldGrid>
        <Select
          label={<>Salary On <span className="text-rose-500">*</span></>}
          name="salaryOn"
          value={form.salaryOn}
          onChange={(e) => { set('salaryOn', e.target.value); setErrors((er) => ({ ...er, salaryOn: undefined })); }}
          placeholder="Select salary basis"
          options={SALARY_ON_OPTIONS}
          error={errors.salaryOn}
        />
        <Select
          label="OT Applicable"
          name="otApplicable"
          value={form.otApplicable}
          onChange={(e) => set('otApplicable', e.target.value)}
          options={OT_APPLICABLE_OPTIONS}
        />
        <Select
          label="Attendance Policy"
          name="attendancePolicy"
          value={form.attendancePolicy}
          onChange={(e) => set('attendancePolicy', e.target.value)}
          placeholder="Select attendance policy"
          options={ATTENDANCE_POLICY_OPTIONS}
        />
        <Select
          label="Work Shift"
          name="workshift"
          value={form.workshift}
          onChange={(e) => set('workshift', e.target.value)}
          placeholder="Select work shift"
          options={WORKSHIFT_OPTIONS}
        />
        <Select
          label="Payment Mode"
          name="paymentMode"
          value={form.paymentMode}
          onChange={(e) => set('paymentMode', e.target.value)}
          placeholder="Select payment mode"
          options={PAYMENT_MODE_OPTIONS}
        />
        <Input
          label="VPF Percentage (%)"
          name="vpfPercentage"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={form.vpfPercentage}
          onChange={(e) => { set('vpfPercentage', e.target.value); setErrors((er) => ({ ...er, vpfPercentage: undefined })); }}
          placeholder="0 – 100"
          error={errors.vpfPercentage}
        />
        <Input
          label="ESI No."
          name="esiNo"
          value={form.esiNo}
          onChange={(e) => { set('esiNo', e.target.value); setErrors((er) => ({ ...er, esiNo: undefined })); }}
          placeholder="10–20 digit ESI number"
          error={errors.esiNo}
        />
        <Input
          label="PF No."
          name="pfNo"
          value={form.pfNo}
          onChange={(e) => { set('pfNo', e.target.value); setErrors((er) => ({ ...er, pfNo: undefined })); }}
          placeholder="e.g. TN/1234567/000"
          error={errors.pfNo}
        />
        <Input
          label="UAN"
          name="uan"
          value={form.uan}
          onChange={(e) => { set('uan', e.target.value); setErrors((er) => ({ ...er, uan: undefined })); }}
          placeholder="12-digit UAN number"
          maxLength={12}
          error={errors.uan}
        />
        <Input
          label="Gratuity No."
          name="gratuityNo"
          value={form.gratuityNo}
          onChange={(e) => { set('gratuityNo', e.target.value); setErrors((er) => ({ ...er, gratuityNo: undefined })); }}
          placeholder="Gratuity number"
          error={errors.gratuityNo}
        />
        <Input
          label="Aadhaar Card No."
          name="aadhaarCardNo"
          value={form.aadhaarCardNo}
          onChange={(e) => { set('aadhaarCardNo', e.target.value); setErrors((er) => ({ ...er, aadhaarCardNo: undefined })); }}
          placeholder="12-digit Aadhaar number"
          maxLength={12}
          error={errors.aadhaarCardNo}
        />
        <Input
          label="RFID Card No."
          name="rfidCardNo"
          value={form.rfidCardNo}
          onChange={(e) => { set('rfidCardNo', e.target.value); setErrors((er) => ({ ...er, rfidCardNo: undefined })); }}
          placeholder="Access card / tag number"
          error={errors.rfidCardNo}
        />
        <Input
          label="Fingerprint ID"
          name="fingerprintId"
          value={form.fingerprintId}
          onChange={(e) => { set('fingerprintId', e.target.value); setErrors((er) => ({ ...er, fingerprintId: undefined })); }}
          placeholder="Biometric device ID"
          error={errors.fingerprintId}
        />
      </FieldGrid>

      <div className="mt-6 border-t pt-5 dark:border-slate-700">
        <p className="label">Statutory &amp; Deduction Applicability</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ADMIN_BOOLEAN_FIELDS.map(([key, label]) => (
            <CheckboxField key={key} label={label} checked={Boolean(form[key])} onChange={(v) => set(key, v)} />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Switch these on to apply statutory deductions and benefits in payroll.</p>
      </div>

      <SaveBar onSave={onSave} saving={saving} dirty={dirty} label="Save Administrative Details" />
      </SectionCard>

      
      </div>
  );
}

const GENDERS = ['Male', 'Female', 'Other'];

function PersonalEditor({ emp, ctx, onSaved }) {
  const p = emp.personal || {};
  const [form, setForm] = useSectionSync(() => ({
    dateOfBirth: toInputDate(emp.dateOfBirth),
    gender: emp.gender || 'Male',
    maritalStatus: p.maritalStatus || '',
    bloodGroup: p.bloodGroup || '',
    nationality: p.nationality || '',
    personalEmail: emp.contact?.personalEmail || '',
    mobileNumber: emp.contact?.mobileNumber || '',
    address: emp.address || '',
  }));
  const [save, saving] = useSave(ctx);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const onSave = () =>
    save({
      section: 'personal',
      payload: {
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        bloodGroup: form.bloodGroup,
        nationality: form.nationality,
        personalEmail: form.personalEmail,
        mobileNumber: form.mobileNumber,
        address: form.address,
      },
      onSaved,
      message: 'Personal details saved',
    });

  return (
    <SectionCard title="Personal" subtitle="Personal and demographic information." icon={User}>
      <FieldGrid>
        <Input label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
        <Select label="Gender" name="gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} options={GENDERS} />
        <Select label="Marital Status" name="maritalStatus" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)} placeholder="Select marital status" options={MARITAL_STATUSES} />
        <Select label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="Select blood group" options={BLOOD_GROUPS} />
        <Input label="Nationality" name="nationality" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Indian" />
        <Input label="Personal Email" name="personalEmail" type="email" value={form.personalEmail} onChange={(e) => set('personalEmail', e.target.value)} placeholder="personal@example.com" />
        <Input label="Mobile Number" name="mobileNumber" value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)} placeholder="+91 98765 43210" />
        <Textarea label="Address" name="address" className="sm:col-span-2" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, City, State" />
      </FieldGrid>
      <SaveBar onSave={onSave} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

function RepeaterSection({ title, subtitle, icon, blank, entries, setEntries, renderEntry, addLabel, onSave, saving, dirty }) {
  const add = () => setEntries((e) => [...e, blank()]);
  const update = (i, patch) => setEntries((e) => e.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i) => setEntries((e) => e.filter((_, idx) => idx !== i));
  return (
    <SectionCard title={title} subtitle={subtitle} icon={icon}>
      <div className="space-y-4">
        {entries.length === 0 && <EmptyState title={`No ${title.toLowerCase()} entries`} message="Add your first entry below." compact />}
        {entries.map((e, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {title} {i + 1}
              </p>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                title={`Delete ${title.toLowerCase()} ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">{renderEntry(e, (patch) => update(i, patch))}</div>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      </div>
      <SaveBar onSave={onSave} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

function FamilyEditor({ emp, ctx, onSaved }) {
  const [entries, setEntries] = useSectionSync(() => (emp.family || []).map((f) => ({ ...f })));
  const [save, saving] = useSave(ctx);
  const dirty = JSON.stringify(entries) !== JSON.stringify((emp.family || []).map((f) => ({ ...f })));
  return (
    <RepeaterSection
      title="Family"
      subtitle="Immediate family members for reference and emergency context."
      icon={UsersRound}
      blank={() => ({ fullName: '', relationship: '', dateOfBirth: '', phoneNumber: '', occupation: '', address: '' })}
      entries={entries}
      setEntries={setEntries}
      dirty={dirty}
      saving={saving}
      addLabel="Add Family Member"
      renderEntry={(m, set) => (
        <>
          <Input label="Full Name" value={m.fullName || ''} onChange={(e) => set({ fullName: e.target.value })} placeholder="Full name" />
          <Select label="Relationship" value={m.relationship || ''} onChange={(e) => set({ relationship: e.target.value })} placeholder="Select relationship" options={RELATIONSHIPS} />
          <Input label="Date of Birth" type="date" value={toInputDate(m.dateOfBirth)} onChange={(e) => set({ dateOfBirth: e.target.value })} />
          <Input label="Mobile Number" value={m.phoneNumber || ''} onChange={(e) => set({ phoneNumber: e.target.value })} placeholder="+91 98765 43210" />
          <Input label="Occupation" value={m.occupation || ''} onChange={(e) => set({ occupation: e.target.value })} placeholder="Occupation" />
          <Textarea label="Address" className="sm:col-span-2" value={m.address || ''} onChange={(e) => set({ address: e.target.value })} placeholder="Street, City, Country" />
        </>
      )}
      onSave={() => save({ section: 'family', payload: entries, onSaved, message: 'Family members saved' })}
    />
  );
}

function EmergencyEditor({ emp, ctx, onSaved }) {
  const [entries, setEntries] = useSectionSync(() => {
    const list = (emp.emergencyContacts || []).map((f) => ({ ...f }));
    if (!list.length && emp.emergencyContact && Object.values(emp.emergencyContact).some(Boolean)) {
      list.push({ ...emp.emergencyContact });
    }
    return list;
  });
  const [save, saving] = useSave(ctx);
  const dirty = JSON.stringify(entries) !== JSON.stringify((emp.emergencyContacts || []).map((f) => ({ ...f })));
  return (
    <RepeaterSection
      title="Emergency Contact"
      subtitle="Who to reach if the employee is unreachable. Multiple contacts are supported."
      icon={PhoneCall}
      blank={() => ({ fullName: '', relationship: '', primaryPhone: '', alternatePhone: '', email: '', address: '' })}
      entries={entries}
      setEntries={setEntries}
      dirty={dirty}
      saving={saving}
      addLabel="Add Emergency Contact"
      renderEntry={(e, set) => (
        <>
          <Input label="Contact Name" value={e.fullName || ''} onChange={(ev) => set({ fullName: ev.target.value })} placeholder="Jane Doe" />
          <Select label="Relationship" value={e.relationship || ''} onChange={(ev) => set({ relationship: ev.target.value })} placeholder="Select relationship" options={RELATIONSHIPS} />
          <Input label="Primary Phone" value={e.primaryPhone || ''} onChange={(ev) => set({ primaryPhone: ev.target.value })} placeholder="+91 98765 43210" />
          <Input label="Alternate Phone" value={e.alternatePhone || ''} onChange={(ev) => set({ alternatePhone: ev.target.value })} placeholder="+91 90000 00000" />
          <Input label="Email" type="email" value={e.email || ''} onChange={(ev) => set({ email: ev.target.value })} placeholder="jane@example.com" />
          <Textarea label="Address" value={e.address || ''} onChange={(ev) => set({ address: ev.target.value })} placeholder="Street, City, Country" />
        </>
      )}
      onSave={() => save({ section: 'emergency', payload: entries, onSaved, message: 'Emergency contacts saved' })}
    />
  );
}

function ExperienceEditor({ emp, ctx, onSaved }) {
  const [entries, setEntries] = useSectionSync(() => (emp.experience || []).map((x) => ({ ...x })));
  const [save, saving] = useSave(ctx);
  const dirty = JSON.stringify(entries) !== JSON.stringify((emp.experience || []).map((x) => ({ ...x })));
  return (
    <RepeaterSection
      title="Experience"
      subtitle="Previous employment history. Most recent first is best."
      icon={Briefcase}
      blank={() => ({ company: '', jobTitle: '', employmentType: '', startDate: '', endDate: '', currentlyWorking: false, location: '', description: '' })}
      entries={entries}
      setEntries={setEntries}
      dirty={dirty}
      saving={saving}
      addLabel="Add Experience"
      renderEntry={(x, set) => (
        <>
          <Input label="Company Name" value={x.company || ''} onChange={(e) => set({ company: e.target.value })} placeholder="Company" />
          <Input label="Job Title" value={x.jobTitle || ''} onChange={(e) => set({ jobTitle: e.target.value })} placeholder="Job title" />
          <Select label="Employment Type" value={x.employmentType || ''} onChange={(e) => set({ employmentType: e.target.value })} placeholder="Select type" options={EMPLOYMENT_TYPES} />
          <Input label="Location" value={x.location || ''} onChange={(e) => set({ location: e.target.value })} placeholder="City, Country" />
          <Input label="Start Date" type="date" value={toInputDate(x.startDate)} onChange={(e) => set({ startDate: e.target.value })} />
          <div className="space-y-2">
            <Input
              label="End Date"
              type="date"
              value={x.currentlyWorking ? '' : toInputDate(x.endDate)}
              onChange={(e) => set({ endDate: e.target.value })}
              disabled={x.currentlyWorking}
              placeholder="Present"
            />
            <CheckboxField label="Currently Working" checked={Boolean(x.currentlyWorking)} onChange={(v) => set({ currentlyWorking: v, endDate: v ? '' : x.endDate })} />
          </div>
          <Textarea label="Description" className="sm:col-span-2" value={x.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder="Role summary" />
        </>
      )}
      onSave={() => save({ section: 'experience', payload: entries, onSaved, message: 'Experience records saved' })}
    />
  );
}

function WeekOffEditor({ emp, ctx, onSaved }) {
  const w = emp.weekOff || {};
  const [form, setForm] = useSectionSync(() => ({
    weeklyOffDay: w.weeklyOffDay || '',
    secondWeeklyOffDay: w.secondWeeklyOffDay || '',
    workingDays: Array.isArray(w.workingDays) && w.workingDays.length ? [...w.workingDays] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  }));
  const [save, saving] = useSave(ctx);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const toggleDay = (day, on) => {
    setForm((f) => {
      const set2 = new Set(f.workingDays);
      if (on) set2.add(day);
      else set2.delete(day);
      return { ...f, workingDays: WEEK_DAYS.filter((d) => set2.has(d)) };
    });
    setDirty(true);
  };

  const onSave = () => save({ section: 'weekOff', payload: form, onSaved, message: 'Week off configuration saved' });

  return (
    <SectionCard title="Week Off" subtitle="Configure the employee’s weekly off days and working days." icon={CalendarDays}>
      <FieldGrid>
        <Select
          label="Weekly Off Day"
          name="weeklyOffDay"
          value={form.weeklyOffDay}
          onChange={(e) => { set('weeklyOffDay', e.target.value); if (e.target.value) toggleDay(e.target.value, false); }}
          placeholder="Select a day"
          options={WEEK_DAYS}
        />
        <Select
          label="Second Weekly Off (optional)"
          name="secondWeeklyOffDay"
          value={form.secondWeeklyOffDay}
          onChange={(e) => { set('secondWeeklyOffDay', e.target.value); if (e.target.value) toggleDay(e.target.value, false); }}
          placeholder="Select a day"
          options={WEEK_DAYS}
        />
      </FieldGrid>

      <div className="mt-5">
        <p className="label">Working Days</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WEEK_DAYS.map((day) => {
            const on = form.workingDays.includes(day);
            return (
              <label
                key={day}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-medium transition ${on ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={(e) => toggleDay(day, e.target.checked)} />
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${on ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  {day}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">Days that are off will be removed automatically from the working day list.</p>
      </div>

      <SaveBar onSave={onSave} saving={saving} dirty={dirty} />
    </SectionCard>
  );
}

function QualificationEditor({ emp, ctx, onSaved }) {
  const [entries, setEntries] = useSectionSync(() => (emp.qualifications || []).map((q) => ({ ...q })));
  const [save, saving] = useSave(ctx);
  const dirty = JSON.stringify(entries) !== JSON.stringify((emp.qualifications || []).map((q) => ({ ...q })));
  return (
    <RepeaterSection
      title="Qualification"
      subtitle="Educational degrees and academic history."
      icon={GraduationCap}
      blank={() => ({ degree: '', institution: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '', description: '' })}
      entries={entries}
      setEntries={setEntries}
      dirty={dirty}
      saving={saving}
      addLabel="Add Qualification"
      renderEntry={(q, set) => (
        <>
          <Input label="Qualification / Degree" value={q.degree || ''} onChange={(e) => set({ degree: e.target.value })} placeholder="B.E. Computer Science" />
          <Input label="Institution Name" value={q.institution || ''} onChange={(e) => set({ institution: e.target.value })} placeholder="University / College" />
          <Input label="Field of Study" value={q.fieldOfStudy || ''} onChange={(e) => set({ fieldOfStudy: e.target.value })} placeholder="Computer Science" />
          <Input label="Specialization" value={q.specialization || ''} onChange={(e) => set({ specialization: e.target.value })} placeholder="Specialization" />
          <Select label="Start Year" value={q.startYear || ''} onChange={(e) => set({ startYear: e.target.value })} placeholder="Year" options={YEARS} />
          <Select label="End Year" value={q.endYear || ''} onChange={(e) => set({ endYear: e.target.value })} placeholder="Year" options={YEARS} />
          <Input label="Grade / Percentage" value={q.grade || ''} onChange={(e) => set({ grade: e.target.value })} placeholder="8.5 CGPA / First Class" />
          <Textarea label="Description" className="sm:col-span-2" value={q.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder="Notes" />
        </>
      )}
      onSave={() => save({ section: 'qualification', payload: entries, onSaved, message: 'Qualifications saved' })}
    />
  );
}

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'Other'];
const PF_STATUSES = ['Active', 'Inactive', 'Exempt'];

const numOrEmpty = (v) => (v === '' || v === null || v === undefined ? '' : Number(v));

function SalaryEditor({ emp, ctx, onSaved }) {
  const s = emp.salary || {};
  const [form, setForm] = useSectionSync(() => ({
    ctc: s.ctc ?? '',
    basicSalary: s.basicSalary ?? '',
    hra: s.hra ?? '',
    specialAllowance: s.specialAllowance ?? '',
    otherAllowance: s.otherAllowance ?? '',
    monthlyGross: s.monthlyGross ?? '',
    monthlyDeductions: s.monthlyDeductions ?? '',
    netPay: s.netPay ?? '',
    currency: s.currency || 'INR',
    effectiveDate: toInputDate(s.effectiveDate),
    revisionDate: toInputDate(s.revisionDate),
    notes: s.notes || '',
  }));
  const [save, saving] = useSave(ctx);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const onSave = () =>
    save({
      section: 'salary',
      payload: {
        ctc: numOrEmpty(form.ctc),
        basicSalary: numOrEmpty(form.basicSalary),
        hra: numOrEmpty(form.hra),
        specialAllowance: numOrEmpty(form.specialAllowance),
        otherAllowance: numOrEmpty(form.otherAllowance),
        monthlyGross: numOrEmpty(form.monthlyGross),
        monthlyDeductions: numOrEmpty(form.monthlyDeductions),
        netPay: numOrEmpty(form.netPay),
        currency: form.currency,
        effectiveDate: form.effectiveDate,
        revisionDate: form.revisionDate,
        notes: form.notes,
      },
      onSaved,
      message: 'Salary details saved',
    });

  return (
    <SectionCard title="Salary Details" subtitle="Compensation and pay breakdown. Visible to admins only." icon={Banknote}>
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        Enter amounts in whole numbers. Leave a field empty to clear it. These fields are informational and do not compute payroll.
      </div>
      <FieldGrid>
        <Input label="Annual CTC" name="ctc" type="number" value={form.ctc} onChange={(e) => set('ctc', e.target.value)} placeholder="1200000" />
        <Input label="Monthly Gross" name="monthlyGross" type="number" value={form.monthlyGross} onChange={(e) => set('monthlyGross', e.target.value)} placeholder="80000" />
        <Input label="Basic Salary" name="basicSalary" type="number" value={form.basicSalary} onChange={(e) => set('basicSalary', e.target.value)} placeholder="32000" />
        <Input label="HRA" name="hra" type="number" value={form.hra} onChange={(e) => set('hra', e.target.value)} placeholder="16000" />
        <Input label="Special Allowance" name="specialAllowance" type="number" value={form.specialAllowance} onChange={(e) => set('specialAllowance', e.target.value)} placeholder="20000" />
        <Input label="Other Allowance" name="otherAllowance" type="number" value={form.otherAllowance} onChange={(e) => set('otherAllowance', e.target.value)} placeholder="0" />
        <Input label="Monthly Deductions" name="monthlyDeductions" type="number" value={form.monthlyDeductions} onChange={(e) => set('monthlyDeductions', e.target.value)} placeholder="2500" />
        <Input label="Net Pay (In-hand)" name="netPay" type="number" value={form.netPay} onChange={(e) => set('netPay', e.target.value)} placeholder="66500" />
        <Select label="Currency" name="currency" value={form.currency} onChange={(e) => set('currency', e.target.value)} options={CURRENCIES} />
        <Input label="Effective From" name="effectiveDate" type="date" value={form.effectiveDate} onChange={(e) => set('effectiveDate', e.target.value)} />
        <Input label="Last Revision Date" name="revisionDate" type="date" value={form.revisionDate} onChange={(e) => set('revisionDate', e.target.value)} />
        <Textarea label="Notes" name="notes" className="sm:col-span-2" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Increment notes, bonus structure, etc." />
      </FieldGrid>
      <SaveBar onSave={onSave} saving={saving} dirty={dirty} label="Save Salary Details" />
    </SectionCard>
  );
}

function PfEditor({ emp, ctx, onSaved }) {
  const p = emp.pf || {};
  const [form, setForm] = useSectionSync(() => ({
    uan: p.uan || '',
    pfNumber: p.pfNumber || '',
    pfStatus: p.pfStatus || 'Inactive',
    vpf: p.vpf === true,
    contribution: p.contribution ?? '',
    employerContribution: p.employerContribution ?? '',
    pfStartDate: toInputDate(p.pfStartDate),
    pfExitDate: toInputDate(p.pfExitDate),
    remarks: p.remarks || '',
  }));
  const [save, saving] = useSave(ctx);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const onSave = () =>
    save({
      section: 'pf',
      payload: {
        uan: form.uan,
        pfNumber: form.pfNumber,
        pfStatus: form.pfStatus,
        vpf: form.vpf,
        contribution: numOrEmpty(form.contribution),
        employerContribution: numOrEmpty(form.employerContribution),
        pfStartDate: form.pfStartDate,
        pfExitDate: form.pfExitDate,
        remarks: form.remarks,
      },
      onSaved,
      message: 'PF details saved',
    });

  return (
    <SectionCard title="PF Details" subtitle="Provident fund and UAN information. Visible to admins only." icon={ShieldCheck}>
      <FieldGrid>
        <Input label="UAN" name="uan" value={form.uan} onChange={(e) => set('uan', e.target.value)} placeholder="123456789012" />
        <Input label="PF Account Number" name="pfNumber" value={form.pfNumber} onChange={(e) => set('pfNumber', e.target.value)} placeholder="TN/1234567/000" />
        <Select label="PF Status" name="pfStatus" value={form.pfStatus} onChange={(e) => set('pfStatus', e.target.value)} options={PF_STATUSES} />
        <div className="flex items-end pb-1">
          <CheckboxField
            label="Voluntary PF (VPF)"
            checked={form.vpf}
            onChange={(v) => { set('vpf', v); }}
            hint="Employee contributes above the statutory limit."
          />
        </div>
        <Input label="Employee Contribution (%)" name="contribution" type="number" value={form.contribution} onChange={(e) => set('contribution', e.target.value)} placeholder="12" />
        <Input label="Employer Contribution (%)" name="employerContribution" type="number" value={form.employerContribution} onChange={(e) => set('employerContribution', e.target.value)} placeholder="12" />
        <Input label="PF Start Date" name="pfStartDate" type="date" value={form.pfStartDate} onChange={(e) => set('pfStartDate', e.target.value)} />
        <Input label="PF Exit Date" name="pfExitDate" type="date" value={form.pfExitDate} onChange={(e) => set('pfExitDate', e.target.value)} />
        <Textarea label="Remarks" name="remarks" className="sm:col-span-2" value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Transfer-in, withdrawals, etc." />
      </FieldGrid>
      <SaveBar onSave={onSave} saving={saving} dirty={dirty} label="Save PF Details" />
    </SectionCard>
  );
}

function WorkLocationEditor({ emp, ctx, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const current = emp.office;
  const [office, setOffice] = useState(current?._id || '');
  const { data: locData, loading: locLoading } = useApi(async () => {
    const { data } = await api.get('/locations');
    return data.data;
  }, []);
  const locations = (locData || [])
    .filter((l) => l.active)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const onSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/employees/${ctx.employeeId}/sections/workLocation`, { data: { office: office || null } });
      toast.success('Work location saved');
      await onSaved?.();
    } catch (err) {
      toast.error(extractError(err, 'Could not save work location'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Work Location" subtitle="The office or company location the employee is assigned to." icon={MapPin}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="label">Assigned Location</p>
          {current ? (
            <div className="mt-2 space-y-2 text-sm">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{current.name}</p>
              {current.city && <p className="text-slate-500 dark:text-slate-400">{current.city}</p>}
              {current.address && <p className="text-slate-500 dark:text-slate-400">{current.address}</p>}
              <Badge tone={current.active === false ? 'slate' : 'emerald'}>{current.active === false ? 'Inactive' : 'Active'}</Badge>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No work location assigned yet.</p>
          )}
        </div>
        <div>
          <Select
            label="Assign to office location"
            name="office"
            value={office}
            onChange={(e) => setOffice(e.target.value)}
            placeholder={locLoading ? 'Loading locations…' : 'Select a location'}
            options={locations.map((l) => ({ value: l._id, label: l.name }))}
          />
          <p className="mt-2 text-xs text-slate-400">
            Choose a listed office. Saving updates this employee's assigned work location.
          </p>
        </div>
      </div>
      <SaveBar onSave={onSave} saving={saving} dirty={String(office) !== String(current?._id || '')} label="Save Work Location" />
    </SectionCard>
  );
}

function DocumentsEditor({ emp, ctx, onSaved }) {
  const docs = emp.documents || [];
  const toast = useToast();
  const [form, setForm] = useState({ kind: 'offer', name: '', file: null });
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [replacing, setReplacing] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const refresh = async () => { await onSaved?.(); };

  const onUpload = async () => {
    if (!form.file) { toast.error('Choose a file to upload.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('kind', form.kind);
      fd.append('file', form.file);
      await api.post(`/employees/${ctx.employeeId}/documents`, fd);
      toast.success('Document uploaded');
      setForm({ kind: form.kind, name: '', file: null });
      await refresh();
    } catch (err) {
      toast.error(extractError(err, 'Could not upload document'));
    } finally {
      setUploading(false);
    }
  };

  const onReplace = async (doc, file) => {
    setReplacing(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.put(`/employees/${ctx.employeeId}/documents/${doc._id}`, fd);
      toast.success('Document replaced');
      await refresh();
    } catch (err) {
      toast.error(extractError(err, 'Could not replace document'));
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/employees/${ctx.employeeId}/documents/${deleting._id}`);
      toast.success('Document deleted');
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete document'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const onPhoto = async (file) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Profile photo must be under 5 MB'); return; }
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append('profilePhoto', file);
      await api.post(`/employees/${ctx.employeeId}/photo`, fd);
      toast.success('Profile photo updated');
      await refresh();
    } catch (err) {
      toast.error(extractError(err, 'Could not update profile photo'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const onView = (d) => {
    const src = resolveAsset(d.path);
    if (/^image\//.test(d.mimeType || '') || /\.(png|jpe?g|webp|gif)$/i.test(d.originalName || '')) setPreview({ src, label: d.originalName });
    else window.open(src, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Profile Photo" subtitle="Used on the profile card and reports." icon={Camera}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <img
            src={resolveAsset(emp.profilePhoto) || undefined}
            alt="Profile"
            className="h-20 w-20 shrink-0 rounded-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {emp.profilePhoto ? 'Profile photo uploaded' : 'No profile photo yet'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">JPG, PNG or WebP up to 5 MB.</p>
            <div className="mt-3 flex justify-center gap-2 sm:justify-start">
              <label className="btn-secondary cursor-pointer text-xs">
                <Camera className="h-4 w-4" /> {emp.profilePhoto ? 'Replace photo' : 'Upload photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ''; }} />
              </label>
              {photoBusy && <Button type="button" variant="ghost" size="sm" loading disabled>Uploading…</Button>}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Documents" subtitle="Government IDs, letters and other documents for the employee file." icon={FileUp}>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="label">Upload a Document</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Document Type"
              name="kind"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              options={DOCUMENT_KINDS}
            />
            <Input label="Document Name" name="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Optional — defaults to type" />
            <div className="sm:pt-6">
              <label className="btn-secondary block cursor-pointer text-center text-xs">
                <FileUp className="h-4 w-4" /> {form.file ? form.file.name : 'Choose file'}
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setForm((s) => ({ ...s, file: f })); e.target.value = ''; }} />
              </label>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {form.file && <p className="truncate text-xs text-slate-400">{form.file.name}</p>}
            <Button type="button" size="sm" onClick={onUpload} loading={uploading}>
              <FileUp className="h-4 w-4" /> Upload
            </Button>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="mt-4"><EmptyState title="No documents uploaded" message="Upload a document above to get started." /></div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="th">Document</th>
                  <th className="th">Date</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d._id} className="border-b last:border-0 dark:border-slate-700">
                    <td className="td">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{KIND_LABEL[d.kind] || d.kind || 'Document'}</p>
                      <p className="text-xs text-slate-400">
                        {d.originalName}
                        {d.size ? ` · ${formatFileSize(d.size)}` : ''}
                      </p>
                    </td>
                    <td className="td text-sm text-slate-500 dark:text-slate-400">{formatDate(d.updatedAt || d.createdAt)}</td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-3">
                        {d.path && (
                          <>
                            <button type="button" onClick={() => onView(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <a href={resolveAsset(d.path)} download={d.originalName || true} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:underline dark:text-slate-300">
                              <Download className="h-3.5 w-3.5" /> Download
                            </a>
                          </>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-slate-500 hover:underline dark:text-slate-300">
                          <RefreshCw className="h-3.5 w-3.5" /> Replace
                          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplace(d, f); e.target.value = ''; }} />
                        </label>
                        <button type="button" onClick={() => setDeleting(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline dark:text-rose-400">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={deleteBusy}
        title="Delete document?"
        message={`"${deleting?.originalName || 'This document'}" will be permanently removed from the employee file.`}
        confirmLabel="Delete"
      />

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.label} size="md">
        {preview && (
          <div className="overflow-hidden rounded-xl">
            <img src={preview.src} alt={preview.label} className="h-auto max-h-[70vh] w-full object-contain" />
            <p className="mt-3 text-center text-sm font-medium text-slate-500">{preview.label}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

const IMMIGRATION_DOCUMENT_TYPES = ['Passport', 'Visa', 'Work Permit', 'Residence Permit', 'Green Card / PR', 'Employment Authorization', 'Other'];

function ImmigrationEditor({ emp, ctx, onSaved }) {
  const [entries, setEntries] = useSectionSync(() => (emp.immigration || []).map((x) => ({ ...x })));
  const [save, saving] = useSave(ctx);
  const dirty = JSON.stringify(entries) !== JSON.stringify((emp.immigration || []).map((x) => ({ ...x })));
  return (
    <RepeaterSection
      title="Immigration"
      subtitle="Passport, visa and work permit details for travel and compliance."
      icon={Plane}
      blank={() => ({ documentType: '', documentNumber: '', issuingCountry: '', issueDate: '', expiryDate: '', remarks: '' })}
      entries={entries}
      setEntries={setEntries}
      dirty={dirty}
      saving={saving}
      addLabel="Add Immigration Document"
      renderEntry={(imm, set) => (
        <>
          <Select label="Document Type" value={imm.documentType || ''} onChange={(e) => set({ documentType: e.target.value })} placeholder="Select document type" options={IMMIGRATION_DOCUMENT_TYPES} />
          <Input label="Document Number" value={imm.documentNumber || ''} onChange={(e) => set({ documentNumber: e.target.value })} placeholder="Passport / visa / permit number" />
          <Input label="Country of Issue" value={imm.issuingCountry || ''} onChange={(e) => set({ issuingCountry: e.target.value })} placeholder="Country" />
          <Input label="Issue Date" type="date" value={toInputDate(imm.issueDate)} onChange={(e) => set({ issueDate: e.target.value })} />
          <Input label="Expiry Date" type="date" value={toInputDate(imm.expiryDate)} onChange={(e) => set({ expiryDate: e.target.value })} />
          <Textarea label="Remarks" className="sm:col-span-2" value={imm.remarks || ''} onChange={(e) => set({ remarks: e.target.value })} placeholder="Visa type, employer, port of entry, notes" />
        </>
      )}
      onSave={() => save({ section: 'immigration', payload: entries, onSaved, message: 'Immigration details saved' })}
    />
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}