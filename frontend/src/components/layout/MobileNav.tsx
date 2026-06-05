'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, CreditCard, TrendingUp, Bell, Users, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const memberNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home', exact: true },
  { href: '/dashboard/installments', icon: Wallet, label: 'Pay' },
  { href: '/dashboard/investments', icon: TrendingUp, label: 'Invest' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Alerts' },
];

const adminNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home', exact: true },
  { href: '/dashboard/members', icon: Users, label: 'Members' },
  { href: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
  { href: '/dashboard/investments', icon: TrendingUp, label: 'Invest' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Alerts' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const navItems = user?.role === 'admin' ? adminNav : memberNav;

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-4">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <motion.div
                className="flex flex-col items-center gap-1 py-1"
                whileTap={{ scale: 0.85 }}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-accent text-white shadow-glow'
                      : 'text-muted hover:text-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    active ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
