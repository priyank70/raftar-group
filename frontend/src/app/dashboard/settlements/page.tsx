'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogOut, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Pagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

export default function SettlementsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const qClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  
  // Propose form
  const [totalInvested, setTotalInvested] = useState('');
  const [groupProfitShare, setGroupProfitShare] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['settlements', page],
    queryFn: () => api.get(`/settlements?page=${page}&limit=10`).then((r) => r.data),
    refetchInterval: 15000,
  });

  const settlements = data?.data || [];
  const pagination = data?.pagination;

  const proposeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => api.put(`/settlements/${id}/propose`, payload),
    onSuccess: () => {
      toast.success('Settlement proposed successfully!');
      qClient.invalidateQueries({ queryKey: ['settlements'] });
      setSelectedRequest(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to propose'),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.put(`/settlements/${id}/accept`),
    onSuccess: () => {
      toast.success('Settlement accepted and finalized. You have now left the group.');
      qClient.invalidateQueries({ queryKey: ['settlements'] });
      // In a real app we might redirect or logout, but we just show disabled state.
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to accept'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-24 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-gradient-to-br from-indigo-900 to-indigo-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Leave Requests & Settlements</h2>
            <p className="text-sm text-indigo-200 mt-1">Manage members leaving the group and their final settlements.</p>
          </div>
          <LogOut className="w-8 h-8 text-indigo-300 opacity-80" />
        </div>
      </div>

      <div className="space-y-4">
        {settlements.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100">
            <LogOut className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">No requests</p>
            <p className="text-xs text-muted mt-1">There are no pending settlement requests.</p>
          </div>
        ) : (
          settlements.map((req: any, i: number) => {
            const isMyRequest = req.userId?._id === user?._id;
            
            return (
              <motion.div
                key={req._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                      {req.userId?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{req.userId?.name} wants to leave</p>
                      <p className="text-xs text-muted">Requested on {formatDate(req.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`badge ${
                    req.status === 'accepted_by_member' ? 'badge-success' :
                    req.status === 'proposed_by_admin' ? 'badge-warning' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {req.status === 'requested_by_member' && 'Pending Admin Review'}
                    {req.status === 'proposed_by_admin' && 'Awaiting Member Acceptance'}
                    {req.status === 'accepted_by_member' && 'Finalized'}
                  </span>
                </div>

                {req.status !== 'requested_by_member' && (
                  <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-100 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted font-semibold uppercase">Total Invested (Root)</p>
                        <p className="font-bold text-gray-900">{formatCurrency(req.totalInvested)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted font-semibold uppercase">Profit Share</p>
                        <p className="font-bold text-success">{formatCurrency(req.groupProfitShare)}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-muted font-semibold uppercase">Final Settlement Amount</p>
                      <p className="text-xl font-bold text-indigo-700">{formatCurrency(req.finalAmount)}</p>
                    </div>
                    {req.adminNote && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-muted font-semibold uppercase mb-1">Admin Note / Calculations</p>
                        <p className="text-gray-700 italic bg-white p-2 rounded border">{req.adminNote}</p>
                      </div>
                    )}
                    {req.acceptedAt && (
                      <p className="text-xs text-success font-semibold flex items-center gap-1 mt-2">
                        <CheckCircle className="w-4 h-4" /> Finalized on {formatDate(req.acceptedAt)}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {isAdmin && req.status === 'requested_by_member' && (
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="btn-primary btn-sm"
                    >
                      Propose Settlement
                    </button>
                  )}
                  {isMyRequest && req.status === 'proposed_by_admin' && (
                    <div className="w-full">
                      <div className="bg-amber-50 text-amber-800 p-3 rounded-xl mb-3 text-xs border border-amber-200 flex gap-2 items-start">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>Only click "Accept & Finalize" <strong>AFTER</strong> you have received the exact final settlement amount from the admin. This action is irreversible and will immediately disable your account.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`I confirm that I have received ${formatCurrency(req.finalAmount)} and wish to permanently leave the group.`)) {
                            acceptMutation.mutate(req._id);
                          }
                        }}
                        disabled={acceptMutation.isPending}
                        className="btn bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-200"
                      >
                        Accept Settlement & Finalize Leave
                      </button>
                    </div>
                  )}
                </div>

                {/* Admin Propose Modal inside loop for simplicity or separate */}
                {selectedRequest?._id === req._id && (
                  <div className="mt-4 p-4 border rounded-xl bg-white shadow-sm space-y-4 relative">
                    <button 
                      onClick={() => setSelectedRequest(null)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                    <h3 className="font-bold text-sm">Propose Settlement</h3>
                    <div>
                      <label className="text-xs font-semibold text-muted">Total Invested (Root)</label>
                      <input 
                        type="number" 
                        value={totalInvested} 
                        onChange={e => setTotalInvested(e.target.value)}
                        className="input mt-1" 
                        placeholder="e.g. 12000"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted">Profit Share</label>
                      <input 
                        type="number" 
                        value={groupProfitShare} 
                        onChange={e => setGroupProfitShare(e.target.value)}
                        className="input mt-1" 
                        placeholder="e.g. 1000"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted">Calculation Details / Note</label>
                      <textarea 
                        value={adminNote} 
                        onChange={e => setAdminNote(e.target.value)}
                        className="input mt-1 min-h-[80px]" 
                        placeholder="Show your calculations here..."
                      />
                    </div>
                    <button
                      onClick={() => proposeMutation.mutate({ 
                        id: req._id, 
                        payload: { totalInvested: Number(totalInvested), groupProfitShare: Number(groupProfitShare), adminNote }
                      })}
                      disabled={proposeMutation.isPending || !totalInvested || !groupProfitShare}
                      className="btn-primary w-full"
                    >
                      Send Proposal to Member
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
