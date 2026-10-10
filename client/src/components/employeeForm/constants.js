import {
  IdCard,
  UserRound,
  Landmark,
  User,
  UsersRound,
  Briefcase,
  GraduationCap,
  Award,
  PhoneCall,
  FileUp,
  CalendarDays,
  Settings2,
  Plane,
} from 'lucide-react';

export const STEPS = [
  { id: 'basic', label: 'Basic Details', icon: IdCard },
  { id: 'contact', label: 'Contact', icon: UserRound },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'family', label: 'Family', icon: UsersRound },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'qualification', label: 'Qualification', icon: GraduationCap },
  { id: 'certification', label: 'Certification', icon: Award },
  { id: 'emergency', label: 'Emergency Contact', icon: PhoneCall },
  { id: 'documents', label: 'Documents', icon: FileUp },
];

export const STEP_IDS = STEPS.map((s) => s.id);

// Profile section tabs shown on the employee profile / employee master page.
export const EMPLOYEE_PROFILE_TABS = [
  { id: 'contact', label: 'Contact', icon: UserRound },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'family', label: 'Family', icon: UsersRound },
  { id: 'emergency', label: 'Emergency Contact', icon: PhoneCall },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'weekOff', label: 'Week Off', icon: CalendarDays },
  { id: 'qualification', label: 'Qualification', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: FileUp },
];

// Admin-only profile tabs on the Employee Details page: the employee
// self-service mirror excludes Admin, Document and Immigration.
export const ADMIN_PROFILE_TABS = [
  { id: 'contact', label: 'Contact', icon: UserRound },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'admin', label: 'Admin', icon: Settings2 },
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'family', label: 'Family', icon: UsersRound },
  { id: 'emergency', label: 'Emergency Contact', icon: PhoneCall },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'weekOff', label: 'Week Off', icon: CalendarDays },
  { id: 'qualification', label: 'Qualification', icon: GraduationCap },
  { id: 'documents', label: 'Document', icon: FileUp },
  { id: 'immigration', label: 'Immigration', icon: Plane },
];

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const BLANK = {
  employeeId: '',
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: 'Male',
  state: '',
  address: '',
  department: '',
  office: '',
  designation: '',
  joiningDate: '',
  employmentType: 'Full-time',
  subDepartment: '',
  subDepartment1: '',
  subDepartment2: '',
  category: '',
  subCategory: '',
  grade: '',
  reportingManager: '',
  reportingManager2: '',
  probation: '',
  probationManage: false,
  totalExperience: '',
  exEmployee: false,
  status: 'Active',
  password: '',
  contact: {
    personalEmail: '',
    alternateEmail: '',
    mobileNumber: '',
    alternatePhone: '',
    sameAsCurrent: true,
    permanentAddress: '',
    address: { line1: '', line2: '', city: '', state: '', country: '', pincode: '' },
  },
  bankDetails: {
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: '',
  },
  personal: { maritalStatus: '', bloodGroup: '', nationality: '' },
  family: [],
  experience: [],
  qualifications: [],
  certifications: [],
  emergencyContact: { fullName: '', relationship: '', primaryPhone: '', alternatePhone: '', email: '', address: '' },
  emergencyContacts: [],
  weekOff: { weeklyOffDay: '', secondWeeklyOffDay: '', workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
};

export const DOCUMENT_KINDS = [
  { value: 'adhaar', label: 'Aadhaar / Government ID' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'address', label: 'Address Proof' },
  { value: 'education', label: 'Educational Certificate' },
  { value: 'experience', label: 'Experience Letter' },
  { value: 'offer', label: 'Offer Letter' },
  { value: 'appointment', label: 'Appointment Letter' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'other', label: 'Other Documents' },
];

export const KIND_LABEL = {
  certificate: 'Certificate File Upload',
  adhaar: 'Aadhaar / Government ID',
  pan: 'PAN Card',
  address: 'Address Proof',
  education: 'Educational Certificate',
  experience: 'Experience Letter',
  offer: 'Offer Letter',
  appointment: 'Appointment Letter',
  payslip: 'Payslip',
  other: 'Other Documents',
  voterId: 'Voter ID',
  passport: 'Passport',
  drivingLicense: 'Driving License',
};

export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ACCOUNT_TYPES = ['Savings', 'Current', 'Salary', 'Fixed Deposit', 'Other'];
export const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Other'];
export const YEARS = Array.from({ length: 68 }, (_, i) => String(new Date().getFullYear() + 1 - i));

export function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return '';
  return [addr.line1, addr.line2, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean).join(', ');
}

export function composeAddress(values) {
  return formatAddress(values.contact?.address);
}