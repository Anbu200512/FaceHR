import { IdCard, UserRound, Landmark, User, PhoneCall, MailCheck } from 'lucide-react';
import { Input, Select, Textarea } from '../../ui/Form';
import { SectionCard, AddressFields } from './shared';
import { MARITAL_STATUSES, BLOOD_GROUPS, ACCOUNT_TYPES, RELATIONSHIPS } from '../constants';

export function BasicStep({ values, errors, set, isEdit, depts, designations, suggestId }) {
  return (
    <SectionCard title="Basic Details" subtitle="Basic employee information used to create the account." icon={IdCard}>
      <div className="mb-4 flex items-end gap-2">
        <Input
          label="Employee ID *"
          name="employeeId"
          value={values.employeeId}
          onChange={(e) => set('employeeId', e.target.value)}
          error={errors.employeeId}
          placeholder="EMP001"
          className="flex-1"
        />
        <button type="button" onClick={suggestId} className="btn-ghost mb-1 text-xs" title="Generate an employee ID">
          Suggest
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First Name *" name="firstName" value={values.firstName} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} placeholder="Arul" />
        <Input label="Last Name *" name="lastName" value={values.lastName} onChange={(e) => set('lastName', e.target.value)} error={errors.lastName} placeholder="Prakash" />
        <Input
          label="Work Email *"
          name="email"
          type="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
          placeholder="arul@facehr.com"
          hint={isEdit ? 'Used as the employee’s login email.' : 'This is the employee’s login email.'}
        />
        <Input label="Mobile Number" name="phone" value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        <Input
          label="Password"
          name="password"
          type="password"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          placeholder={isEdit ? 'Leave blank to keep current' : 'Leave blank to auto-generate'}
          hint={
            isEdit
              ? 'Only set when resetting the password.'
              : 'Optional — if blank, a temporary password is generated and included in the welcome email.'
          }
        />
        <Select
          label="Department *"
          name="department"
          value={values.department}
          onChange={(e) => set('department', e.target.value)}
          placeholder="Select department"
          error={errors.department}
          options={(depts || []).map((d) => ({ value: d._id, label: d.name }))}
        />
        <Select
          label="Designation"
          name="designation"
          value={values.designation}
          onChange={(e) => set('designation', e.target.value)}
          placeholder="Select designation"
          options={(designations || []).map((d) => ({ value: d._id, label: d.name }))}
        />
      </div>
      {!isEdit && (
        <p className="mt-5 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          On save, the employee account is created and the login credentials are sent to the work email above.
        </p>
      )}
    </SectionCard>
  );
}

export function ContactStep({ values, set }) {
  return (
    <SectionCard title="Contact" subtitle="How to reach the employee outside of work." icon={UserRound}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Personal Email" name="contact.personalEmail" value={values.contact.personalEmail} onChange={(e) => set('contact.personalEmail', e.target.value)} placeholder="personal@example.com" />
        <Input label="Alternate Mobile Number" name="contact.alternatePhone" value={values.contact.alternatePhone} onChange={(e) => set('contact.alternatePhone', e.target.value)} placeholder="+91 90000 00000" />
      </div>
      <div className="mt-5">
        <p className="label">Address</p>
        <AddressFields value={values.contact.address} onChange={(addr) => set('contact.address', addr)} />
      </div>
    </SectionCard>
  );
}

export function BankDetailsStep({ values, set, errors }) {
  return (
    <SectionCard title="Bank Details" subtitle="Where payroll and reimbursements are sent." icon={Landmark}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Account Holder Name" name="accountHolderName" value={values.bankDetails.accountHolderName} onChange={(e) => set('bankDetails.accountHolderName', e.target.value)} placeholder="Arul Prakash" />
        <Input label="Bank Name" name="bankName" value={values.bankDetails.bankName} onChange={(e) => set('bankDetails.bankName', e.target.value)} placeholder="HDFC Bank" />
        <Input label="Account Number" name="accountNumber" value={values.bankDetails.accountNumber} onChange={(e) => set('bankDetails.accountNumber', e.target.value)} placeholder="01234567890123" />
        <Input label="Confirm Account Number" name="confirmAccountNumber" value={values.bankDetails.confirmAccountNumber} onChange={(e) => set('bankDetails.confirmAccountNumber', e.target.value)} error={errors.confirmAccountNumber} placeholder="01234567890123" />
        <Input label="IFSC Code" name="ifscCode" value={values.bankDetails.ifscCode} onChange={(e) => set('bankDetails.ifscCode', e.target.value)} placeholder="HDFC0001234" />
        <Input label="Branch Name" name="branchName" value={values.bankDetails.branchName} onChange={(e) => set('bankDetails.branchName', e.target.value)} placeholder="Anna Nagar" />
        <Select label="Account Type" name="accountType" value={values.bankDetails.accountType} onChange={(e) => set('bankDetails.accountType', e.target.value)} placeholder="Select account type" options={ACCOUNT_TYPES} />
      </div>
    </SectionCard>
  );
}

export function PersonalStep({ values, set }) {
  return (
    <SectionCard title="Personal" subtitle="Personal details such as marital status, blood group and nationality." icon={User}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Date of Birth" name="dateOfBirth" type="date" value={values.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
        <div>
          <label className="label">Gender</label>
          <select className="input appearance-none" name="gender" value={values.gender} onChange={(e) => set('gender', e.target.value)}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <Select label="Marital Status" name="personal.maritalStatus" value={values.personal.maritalStatus} onChange={(e) => set('personal.maritalStatus', e.target.value)} placeholder="Select marital status" options={MARITAL_STATUSES} />
        <Select label="Blood Group" name="personal.bloodGroup" value={values.personal.bloodGroup} onChange={(e) => set('personal.bloodGroup', e.target.value)} placeholder="Select blood group" options={BLOOD_GROUPS} />
        <Input label="Nationality" name="personal.nationality" value={values.personal.nationality} onChange={(e) => set('personal.nationality', e.target.value)} placeholder="Indian" />
      </div>
    </SectionCard>
  );
}

export function EmergencyContactStep({ values, set }) {
  return (
    <SectionCard title="Emergency Contact" subtitle="Who to reach if the employee is unreachable." icon={PhoneCall}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Contact Name" name="fullName" value={values.emergencyContact.fullName} onChange={(e) => set('emergencyContact.fullName', e.target.value)} placeholder="Jane Doe" />
        <Select label="Relationship" name="relationship" value={values.emergencyContact.relationship} onChange={(e) => set('emergencyContact.relationship', e.target.value)} placeholder="Select relationship" options={RELATIONSHIPS} />
        <Input label="Primary Phone Number" name="primaryPhone" value={values.emergencyContact.primaryPhone} onChange={(e) => set('emergencyContact.primaryPhone', e.target.value)} placeholder="+91 98765 43210" />
        <Input label="Alternate Phone Number" name="alternatePhone" value={values.emergencyContact.alternatePhone} onChange={(e) => set('emergencyContact.alternatePhone', e.target.value)} placeholder="+91 90000 00000" />
        <Input label="Email" name="email" type="email" value={values.emergencyContact.email} onChange={(e) => set('emergencyContact.email', e.target.value)} placeholder="jane@example.com" />
        <Textarea label="Full Address" className="sm:col-span-2" name="address" value={values.emergencyContact.address} onChange={(e) => set('emergencyContact.address', e.target.value)} placeholder="Street, City, Country" />
      </div>
    </SectionCard>
  );
}