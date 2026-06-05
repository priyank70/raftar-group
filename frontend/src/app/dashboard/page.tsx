'use client';

import { useAuthStore } from '@/store/authStore';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { MemberDashboard } from '@/components/dashboard/MemberDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return user.role === 'admin' ? <AdminDashboard /> : <MemberDashboard />;
}
