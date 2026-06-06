'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, ChevronRight, LogOut, User, Settings, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getInitials, formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/members': 'Members',
  '/dashboard/payments': 'Payments',
  '/dashboard/installments': 'Installments',
  '/dashboard/investments': 'Investments',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/reports': 'Reports',
  '/dashboard/settings': 'Settings',
  '/dashboard/activity': 'Activity',
  '/dashboard/delay-requests': 'Delay Requests',
  '/dashboard/promotion-requests': 'Promotion Requests',
  '/dashboard/disable-requests': 'Disable Requests',
  '/dashboard/settlements': 'Settlements',
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const pageTitle = routeNames[pathname] || 'Dashboard';

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications?limit=5').then((r) => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;
  const recentNotifs = notifData?.data?.slice(0, 5) || [];

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.replace('/login');
  };

  return (
    <header className="header-blur sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* Left: Hamburger menu & Page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600 flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900 lg:text-lg">{pageTitle}</h2>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted mt-0.5">
              <span>Raftar Group</span>
              <ChevronRight className="w-3 h-3" />
              <span>{pageTitle}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5 text-gray-600" style={{ width: 18, height: 18 }} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-danger rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ width: 18, height: 18 }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-card-hover border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="badge badge-accent">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {recentNotifs.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-muted">No notifications yet</p>
                      </div>
                    ) : (
                      recentNotifs.map((notif: any) => (
                        <div
                          key={notif._id}
                          className={`p-4 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-accent/3' : ''}`}
                        >
                          <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-muted mt-1">{formatRelativeTime(notif.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <Link
                      href="/dashboard/notifications"
                      className="block text-center text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
                      onClick={() => setShowNotifs(false)}
                    >
                      View all notifications →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="avatar avatar-sm">
                {user?.avatar ? (
                  <img src={`${process.env.NEXT_PUBLIC_SOCKET_URL || ''}${user.avatar}`} alt={user.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  getInitials(user?.name || 'U')
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-900 leading-none">{user?.name?.split(' ')[0]}</p>
                <p className="text-xs text-muted mt-0.5 capitalize">{user?.role}</p>
              </div>
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-card-hover border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-semibold text-sm text-gray-900">{user?.name}</p>
                    <p className="text-xs text-muted">{user?.email}</p>
                    <span className={`badge mt-1.5 ${user?.role === 'admin' ? 'badge-accent' : 'badge-gray'}`}>
                      {user?.role === 'admin' ? '⭐ Admin' : 'Member'}
                    </span>
                  </div>
                  <div className="p-2">
                    <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)}>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                        <Settings className="w-4 h-4 text-muted" />
                        <span className="text-sm text-gray-700">Settings</span>
                      </div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-danger-bg w-full transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4 text-danger" />
                      <span className="text-sm text-danger font-medium">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showNotifs || showUserMenu) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => { setShowNotifs(false); setShowUserMenu(false); }}
        />
      )}
    </header>
  );
}
