import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ScanFace,
  Building2,
  Plane,
  ClipboardList,
  BarChart3,
  Settings as SettingsIcon,
  MapPinned,
  PencilLine,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  SlidersHorizontal,
  Megaphone,
  Wallet,
  Clock,
} from 'lucide-react';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import NotificationBell from '../components/NotificationBell';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useNavigateSearch } from '../utils/navigation';
import api from '../services/api';
import { FullScreenLoader } from '../components/ui/Button';
import { usePolling } from '../hooks/useDebounce';
import clsx from 'clsx';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/employees', label: 'Employees', icon: Users },
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
    ],
  },
  {
    label: 'Attendance',
    items: [
      {
        label: 'Attendance',
        icon: CalendarDays,
        children: [
          { to: '/admin/attendance', label: 'Daily Attendance', icon: CalendarDays, end: true },
          { to: '/admin/attendance/manual', label: 'Manual Attendance', icon: PencilLine },
          { to: '/admin/attendance-settings', label: 'Attendance Settings', icon: MapPinned },
        ],
      },
      { to: '/admin/face-registration', label: 'Face Registration', icon: ScanFace },
      { to: '/admin/regularizations', label: 'Regularization', icon: Clock },
    ],
  },
  {
    label: 'Leave & Holidays',
    items: [
      { to: '/admin/leaves', label: 'Leave Requests', icon: Plane },
      { to: '/admin/leave-policies', label: 'Leave Policies', icon: SlidersHorizontal },
      { to: '/admin/holidays', label: 'Holiday Calendar', icon: CalendarCheck },
    ],
  },
  {
    label: 'Payroll',
    items: [{ to: '/admin/payroll', label: 'Payroll & Payslips', icon: Wallet }],
  },
  {
    label: 'Communication',
    items: [
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/admin/resignations', label: 'Resignation Requests', icon: ClipboardList },
    ],
  },
  {
    label: 'Reports & Settings',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const navigateSearch = useNavigateSearch();
  const [drawer, setDrawer] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState({});
  const pendingResignations = usePolling(async () => {
    const { data } = await api.get('/resignations?page=1&pageSize=1&status=Pending');
    return data.meta?.total || 0;
  }, { interval: 120000 });

  const isChildActive = (item) =>
    item.children?.some((c) => (c.end ? location.pathname === c.to : location.pathname.startsWith(c.to)));

  useEffect(() => {
    NAV_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children && isChildActive(item)) {
          setOpenGroups((prev) => (prev[item.label] ? prev : { ...prev, [item.label]: true }));
        }
      });
    });
  }, [location.pathname]);

  const onSearch = (e) => {
    e.preventDefault();
    navigateSearch('/admin/employees', query.trim());
  };

  const doLogout = () => {
    logout();
    toast.info('Signed out successfully');
    navigate('/login');
  };

  const sidebar = (
      <div className={clsx('flex h-full flex-col', desktopSidebarCollapsed && !drawer && 'items-center')}>
        <div className="flex h-16 items-center justify-between px-5">
        {(!desktopSidebarCollapsed || drawer) && <Link to="/admin" onClick={() => setDrawer(false)}><Logo /></Link>}
        <button
          onClick={() => desktopSidebarCollapsed ? setDesktopSidebarCollapsed(false) : setDesktopSidebarCollapsed(true)}
          className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:inline-flex"
          aria-label={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {desktopSidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className={clsx('flex-1 space-y-4 overflow-y-auto py-4', desktopSidebarCollapsed && !drawer ? 'px-2' : 'px-3')}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {(!desktopSidebarCollapsed || drawer) && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) =>
                item.children ? (
                  <div key={item.label}>
                    {desktopSidebarCollapsed && !drawer ? (
                      <NavLink
                        to={item.children[0].to}
                        title={item.label}
                        onClick={() => setDrawer(false)}
                        className={clsx(
                          'group flex justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition',
                          isChildActive(item)
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                      </NavLink>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenGroups((o) => ({ ...o, [item.label]: !o[item.label] }))}
                        aria-expanded={!!openGroups[item.label]}
                        className={clsx(
                          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                          isChildActive(item)
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="min-w-0 flex-1">{item.label}</span>
                        <ChevronRight className={clsx('h-4 w-4 transition-transform', openGroups[item.label] && 'rotate-90')} />
                      </button>
                    )}
                    {openGroups[item.label] && (!desktopSidebarCollapsed || drawer) && (
                      <div className="ml-4 mt-1 space-y-1 border-l pl-3 dark:border-slate-700">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            end={child.end}
                            onClick={() => setDrawer(false)}
                            className={({ isActive }) =>
                              clsx(
                                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                                isActive
                                  ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                              )
                            }
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setDrawer(false)}
                    title={desktopSidebarCollapsed && !drawer ? item.label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center rounded-xl py-2.5 text-sm font-medium transition',
                        desktopSidebarCollapsed && !drawer ? 'justify-center px-2' : 'gap-3 px-3',
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      )
                    }
                  >
                    <span className="relative flex shrink-0">
                      <item.icon className="h-5 w-5" />
                      {item.to === '/admin/resignations' && pendingResignations.data > 0 && desktopSidebarCollapsed && !drawer && (
                        <span className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 dark:border-slate-900" />
                      )}
                    </span>
                    {(!desktopSidebarCollapsed || drawer) && (
                      <>
                        <span className="min-w-0 flex-1">{item.label}</span>
                        {item.to === '/admin/resignations' && pendingResignations.data > 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold leading-none text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                            {pendingResignations.data > 99 ? '99+' : pendingResignations.data}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              )}
            </div>
          </div>
        ))}
      </nav>
      {(!desktopSidebarCollapsed || drawer) && <div className="border-t p-4 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-400">FaceHR Admin</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
          Smart HR Management with Face-Based Attendance
        </p>
      </div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      {/* Desktop sidebar */}
      {desktopSidebarOpen && (
        <aside className={clsx('fixed inset-y-0 left-0 z-30 hidden border-r bg-white dark:border-slate-700 dark:bg-slate-900 lg:block', desktopSidebarCollapsed ? 'w-16' : 'w-64')}>
          {sidebar}
        </aside>
      )}

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-lift animate-slide-up dark:bg-slate-900">
            <button
              onClick={() => setDrawer(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={desktopSidebarOpen ? (desktopSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64') : ''}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {!desktopSidebarOpen && (
            <button
              onClick={() => setDesktopSidebarOpen(true)}
              className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:inline-flex"
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <form onSubmit={onSearch} className="relative hidden flex-1 md:block md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees by name, ID, email…"
              className="input pl-9"
            />
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <NotificationBell admin />

            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="ml-1 flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Avatar user={user} size="sm" />
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border bg-white shadow-lift dark:bg-slate-900">
                  <div className="border-b px-4 py-3 dark:border-slate-700">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
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
          <Suspense fallback={<FullScreenLoader label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
