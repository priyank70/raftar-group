'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, Shield, Phone, Mail, X, Crown, UserMinus, Trophy, Award, Coins } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, getInitials, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

function AddMemberModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const qClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'member',
    joinedAt: new Date().toISOString().split('T')[0]
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      toast.success('Member added successfully! 🎉');
      qClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
      setForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'member',
        joinedAt: new Date().toISOString().split('T')[0]
      });
    },
    onError: (err: any) => {
      console.error("Error adding member:", err);
      const msg = err?.response?.data?.message || err.message || 'Failed to add member';
      toast.error(msg);
    },
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add New Member</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Enter full name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="email@example.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="9876543210" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="Min 6 characters" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Joined Date</label>
                  <input className="input" type="date" value={form.joinedAt}
                    onChange={(e) => setForm({ ...form, joinedAt: e.target.value })} />
                </div>
              </div>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.name || !form.email || !form.phone || !form.password}
                className="btn-primary btn-lg w-full"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ProposeDisableModal({ isOpen, onClose, member }: { isOpen: boolean; onClose: () => void; member: any }) {
  const qClient = useQueryClient();
  const [reason, setReason] = useState('');

  const disableMutation = useMutation({
    mutationFn: (data: { reason: string }) => api.put(`/users/${member?._id}/disable`, data),
    onSuccess: () => {
      toast.success('Disable request submitted to members for voting! 🗳️');
      qClient.invalidateQueries({ queryKey: ['users'] });
      qClient.invalidateQueries({ queryKey: ['disable-requests'] });
      onClose();
      setReason('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to submit disable request'),
  });

  return (
    <AnimatePresence>
      {isOpen && member && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Propose to Disable Member</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-bold">⚠️ Voting Workflow Required</p>
                <p>Disabling {member.name} will require unanimous approval (yes votes) from all other active members. Once approved, the member will have read-only access and cannot make payments or vote.</p>
              </div>

              <div>
                <label className="label">Target Member</label>
                <p className="font-semibold text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-xl">
                  {member.name} ({member.email})
                </p>
              </div>

              <div>
                <label className="label">Solid Reason for Disabling</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder="Provide a detailed and solid reason why this member should be disabled..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <button
                onClick={() => disableMutation.mutate({ reason })}
                disabled={disableMutation.isPending || !reason.trim()}
                className="btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500 text-white btn-lg w-full"
              >
                {disableMutation.isPending ? 'Submitting...' : 'Submit Propose Disable'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import { Pagination } from '@/components/ui/Pagination';

export default function MembersPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDisableMember, setSelectedDisableMember] = useState<any>(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qClient = useQueryClient();

  const handleProposeDisable = (member: any) => {
    setSelectedDisableMember(member);
    setShowDisableModal(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.get(`/users?page=${page}&limit=10&search=${search}`).then((r) => r.data),
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('Member removed');
      qClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const promoteMutation = useMutation({
    mutationFn: (id: string) => api.put(`/users/${id}/promote`),
    onSuccess: () => {
      toast.success('Promotion request submitted for group voting! ⭐');
      qClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to promote member'),
  });

  const demoteMutation = useMutation({
    mutationFn: (id: string) => api.put(`/users/${id}`, { role: 'member' }),
    onSuccess: () => {
      toast.success('Admin successfully demoted to regular member.');
      qClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to demote admin'),
  });

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
          <p className="text-xs text-muted">Total Members</p>
        </div>
      </div>

      {/* Header with search */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input flex-1 text-sm py-2.5"
        />
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary btn-md">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <div className="skeleton w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-48 rounded" />
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="card p-10 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-muted text-sm">No members found</p>
          </div>
        ) : (
          users.map((member: any, i: number) => (
            <motion.div
              key={member._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card card-hover p-4"
            >
              <div className="flex items-center gap-3">
                <div className="avatar avatar-md flex-shrink-0">
                  {member.avatar
                    ? <img src={`${process.env.NEXT_PUBLIC_SOCKET_URL}${member.avatar}`} className="w-full h-full object-cover rounded-full" alt="" />
                    : getInitials(member.name)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">{member.name}</p>
                    {member.role === 'admin' && <Crown className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Mail className="w-3 h-3" />{member.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Phone className="w-3 h-3" />{member.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`badge ${member.role === 'admin' ? 'badge-accent' : 'badge-gray'}`}>
                      {member.role === 'admin' ? '⭐ Admin' : 'Member'}
                    </span>
                    
                    {/* Rank Badge */}
                    {member.rank && (
                      <span className={`badge font-semibold flex items-center gap-1 ${
                        member.rank === 1 ? 'bg-amber-50 text-amber-800 border border-amber-200/60' :
                        member.rank === 2 ? 'bg-slate-50 text-slate-800 border border-slate-200/60' :
                        member.rank === 3 ? 'bg-orange-50 text-orange-800 border border-orange-200/60' :
                        'badge-gray'
                      }`}>
                        {member.rank === 1 || member.rank === 2 || member.rank === 3 ? (
                          <Trophy className={`w-3.5 h-3.5 ${
                            member.rank === 1 ? 'text-amber-500' :
                            member.rank === 2 ? 'text-slate-400' :
                            'text-orange-400'
                          }`} />
                        ) : (
                          <Award className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span>Rank #{member.rank}</span>
                      </span>
                    )}

                    {/* Money Invested Badge */}
                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Invested: {formatCurrency(member.totalPaid || 0)}</span>
                    </span>

                    {/* Penalty Paid Badge */}
                    {(member.totalPenaltyPaid || 0) > 0 && (
                      <span className="badge bg-danger-bg text-danger border border-danger/20 font-medium flex items-center gap-1">
                        <span>Penalty: {formatCurrency(member.totalPenaltyPaid)}</span>
                      </span>
                    )}

                    {member.isDisabled && (
                      <span className="bg-red-50 text-red-600 border border-red-100/50 px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 animate-pulse">
                        🔒 Disabled
                      </span>
                    )}
                    <span className="text-xs text-muted">Joined {formatDate(member.joinedAt)}</span>
                  </div>
                </div>

                {/* Admin actions */}
                {isAdmin && member._id !== currentUser?._id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {member.role === 'member' && !member.isDisabled && (
                      <button
                        onClick={() => promoteMutation.mutate(member._id)}
                        title="Promote to Admin"
                        className="px-3 py-1.5 rounded-xl bg-accent/10 flex items-center gap-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-white transition-all"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Promote</span>
                      </button>
                    )}
                    {member.role === 'admin' && !member.isDisabled && (
                      <button
                        onClick={() => {
                          if (confirm(`Demote ${member.name} to a regular member? They will lose admin privileges immediately.`)) {
                            demoteMutation.mutate(member._id);
                          }
                        }}
                        title="Demote to Member"
                        className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-all"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!member.isDisabled ? (
                      <button
                        onClick={() => handleProposeDisable(member)}
                        title="Propose to Disable"
                        className="px-3 py-1.5 rounded-xl bg-amber-50 flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500 hover:text-white transition-all"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Disable</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.name} from the group? This will completely delete the user but their past transactions will remain in the group statistics.`)) {
                            removeMutation.mutate(member._id);
                          }
                        }}
                        title="Remove member"
                        className="w-8 h-8 rounded-xl bg-danger-bg flex items-center justify-center text-danger hover:bg-danger hover:text-white transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
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

      <AddMemberModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <ProposeDisableModal isOpen={showDisableModal} onClose={() => setShowDisableModal(false)} member={selectedDisableMember} />
    </div>
  );
}
