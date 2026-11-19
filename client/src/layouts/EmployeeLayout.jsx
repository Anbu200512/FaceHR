import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
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
  ChevronLeft,
  Clock,
  Wallet,
  Megaphone,
  CalendarCheck,
  CalendarDays,
} from 'lucide-react';
import api from '../services/api';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import NotificationBell from '../components/NotificationBell';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { FullScreenLoader } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { usePolling } from '../hooks/useDebounce';
import clsx from 'clsx';

const NAV = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employee/history', label: 'My Attendance', icon: History },
  { to: '/employee/regularization', label: 'Regularization', icon: Clock },
  { to: '/employee/leave', label: 'Leave', icon: Plane },
  { to: '/employee/payslips', label: 'Payslips', icon: Wallet, internHidden: true },
  { to: '/employee/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/employee/holidays', label: 'Holidays', icon: CalendarCheck },
  { to: '/employee/weekoff', label: 'Week Off', icon: CalendarDays },
  { to: '/employee/resignation', label: 'Resignation', icon: FileSignature },
  { to: '/employee/profile', label: 'Profile', icon: UserCircle },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const isIntern = user?.employeeData?.employmentType === 'Intern' || user?.employeeData?.category === 'Intern';

  const pendingCounts = usePolling(async () => {
    const [leaves, regs, resigs] = await Promise.all([
      api.get('/leaves/mine'),
      api.get('/regularizations/mine'),
      api.get('/resignations/mine'),
    ]);
    const countPending = (arr) => (Array.isArray(arr) ? arr.filter((x) => x.status === 'Pending').length : 0);
    return {
      '/employee/leave': countPending(leaves.data?.data),
      '/employee/regularization': countPending(regs.data?.data),
      '/employee/resignation': countPending(resigs.data?.data),
    };
  }, { interval: 120000 });

  const doLogout = () => {
    logout();
    toast.info('Signed out successfully');
    navigate('/login');
  };

  const sidebar = (
    <div className={clsx('flex h-full flex-col', desktopSidebarCollapsed && !drawer && 'items-center')}>
      <div className="flex h-16 items-center justify-between px-5">
        {(!desktopSidebarCollapsed || drawer) && <Link to="/employee" onClick={() => setDrawer(false)}>
          <Logo />
        </Link>}
        <button
          onClick={() => setDesktopSidebarCollapsed((collapsed) => !collapsed)}
          className="hidden rounded-lg p-1.5 text-slate-400 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:inline-flex"
          aria-label={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {desktopSidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className={clsx('flex-1 space-y-1 overflow-y-auto py-4', desktopSidebarCollapsed && !drawer ? 'px-2' : 'px-3')}>
        {NAV.filter((item) => !(item.internHidden && isIntern)).map((item) => {
          const pending = pendingCounts.data?.[item.to] || 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawer(false)}
              title={desktopSidebarCollapsed && !drawer ? item.label : undefined}
              className={({ isActive }) =>
                clsx(
                  clsx('group flex items-center rounded-xl py-2.5 text-sm font-medium transition', desktopSidebarCollapsed && !drawer ? 'justify-center px-2' : 'gap-3 px-3'),
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )
              }
            >
              <span className="relative flex shrink-0">
                <item.icon className="h-5 w-5" />
                {pending > 0 && desktopSidebarCollapsed && !drawer && (
                  <span className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 dark:border-slate-900" />
                )}
              </span>
              {(!desktopSidebarCollapsed || drawer) && (
                <>
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {pending > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold leading-none text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                      {pending > 99 ? '99+' : pending}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      {(!desktopSidebarCollapsed || drawer) && <div className="border-t p-4 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">{user?.employeeData?.employeeId}</p>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-300">
          {user?.employeeData?.designation?.name || 'Team Member'}
        </p>
      </div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <aside className={clsx('fixed inset-y-0 left-0 z-30 hidden border-r bg-white dark:border-slate-700 dark:bg-slate-900 lg:block', desktopSidebarCollapsed ? 'w-16' : 'w-64')}>
        {sidebar}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-lift dark:bg-slate-900">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className={desktopSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-xl p-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-slate-400 dark:text-slate-300 sm:block">
              {user?.employeeData?.department?.name || 'Employee'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggle} className="rounded-xl p-2.5 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle dark mode">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <NotificationBell />
            <div className="relative">
              <button onClick={() => setProfileOpen((o) => !o)} className="ml-1 flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Avatar user={user?.employeeData || user} size="sm" name={user?.name} />
                <ChevronDown className="hidden h-4 w-4 text-slate-400 dark:text-slate-300 sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-white shadow-lift dark:bg-slate-900">
                  <div className="flex items-center gap-3 border-b px-4 py-3 dark:border-slate-700">
                    <Avatar user={user?.employeeData || user} size="lg" name={user?.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-300">{user?.employeeData?.employeeId || user?.email}</p>
                    </div>
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

        <main className="mx-auto w-full min-w-0 max-w-7xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Suspense fallback={<FullScreenLoader label="Loading page..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
