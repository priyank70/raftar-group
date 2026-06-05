'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

const notifIcons: Record<string, string> = {
  payment_submitted: '💳',
  payment_approved: '✅',
  payment_rejected: '❌',
  due_reminder: '📅',
  penalty_alert: '⚠️',
  investment_update: '💰',
  rule_change: '📋',
  announcement: '📢',
  delay_request: '⏰',
  vote_update: '🗳️',
  member_joined: '👋',
  member_removed: '👋',
};

export default function NotificationsPage() {
  const qClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.get(`/notifications?page=${page}&limit=20`).then((r) => r.data),
    refetchInterval: 30000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['notifications'] });
      qClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['notifications'] });
      qClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-muted mt-0.5">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="btn btn-sm bg-accent/10 text-accent hover:bg-accent hover:text-white border-0"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="card divide-y divide-gray-50">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48 rounded" />
                <div className="skeleton h-3 w-64 rounded" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">All caught up!</p>
            <p className="text-sm text-muted mt-1">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif: any, i: number) => (
            <motion.div
              key={notif._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors group ${
                !notif.isRead ? 'bg-accent/3' : ''
              }`}
              onClick={() => !notif.isRead && markReadMutation.mutate(notif._id)}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                !notif.isRead ? 'bg-accent/10' : 'bg-gray-100'
              }`}>
                {notifIcons[notif.type] || '🔔'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {notif.title}
                  </p>
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notif.createdAt)}</p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif._id); }}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-muted hover:bg-danger-bg hover:text-danger transition-all flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))
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
