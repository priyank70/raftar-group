'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, getMonthName } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Pagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

export default function DelayRequestsPage() {
  const { user } = useAuthStore();
  const qClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['delay-requests', page],
    queryFn: () => api.get(`/delay-requests?page=${page}&limit=10`).then((r) => r.data),
    refetchInterval: 30000,
  });

  const requests = data?.data || [];
  const pagination = data?.pagination;

  const voteMutation = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: 'approve' | 'reject' }) =>
      api.put(`/delay-requests/${id}/vote`, { vote }),
    onSuccess: () => {
      toast.success('Vote recorded!');
      qClient.invalidateQueries({ queryKey: ['delay-requests'] });
    },
    onError: () => toast.error('Failed to record vote'),
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
      <div className="card p-5 bg-gradient-to-br from-primary-900 to-primary-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Delay Requests</h2>
            <p className="text-sm text-primary-200 mt-1">Review and vote on member installment delays</p>
          </div>
          <Clock className="w-8 h-8 text-accent-light opacity-80" />
        </div>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">No requests</p>
            <p className="text-xs text-muted mt-1">There are no pending delay requests.</p>
          </div>
        ) : (
          requests.map((req: any, i: number) => {
            const myVote = req.votes.find((v: any) => v.userId?._id === user?._id || v.userId === user?._id);
            const approveCount = req.votes.filter((v: any) => v.vote === 'approve').length;
            const rejectCount = req.votes.filter((v: any) => v.vote === 'reject').length;

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
                    <div className="w-10 h-10 rounded-full bg-primary-900/10 flex items-center justify-center font-bold text-primary-900">
                      {req.userId?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{req.userId?.name}</p>
                      <p className="text-xs text-muted">
                        Installment: {getMonthName(req.installmentId?.month, req.installmentId?.year)}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${
                    req.status === 'approved' ? 'badge-success' :
                    req.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between">
                    <p className="text-muted">Original Due Date:</p>
                    <p className="font-semibold">{formatDate(req.originalDueDate)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted">Requested Date:</p>
                    <p className="font-semibold text-accent">{formatDate(req.requestedDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Reason:</p>
                    <p className="font-medium text-gray-900">{req.reason}</p>
                  </div>
                  {req.notes && (
                    <div>
                      <p className="text-muted mb-1">Notes:</p>
                      <p className="text-gray-700 text-xs">{req.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> {approveCount}
                    </span>
                    <span className="text-danger flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> {rejectCount}
                    </span>
                  </div>

                  {req.status === 'pending' && req.userId?._id !== user?._id && (
                    user?.isDisabled ? (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                        🔒 Disabled
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => voteMutation.mutate({ id: req._id, vote: 'reject' })}
                          disabled={voteMutation.isPending || myVote?.vote === 'reject'}
                          className={`btn-sm ${myVote?.vote === 'reject' ? 'bg-danger text-white' : 'btn-outline border-danger text-danger'}`}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => voteMutation.mutate({ id: req._id, vote: 'approve' })}
                          disabled={voteMutation.isPending || myVote?.vote === 'approve'}
                          className={`btn-sm ${myVote?.vote === 'approve' ? 'bg-success text-white' : 'btn-outline border-success text-success'}`}
                        >
                          Approve
                        </button>
                      </div>
                    )
                  )}

                  {req.status === 'pending' && req.userId?._id === user?._id && (
                    <span className="text-xs font-semibold text-muted bg-gray-100 px-2 py-1 rounded-md">
                      Awaiting votes...
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
