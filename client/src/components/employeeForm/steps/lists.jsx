import { UsersRound, Briefcase, GraduationCap, Award, ExternalLink } from 'lucide-react';
import { Input, Select, Textarea } from '../../ui/Form';
import { SectionCard, EntryCard, ListEditor, CheckboxField } from './shared';
import { RELATIONSHIPS, YEARS } from '../constants';
import { EMPLOYMENT_TYPES } from '../../../services/static';
import { resolveAsset } from '../../../services/format';

export function FamilyStep({ values, addEntry, updateEntry, removeEntry }) {
  return (
    <SectionCard title="Family" subtitle="Immediate family members for reference and emergency context." icon={UsersRound}>
      <ListEditor addLabel="Add family member" onAdd={() => addEntry('family')}>
        {values.family.map((m, i) => (
          <EntryCard key={i} index={i} title={`Family Member ${i + 1}`} onRemove={() => removeEntry('family', i)}>
            <Input label="Full Name" value={m.fullName || ''} onChange={(e) => updateEntry('family', i, 'fullName', e.target.value)} placeholder="Full name" />
            <Select label="Relationship" value={m.relationship || ''} onChange={(e) => updateEntry('family', i, 'relationship', e.target.value)} placeholder="Select relationship" options={RELATIONSHIPS} />
            <Input label="Date of Birth" type="date" value={m.dateOfBirth || ''} onChange={(e) => updateEntry('family', i, 'dateOfBirth', e.target.value)} />
            <Input label="Phone Number" value={m.phoneNumber || ''} onChange={(e) => updateEntry('family', i, 'phoneNumber', e.target.value)} placeholder="+91 98765 43210" />
            <Input label="Occupation" value={m.occupation || ''} onChange={(e) => updateEntry('family', i, 'occupation', e.target.value)} placeholder="Occupation" />
            <Textarea label="Address" className="sm:col-span-2" value={m.address || ''} onChange={(e) => updateEntry('family', i, 'address', e.target.value)} placeholder="Street, City, Country" />
          </EntryCard>
        ))}
      </ListEditor>
    </SectionCard>
  );
}

export function ExperienceStep({ values, addEntry, updateEntry, removeEntry }) {
  return (
    <SectionCard title="Experience" subtitle="Previous employment history. Most recent first is best." icon={Briefcase}>
      <ListEditor addLabel="Add experience" onAdd={() => addEntry('experience')}>
        {values.experience.map((x, i) => (
          <EntryCard key={i} index={i} title={`Experience ${i + 1}`} onRemove={() => removeEntry('experience', i)}>
            <Input label="Company Name" value={x.company || ''} onChange={(e) => updateEntry('experience', i, 'company', e.target.value)} placeholder="Company" />
            <Input label="Job Title" value={x.jobTitle || ''} onChange={(e) => updateEntry('experience', i, 'jobTitle', e.target.value)} placeholder="Job title" />
            <Select label="Employment Type" value={x.employmentType || ''} onChange={(e) => updateEntry('experience', i, 'employmentType', e.target.value)} placeholder="Select type" options={EMPLOYMENT_TYPES} />
            <Input label="Location" value={x.location || ''} onChange={(e) => updateEntry('experience', i, 'location', e.target.value)} placeholder="City, Country" />
            <Input label="Start Date" type="date" value={x.startDate || ''} onChange={(e) => updateEntry('experience', i, 'startDate', e.target.value)} />
            <div className="space-y-2">
              <Input
                label="End Date"
                type="date"
                value={x.currentlyWorking ? '' : x.endDate || ''}
                onChange={(e) => updateEntry('experience', i, 'endDate', e.target.value)}
                disabled={x.currentlyWorking}
              />
              <CheckboxField
                label="Currently working"
                checked={Boolean(x.currentlyWorking)}
                onChange={(v) => updateEntry('experience', i, 'currentlyWorking', v)}
              />
            </div>
            <Textarea label="Description" className="sm:col-span-2" value={x.description || ''} onChange={(e) => updateEntry('experience', i, 'description', e.target.value)} placeholder="Role summary" />
          </EntryCard>
        ))}
      </ListEditor>
    </SectionCard>
  );
}

