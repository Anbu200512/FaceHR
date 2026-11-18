import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function NotificationBell({ admin }) {
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const to = admin ? '/admin/notifications' : '/employee/notifications';

  const load = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const { data } = await api.get('/notifications/summary?limit=1');
      setUnread(Number(data?.data?.unread || 0));
    } catch (_e) {
      /* silent */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 120000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <button
      onClick={() => navigate(to)}
      className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="Notifications"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
