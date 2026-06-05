'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import api from '@/lib/api';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';

const actionColors: Record<string, string> = {
  PAYMENT_SUBMITTED: 'bg-warning-bg text-warning',
  PAYMENT_APPROVED: 'bg-success-bg text-success',
  PAYMENT_REJECTED: 'bg-danger-bg text-danger',
  INVESTMENT_CREATED: 'bg-accent/10 text-accent',
  VOTE_RECORDED: 'bg-blue-50 text-blue-600',
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['activity-log', page],
    queryFn: () => api.get(`/dashboard/activity-log?page=${page}&limit=20`).then((r) => r.data),
    refetchInterval: 30000,
  });

  const activities = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Activity Timeline</h2>
        <p className="text-xs text-muted mt-0.5">All actions in your mandal</p>
      </div>

      {isLoading ? (
        <div className="card divide-y divide-gray-50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <div className="skeleton w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="card p-10 text-center">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-muted text-sm">No activity recorded yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-9 top-0 bottom-0 w-px bg-gray-100" />

          <div className="space-y-1">
            {activities.map((activity: any, i: number) => (
              <motion.div
                key={activity._id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors relative"
              >
                {/* Avatar */}
                <div className="avatar avatar-sm flex-shrink-0 z-10 ring-2 ring-white">
                  {activity.userId?.avatar
                    ? <img src={activity.userId.avatar} className="w-full h-full object-cover rounded-full" alt="" />
                    : getInitials(activity.userId?.name || 'S')
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{activity.userId?.name}</p>
                    <span className={`badge text-xs ${actionColors[activity.action] || 'badge-gray'}`}>
                      {activity.action.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          
          {pagination && pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