export function QualificationStep({ values, addEntry, updateEntry, removeEntry }) {
  return (
    <SectionCard title="Qualification" subtitle="Educational degrees and academic history." icon={GraduationCap}>
      <ListEditor addLabel="Add qualification" onAdd={() => addEntry('qualifications')}>
        {values.qualifications.map((q, i) => (
          <EntryCard key={i} index={i} title={`Qualification ${i + 1}`} onRemove={() => removeEntry('qualifications', i)}>
            <Input label="Degree" value={q.degree || ''} onChange={(e) => updateEntry('qualifications', i, 'degree', e.target.value)} placeholder="B.E. Computer Science" />
            <Input label="Institution" value={q.institution || ''} onChange={(e) => updateEntry('qualifications', i, 'institution', e.target.value)} placeholder="University / College" />
            <Input label="Field of Study" value={q.fieldOfStudy || ''} onChange={(e) => updateEntry('qualifications', i, 'fieldOfStudy', e.target.value)} placeholder="Computer Science" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Start Year" value={q.startYear || ''} onChange={(e) => updateEntry('qualifications', i, 'startYear', e.target.value)} placeholder="Year" options={YEARS} />
              <Select label="End Year" value={q.endYear || ''} onChange={(e) => updateEntry('qualifications', i, 'endYear', e.target.value)} placeholder="Year" options={YEARS} />
            </div>
            <Input label="Grade" value={q.grade || ''} onChange={(e) => updateEntry('qualifications', i, 'grade', e.target.value)} placeholder="8.5 CGPA / First Class" />
            <Textarea label="Description" className="sm:col-span-2" value={q.description || ''} onChange={(e) => updateEntry('qualifications', i, 'description', e.target.value)} placeholder="Notes" />
          </EntryCard>
        ))}
      </ListEditor>
    </SectionCard>
  );
}

export function CertificationStep({ values, addEntry, updateEntry, removeEntry, onFileSelect, onFileRemove }) {
  return (
    <SectionCard title="Certification" subtitle="Professional certificates and credentials." icon={Award}>
      <ListEditor addLabel="Add certification" onAdd={() => addEntry('certifications')}>
        {values.certifications.map((c, i) => (
          <EntryCard key={i} index={i} title={`Certification ${i + 1}`} onRemove={() => removeEntry('certifications', i)}>
            <Input label="Certification Name" value={c.name || ''} onChange={(e) => updateEntry('certifications', i, 'name', e.target.value)} placeholder="AWS Certified Solutions Architect" />
            <Input label="Issuing Organization" value={c.organization || ''} onChange={(e) => updateEntry('certifications', i, 'organization', e.target.value)} placeholder="Amazon Web Services" />
            <Input label="Issue Date" type="date" value={c.issueDate || ''} onChange={(e) => updateEntry('certifications', i, 'issueDate', e.target.value)} />
            <Input label="Expiry Date" type="date" value={c.expiryDate || ''} onChange={(e) => updateEntry('certifications', i, 'expiryDate', e.target.value)} />
            <Input label="Credential ID" value={c.credentialId || ''} onChange={(e) => updateEntry('certifications', i, 'credentialId', e.target.value)} placeholder="Credential ID" />
            <Input label="Credential URL" value={c.credentialUrl || ''} onChange={(e) => updateEntry('certifications', i, 'credentialUrl', e.target.value)} placeholder="https://verify.example.com/..." />
            <CertFileBlock c={c} i={i} onFileSelect={onFileSelect} onFileRemove={onFileRemove} />
          </EntryCard>
        ))}
      </ListEditor>
    </SectionCard>
  );
}

function CertFileBlock({ c, i, onFileSelect, onFileRemove }) {
  const lbl = c._pending?.name || c.file?.name;
  if (lbl) {
    return (
      <div className="sm:col-span-2">
        <p className="label">Certificate File</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <Award className="h-4 w-4 shrink-0 text-brand-500" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{lbl}</p>
              <p className="text-xs text-slate-400">{c._pending ? 'Pending upload' : 'Uploaded'}</p>
            </div>
            {!c._pending && (
              <a href={resolveAsset(c.file.path)} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              {c._pending ? 'Change' : 'Replace'}
              <input type="file" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelect(i, f);
                e.target.value = '';
              }} />
            </label>
            <button type="button" onClick={() => onFileRemove(i)} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" title="Remove file">
              <span className="sr-only">Remove</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="sm:col-span-2">
      <p className="label">Certificate File</p>
      <label className="btn-secondary cursor-pointer text-xs">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        Upload certificate file
        <input type="file" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(i, f);
          e.target.value = '';
        }} />
      </label>
    </div>
  );
}