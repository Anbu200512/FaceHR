import { composeAddress } from './constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStep(stepId, v) {
  const errors = {};
  if (stepId === 'basic') {
    if (!String(v.employeeId || '').trim()) errors.employeeId = 'Employee ID is required';
    if (!String(v.firstName || '').trim()) errors.firstName = 'First name is required';
    if (!String(v.lastName || '').trim()) errors.lastName = 'Last name is required';
    if (!String(v.email || '').trim()) errors.email = 'Work email is required';
    else if (!EMAIL_RE.test(String(v.email).trim())) errors.email = 'Enter a valid work email';
    if (!String(v.joiningDate || '').trim()) errors.joiningDate = 'Date of joining is required';
    if (!String(v.dateOfBirth || '').trim()) errors.dateOfBirth = 'Date of birth is required';
    if (!String(v.state || '').trim()) errors.state = 'State is required';
    if (!String(v.department || '').trim()) errors.department = 'Department is required';
    if (!String(v.designation || '').trim()) errors.designation = 'Designation is required';
    if (v.password && String(v.password).length < 6) errors.password = 'Password must be at least 6 characters';
  }
  if (stepId === 'bank') {
    const acct = String(v.bankDetails.accountNumber || '').trim();
    const confirm = String(v.bankDetails.confirmAccountNumber || '').trim();
    if (acct && !confirm) errors.confirmAccountNumber = 'Please confirm the account number';
    else if (acct && confirm !== acct) errors.confirmAccountNumber = 'Account numbers do not match';
  }
  return errors;
}

const mapEntry = (entry, keys) =>
  Object.fromEntries(keys.filter((k) => entry && entry[k] !== undefined && entry[k] !== null).map((k) => [k, entry[k]]));

export function buildSections(v) {
  const certifications = (v.certifications || []).map((c = {}) => {
    const base = mapEntry(c, ['name', 'organization', 'issueDate', 'expiryDate', 'credentialId', 'credentialUrl']);
    if (c.file && c.file.path) base.file = mapEntry(c.file, ['name', 'path', 'mimeType', 'size', 'docId']);
    return base;
  });

  const { confirmAccountNumber, ...bank } = v.bankDetails || {};

  return {
    contact: {
      personalEmail: v.contact.personalEmail || '',
      alternateEmail: v.contact.alternateEmail || '',
      mobileNumber: v.contact.mobileNumber || '',
      alternatePhone: v.contact.alternatePhone || '',
      sameAsCurrent: Boolean(v.contact.sameAsCurrent),
      permanentAddress: v.contact.permanentAddress || '',
      address: { ...v.contact.address },
    },
    bankDetails: { ...bank },
    personal: { ...v.personal },
    family: (v.family || []).map((f) => mapEntry(f, ['fullName', 'relationship', 'dateOfBirth', 'phoneNumber', 'occupation', 'address'])),
    experience: (v.experience || []).map((x) =>
      mapEntry(x, ['company', 'jobTitle', 'employmentType', 'startDate', 'endDate', 'currentlyWorking', 'location', 'description'])
    ),
    qualifications: (v.qualifications || []).map((q) => mapEntry(q, ['degree', 'institution', 'fieldOfStudy', 'startYear', 'endYear', 'grade', 'description'])),
    certifications,
    emergencyContact: { ...v.emergencyContact },
    emergencyContacts: (v.emergencyContacts || []).map((e) =>
      mapEntry(e, ['fullName', 'relationship', 'primaryPhone', 'alternatePhone', 'email', 'address'])
    ),
    weekOff: {
      weeklyOffDay: v.weekOff?.weeklyOffDay || '',
      secondWeeklyOffDay: v.weekOff?.secondWeeklyOffDay || '',
      workingDays: v.weekOff?.workingDays || [],
    },
  };
}

export function buildEmployeeFormData(values, { photo = null, sectionsOverride } = {}) {
  const fd = new FormData();
  const append = (k, v) => {
    if (v !== '' && v !== undefined && v !== null) fd.append(k, v);
  };
  append('employeeId', values.employeeId);
  append('firstName', values.firstName);
  append('middleName', values.middleName);
  append('lastName', values.lastName);
  append('email', values.email);
  append('phone', values.phone);
  append('dateOfBirth', values.dateOfBirth);
  append('gender', values.gender);
  append('state', values.state);
  append('department', values.department);
  append('office', values.office);
  append('designation', values.designation);
  append('joiningDate', values.joiningDate);
  append('employmentType', values.employmentType);
  append('subDepartment', values.subDepartment);
  append('subDepartment1', values.subDepartment1);
  append('subDepartment2', values.subDepartment2);
  append('category', values.category);
  append('subCategory', values.subCategory);
  append('grade', values.grade);
  append('reportingManager', values.reportingManager);
  append('reportingManager2', values.reportingManager2);
  append('probation', values.probation);
  append('totalExperience', values.totalExperience);
  append('status', values.status);
  append('password', values.password);
  append('address', values.address || composeAddress(values));
  if (values.exEmployee) fd.append('exEmployee', 'true');
  if (values.probationManage) fd.append('probationManage', 'true');
  if (sectionsOverride !== false && sectionsOverride !== null) {
    fd.append('sections', JSON.stringify(sectionsOverride || buildSections(values)));
  }
  if (photo) fd.append('profilePhoto', photo);
  return fd;
}