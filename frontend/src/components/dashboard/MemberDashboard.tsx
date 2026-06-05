'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet, Clock, AlertCircle, TrendingUp, CreditCard, CheckCircle, ArrowRight, BarChart3, Database, PiggyBank, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export function MemberDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: () => api.get('/dashboard/member').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: statusData } = useQuery({
    queryKey: ['my-installment-status'],
    queryFn: () => api.get('/installments/my-status').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const nextDue = data?.nextDue;
  // Respect extendedDueDate (approved delay) — only that member's installment is affected
  const effectiveDueDate = nextDue?.extendedDueDate || nextDue?.dueDate;
  const hasApprovedDelay = !!nextDue?.extendedDueDate;
  const daysUntil = effectiveDueDate ? getDaysUntilDue(effectiveDueDate) : null;
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-900 to-primary-700 rounded-2xl p-5 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-accent/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-slate-400 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold mt-0.5">{user?.name?.split(' ')[0]} 👋</h2>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-slate-400 text-xs">Total Paid</p>
              <p className="text-xl font-bold text-accent-light">{formatCurrency(data?.totalPaid || 0)}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-slate-400 text-xs">Pending</p>
              <p className="text-xl font-bold text-warning">{data?.totalPending || 0} months</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Due date card */}
      {nextDue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`card p-5 border-l-4 ${
            isOverdue ? 'border-danger bg-danger-bg' :
            isDueSoon ? 'border-warning bg-warning-bg' :
            'border-accent bg-accent/5'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`w-4 h-4 ${isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-accent'}`} />
                <p className={`text-sm font-semibold ${isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-accent'}`}>
                  {isOverdue ? '⚠️ Payment Overdue!' : isDueSoon ? '⏰ Due Soon!' : '📅 Next Due Date'}
                </p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(nextDue.amount)}</p>
              <p className="text-sm text-muted mt-1">
                Due on {formatDate(effectiveDueDate!)} ·
                {isOverdue
                  ? ` ${Math.abs(daysUntil!)} days overdue`
                  : daysUntil === 0 ? ' Due today'
                  : ` ${daysUntil} days remaining`}
              </p>
              {hasApprovedDelay && (
                <p className="text-xs font-semibold text-accent mt-1">
                  ✅ Delay approved — original due was {formatDate(nextDue.dueDate)}
                </p>
              )}
              {statusData?.currentPenalty > 0 && (
                <p className="text-xs font-semibold text-danger mt-1">
                  + {formatCurrency(statusData.currentPenalty)} penalty accumulated
                </p>
              )}
            </div>
            <Link href="/dashboard/installments">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="btn-primary btn-sm"
              >
                Pay Now
              </motion.button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Group Stats Grid */}
      {data?.groupStats && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm px-1">Group Analytics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { icon: Database, label: 'Group Balance', value: formatCurrency(data.groupStats.groupBalance), color: 'bg-primary-900', textColor: 'text-primary-900' },
              { icon: Wallet, label: 'Total Collected', value: formatCurrency(data.groupStats.totalCollected), color: 'bg-accent', textColor: 'text-accent' },
              { icon: TrendingUp, label: 'Total Profit', value: formatCurrency(data.groupStats.totalProfit), color: 'bg-success', textColor: 'text-success' },
              { icon: BarChart3, label: 'This Month', value: formatCurrency(data.groupStats.currentMonthCollected), color: 'bg-blue-500', textColor: 'text-blue-600' },
              { icon: Target, label: 'Total Invested', value: formatCurrency(data.groupStats.totalInvested), color: 'bg-amber-500', textColor: 'text-amber-600' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="stat-card"
              >
                <div className={`w-10 h-10 rounded-2xl ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
                <p className="text-xs text-muted mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Stats grid */}
      <h3 className="font-semibold text-gray-900 text-sm px-1 mt-6">My Personal Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Wallet, label: 'Total Paid', value: formatCurrency(data?.totalPaid || 0), color: 'bg-accent', textColor: 'text-accent' },
          { icon: AlertCircle, label: 'Penalty', value: formatCurrency(statusData?.currentPenalty || 0), color: 'bg-danger', textColor: 'text-danger' },
          { icon: CreditCard, label: 'Pending Months', value: data?.totalPending ?? 0, color: 'bg-warning', textColor: 'text-warning' },
          { icon: TrendingUp, label: 'Installments Paid', value: data?.paidInstallmentsCount ?? 0, color: 'bg-success', textColor: 'text-success' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="stat-card"
          >
            <div className={`w-10 h-10 rounded-2xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
            <p className="text-xs text-muted mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent payments */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Payments</h3>
          <Link href="/dashboard/payments" className="text-xs font-semibold text-accent">View all →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {(data?.recentPayments || []).length === 0 ? (
            <div className="p-6 text-center">
              <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-muted">No payments yet</p>
              <Link href="/dashboard/installments" className="text-xs text-accent font-semibold mt-2 inline-block">
                Make your first payment →
              </Link>
            </div>
          ) : (
            (data?.recentPayments || []).map((payment: any, i: number) => (
              <div key={payment._id} className="flex items-center gap-3 p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  payment.status === 'approved' ? 'bg-success-bg' :
                  payment.status === 'rejected' ? 'bg-danger-bg' : 'bg-warning-bg'
                }`}>
                  <CreditCard className={`w-4 h-4 ${
                    payment.status === 'approved' ? 'text-success' :
                    payment.status === 'rejected' ? 'text-danger' : 'text-warning'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted">{formatDate(payment.submittedAt || payment.createdAt)}</p>
                </div>
                <span className={`badge ${
                  payment.status === 'approved' ? 'badge-success' :
                  payment.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {payment.status}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Group Rules */}
      {data?.group?.rules && data.group.rules.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Group Rules</h3>
          <ul className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            {data.group.rules.map((rule: string, i: number) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Quick action */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Link href="/dashboard/installments">
          <div className="btn-primary btn-lg w-full justify-between group">
            <span>Submit Payment</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
