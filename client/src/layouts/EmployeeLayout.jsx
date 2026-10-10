import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanFace,
  History,
  Plane,
  UserCircle,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  KeyRound,
  FileSignature,
} from 'lucide-react';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import NotificationBell from '../components/NotificationBell';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';

const NAV = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employee/attendance', label: 'Face Attendance', icon: ScanFace },
  { to: '/employee/history', label: 'My Attendance', icon: History },
  { to: '/employee/leave', label: 'Leave', icon: Plane },
  { to: '/employee/resignation', label: 'Resignation', icon: FileSignature },
  { to: '/employee/profile', label: 'Profile', icon: UserCircle },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const doLogout = () => {
    logout();
    toast.info('Signed out successfully');
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to="/employee" onClick={() => setDrawer(false)}>
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setDrawer(false)}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-400">{user?.employeeData?.employeeId}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {user?.employeeData?.designation?.name || 'Team Member'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white dark:border-slate-700 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-lift dark:bg-slate-900">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-slate-400 sm:block">
              {user?.employeeData?.department?.name || 'Employee'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggle} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Toggle dark mode">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <NotificationBell />
            <div className="relative">
              <button onClick={() => setProfileOpen((o) => !o)} className="ml-1 flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Avatar user={user?.employeeData || user} size="sm" name={user?.name} />
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border bg-white shadow-lift dark:bg-slate-900">
                  <div className="border-b px-4 py-3 dark:border-slate-700">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                    <p className="truncate text-xs text-slate-400">{user?.employeeData?.employeeId || user?.email}</p>
                  </div>
                  <button onClick={() => { setProfileOpen(false); setPwOpen(true); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <KeyRound className="h-4 w-4" /> Change Password
                  </button>
                  <button onClick={doLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}