import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import { useAuth } from './context/AuthContext';
import { FullScreenLoader } from './components/ui/Button';

const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const EmployeeForm = lazy(() => import('./pages/admin/EmployeeForm'));
const EmployeeProfile = lazy(() => import('./pages/admin/EmployeeProfile'));
const FaceRegistrationList = lazy(() => import('./pages/admin/FaceRegistrationList'));
const Attendance = lazy(() => import('./pages/admin/Attendance'));
const ManualAttendance = lazy(() => import('./pages/admin/ManualAttendance'));
const TodayAttendance = lazy(() => import('./pages/admin/TodayAttendance'));
const MonthlyAttendance = lazy(() => import('./pages/admin/MonthlyAttendance'));
const AttendanceGallery = lazy(() => import('./pages/admin/AttendanceGallery'));
const Departments = lazy(() => import('./pages/admin/Departments'));
const Leaves = lazy(() => import('./pages/admin/Leaves'));
const LeavePolicies = lazy(() => import('./pages/admin/LeavePolicies'));
const Holidays = lazy(() => import('./pages/admin/Holidays'));
const Regularizations = lazy(() => import('./pages/admin/Regularizations'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const Payroll = lazy(() => import('./pages/admin/Payroll'));
const Resignations = lazy(() => import('./pages/admin/Resignations'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const AttendanceSettings = lazy(() => import('./pages/admin/AttendanceSettings'));

const EmployeeHome = lazy(() => import('./pages/employee/Dashboard'));
const FaceAttendance = lazy(() => import('./pages/employee/FaceAttendance'));
const History = lazy(() => import('./pages/employee/History'));
const MyLeaves = lazy(() => import('./pages/employee/MyLeaves'));
const MyRegularizations = lazy(() => import('./pages/employee/MyRegularizations'));
const MyPayslips = lazy(() => import('./pages/employee/Payslips'));
const EmployeeAnnouncements = lazy(() => import('./pages/employee/Announcements'));
const EmployeeHolidays = lazy(() => import('./pages/employee/Holidays'));
const Resignation = lazy(() => import('./pages/employee/Resignation'));
const MyProfile = lazy(() => import('./pages/employee/MyProfile'));

const NotFound = lazy(() => import('./pages/NotFound'));

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader label="Loading FaceHR..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader label="Loading..." />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/new" element={<EmployeeForm />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />
          <Route path="employees/:id/face" element={<EmployeeProfile faceMode />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendance/manual" element={<ManualAttendance />} />
          <Route path="attendance/today" element={<TodayAttendance />} />
          <Route path="attendance/monthly" element={<MonthlyAttendance />} />
          <Route path="attendance/gallery" element={<AttendanceGallery />} />
          <Route path="attendance-settings" element={<AttendanceSettings />} />
          <Route path="face-registration" element={<FaceRegistrationList />} />
          <Route path="departments" element={<Departments />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="leave-policies" element={<LeavePolicies />} />
          <Route path="holidays" element={<Holidays />} />
          <Route path="regularizations" element={<Regularizations />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="resignations" element={<Resignations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/employee"
          element={
            <ProtectedRoute employeeOnly>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeHome />} />
          <Route path="attendance" element={<FaceAttendance />} />
          <Route path="history" element={<History />} />
          <Route path="regularization" element={<MyRegularizations />} />
          <Route path="leave" element={<MyLeaves />} />
          <Route path="payslips" element={<MyPayslips />} />
          <Route path="announcements" element={<EmployeeAnnouncements />} />
          <Route path="holidays" element={<EmployeeHolidays />} />
          <Route path="resignation" element={<Resignation />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
