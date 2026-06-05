'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Clock, AlertCircle, QrCode, X, CheckCircle, Calendar,
  Banknote, CreditCard, Copy, Check, WifiOff
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Pagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

// ─── Delay Request Modal ───────────────────────────────────────────────────────
function DelayRequestModal({ isOpen, onClose, installmentId, dueDate }: any) {
  const [requestedDate, setRequestedDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const qClient = useQueryClient();

  const minDate = dueDate ? (() => {
    const d = new Date(dueDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })() : '';

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.post('/delay-requests', data),
    onSuccess: () => {
      toast.success('Delay request submitted for approval!');
      qClient.invalidateQueries({ queryKey: ['delay-requests'] });
      qClient.invalidateQueries({ queryKey: ['my-installment-status'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to submit delay request'),
  });

  const handleSubmit = () => {
    if (!requestedDate || !reason) {
      toast.error('Please select a date and provide a reason');
      return;
    }
    submitMutation.mutate({ installmentId, requestedDate, reason, notes });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" style={{ WebkitBackdropFilter: 'blur(4px)' }}
            onClick={onClose} />
          <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '90dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Request Delay</h2>
                <p className="text-xs text-muted">Request to pay at a later date</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">I will pay on <span className="text-danger">*</span></label>
                <input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} className="input" min={minDate} suppressHydrationWarning />
              </div>
              <div>
                <label className="label">Reason <span className="text-danger">*</span></label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder="e.g. Salary delayed" />
              </div>
              <div>
                <label className="label">Additional Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Any extra details..." />
              </div>
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSubmit}
                disabled={submitMutation.isPending} className="btn-primary btn-lg w-full mt-4">
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── UPI Copy Button ───────────────────────────────────────────────────────────
function UpiCopyButton({ upiId }: { upiId: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = upiId;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [upiId]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
        copied
          ? 'bg-success-bg text-success border border-success/20'
          : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy UPI ID'}
    </button>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
type PaymentMode = 'select' | 'online' | 'cash';

function PaymentModal({ isOpen, onClose, group, pendingInstallments, hasPendingPayment, pendingPaymentDetails }: any) {
  const [mode, setMode] = useState<PaymentMode>('select');
  const [note, setNote] = useState('');
  const [txnId, setTxnId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const qClient = useQueryClient();

  const targetInstallment = pendingInstallments?.length > 0 ? pendingInstallments[0] : null;
  const baseAmount = targetInstallment ? targetInstallment.amount : (group?.installmentAmount || 1000);

  const calculatePenaltyForDate = (inst: any, dateStr: string) => {
    if (!inst || inst.isDelayed) return 0;
    const dueDate = inst.extendedDueDate ? new Date(inst.extendedDueDate) : new Date(inst.dueDate);
    const payDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    payDate.setHours(0, 0, 0, 0);
    if (payDate <= dueDate) return 0;
    const diffDays = Math.ceil((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(inst.amount * ((group?.penaltyRate || 10) / 100) * diffDays);
  };

  const dynamicPenalty = calculatePenaltyForDate(targetInstallment, paymentDate);

  const resetAndClose = () => {
    setMode('select');
    setNote('');
    setTxnId('');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  const handleModeSelect = (selected: 'online' | 'cash') => {
    setAmount((baseAmount + (selected === 'online' ? dynamicPenalty : 0)).toString());
    setMode(selected);
  };

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.post('/payments/submit', data),
    onSuccess: () => {
      toast.success(mode === 'cash'
        ? 'Cash payment recorded! Awaiting admin approval. 💵'
        : 'Payment submitted! Awaiting admin approval. 🎉');
      qClient.invalidateQueries({ queryKey: ['my-installment-status'] });
      qClient.invalidateQueries({ queryKey: ['member-dashboard'] });
      resetAndClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to submit payment'),
  });

  const handleOnlineSubmit = () => {
    if (!amount || Number(amount) <= 0) { toast.error('Please enter a valid amount'); return; }
    if (!txnId) { toast.error('Please enter the Transaction ID'); return; }
    submitMutation.mutate({ amount, transactionNote: note, transactionId: txnId, paymentDate, penaltyIncluded: dynamicPenalty, isCashPayment: false });
  };

  const handleCashSubmit = () => {
    if (!amount || Number(amount) <= 0) { toast.error('Please enter a valid amount'); return; }
    submitMutation.mutate({ amount, transactionNote: note, paymentDate, isCashPayment: true });
  };

  const numAmount = Number(amount);
  const installmentAmt = group?.installmentAmount || 1000;
  const coverage = Math.floor(numAmount / installmentAmt);
  const balance = numAmount % installmentAmt;
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: 'blur(4px)' }}
            onClick={resetAndClose} />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '92dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {mode !== 'select' && (
                  <button onClick={() => setMode('select')}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors mr-1">
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div>
                  <h2 className="font-bold text-gray-900">
                    {mode === 'select' ? 'Submit Payment' : mode === 'online' ? '💳 Pay Online' : '💵 Cash Payment'}
                  </h2>
                  <p className="text-xs text-muted">
                    {mode === 'select' ? 'Choose how you want to pay' :
                     mode === 'online' ? 'Pay via UPI or bank transfer' :
                     'Record your cash payment'}
                  </p>
                </div>
              </div>
              <button onClick={resetAndClose}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-5">
              {/* Pending payment warning — always shown */}
              {hasPendingPayment && (
                <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-850 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 mb-0.5">⚠️ Payment Awaiting Approval</p>
                    <p>You already have a pending payment of <strong>{formatCurrency(pendingPaymentDetails?.amount || 0)}</strong> awaiting admin review. You cannot submit another payment until this is approved or rejected.</p>
                  </div>
                </div>
              )}

              {/* ── MODE SELECT ── */}
              <AnimatePresence mode="wait">
                {mode === 'select' && (
                  <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700 mb-4">How are you paying?</p>

                    {/* Online */}
                    <motion.button
                      whileTap={hasPendingPayment ? {} : { scale: 0.98 }}
                      disabled={hasPendingPayment}
                      onClick={() => !hasPendingPayment && handleModeSelect('online')}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        hasPendingPayment
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-accent/30 bg-accent/5 hover:border-accent hover:bg-accent/10 cursor-pointer'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center flex-shrink-0 shadow-md">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">Pay Online</p>
                        <p className="text-xs text-muted mt-0.5">UPI, Net Banking, or Bank Transfer</p>
                        {group?.upiId && (
                          <p className="text-xs text-accent font-medium mt-1">📷 QR Code available</p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>

                    {/* Cash */}
                    <motion.button
                      whileTap={hasPendingPayment ? {} : { scale: 0.98 }}
                      disabled={hasPendingPayment}
                      onClick={() => !hasPendingPayment && handleModeSelect('cash')}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        hasPendingPayment
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100/80 cursor-pointer'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Banknote className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">Cash Payment</p>
                        <p className="text-xs text-muted mt-0.5">Paid in person — no transaction ID needed</p>
                        <p className="text-xs text-amber-700 font-medium mt-1">Admin will confirm receipt</p>
                      </div>
                      <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>

                    {/* Due amount hint */}
                    {targetInstallment && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                        <p className="text-xs text-muted">Amount due this month</p>
                        <p className="font-bold text-gray-900">{formatCurrency(baseAmount)}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── ONLINE FORM ── */}
                {mode === 'online' && (
                  <motion.div key="online" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-5">

                    {/* QR Code — always visible */}
                    {group?.qrCodeImage ? (
                      <div className="flex flex-col items-center gap-3 p-5 bg-accent/5 rounded-2xl border border-accent/20">
                        <p className="text-sm font-semibold text-gray-900">Scan to Pay</p>
                        <div className="relative">
                          <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: '0 0 0 4px rgba(20,184,166,0.15), 0 0 20px rgba(20,184,166,0.2)' }} />
                          <img
                            src={`${socketUrl}${group.qrCodeImage}`}
                            alt="Payment QR Code"
                            className="w-44 h-44 object-contain rounded-2xl border-2 border-accent/30"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        {group.upiName && (
                          <p className="text-sm font-bold text-gray-900">{group.upiName}</p>
                        )}
                        {group.upiId && (
                          <div className="flex items-center gap-2 flex-wrap justify-center">
                            <span className="font-mono text-sm text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-200">
                              {group.upiId}
                            </span>
                            <UpiCopyButton upiId={group.upiId} />
                          </div>
                        )}
                      </div>
                    ) : group?.upiId ? (
                      <div className="flex flex-col items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                        <WifiOff className="w-8 h-8 text-amber-400" />
                        <p className="text-sm font-semibold text-amber-800 text-center">No QR image set up yet</p>
                        <p className="text-xs text-amber-700 text-center">Please transfer directly to UPI ID:</p>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          <span className="font-mono text-sm font-bold text-amber-900 bg-white px-3 py-1 rounded-lg border border-amber-200">
                            {group.upiId}
                          </span>
                          <UpiCopyButton upiId={group.upiId} />
                        </div>
                      </div>
                    ) : null}

                    {/* Payment Date */}
                    <div>
                      <label className="label">Payment Date</label>
                      <input type="date" value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)} className="input" suppressHydrationWarning />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="label">Payment Amount (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="input !pl-11 text-lg font-semibold" placeholder="Enter amount" suppressHydrationWarning />
                      </div>
                      {numAmount > 0 && coverage > 0 && (
                        <p className="text-xs text-accent font-semibold mt-2">
                          ℹ️ Covers {coverage} installment{coverage > 1 ? 's' : ''}
                          {balance > 0 ? ` with ₹${balance} credit` : ''}
                        </p>
                      )}
                      {dynamicPenalty > 0 && numAmount === baseAmount + dynamicPenalty && (
                        <p className="text-xs text-danger font-medium mt-2">⚠️ Includes penalty of ₹{dynamicPenalty} for late payment.</p>
                      )}
                      {targetInstallment && dynamicPenalty === 0 && numAmount === baseAmount && (
                        <p className="text-xs text-success font-medium mt-2">✅ No penalty applied.</p>
                      )}
                    </div>

                    {/* Transaction ID */}
                    <div>
                      <label className="label">Transaction ID <span className="text-danger">*</span></label>
                      <input type="text" value={txnId}
                        onChange={(e) => setTxnId(e.target.value)} className="input"
                        placeholder="UPI Reference / Bank Transaction ID" suppressHydrationWarning />
                    </div>

                    {/* Note */}
                    <div>
                      <label className="label">Note (optional)</label>
                      <textarea value={note} onChange={(e) => setNote(e.target.value)}
                        className="input resize-none" rows={2} placeholder="Any additional note..." />
                    </div>

                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleOnlineSubmit}
                      disabled={submitMutation.isPending}
                      className="btn-primary btn-lg w-full">
                      {submitMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </div>
                      ) : (
                        <><CheckCircle className="w-5 h-5" /> Submit Payment</>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── CASH FORM ── */}
                {mode === 'cash' && (
                  <motion.div key="cash" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-5">

                    {/* Info box */}
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                      <Banknote className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Recording a Cash Payment</p>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          This records that you paid in cash (in person). The admin will verify and approve this entry. A reference ID will be auto-generated for tracking.
                        </p>
                      </div>
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="label">Date of Cash Payment</label>
                      <input type="date" value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)} className="input" suppressHydrationWarning />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="label">Amount Paid in Cash (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="input !pl-11 text-lg font-semibold" placeholder="Enter amount" suppressHydrationWarning />
                      </div>
                      {numAmount > 0 && coverage > 0 && (
                        <p className="text-xs text-accent font-semibold mt-2">
                          ℹ️ Covers {coverage} installment{coverage > 1 ? 's' : ''}
                          {balance > 0 ? ` with ₹${balance} credit` : ''}
                        </p>
                      )}
                    </div>

                    {/* Note */}
                    <div>
                      <label className="label">Details / Note (optional)</label>
                      <textarea value={note} onChange={(e) => setNote(e.target.value)}
                        className="input resize-none" rows={3}
                        placeholder="e.g. Paid to Priyank at the monthly meeting..." />
                    </div>

                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleCashSubmit}
                      disabled={submitMutation.isPending}
                      className="w-full btn-lg font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-2"
                      style={{ padding: '0.75rem 1.5rem' }}>
                      {submitMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Recording...
                        </div>
                      ) : (
                        <><Banknote className="w-5 h-5" /> Record Cash Payment</>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InstallmentsPage() {
  const { user, group } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [showPayModal, setShowPayModal] = useState(false);
  const [delayModalInst, setDelayModalInst] = useState<{ id: string; dueDate: string } | null>(null);
  const [page, setPage] = useState(1);
  const qClient = useQueryClient();

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['my-installment-status'],
    queryFn: () => api.get('/installments/my-status').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: allInstallments } = useQuery({
    queryKey: ['installments', 'paid', page],
    queryFn: () => api.get(`/installments?status=paid&page=${page}&limit=10`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary-900 to-primary-700 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm">Monthly Installment</p>
              <p className="text-4xl font-bold mt-1">{formatCurrency(statusData?.group?.installmentAmount || 1000)}</p>
              {statusData?.currentInstallment?.extendedDueDate ? (
                <p className="text-slate-400 text-sm mt-2">
                  This month due on{' '}
                  <span className="text-accent-light font-bold">{formatDate(statusData.currentInstallment.extendedDueDate)}</span>{' '}
                  <span className="text-xs text-green-400 font-semibold">(Delay Approved ✅)</span>
                </p>
              ) : (
                <p className="text-slate-400 text-sm mt-2">
                  Due on the{' '}
                  <span className="text-accent-light font-bold">{statusData?.group?.dueDay || 25}th</span>{' '}
                  of every month
                </p>
              )}
            </div>
            <Wallet className="w-10 h-10 text-accent-light opacity-50" />
          </div>
          <div className="flex gap-4 mt-5">
            <div>
              <p className="text-slate-400 text-xs">Total Paid</p>
              <p className="text-lg font-bold text-accent-light">{formatCurrency(statusData?.totalPaid || 0)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Current Penalty</p>
              <p className="text-lg font-bold text-warning">{formatCurrency(statusData?.currentPenalty || 0)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Penalty Rate</p>
              <p className="text-lg font-bold text-white">{statusData?.group?.penaltyRate || 10}%/day</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Warning Disclaimer for Pending Payment */}
      {statusData?.hasPendingPayment && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200/50 shadow-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-850 leading-relaxed">
            <p className="font-bold text-amber-900 text-sm mb-1">Payment Awaiting Approval</p>
            <p>
              You have already submitted a payment request of{' '}
              <span className="font-bold text-amber-900">{formatCurrency(statusData?.pendingPaymentDetails?.amount || 0)}</span>{' '}
              (Txn: <span className="font-mono text-amber-900 font-medium">{statusData?.pendingPaymentDetails?.transactionId}</span>)
              {' '}submitted on{' '}
              <span className="font-medium text-amber-900">{formatDate(statusData?.pendingPaymentDetails?.submittedAt)}</span>.
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-amber-700">
              ⚠️ You cannot make another payment until the admin approves or rejects this pending request.
            </p>
          </div>
        </motion.div>
      )}

      {/* Pay button */}
      <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        whileTap={statusData?.hasPendingPayment || user?.isDisabled ? {} : { scale: 0.97 }}
        disabled={statusData?.hasPendingPayment || user?.isDisabled}
        onClick={() => !statusData?.hasPendingPayment && !user?.isDisabled && setShowPayModal(true)}
        className={`btn-primary btn-lg w-full ${
          statusData?.hasPendingPayment || user?.isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 border-gray-400 shadow-none' : ''
        }`}>
        <Wallet className="w-5 h-5" />
        Submit Payment
      </motion.button>

      {/* Pending installments */}
      {(statusData?.pendingInstallments || []).length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <h3 className="font-semibold text-gray-900 text-sm">Pending Installments</h3>
            <span className="badge badge-warning ml-auto">{statusData?.pendingInstallments?.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {statusData?.pendingInstallments?.map((inst: any, i: number) => {
              const isOverdue = new Date(inst.dueDate) < new Date();
              return (
                <motion.div key={inst._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }} className="flex items-center gap-4 p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-danger-bg' : 'bg-warning-bg'}`}>
                    <Clock className={`w-5 h-5 ${isOverdue ? 'text-danger' : 'text-warning'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{getMonthName(inst.month, inst.year)}</p>
                    <p className="text-xs text-muted">Due {formatDate(inst.dueDate)}</p>
                    {isOverdue && inst.penaltyAmount > 0 && (
                      <p className="text-xs text-danger font-medium">+{formatCurrency(inst.penaltyAmount)} penalty</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end justify-center gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{formatCurrency(inst.amount)}</p>
                      <span className={`badge ${isOverdue ? 'badge-danger' : 'badge-warning'}`}>
                        {isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                    {!isOverdue && !inst.extendedDueDate && !user?.isDisabled && (
                      <button onClick={() => setDelayModalInst({ id: inst._id, dueDate: inst.dueDate })}
                        className="text-[10px] font-semibold text-accent underline hover:text-accent-dark">
                        Request Delay
                      </button>
                    )}
                    {inst.extendedDueDate && !isOverdue && (
                      <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        ✅ Delay to {formatDate(inst.extendedDueDate)}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Installment History */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Installment History</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {(allInstallments?.data || []).length === 0 ? (
            <div className="text-center p-8">
              <CheckCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">No payments yet</p>
              <p className="text-xs text-muted mt-1">Your paid installments will appear here.</p>
            </div>
          ) : (
            (allInstallments?.data || []).map((inst: any, i: number) => (
              <motion.div key={inst._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }} className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-success-bg">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {isAdmin && inst.userId?.name ? `${inst.userId.name} - ` : ''}
                    {getMonthName(inst.month, inst.year)}
                  </p>
                  <p className="text-xs text-muted">{formatDate(inst.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">{formatCurrency(inst.amount)}</p>
                  <span className="badge badge-success">Paid</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
        {allInstallments?.pagination && allInstallments.pagination.pages > 1 && (
          <Pagination
            currentPage={allInstallments.pagination.page}
            totalPages={allInstallments.pagination.pages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        group={statusData?.group || group}
        pendingInstallments={statusData?.pendingInstallments}
        hasPendingPayment={statusData?.hasPendingPayment}
        pendingPaymentDetails={statusData?.pendingPaymentDetails}
      />

      <DelayRequestModal
        isOpen={!!delayModalInst}
        onClose={() => setDelayModalInst(null)}
        installmentId={delayModalInst?.id}
        dueDate={delayModalInst?.dueDate}
      />
    </div>
  );
}
