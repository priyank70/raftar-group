'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { UserX, CheckCircle, XCircle, AlertCircle, Users, MessageSquare } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Pagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

export default function DisableRequestsPage() {
  const { user } = useAuthStore();
  const qClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['disable-requests', page],
    queryFn: () => api.get(`/users/disable-requests?page=${page}&limit=10`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const requests = data?.data || [];
  const pagination = data?.pagination;

  const voteMutation = useMutation({
    mutationFn: ({ id, vote, comment }: { id: string; vote: 'approve' | 'reject'; comment?: string }) =>
      api.put(`/users/disable-requests/${id}/vote`, { vote, comment }),
    onSuccess: () => {
      toast.success('Vote recorded! 🗳️');
      qClient.invalidateQueries({ queryKey: ['disable-requests'] });
      qClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record vote');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card p-5 bg-gradient-to-br from-red-950 to-red-800 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Disable Requests</h2>
            <p className="text-sm text-red-200 mt-1">
              Review and vote on proposals to disable members. Disabling a member requires <strong>unanimous approval</strong> from all active group members.
            </p>
          </div>
          <UserX className="w-8 h-8 text-red-300 opacity-80" />
        </div>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">No requests</p>
            <p className="text-xs text-muted mt-1">There are no pending disable member requests.</p>
          </div>
        ) : (
          requests.map((req: any, i: number) => {
            const myVote = req.votes.find((v: any) => v.userId?._id === user?._id || v.userId === user?._id);
            const approveCount = req.votes.filter((v: any) => v.vote === 'approve').length;
            const rejectCount = req.votes.filter((v: any) => v.vote === 'reject').length;
            const isTarget = req.targetUserId?._id === user?._id;

            return (
              <motion.div
                key={req._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5 border border-red-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center font-bold text-red-700">
                      {req.targetUserId?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Disable: {req.targetUserId?.name}</p>
                      <p className="text-xs text-muted">
                        Proposed by {req.requestedBy?.name} · {formatDate(req.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${
                    req.status === 'approved' ? 'badge-success' :
                    req.status === 'rejected' ? 'badge-danger' : 'badge-warning bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {req.status === 'pending' ? 'Pending Approval' : req.status}
                  </span>
                </div>

                <div className="bg-red-50/50 rounded-xl p-4 mb-4 text-sm border border-red-50/40 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-red-900/60 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Solid Reason from Admin
                    </p>
                    <p className="text-gray-800 font-medium bg-white p-3 rounded-lg border border-red-100/50 italic">
                      "{req.reason}"
                    </p>
                  </div>

                  <div className="border-t border-red-100/30 pt-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      Votes Detail ({approveCount} Approved, {rejectCount} Rejected):
                    </p>
                    {req.votes.length === 0 ? (
                      <p className="text-xs text-muted italic">No votes cast yet.</p>
                    ) : (
                      <div className="space-y-1.5 mt-2">
                        {req.votes.map((v: any, index: number) => (
                          <div key={index} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-xs">
                            <span className="font-medium text-gray-800">{v.userId?.name || 'User'}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded font-bold ${v.vote === 'approve' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                                {v.vote === 'approve' ? 'Approved' : 'Rejected'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> {approveCount} Approve
                    </span>
                    <span className="text-danger flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> {rejectCount} Reject
                    </span>
                  </div>

                  {req.status === 'pending' && !isTarget && !user?.isDisabled && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => voteMutation.mutate({ id: req._id, vote: 'reject', comment: 'Rejected by member' })}
                        disabled={voteMutation.isPending || myVote?.vote === 'reject'}
                        className={`btn-sm transition-all ${myVote?.vote === 'reject' ? 'bg-danger text-white' : 'btn-outline border-danger text-danger hover:bg-danger hover:text-white'}`}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => voteMutation.mutate({ id: req._id, vote: 'approve', comment: 'Approved by member' })}
                        disabled={voteMutation.isPending || myVote?.vote === 'approve'}
                        className={`btn-sm transition-all ${myVote?.vote === 'approve' ? 'bg-success text-white' : 'btn-outline border-success text-success hover:bg-success hover:text-white'}`}
                      >
                        Approve
                      </button>
                    </div>
                  )}

                  {req.status === 'pending' && isTarget && (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> You cannot vote on your own disable request
                    </span>
                  )}

                  {req.status === 'pending' && user?.isDisabled && (
                    <span className="text-xs font-semibold text-muted bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      🔒 Read-only account cannot vote
                    </span>
                  )}
                </div>
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
