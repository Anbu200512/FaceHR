import { IdCard, KeyRound, ShieldCheck } from 'lucide-react';
import { Input, Select } from '../ui/Form';
import { SectionCard, CheckboxField } from './steps/shared';

const EMPLOYEE_STATUSES = ['Active', 'Inactive'];

export default function BasicInfoEditor({
  values,
  errors,
  set,
  isEdit,
  depts,
  designations,
  locations,
  suggestId,
  manualEmployeeId,
  setManualEmployeeId,
}) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Basic Employee Information"
        subtitle="Essential employment information. Fields marked with * are required to create the employee record."
        icon={IdCard}
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Employee ID *"
                name="employeeId"
                value={values.employeeId}
                onChange={(e) => set('employeeId', e.target.value)}
                error={errors.employeeId}
                placeholder="EMP001"
                className="w-full"
                disabled={!isEdit && !manualEmployeeId}
              />
              <p className="mt-1 text-xs text-slate-400">
                {isEdit
                  ? 'Edit the unique employee identifier.'
                  : manualEmployeeId
                    ? 'Manual entry enabled — enter a unique employee ID.'
                    : 'Auto-generated when the employee is saved.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 pb-1 sm:items-end">
              {!isEdit && (
                <CheckboxField
                  label="Manual Employee ID"
                  checked={manualEmployeeId}
                  onChange={(v) => {
                    setManualEmployeeId(v);
                    if (!v) set('employeeId', '');
                  }}
                />
              )}
              <button
                type="button"
                onClick={suggestId}
                className="btn-ghost text-xs"
                title="Generate an employee ID suggestion"
              >
                Suggest
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First Name *" name="firstName" value={values.firstName} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} placeholder="Arul" />
            <Input label="Middle Name" name="middleName" value={values.middleName} onChange={(e) => set('middleName', e.target.value)} placeholder="Kumar" />
            <Input label="Last Name *" name="lastName" value={values.lastName} onChange={(e) => set('lastName', e.target.value)} error={errors.lastName} placeholder="Prakash" />
            <Input label="Date of Joining *" name="joiningDate" type="date" value={values.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} error={errors.joiningDate} />
            <Input label="Date of Birth *" name="dateOfBirth" type="date" value={values.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} error={errors.dateOfBirth} />
            <Input label="State *" name="state" value={values.state} onChange={(e) => set('state', e.target.value)} error={errors.state} placeholder="Tamil Nadu" />

            <Select
              label="Branch *"
              name="office"
              value={values.office}
              onChange={(e) => set('office', e.target.value)}
              placeholder="Select branch"
              error={errors.office}
              options={(locations || []).map((d) => ({ value: d._id, label: d.name }))}
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
            <Input label="Sub Department" name="subDepartment" value={values.subDepartment} onChange={(e) => set('subDepartment', e.target.value)} placeholder="Sub department" />
            <div className="hidden sm:block" />
            <Input label="Sub Department 1" name="subDepartment1" value={values.subDepartment1} onChange={(e) => set('subDepartment1', e.target.value)} placeholder="Sub department 1" />
            <Input label="Sub Department 2" name="subDepartment2" value={values.subDepartment2} onChange={(e) => set('subDepartment2', e.target.value)} placeholder="Sub department 2" />
            <Input label="Category" name="category" value={values.category} onChange={(e) => set('category', e.target.value)} placeholder="Category" />
            <Input label="Sub Category" name="subCategory" value={values.subCategory} onChange={(e) => set('subCategory', e.target.value)} placeholder="Sub category" />

            <Select
              label="Designation *"
              name="designation"
              value={values.designation}
              onChange={(e) => set('designation', e.target.value)}
              placeholder="Select designation"
              error={errors.designation}
              options={(designations || []).map((d) => ({ value: d._id, label: d.name }))}
            />
            <Input label="Grade / Cadre" name="grade" value={values.grade} onChange={(e) => set('grade', e.target.value)} placeholder="Grade or cadre" />
            <Input label="Reporting Manager" name="reportingManager" value={values.reportingManager} onChange={(e) => set('reportingManager', e.target.value)} placeholder="Reporting manager name" />
            <Input label="Reporting Manager 2" name="reportingManager2" value={values.reportingManager2} onChange={(e) => set('reportingManager2', e.target.value)} placeholder="Second reporting manager" />
            <Input label="Probation" name="probation" value={values.probation} onChange={(e) => set('probation', e.target.value)} placeholder="e.g. 6 months" />
            <Input label="Experience" name="totalExperience" value={values.totalExperience} onChange={(e) => set('totalExperience', e.target.value)} placeholder="e.g. 5 years" />

            <Input
              label="Company Email / Work Email *"
              name="email"
              type="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              error={errors.email}
              placeholder="arul@facehr.com"
              hint="This is the employee’s login email and the address login credentials are sent to."
            />
            <Select
              label="Status *"
              name="status"
              value={values.status}
              onChange={(e) => set('status', e.target.value)}
              options={EMPLOYEE_STATUSES}
            />
            <div className="gap-3 space-y-3 pt-1 sm:col-span-2 sm:flex sm:items-center">
              <CheckboxField label="Ex Employee" checked={Boolean(values.exEmployee)} onChange={(v) => set('exEmployee', v)} hint="Mark employees who are no longer part of the organisation." />
              <CheckboxField label="Probation Manage" checked={Boolean(values.probationManage)} onChange={(v) => set('probationManage', v)} hint="Enable probation tracking for this employee." />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Employee Login Information"
        subtitle="The work email is used as the login email. Passwords are never stored in plain text."
        icon={KeyRound}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Login Email / Work Email" name="loginEmail" value={values.email} readOnly className="sm:col-span-2" hint="Derived from the work email — the employee signs in with this address." />
          <Input
            label="Temporary Password"
            name="password"
            type="password"
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
            error={errors.password}
            placeholder={isEdit ? 'Leave blank to keep current' : 'Leave blank to auto-generate'}
            hint={
              isEdit
                ? 'Only set when resetting the password.'
                : 'Optional — a temporary password is auto-generated and included in the credential email.'
            }
          />
          <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-700 sm:self-end dark:bg-brand-500/10 dark:text-brand-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>The password is securely hashed with bcrypt before being stored. Send login details from the employee list or profile anytime.</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}