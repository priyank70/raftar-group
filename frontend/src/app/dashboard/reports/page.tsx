'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Download } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { data: paymentsData } = useQuery({
    queryKey: ['all-payments-report'],
    queryFn: () => api.get('/payments?status=approved&limit=100').then((r) => r.data.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-report'],
    queryFn: () => api.get('/users').then((r) => r.data.data),
  });

  const payments = paymentsData || [];
  const users = usersData || [];

  const totalCollected = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const avgPerMember = users.length > 0 ? totalCollected / users.length : 0;

  const exportCSV = () => {
    const rows = [
      ['Member', 'Amount', 'Type', 'Status', 'Date'],
      ...payments.map((p: any) => [
        p.userId?.name || 'Unknown',
        p.amount,
        p.paymentType,
        p.status,
        formatDate(p.submittedAt || p.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raftar-group-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Report exported!');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Reports</h2>
          <p className="text-xs text-muted mt-0.5">Financial summary & exports</p>
        </div>
        <button onClick={exportCSV} className="btn-primary btn-md">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Collected', value: formatCurrency(totalCollected), color: 'text-accent' },
          { label: 'Avg Per Member', value: formatCurrency(avgPerMember), color: 'text-success' },
          { label: 'Total Payments', value: payments.length, color: 'text-gray-900' },
          { label: 'Active Members', value: users.length, color: 'text-primary-800' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card p-4"
          >
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Member-wise summary */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Member Collection Summary</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {users.map((user: any, i: number) => {
            const userPayments = payments.filter((p: any) =>
              p.userId?._id === user._id || p.userId === user._id
            );
            const userTotal = userPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
            return (
              <motion.div
                key={user._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-4"
              >
                <div className="avatar avatar-sm">{user.name?.charAt(0) || 'U'}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{user.name}</p>
                  <p className="text-xs text-muted">{userPayments.length} payment{userPayments.length !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm">{formatCurrency(userTotal)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Payment log table */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">All Approved Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 20).map((p: any) => (
                <tr key={p._id}>
                  <td className="font-medium">{p.userId?.name || 'Unknown'}</td>
                  <td className="font-bold text-accent">{formatCurrency(p.amount)}</td>
                  <td><span className="badge badge-gray">{p.paymentType}</span></td>
                  <td className="text-muted">{formatDate(p.submittedAt || p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
