'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Plus, Vote, CheckCircle, XCircle, Calculator, X,
  AlertCircle, ChevronDown, ChevronUp, Shield, User, Phone, Mail,
  MapPin, CreditCard, FileText, Users, Calendar, IndianRupee, Pencil
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Pagination } from '@/components/ui/Pagination';
import toast from 'react-hot-toast';
import { useScrollLock } from '@/hooks/useScrollLock';

// ─── Live Calculator ────────────────────────────────────────────────────────
function LiveCalculator() {
  const [amount, setAmount] = useState('500000');
  const [rate, setRate] = useState('12');
  const [interestType, setInterestType] = useState('yearly');
  const [months, setMonths] = useState('12');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    if (!amount || !rate || !months) return;
    setLoading(true);
    try {
      const res = await api.post('/investments/calculate', {
        amount: Number(amount), interestRate: Number(rate), durationMonths: Number(months), interestType
      });
      setResult(res.data.data);
    } catch (e) {
      toast.error('Calculation failed');
    }
    setLoading(false);
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-accent" />
        <h3 className="font-bold text-gray-900">Live Interest Calculator</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Amount (₹)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input text-sm py-2" placeholder="500000" />
        </div>
        <div>
          <label className="label text-xs">Rate</label>
          <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden">
            <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="w-16 outline-none px-3 text-sm py-2" placeholder="12" />
            <select className="flex-1 bg-gray-50 border-l text-xs outline-none px-2" value={interestType} onChange={(e) => setInterestType(e.target.value)}>
              <option value="yearly">%/yr</option>
              <option value="monthly">%/mo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label text-xs">Duration (mo)</label>
          <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} className="input text-sm py-2" placeholder="12" />
        </div>
      </div>
      <button onClick={calculate} disabled={loading} className="btn-primary btn-md w-full">
        {loading ? 'Calculating...' : 'Calculate Returns'}
      </button>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Principal', value: formatCurrency(result.amount), color: 'text-gray-900' },
                { label: 'Total Return', value: formatCurrency(result.totalReturn), color: 'text-accent' },
                { label: 'Profit', value: formatCurrency(result.profit), color: 'text-success' },
                { label: 'Monthly Earning', value: formatCurrency(result.monthlyEarning), color: 'text-warning' },
                { label: 'ROI', value: `${result.roi}%`, color: 'text-accent' },
                { label: 'EMI per Month', value: formatCurrency(result.emiAmount), color: 'text-purple-600' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-muted">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── EMI Repayment Modal ─────────────────────────────────────────────────────
function RecordEmiModal({ isOpen, onClose, investment }: any) {
  const qClient = useQueryClient();
  useScrollLock(isOpen);
  const now = new Date();
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    amount: investment?.emiAmount || '',
    note: '',
  });

  const emiMutation = useMutation({
    mutationFn: (data: any) => api.post(`/investments/${investment._id}/emi`, data),
    onSuccess: () => {
      toast.success('EMI payment recorded! 📥');
      qClient.invalidateQueries({ queryKey: ['investments'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record EMI'),
  });

  if (!isOpen || !investment) return null;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl overflow-hidden"
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Record EMI Payment</h2>
            <p className="text-xs text-muted">{investment.personName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Month</label>
              <select className="input" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>
                {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Amount Received (₹)</label>
            <input type="number" className="input" placeholder={String(investment.emiAmount)} value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <p className="text-xs text-muted mt-1">Expected EMI: {formatCurrency(investment.emiAmount)}</p>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input type="text" className="input" placeholder="Cash / UPI / Bank transfer..." value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button
            onClick={() => emiMutation.mutate(form)}
            disabled={emiMutation.isPending || !form.amount}
            className="btn-primary btn-lg w-full"
          >
            {emiMutation.isPending ? 'Recording...' : 'Record EMI Payment'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── New/Edit Investment Modal ───────────────────────────────────────────────
interface NewInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment?: any; // populated when editing
}

function NewInvestmentModal({ isOpen, onClose, investment }: NewInvestmentModalProps) {
  const qClient = useQueryClient();
  useScrollLock(isOpen);
  const [repaymentMode, setRepaymentMode] = useState<'emi' | 'lump_sum'>('lump_sum');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [form, setForm] = useState({
    // Borrower info
    personName: '', personPhone: '', personEmail: '', personAddress: '',
    personAadhaar: '', loanPurpose: '', collateral: '', guarantorName: '',
    // Investment
    type: 'personal_loan', amount: '', interestRate: '', interestType: 'yearly',
    durationMonths: '', startDate: '', notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (investment) {
        setRepaymentMode(investment.repaymentMode || 'lump_sum');
        setForm({
          personName: investment.personName || '',
          personPhone: investment.personPhone || '',
          personEmail: investment.personEmail || '',
          personAddress: investment.personAddress || '',
          personAadhaar: investment.personAadhaar || '',
          loanPurpose: investment.loanPurpose || '',
          collateral: investment.collateral || '',
          guarantorName: investment.guarantorName || '',
          type: investment.type || 'personal_loan',
          amount: String(investment.amount || ''),
          interestRate: String(investment.interestRate || ''),
          interestType: investment.interestType || 'yearly',
          durationMonths: String(investment.durationMonths || ''),
          startDate: investment.startDate ? new Date(investment.startDate).toISOString().split('T')[0] : '',
          notes: investment.notes || '',
        });
        // fetch calculation returns for preview
        api.post('/investments/calculate', {
          amount: Number(investment.amount), interestRate: Number(investment.interestRate),
          durationMonths: Number(investment.durationMonths), interestType: investment.interestType
        }).then(res => setCalcResult(res.data.data)).catch(() => {});
      } else {
        setRepaymentMode('lump_sum');
        setForm({
          personName: '', personPhone: '', personEmail: '', personAddress: '',
          personAadhaar: '', loanPurpose: '', collateral: '', guarantorName: '',
          type: 'personal_loan', amount: '', interestRate: '', interestType: 'yearly',
          durationMonths: '', startDate: '', notes: '',
        });
        setCalcResult(null);
      }
    }
  }, [isOpen, investment]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (investment?._id) {
        return api.put(`/investments/${investment._id}`, data);
      }
      return api.post('/investments', data);
    },
    onSuccess: () => {
      toast.success(investment ? 'Investment proposal updated! Members must re-vote. 💰' : 'Investment proposed! Members can now vote. 💰');
      qClient.invalidateQueries({ queryKey: ['investments'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || `Failed to ${investment ? 'update' : 'create'} investment`),
  });

  const liveCalc = async () => {
    if (!form.amount || !form.interestRate || !form.durationMonths) return;
    try {
      const res = await api.post('/investments/calculate', {
        amount: Number(form.amount), interestRate: Number(form.interestRate),
        durationMonths: Number(form.durationMonths), interestType: form.interestType
      });
      setCalcResult(res.data.data);
    } catch {}
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl overflow-hidden max-h-[92vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-bold text-gray-900">{investment ? 'Edit Investment Proposal' : 'Propose New Investment'}</h2>
                <p className="text-xs text-muted">Requires unanimous group approval</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* ── Borrower Information ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Borrower Information</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label">Full Name <span className="text-danger">*</span></label>
                    <input className="input" placeholder="Borrower's full name" value={form.personName}
                      onChange={(e) => setForm({ ...form, personName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" placeholder="Mobile number" value={form.personPhone}
                      onChange={(e) => setForm({ ...form, personPhone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input" type="email" placeholder="email@example.com" value={form.personEmail}
                      onChange={(e) => setForm({ ...form, personEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Aadhaar Number</label>
                    <input className="input" placeholder="XXXX XXXX XXXX" maxLength={14} value={form.personAadhaar}
                      onChange={(e) => setForm({ ...form, personAadhaar: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Loan Type</label>
                    <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="personal_loan">Personal Loan</option>
                      <option value="business">Business Loan</option>
                      <option value="interest_lending">Interest Lending</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <input className="input" placeholder="Full residential address" value={form.personAddress}
                      onChange={(e) => setForm({ ...form, personAddress: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Purpose of Loan</label>
                    <input className="input" placeholder="Why is the borrower taking this loan?" value={form.loanPurpose}
                      onChange={(e) => setForm({ ...form, loanPurpose: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* ── Security & Guarantor ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Security & Guarantor</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Collateral / Security</label>
                    <input className="input" placeholder="e.g. Property, Gold, Vehicle..." value={form.collateral}
                      onChange={(e) => setForm({ ...form, collateral: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Guarantor Name</label>
                    <input className="input" placeholder="Guarantor's full name" value={form.guarantorName}
                      onChange={(e) => setForm({ ...form, guarantorName: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* ── Loan Terms ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Loan Terms</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Principal Amount (₹) <span className="text-danger">*</span></label>
                    <input className="input" type="number" placeholder="500000" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })} onBlur={liveCalc} />
                  </div>
                  <div>
                    <label className="label">Duration (months) <span className="text-danger">*</span></label>
                    <input className="input" type="number" placeholder="12" value={form.durationMonths}
                      onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} onBlur={liveCalc} />
                  </div>
                  <div>
                    <label className="label">Interest Rate <span className="text-danger">*</span></label>
                    <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <input className="w-1/2 outline-none px-3 text-sm py-2" type="number" placeholder="12" value={form.interestRate}
                        onChange={(e) => setForm({ ...form, interestRate: e.target.value })} onBlur={liveCalc} />
                      <select className="flex-1 bg-gray-50 border-l text-sm outline-none px-2" value={form.interestType}
                        onChange={(e) => setForm({ ...form, interestType: e.target.value })}>
                        <option value="yearly">%/yr</option>
                        <option value="monthly">%/mo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Start Date <span className="text-danger">*</span></label>
                    <input className="input" type="date" value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                </div>

                {/* Live preview */}
                {calcResult && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="grid grid-cols-3 gap-2 mt-3 p-3 bg-accent/5 rounded-xl border border-accent/20">
                    <div className="text-center">
                      <p className="text-xs text-muted">Total Return</p>
                      <p className="font-bold text-accent text-sm">{formatCurrency(calcResult.totalReturn)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted">Profit</p>
                      <p className="font-bold text-success text-sm">{formatCurrency(calcResult.profit)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted">EMI/month</p>
                      <p className="font-bold text-purple-600 text-sm">{formatCurrency(calcResult.emiAmount)}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ── Repayment Mode ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Repayment Mode</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRepaymentMode('lump_sum')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${repaymentMode === 'lump_sum' ? 'border-accent bg-accent/5' : 'border-gray-200'}`}
                  >
                    <p className="font-semibold text-sm text-gray-900">💰 Lump Sum</p>
                    <p className="text-xs text-muted mt-1">Full repayment at once when term ends</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepaymentMode('emi')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${repaymentMode === 'emi' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                  >
                    <p className="font-semibold text-sm text-gray-900">📅 Monthly EMI</p>
                    <p className="text-xs text-muted mt-1">Borrower pays monthly installments</p>
                    {calcResult && repaymentMode === 'emi' && (
                      <p className="text-xs font-bold text-purple-600 mt-1">{formatCurrency(calcResult.emiAmount)}/mo</p>
                    )}
                  </button>
                </div>
                {repaymentMode === 'emi' && (
                  <div className="mt-2 p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800 leading-relaxed">
                    📌 Admin will record each monthly payment received from the borrower. All group members will be notified when an EMI is received.
                  </div>
                )}
              </div>

              {/* ── Notes ── */}
              <div>
                <label className="label">Additional Notes</label>
                <textarea className="input resize-none" rows={2} placeholder="Any extra details about this investment..."
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <button
                onClick={() => mutation.mutate({ ...form, repaymentMode })}
                disabled={mutation.isPending || !form.personName || !form.amount || !form.interestRate || !form.durationMonths || !form.startDate}
                className="btn-primary btn-lg w-full"
              >
                {mutation.isPending ? 'Saving...' : investment ? '💾 Save & Reset Votes' : '🗳️ Propose Investment for Group Voting'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Borrower Details Panel ──────────────────────────────────────────────────
function BorrowerDetails({ inv }: { inv: any }) {
  const maskAadhaar = (a: string) => a?.replace(/\d(?=\d{4})/g, '*') || '—';

  const details = [
    { icon: Phone, label: 'Phone', value: inv.personPhone },
    { icon: Mail, label: 'Email', value: inv.personEmail },
    { icon: CreditCard, label: 'Aadhaar', value: inv.personAadhaar ? maskAadhaar(inv.personAadhaar) : null },
    { icon: MapPin, label: 'Address', value: inv.personAddress },
    { icon: FileText, label: 'Purpose', value: inv.loanPurpose },
    { icon: Shield, label: 'Collateral', value: inv.collateral },
    { icon: Users, label: 'Guarantor', value: inv.guarantorName },
  ].filter(d => d.value);

  if (details.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Borrower Details</p>
      <div className="grid grid-cols-1 gap-2">
        {details.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3 h-3 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
              <p className="text-xs text-gray-900 font-medium">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EMI Tracker Grid ────────────────────────────────────────────────────────
function EmiTracker({ inv, isAdmin, onRecord }: { inv: any; isAdmin: boolean; onRecord: () => void }) {
  const { user } = useAuthStore();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const start = new Date(inv.startDate);
  const months: { month: number; year: number; label: string }[] = [];

  for (let i = 0; i < inv.durationMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">📅 EMI Repayment Tracker</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-success font-semibold">✅ {inv.emiRepayments?.length || 0} paid</span>
          <span className="text-muted">{inv.durationMonths - (inv.emiRepayments?.length || 0)} pending</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-success rounded-full transition-all"
          style={{ width: `${Math.min(100, ((inv.emiRepayments?.length || 0) / inv.durationMonths) * 100)}%` }}
        />
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {months.map(({ month, year, label }) => {
          const paid = inv.emiRepayments?.find((r: any) => r.month === month && r.year === year);
          return (
            <div
              key={label}
              title={paid ? `Paid ₹${paid.amount} on ${formatDate(paid.paidAt)}${paid.note ? ` — ${paid.note}` : ''}` : `${label} — Pending`}
              className={`rounded-lg p-2 text-center text-[10px] font-semibold cursor-default transition-all ${
                paid ? 'bg-success-bg text-success border border-success/20' : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              <div>{paid ? '✅' : '⏳'}</div>
              <div className="mt-0.5">{label.split(' ')[0]}</div>
              <div className="text-[9px] opacity-70">{String(year).slice(2)}</div>
            </div>
          );
        })}
      </div>

      {/* Record EMI Button for admin */}
      {isAdmin && !user?.isDisabled && inv.status === 'active' && (
        <button onClick={onRecord} className="btn-primary btn-sm w-full">
          <IndianRupee className="w-3.5 h-3.5" /> Record EMI Payment
        </button>
      )}

      {/* Recent receipts */}
      {inv.emiRepayments?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Recent Receipts</p>
          {[...inv.emiRepayments].reverse().slice(0, 3).map((r: any) => (
            <div key={r._id} className="flex items-center justify-between text-xs bg-success-bg/50 rounded-lg p-2">
              <span className="font-medium text-gray-800">{monthNames[r.month - 1]} {r.year}</span>
              <span className="font-bold text-success">{formatCurrency(r.amount)}</span>
              <span className="text-muted">{formatDate(r.paidAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Approval Confirmation Modal ─────────────────────────────────────────────
interface ApprovalConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: any;
}

function ApprovalConfirmModal({ isOpen, onClose, investment }: ApprovalConfirmModalProps) {
  const qClient = useQueryClient();
  useScrollLock(isOpen);
  const [checked, setChecked] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/investments/${investment._id}/approve`),
    onSuccess: () => {
      toast.success('Loan approved and activated successfully! 🚀');
      qClient.invalidateQueries({ queryKey: ['investments'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve investment'),
  });

  if (!isOpen || !investment) return null;

  const maskAadhaar = (a: string) => a?.replace(/\d(?=\d{4})/g, '*') || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl overflow-hidden max-h-[92vh] overflow-y-auto z-10 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" /> Review & Approve Loan
            </h2>
            <p className="text-xs text-muted">Please perform final verification before activating</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Borrower KYC */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Borrower KYC Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted">Full Name</p>
                <p className="font-semibold text-gray-900">{investment.personName}</p>
              </div>
              <div>
                <p className="text-muted">Aadhaar (Masked)</p>
                <p className="font-semibold text-gray-900">{investment.personAadhaar ? maskAadhaar(investment.personAadhaar) : '—'}</p>
              </div>
              <div>
                <p className="text-muted">Phone</p>
                <p className="font-semibold text-gray-900">{investment.personPhone || '—'}</p>
              </div>
              <div>
                <p className="text-muted">Email</p>
                <p className="font-semibold text-gray-900">{investment.personEmail || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted">Address</p>
                <p className="font-semibold text-gray-900">{investment.personAddress || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted">Loan Purpose</p>
                <p className="font-semibold text-gray-900">{investment.loanPurpose || '—'}</p>
              </div>
            </div>
          </div>

          {/* Security & Guarantor */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <Shield className="w-4 h-4 text-green-600" />
              <h3 className="font-bold text-gray-900 text-sm">Security & Guarantor</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted">Collateral Security</p>
                <p className="font-semibold text-gray-900">{investment.collateral || '—'}</p>
              </div>
              <div>
                <p className="text-muted">Guarantor Name</p>
                <p className="font-semibold text-gray-900">{investment.guarantorName || '—'}</p>
              </div>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <IndianRupee className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-gray-900 text-sm">Loan Terms & Projections</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted">Principal</p>
                <p className="font-bold text-gray-900 text-sm">{formatCurrency(investment.amount)}</p>
              </div>
              <div>
                <p className="text-muted">Interest Rate</p>
                <p className="font-bold text-accent text-sm">{investment.interestRate}{investment.interestType === 'monthly' ? '% p.m.' : '% p.a.'}</p>
              </div>
              <div>
                <p className="text-muted">Duration</p>
                <p className="font-bold text-gray-900 text-sm">{investment.durationMonths} months</p>
              </div>
              <div>
                <p className="text-muted">Repayment Mode</p>
                <p className="font-semibold text-gray-900 uppercase">{investment.repaymentMode === 'emi' ? 'EMI / Installments' : 'Lump Sum'}</p>
              </div>
              {investment.repaymentMode === 'emi' && (
                <div>
                  <p className="text-muted">Monthly EMI</p>
                  <p className="font-bold text-purple-600 text-sm">{formatCurrency(investment.emiAmount)}</p>
                </div>
              )}
              <div>
                <p className="text-muted">Expected Profit</p>
                <p className="font-bold text-success text-sm">{formatCurrency(investment.profit)}</p>
              </div>
              <div className="col-span-3 pt-1">
                <p className="text-[10px] text-muted">
                  Timeline: {formatDate(investment.startDate)} → {formatDate(investment.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer Alert Box */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Disclaimer & Agreement</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                I understand that by activating this loan, group funds will be committed. I have verified the borrower's KYC documents, checked their collateral security, and verified the guarantor.
              </p>
            </div>
          </div>

          {/* Verification Checkbox */}
          <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-5 h-5 rounded-lg border-gray-300 text-accent focus:ring-accent accent-accent mt-0.5"
            />
            <span className="text-xs font-semibold text-gray-800 leading-relaxed">
              I have checked all the borrower and loan details and confirm they are correct.
            </span>
          </label>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-md flex-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => approveMutation.mutate()}
            disabled={!checked || approveMutation.isPending}
            className="btn-primary btn-md flex-1 bg-success hover:bg-success-dark text-white border-none shadow-md shadow-success/15 font-bold flex items-center justify-center gap-2"
          >
            {approveMutation.isPending ? 'Activating...' : 'Approve & Activate Loan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function InvestmentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emiTarget, setEmiTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [approvalTarget, setApprovalTarget] = useState<any>(null);
  const [page, setPage] = useState(1);
  const qClient = useQueryClient();

  const getStatusQuery = (tab: string) => {
    if (tab === 'active') return 'active';
    if (tab === 'pending') return 'pending_approval';
    if (tab === 'completed') return 'completed'; // For defaulted we might need multiple statuses, backend only accepts one string right now or we can just fetch all and filter locally for now. Let's just fetch all and filter locally if we don't want to change backend, but that breaks pagination. I will pass status to backend.
    return '';
  };

  const statusQuery = getStatusQuery(tab);

  const { data, isLoading } = useQuery({
    queryKey: ['investments', page, statusQuery],
    queryFn: () => api.get(`/investments?page=${page}&limit=10${statusQuery ? `&status=${statusQuery}` : ''}`).then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users?limit=100').then((r) => r.data),
  });
  const users = usersData?.data || [];

  const voteMutation = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: string }) =>
      api.post(`/investments/${id}/vote`, { vote }),
    onSuccess: () => {
      toast.success('Vote recorded! ✅');
      qClient.invalidateQueries({ queryKey: ['investments'] });
    },
    onError: () => toast.error('Failed to record vote'),
  });

  // Local filter for defaulted and completed if tab is completed, 
  // since backend currently only handles exact string match for status.
  const investments = (data?.data || []).filter((inv: any) => {
    if (tab === 'completed') return inv.status === 'completed' || inv.status === 'defaulted';
    return true;
  });
  
  const pagination = data?.pagination;

  const statusColor: Record<string, string> = {
    active: 'badge-success', pending_approval: 'badge-warning',
    completed: 'badge-accent', defaulted: 'badge-danger',
  };

  const typeLabel: Record<string, string> = {
    personal_loan: 'Personal Loan', business: 'Business Loan', interest_lending: 'Interest Lending',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Investments</h2>
          <p className="text-xs text-muted mt-0.5">Group investment portfolio</p>
        </div>
        {isAdmin && !user?.isDisabled && (
          <button onClick={() => setShowModal(true)} className="btn-primary btn-md">
            <Plus className="w-4 h-4" /> New
          </button>
        )}
      </div>

      {/* Live calculator */}
      <LiveCalculator />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {['all', 'pending', 'active', 'completed'].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
              tab === t ? 'bg-accent text-white border-accent' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {t === 'completed' ? 'Completed / Rejected' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Investments list */}
      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="card p-5"><div className="skeleton h-20 w-full rounded-xl" /></div>
          ))
        ) : investments.length === 0 ? (
          <div className="card p-10 text-center">
            <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-muted text-sm">No investments found</p>
            {isAdmin && !user?.isDisabled && (
              <button onClick={() => setShowModal(true)} className="btn-primary btn-md mt-4">
                Create First Investment
              </button>
            )}
          </div>
        ) : (
          investments.map((inv: any, i: number) => {
            const activeMembers = users?.filter((u: any) => !u.isDisabled) || [];
            const activeMembersCount = activeMembers.length;
            const userVote = inv.votes?.find((v: any) => v.userId?._id === user?._id || v.userId === user?._id);
            const approveCount = inv.votes?.filter((v: any) => v.vote === 'approve').length || 0;
            const rejectCount = inv.votes?.filter((v: any) => v.vote === 'reject').length || 0;
            const isExpanded = expandedId === inv._id;
            const repaidPct = inv.totalReturn > 0 ? Math.min(100, Math.round((inv.repaidAmount / inv.totalReturn) * 100)) : 0;

            return (
              <motion.div
                key={inv._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{inv.personName}</h3>
                        <span className={`badge ${statusColor[inv.status] || 'badge-gray'}`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                        {inv.repaymentMode === 'emi' && (
                          <span className="badge bg-purple-100 text-purple-700 border-purple-200">📅 EMI</span>
                        )}
                        {inv.repaymentMode === 'lump_sum' && (
                          <span className="badge bg-blue-100 text-blue-700 border-blue-200">💰 Lump Sum</span>
                        )}
                        {isAdmin && !user?.isDisabled && (inv.status === 'pending_approval' || inv.status === 'active') && (
                          <button
                            onClick={() => {
                              setEditTarget(inv);
                              setShowModal(true);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-accent hover:bg-gray-100 transition-colors flex-shrink-0"
                            title="Edit Investment Proposal"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{typeLabel[inv.type] || inv.type}</p>
                      {inv.personPhone && <p className="text-xs text-muted">{inv.personPhone}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(inv.amount)}</p>
                      <p className="text-xs text-accent">{inv.interestRate}{inv.interestType === 'monthly' ? '% p.m.' : '% p.a.'}</p>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted">Duration</p>
                      <p className="font-bold text-gray-900 text-sm">{inv.durationMonths}mo</p>
                    </div>
                    <div className="bg-success-bg rounded-xl p-3 text-center">
                      <p className="text-xs text-muted">Profit</p>
                      <p className="font-bold text-success text-sm">{formatCurrency(inv.profit)}</p>
                    </div>
                    <div className="bg-accent/10 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted">{inv.repaymentMode === 'emi' ? 'EMI/mo' : 'Total Return'}</p>
                      <p className="font-bold text-accent text-sm">
                        {inv.repaymentMode === 'emi' ? formatCurrency(inv.emiAmount) : formatCurrency(inv.totalReturn)}
                      </p>
                    </div>
                  </div>

                  {/* Date range */}
                  <p className="text-xs text-muted">{formatDate(inv.startDate)} → {formatDate(inv.endDate)}</p>

                  {/* Repayment progress for lump-sum active */}
                  {inv.status === 'active' && inv.repaymentMode === 'lump_sum' && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted">Repayment Progress</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(inv.repaidAmount)} / {formatCurrency(inv.totalReturn)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-accent to-success rounded-full" style={{ width: `${repaidPct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Toggle expand/collapse */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : inv._id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Hide Details' : 'View Borrower Details & Repayment'}
                  </button>
                </div>

                {/* Expanded section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 overflow-hidden"
                    >
                      <div className="p-5 space-y-4">
                        {/* Borrower details */}
                        <BorrowerDetails inv={inv} />

                        {/* EMI tracker */}
                        {inv.repaymentMode === 'emi' && inv.status === 'active' && (
                          <EmiTracker
                            inv={inv}
                            isAdmin={isAdmin}
                            onRecord={() => setEmiTarget(inv)}
                          />
                        )}

                        {/* Notes */}
                        {inv.notes && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-xs text-amber-900">{inv.notes}</p>
                          </div>
                        )}

                        {/* Proposed by */}
                        {inv.createdBy?.name && (
                          <p className="text-xs text-muted">Proposed by <span className="font-semibold text-gray-700">{inv.createdBy.name}</span></p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Voting section */}
                {inv.status === 'pending_approval' && (
                  <div className="border-t border-gray-100 p-5 space-y-3">
                    {/* Unanimous disclaimer */}
                    <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-[11px] text-amber-850 leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900">Unanimous Consent Required:</span> All active group members must approve. Any rejection fails the proposal immediately.
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Vote className="w-3.5 h-3.5" /> Member Votes ({approveCount}/{activeMembersCount})
                      </p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-success font-semibold">✅ {approveCount}</span>
                        <span className="text-danger font-semibold">❌ {rejectCount}</span>
                      </div>
                    </div>

                    {/* Vote bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: activeMembersCount > 0 ? `${(approveCount / activeMembersCount) * 100}%` : '0%' }}
                      />
                    </div>

                    {/* Voter avatars */}
                    {inv.votes?.length > 0 && (
                      <div className="flex -space-x-1">
                        {inv.votes.slice(0, 6).map((v: any) => (
                          <div
                            key={v._id}
                            title={`${v.userId?.name}: ${v.vote}`}
                            className={`avatar avatar-sm border-2 ${v.vote === 'approve' ? 'border-success' : 'border-danger'}`}
                          >
                            {getInitials(v.userId?.name || 'U')}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Voting controls for everyone (members and admins) */}
                    {user?.isDisabled ? (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 text-center font-medium mt-3">
                        🔒 Account disabled. You cannot vote.
                      </div>
                    ) : !userVote ? (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => voteMutation.mutate({ id: inv._id, vote: 'reject' })}
                          className="btn btn-md flex-1 bg-danger-bg text-danger hover:bg-red-100 border border-danger/20"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => voteMutation.mutate({ id: inv._id, vote: 'approve' })}
                          className="btn-primary btn-md flex-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                      </div>
                    ) : (
                      <div className={`p-2 rounded-xl text-xs font-semibold text-center mt-3 ${
                        userVote.vote === 'approve' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                      }`}>
                        You voted: {userVote.vote === 'approve' ? '✅ Approve' : '❌ Reject'}
                      </div>
                    )}

                    {/* Final Approval logic exclusively for Admins */}
                    {isAdmin && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        {approveCount < activeMembersCount ? (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-muted text-center font-medium">
                            ⏳ Waiting for member approvals ({approveCount} / {activeMembersCount} approved)
                          </div>
                        ) : (
                          <div className="bg-success-bg/30 border border-success/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-success font-bold text-sm">
                              <CheckCircle className="w-5 h-5 text-success" />
                              <span>All Members Have Approved!</span>
                            </div>
                            <p className="text-xs text-muted">
                              All active group members have voted to approve this investment proposal. As the admin, you can now review the details and perform the final approval.
                            </p>
                            {!user?.isDisabled && (
                              <button
                                onClick={() => setApprovalTarget(inv)}
                                className="btn-primary btn-md w-full bg-success hover:bg-success-dark text-white border-none shadow-md shadow-success/10 font-bold flex items-center justify-center gap-2"
                              >
                                <Shield className="w-4 h-4" /> Review & Approve Loan
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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

      <NewInvestmentModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditTarget(null);
        }}
        investment={editTarget}
      />

      {/* EMI Record Modal */}
      <AnimatePresence>
        {emiTarget && (
          <RecordEmiModal
            isOpen={true}
            onClose={() => setEmiTarget(null)}
            investment={emiTarget}
          />
        )}
      </AnimatePresence>

      {/* Admin Approval Confirmation Modal */}
      <AnimatePresence>
        {approvalTarget && (
          <ApprovalConfirmModal
            isOpen={true}
            onClose={() => setApprovalTarget(null)}
            investment={approvalTarget}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
