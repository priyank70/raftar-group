'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { motion } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, refreshUser, user } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (!token && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    refreshUser();
  }, []);

  if (!mounted) {
    return null;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (!isAuthenticated && !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop & Mobile Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
        {/* Header */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        {user?.isDisabled && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 text-red-500 flex items-center gap-3 text-sm font-medium animate-pulse">
            <span className="text-base">🔒</span>
            <span><strong>Read-only Mode:</strong> This account has been disabled. You can view group records but cannot perform any actions, payments, or votes.</span>
          </div>
        )}

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden"
        >
          {children}
        </motion.main>
        {/* Mobile Bottom Navigation — visible on iOS and Android */}
        <MobileNav />
      </div>
    </div>
  );
}
