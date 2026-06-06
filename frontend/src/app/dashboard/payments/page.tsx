'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle, XCircle, Eye, Filter, Clock, Search } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatRelativeTime, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Pagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

function PaymentDetailModal({ payment, onClose, isAdmin }: any) {
  const qClient = useQueryClient();
  const [adminNote, setAdminNote] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => api.put(`/payments/${payment._id}/approve`, { adminNote }),
    onSuccess: () => {
      toast.success('Payment approved! ✅');
      qClient.invalidateQueries({ queryKey: ['payments'] });
      qClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      onClose();
    },
    onError: () => toast.error('Failed to approve payment'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.put(`/payments/${payment._id}/reject`, { adminNote }),
    onSuccess: () => {
      toast.success('Payment rejected');
      qClient.invalidateQueries({ queryKey: ['payments'] });
      onClose();
    },
    onError: () => toast.error('Failed to reject payment'),
  });

  return (
    <AnimatePresence>
      {payment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Payment Details</h2>
              <p className="text-xs text-muted mt-0.5">{formatDate(payment.submittedAt || payment.createdAt)}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Member info */}
              {payment.userId && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="avatar avatar-sm">{getInitials(payment.userId.name)}</div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{payment.userId.name}</p>
                    <p className="text-xs text-muted">{payment.userId.email}</p>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="flex items-center justify-between p-4 bg-accent/5 rounded-xl">
                <div>
                  <p className="text-xs text-muted">Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                  {payment.penaltyIncluded > 0 && (
                    <p className="text-xs text-danger font-medium mt-1">incl. ₹{payment.penaltyIncluded} penalty</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Coverage</p>
                  <p className="font-semibold text-accent">{payment.coverageMonths} month{payment.coverageMonths !== 1 ? 's' : ''}</p>
                  {payment.remainingBalance > 0 && (
                    <p className="text-xs text-muted">+{formatCurrency(payment.remainingBalance)} remaining</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {payment.isCashPayment && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted">Payment Method</span>
                    <span className="badge bg-amber-50 text-amber-700 border border-amber-200">💵 Cash Payment</span>
                  </div>
                )}
                {payment.transactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">{payment.isCashPayment ? 'Reference ID' : 'Transaction ID'}</span>
                    <span className="font-mono text-gray-900 font-medium">{payment.transactionId}</span>
                  </div>
                )}
                {payment.transactionNote && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Note</span>
                    <span className="text-gray-900">{payment.transactionNote}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Status</span>
                  <span className={`badge ${
                    payment.status === 'approved' ? 'badge-success' :
                    payment.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                  }`}>{payment.status}</span>
                </div>
              </div>

              {/* Admin actions */}
              {isAdmin && payment.status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="input resize-none text-sm"
                    rows={2}
                    placeholder="Admin note (optional)..."
                  />
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => rejectMutation.mutate()}
                      disabled={rejectMutation.isPending}
                      className="btn btn-md flex-1 bg-danger-bg text-danger hover:bg-red-100 border border-danger/20"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                      className="btn-primary btn-md flex-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {approveMutation.isPending ? 'Approving...' : 'Approve'}
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Admin note if already reviewed */}
              {payment.adminNote && payment.status !== 'pending' && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-muted">Admin note</p>
                  <p className="text-sm text-gray-700 mt-1">{payment.adminNote}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', statusFilter, search, page],
    queryFn: () => api.get(`/payments?status=${statusFilter}&search=${search}&page=${page}&limit=10`).then((r) => r.data),
    refetchInterval: 30000,
  });

  const payments = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      {/* Stats row for admin */}
      {isAdmin && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', count: payments.length, color: 'text-gray-900' },
            { label: 'Pending', count: payments.filter((p: any) => p.status === 'pending').length, color: 'text-warning' },
            { label: 'Approved', count: payments.filter((p: any) => p.status === 'approved').length, color: 'text-success' },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        {isAdmin && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input !pl-11 text-sm py-2.5"
            />
          </div>
        )}
        <div className="flex gap-2">
          {['', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                statusFilter === status
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-accent'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments list */}
      <div className="card">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-muted text-sm">No payments found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map((payment: any, i: number) => (
              <motion.div
                key={payment._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedPayment(payment)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  payment.status === 'approved' ? 'bg-success-bg' :
                  payment.status === 'rejected' ? 'bg-danger-bg' : 'bg-warning-bg'
                }`}>
                  {payment.status === 'approved'
                    ? <CheckCircle className="w-5 h-5 text-success" />
                    : payment.status === 'rejected'
                    ? <XCircle className="w-5 h-5 text-danger" />
                    : <Clock className="w-5 h-5 text-warning" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {isAdmin && payment.userId && (
                    <p className="font-semibold text-gray-900 text-sm truncate">{payment.userId.name}</p>
                  )}
                  <p className="text-xs text-muted">{formatRelativeTime(payment.submittedAt || payment.createdAt)}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {payment.isCashPayment && (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">💵 Cash</span>
                    )}
                    {payment.coverageMonths > 0 && (
                      <p className="text-xs text-accent">{payment.coverageMonths} month coverage</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                  <span className={`badge ${
                    payment.status === 'approved' ? 'badge-success' :
                    payment.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                  }`}>{payment.status}</span>
                </div>
                <Eye className="w-4 h-4 text-muted ml-1 flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}

      {/* Detail modal */}
      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
