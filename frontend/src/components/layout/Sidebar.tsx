'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, CreditCard, TrendingUp,
  Bell, Settings, LogOut, ChevronRight, BarChart3,
  FileText, Clock, Wallet, Shield, Calendar, X, UserX
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useScrollLock } from '@/hooks/useScrollLock';

const memberNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/members', icon: Users, label: 'Members' },
  { href: '/dashboard/installments', icon: Wallet, label: 'Installments' },
  { href: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
  { href: '/dashboard/investments', icon: TrendingUp, label: 'Investments' },
  { href: '/dashboard/delay-requests', icon: Calendar, label: 'Delay Requests' },
  { href: '/dashboard/promotion-requests', icon: Shield, label: 'Promotions' },
  { href: '/dashboard/disable-requests', icon: UserX, label: 'Disable Requests' },
  { href: '/dashboard/settlements', icon: LogOut, label: 'Settlements' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { href: '/dashboard/activity', icon: Clock, label: 'Activity' },
];

const adminNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/members', icon: Users, label: 'Members' },
  { href: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
  { href: '/dashboard/installments', icon: Wallet, label: 'Installments' },
  { href: '/dashboard/investments', icon: TrendingUp, label: 'Investments' },
  { href: '/dashboard/delay-requests', icon: Calendar, label: 'Delay Requests' },
  { href: '/dashboard/promotion-requests', icon: Shield, label: 'Promotions' },
  { href: '/dashboard/disable-requests', icon: UserX, label: 'Disable Requests' },
  { href: '/dashboard/settlements', icon: LogOut, label: 'Settlements' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { href: '/dashboard/reports', icon: FileText, label: 'Reports' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, group, logout } = useAuthStore();
  const router = useRouter();

  const navItems = user?.role === 'admin' ? adminNavItems : memberNavItems;

  // Lock body scroll when mobile sidebar is open
  useScrollLock(isOpen);

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.replace('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <div className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col z-40 shadow-sm transition-transform duration-300 lg:z-30 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">R</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{group?.name || 'Raftar Group'}</p>
            <p className="text-xs text-muted truncate">Digital Mandal System</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="avatar avatar-sm flex-shrink-0">
            {user?.avatar ? (
              <img src={`${process.env.NEXT_PUBLIC_SOCKET_URL || ''}${user.avatar}`} alt={user.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              getInitials(user?.name || 'U')
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{user?.name}</p>
            <span className={`badge text-xs ${user?.role === 'admin' ? 'badge-accent' : 'badge-gray'}`}>
              {user?.role === 'admin' ? '⭐ Admin' : 'Member'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar space-y-0.5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider px-3 mb-2 mt-1">
          {user?.role === 'admin' ? 'Management' : 'My Account'}
        </p>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={onClose}>
            <motion.div
              className={`nav-item ${isActive(item) ? 'nav-item-active' : ''}`}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive(item) && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </motion.div>
          </Link>
        ))}
      </nav>

      {/* Bottom actions — safe area aware */}
      <div className="p-3 border-t border-gray-100 space-y-1 has-safe-area-bottom">
        <Link href="/dashboard/settings" onClick={onClose}>
          <div className="nav-item">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
        </Link>
        <button
          onClick={() => {
            onClose?.();
            handleLogout();
          }}
          className="nav-item w-full text-left text-danger hover:bg-danger-bg hover:text-danger"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
    </>
  );
}
