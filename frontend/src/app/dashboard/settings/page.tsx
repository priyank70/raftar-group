'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Settings, Save, QrCode, Bell, Megaphone, Upload, X, User, Phone, Mail, Edit3, LogOut, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, group, setGroup, setUser } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const qClient = useQueryClient();

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.put('/users/profile/me', data),
    onSuccess: (res) => {
      toast.success('Profile updated! ✅');
      setUser(res.data.data);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update profile'),
  });

  const [settings, setSettings] = useState({
    installmentAmount: group?.installmentAmount || 1000,
    dueDay: group?.dueDay || 25,
    penaltyRate: group?.penaltyRate || 10,
    upiId: group?.upiId || '',
    upiName: group?.upiName || '',
    minimumVotesRequired: group?.minimumVotesRequired || 3,
    startDate: group?.startDate ? new Date(group.startDate).toISOString().split('T')[0] : '',
    rulesText: group?.rules?.join('\n') || '',
  });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });

  const { data: groupData } = useQuery({
    queryKey: ['group-settings'],
    queryFn: () => api.get('/dashboard/group-settings').then((r) => r.data.data),
  });

  // Sync settings form whenever server data loads (replaces deprecated onSuccess)
  useEffect(() => {
    if (groupData) {
      setSettings({
        installmentAmount: groupData.installmentAmount,
        dueDay: groupData.dueDay,
        penaltyRate: groupData.penaltyRate,
        upiId: groupData.upiId || '',
        upiName: groupData.upiName || '',
        minimumVotesRequired: groupData.minimumVotesRequired || 3,
        startDate: groupData.startDate ? new Date(groupData.startDate).toISOString().split('T')[0] : '',
        rulesText: groupData.rules?.join('\n') || '',
      });
    }
  }, [groupData]);

  const updateMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.put('/dashboard/group-settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    onSuccess: (res) => {
      toast.success('Settings updated! ✅');
      setGroup(res.data.data);
      qClient.invalidateQueries({ queryKey: ['group-settings'] });
    },
    onError: () => toast.error('Failed to update settings'),
  });

  const announceMutation = useMutation({
    mutationFn: (data: any) => api.post('/dashboard/announcement', data),
    onSuccess: () => {
      toast.success('Announcement sent to all members! 📢');
      setAnnouncement({ title: '', message: '' });
    },
    onError: () => toast.error('Failed to send announcement'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.post('/settlements/leave-request'),
    onSuccess: () => {
      toast.success('Leave request submitted. The admin will propose a settlement amount shortly.');
      qClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to request leave'),
  });

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setQrFile(f);
      setQrPreview(URL.createObjectURL(f));
    }
  };

  const handleSave = () => {
    const formData = new FormData();
    Object.entries(settings).forEach(([k, v]) => {
      if (k === 'rulesText') {
        const rulesArray = String(v).split('\n').map(r => r.trim()).filter(Boolean);
        formData.append('rules', JSON.stringify(rulesArray));
      } else {
        formData.append(k, String(v));
      }
    });
    if (qrFile) formData.append('qrCode', qrFile);
    updateMutation.mutate(formData);
  };

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const pwMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to change password'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      {/* My Profile — visible to ALL users */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <User className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">My Profile</h3>
            <p className="text-xs text-muted">Update your personal information</p>
          </div>
        </div>

        {/* Avatar display */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
            {user?.avatar
              ? <img src={`${process.env.NEXT_PUBLIC_SOCKET_URL}${user.avatar}`} className="w-full h-full object-cover" alt="" />
              : user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            }
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-muted">{user?.email}</p>
            <span className={`badge mt-1 ${user?.role === 'admin' ? 'badge-accent' : 'badge-gray'}`}>
              {user?.role === 'admin' ? '⭐ Admin' : 'Member'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
            <input
              className="input"
              placeholder="Your full name"
              value={profileForm.name}
              disabled={user?.isDisabled}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="your@email.com"
              value={profileForm.email}
              disabled={user?.isDisabled}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</label>
            <input
              className="input"
              placeholder="9876543210"
              value={profileForm.phone}
              disabled={user?.isDisabled}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </div>
        </div>

        <button
          onClick={() => profileMutation.mutate(profileForm)}
          disabled={profileMutation.isPending || user?.isDisabled}
          className="btn-primary btn-md w-full sm:w-auto"
        >
          <Edit3 className="w-4 h-4" />
          {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </motion.div>

      {/* Group Settings - Admin Only */}
      {isAdmin && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5 space-y-5"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent" />
              <h3 className="font-bold text-gray-900">Group Settings</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Installment Amount (₹)</label>
                <input type="number" className="input" value={settings.installmentAmount} disabled={user?.isDisabled}
                  onChange={(e) => setSettings({ ...settings, installmentAmount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Due Day of Month</label>
                <input type="number" className="input" min="1" max="31" value={settings.dueDay} disabled={user?.isDisabled}
                  onChange={(e) => setSettings({ ...settings, dueDay: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Penalty Rate (%/day)</label>
                <input type="number" className="input" value={settings.penaltyRate} disabled={user?.isDisabled}
                  onChange={(e) => setSettings({ ...settings, penaltyRate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">UPI ID</label>
                <input type="text" className="input" placeholder="yourname@upi" value={settings.upiId} disabled={user?.isDisabled}
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value })} />
              </div>
              <div>
                <label className="label">UPI Name</label>
                <input type="text" className="input" placeholder="Raftar Group" value={settings.upiName} disabled={user?.isDisabled}
                  onChange={(e) => setSettings({ ...settings, upiName: e.target.value })} />
              </div>
              <div>
                <label className="label">Group Start Date</label>
                <input type="date" className="input" value={settings.startDate} disabled={user?.isDisabled}
                  onChange={(e) => setSettings({ ...settings, startDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Group Rules (One per line)</label>
                <textarea className="input resize-y" rows={4} placeholder="1. Rule one&#10;2. Rule two" value={settings.rulesText} disabled={user?.isDisabled}
                  onChange={(e) => setSettings({ ...settings, rulesText: e.target.value })} />
              </div>
            </div>

            {/* QR Code */}
            <div>
              <label className="label">Payment QR Code</label>
              <div className="flex items-start gap-4">
                {(qrPreview || (groupData as any)?.qrCodeImage) && (
                  <div className="relative">
                    <img
                      src={qrPreview || `${process.env.NEXT_PUBLIC_SOCKET_URL}${(groupData as any)?.qrCodeImage}`}
                      alt="QR Code"
                      className="w-24 h-24 object-contain rounded-xl border border-gray-200"
                    />
                    {qrPreview && !user?.isDisabled && (
                      <button
                        onClick={() => { setQrFile(null); setQrPreview(null); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                )}
                <label className={`flex-1 flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl transition-all ${user?.isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-accent'}`}>
                  <QrCode className="w-6 h-6 text-muted" />
                  <p className="text-xs text-muted">Upload new QR code</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleQrChange} disabled={user?.isDisabled} />
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || user?.isDisabled}
                className="btn-primary btn-md flex-1"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>

              <button
                onClick={() => {
                  if (confirm('Are you sure? This will regenerate installments for all members based on the start date.')) {
                    api.post('/installments/regenerate')
                      .then(() => toast.success('Installments regenerated!'))
                      .catch(() => toast.error('Failed to regenerate installments'));
                  }
                }}
                disabled={user?.isDisabled}
                className="btn-outline border-gray-200 text-gray-700 hover:border-danger hover:text-danger btn-md flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Regenerate Installments
              </button>
            </div>
          </motion.div>

          {/* Announcements */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-warning" />
              <h3 className="font-bold text-gray-900">Send Announcement</h3>
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" placeholder="Announcement title" value={announcement.title} disabled={user?.isDisabled}
                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input resize-none" rows={3} placeholder="Write your announcement..." disabled={user?.isDisabled}
                value={announcement.message}
                onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })} />
            </div>
            <button
              onClick={() => announceMutation.mutate(announcement)}
              disabled={announceMutation.isPending || !announcement.title || !announcement.message || user?.isDisabled}
              className="btn btn-md bg-warning-bg text-warning hover:bg-amber-100 border border-warning/20"
            >
              <Bell className="w-4 h-4" />
              {announceMutation.isPending ? 'Sending...' : 'Send to All Members'}
            </button>
          </motion.div>
        </>
      )}

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-5 space-y-4"
      >
        <h3 className="font-bold text-gray-900">Change Password</h3>
        <div>
          <label className="label">Current Password</label>
          <input type="password" className="input" value={pwForm.currentPassword} disabled={user?.isDisabled}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
        </div>
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input" value={pwForm.newPassword} disabled={user?.isDisabled}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input type="password" className="input" value={pwForm.confirmPassword} disabled={user?.isDisabled}
            onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
        </div>
        <button
          onClick={() => {
            if (pwForm.newPassword !== pwForm.confirmPassword) {
              toast.error('Passwords do not match');
              return;
            }
            pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
          }}
          disabled={pwMutation.isPending || user?.isDisabled}
          className="btn-primary btn-md w-full sm:w-auto"
        >
          {pwMutation.isPending ? 'Changing...' : 'Change Password'}
        </button>
      </motion.div>

      {/* Leave Group Section */}
      {!isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-5 space-y-4 border border-danger/20"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger" />
            <h3 className="font-bold text-gray-900">Danger Zone: Leave Group</h3>
          </div>
          <p className="text-sm text-gray-600">
            If you wish to leave the Raftar Group, you can submit a request here. The admin will calculate your total investment and your share of the group profit to propose a final settlement.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to request to leave the group? This will initiate the settlement process.')) {
                leaveMutation.mutate();
              }
            }}
            disabled={leaveMutation.isPending || user?.isDisabled}
            className="btn bg-danger-bg text-danger hover:bg-red-100 w-full sm:w-auto font-bold border border-danger/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {leaveMutation.isPending ? 'Submitting...' : 'Request to Leave Group'}
          </button>
        </motion.div>
      )}

      {/* App info */}
      <div className="text-center text-xs text-muted pb-4">
        <p className="font-semibold text-gray-700">Raftar Group</p>
        <p>Digital Mandal Management System v1.0</p>
        <p className="mt-1">Internal use only · © 2024</p>
      </div>
    </div>
  );
}
