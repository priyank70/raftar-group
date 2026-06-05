'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Calendar, Crown } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, getInitials } from '@/lib/utils';

const COLORS = ['#14B8A6', '#0F172A', '#F59E0B', '#EF4444', '#16A34A', '#2DD4BF'];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'paid':
      return {
        labelText: 'Paid',
        ringColor: 'border-emerald-400',
        textColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-500',
        icon: '✓',
      };
    case 'awaiting_approval':
      return {
        labelText: 'Awaiting Approval',
        ringColor: 'border-indigo-400',
        textColor: 'text-indigo-600',
        badgeBg: 'bg-indigo-500',
        icon: '⏳',
      };
    case 'delayed':
      return {
        labelText: 'Delay Approved',
        ringColor: 'border-purple-400',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-500',
        icon: '📅',
      };
    case 'overdue':
      return {
        labelText: 'Overdue',
        ringColor: 'border-red-400',
        textColor: 'text-red-600',
        badgeBg: 'bg-red-500',
        icon: '!',
      };
    case 'pending':
    default:
      return {
        labelText: 'Pending',
        ringColor: 'border-amber-300',
        textColor: 'text-amber-600',
        badgeBg: 'bg-amber-400',
        icon: '•',
      };
  }
};

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/dashboard/admin').then((r) => r.data.data),
  });

  const monthlyData = data?.monthlyData || [];
  const stats = data?.stats;
  const memberStatuses = data?.memberStatuses || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-64 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Collected', value: formatCurrency(stats?.totalCollected || 0), color: 'text-accent' },
          { label: 'Total Profit', value: formatCurrency(stats?.totalProfit || 0), color: 'text-indigo-600' },
          { label: 'This Month', value: formatCurrency(stats?.currentMonthCollected || 0), color: 'text-success' },
          { label: 'Total Invested', value: formatCurrency(stats?.totalInvested || 0), color: 'text-warning' },
          { label: 'Group Balance', value: formatCurrency(stats?.groupBalance || 0), color: 'text-primary-800' },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card p-4"
          >
            <p className="text-xs text-muted">{m.label}</p>
            <p className={`text-xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Monthly collection - Area */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-5"
      >
        <h3 className="section-title text-base mb-4">Monthly Collection Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${v / 1000}K`} />
            <Tooltip formatter={(val: any) => [formatCurrency(val), 'Collected']}
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
            <Area type="monotone" dataKey="amount" stroke="#14B8A6" strokeWidth={2.5}
              fill="url(#areaGrad)" dot={{ r: 5, fill: '#14B8A6', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-5"
      >
        <h3 className="section-title text-base mb-4">Collection vs Target</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData.map((m: any) => ({
            ...m,
            target: (stats?.totalMembers || 6) * (data?.group?.installmentAmount || 1000)
          }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${v / 1000}K`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
              formatter={(val: any, name: any) => [formatCurrency(val), name === 'amount' ? 'Collected' : 'Target']} />
            <Bar dataKey="target" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
            <Bar dataKey="amount" fill="#14B8A6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Live Installment Collection Board */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-5 overflow-hidden relative border border-gray-100 shadow-md bg-white"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="section-title text-base mb-1 font-bold text-gray-900">
              Live Installment Collection Board
            </h3>
            <p className="text-xs text-muted">
              Real-time payment tracking for this month
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-gray-700">
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Collection Stats & Progress Bar */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-3">
            <div>
              <p className="text-xs font-medium text-muted">Collection Rate</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {memberStatuses.length > 0 ? Math.round((memberStatuses.filter((m: any) => m.displayStatus === 'paid').length / memberStatuses.length) * 100) : 0}%
                </span>
                <span className="text-xs text-muted font-medium">
                  ({memberStatuses.filter((m: any) => m.displayStatus === 'paid').length} of {memberStatuses.length} paid)
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium text-muted">Amount Collected</p>
              <p className="text-lg font-bold text-accent mt-0.5">
                {formatCurrency(stats?.currentMonthCollected || 0)}
                <span className="text-xs text-muted font-normal block sm:inline sm:ml-1">
                  / {formatCurrency(memberStatuses.length * (data?.group?.installmentAmount || 1000))} expected
                </span>
              </p>
            </div>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${memberStatuses.length > 0 ? (memberStatuses.filter((m: any) => m.displayStatus === 'paid').length / memberStatuses.length) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-accent to-teal-400 rounded-full shadow-lg"
            />
          </div>

          {/* Mini Legend Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
            {[
              { label: 'Paid', count: memberStatuses.filter((m: any) => m.displayStatus === 'paid').length, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Awaiting', count: memberStatuses.filter((m: any) => m.displayStatus === 'awaiting_approval').length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Pending', count: memberStatuses.filter((m: any) => m.displayStatus === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Delayed', count: memberStatuses.filter((m: any) => m.displayStatus === 'delayed').length, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Overdue', count: memberStatuses.filter((m: any) => m.displayStatus === 'overdue').length, color: 'text-danger', bg: 'bg-danger-bg' },
            ].map((st) => (
              <div key={st.label} className={`p-2 rounded-xl ${st.bg} flex flex-col items-center justify-center`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  {st.label}
                </span>
                <span className={`text-sm font-extrabold mt-0.5 ${st.color}`}>
                  {st.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Member Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberStatuses.map((member: any) => {
            const statusStyle = getStatusConfig(member.displayStatus);
            return (
              <div
                key={member._id}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-200"
              >
                <div className="flex items-center gap-3 min-w-0 w-full">
                  {/* Status indicator ring around avatar */}
                  <div className={`relative p-0.5 rounded-full border-2 ${statusStyle.ringColor} transition-transform duration-300 group-hover:scale-105 flex-shrink-0`}>
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 text-gray-700 font-bold text-sm">
                      {member.avatar ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_SOCKET_URL || ''}${member.avatar}`}
                          className="w-full h-full object-cover"
                          alt={member.name}
                        />
                      ) : (
                        getInitials(member.name)
                      )}
                    </div>
                    {/* Corner badge for status icon */}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white shadow font-bold ${statusStyle.badgeBg}`}>
                      {statusStyle.icon}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-accent transition-colors duration-200">
                        {member.name}
                      </p>
                      {member.role === 'admin' && (
                        <Crown className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      )}
                    </div>
                    {/* Status Badge */}
                    <div className="flex flex-col mt-0.5">
                      <span className={`text-[10px] font-bold tracking-wide uppercase ${statusStyle.textColor}`}>
                        {statusStyle.labelText}
                      </span>
                      {/* Subtitle with extra context */}
                      {member.displayStatus === 'paid' && member.installment?.paidAt && (
                        <span className="text-[10px] text-muted mt-0.5">
                          Paid {new Date(member.installment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      {member.displayStatus === 'delayed' && member.installment?.extendedDueDate && (
                        <span className="text-[10px] text-purple-600 font-medium mt-0.5">
                          Delayed to {new Date(member.installment.extendedDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      {member.displayStatus === 'awaiting_approval' && member.pendingPayment && (
                        <span className="text-[10px] text-indigo-600 font-medium truncate mt-0.5" title={`Txn ID: ${member.pendingPayment.transactionId}`}>
                          ₹{member.pendingPayment.amount} pending approval
                        </span>
                      )}
                      {member.displayStatus === 'overdue' && (
                        <span className="text-[10px] text-danger font-medium mt-0.5">
                          Overdue by {member.installment ? Math.max(1, Math.ceil((new Date().getTime() - new Date(member.installment.extendedDueDate || member.installment.dueDate).getTime()) / (1000 * 60 * 60 * 24))) : 0} days
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Group Rules */}
      {data?.group?.rules && data.group.rules.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-5"
        >
          <h3 className="section-title text-base mb-4">Group Rules</h3>
          <ul className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            {data.group.rules.map((rule: string, i: number) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
