import { Response } from 'express';
import { differenceInDays, startOfDay, addMonths } from 'date-fns';
import Payment from '../models/Payment';
import Installment from '../models/Installment';
import Group from '../models/Group';
import Notification from '../models/Notification';
import Transaction from '../models/Transaction';
import ActivityLog from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';

// Helper: calculate advance payment coverage
const calculateAdvanceCoverage = (amount: number, installmentAmount: number) => {
  const fullMonths = Math.floor(amount / installmentAmount);
  const remainingBalance = amount % installmentAmount;
  return { fullMonths, remainingBalance };
};

// POST /api/payments/submit
export const submitPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, transactionNote, transactionId, paymentDate, penaltyIncluded, isCashPayment } = req.body;
    const userId = req.user?.userId;
    const isCash = isCashPayment === true || isCashPayment === 'true';

    // For online payments, transaction ID is required
    if (!isCash && !transactionId) {
      res.status(400).json({ success: false, message: 'Transaction ID is required for online payments' });
      return;
    }

    // Check if user has an existing pending payment
    const existingPending = await Payment.findOne({ userId, status: 'pending' });
    if (existingPending) {
      res.status(400).json({
        success: false,
        message: 'You have a pending payment request. Please wait until the admin approves or rejects it before making another payment.'
      });
      return;
    }

    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    // Auto-generate transaction ID for cash payments
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const finalTransactionId = isCash
      ? (transactionId || `CASH-${dateStr}-${randomSuffix}`)
      : transactionId;

    const paymentAmount = Number(amount);
    const penaltyAmount = Number(penaltyIncluded || 0);
    const baseAmountPaid = Math.max(0, paymentAmount - penaltyAmount);
    const { fullMonths, remainingBalance } = calculateAdvanceCoverage(baseAmountPaid, group.installmentAmount);

    const paymentType = isCash ? 'cash' : (fullMonths > 1 ? 'advance' : fullMonths === 1 ? 'installment' : 'partial');

    const payment = await Payment.create({
      userId,
      groupId: group._id,
      amount: paymentAmount,
      paymentType,
      isCashPayment: isCash,
      transactionNote,
      transactionId: finalTransactionId,
      coverageMonths: fullMonths,
      remainingBalance,
      status: 'pending',
      submittedAt: paymentDate ? new Date(paymentDate) : new Date(),
      penaltyIncluded: penaltyAmount,
    });

    // Notify all admins
    const { default: User } = await import('../models/User');
    const admins = await User.find({ role: 'admin', isActive: true });
    const paymentLabel = isCash ? '💵 Cash payment' : 'Payment';
    const notifPromises = admins.map((admin) =>
      Notification.create({
        userId: admin._id,
        groupId: group._id,
        type: 'payment_submitted',
        title: `New ${isCash ? 'Cash ' : ''}Payment Submitted`,
        message: `${paymentLabel} of ₹${paymentAmount} has been submitted and requires approval.`,
        data: { paymentId: payment._id },
      })
    );
    await Promise.all(notifPromises);

    await ActivityLog.create({
      userId,
      groupId: group._id,
      action: 'PAYMENT_SUBMITTED',
      entityType: 'payment',
      entityId: payment._id,
      description: `${isCash ? 'Cash payment' : 'Payment'} of ₹${paymentAmount} submitted for approval`,
    });

    res.status(201).json({ success: true, message: 'Payment submitted successfully', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// GET /api/payments
export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, status, search, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = {};

    if (req.user?.role !== 'admin') {
      filter.userId = req.user?.userId;
    } else if (userId) {
      filter.userId = userId;
    }
    
    if (status) filter.status = status;

    if (search && req.user?.role === 'admin') {
      const { default: User } = await import('../models/User');
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search as string, $options: 'i' } },
          { email: { $regex: search as string, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      
      // If we already have a specific userId filter, we intersect them, 
      // otherwise we just use the matching user IDs.
      if (filter.userId) {
         filter.userId = { $in: userIds.filter(id => id.toString() === filter.userId?.toString()) };
      } else {
         filter.userId = { $in: userIds };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'name email avatar phone')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/payments/:id/approve (admin)
export const approvePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { adminNote } = req.body;
    const payment = await Payment.findById(req.params.id).populate('userId', 'name');
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    if (payment.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Payment already processed' });
      return;
    }

    const group = await Group.findById(payment.groupId);
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    payment.status = 'approved';
    payment.adminNote = adminNote;
    payment.reviewedBy = req.user?.userId as any;
    payment.reviewedAt = new Date();

    // Cover installments based on actual amount and penalties calculated up to payment date
    const pendingInstallments = await Installment.find({
      userId: payment.userId,
      status: { $in: ['pending', 'overdue'] },
    }).sort({ year: 1, month: 1 });

    const coveredInstallmentIds = [];
    let remainingPaymentAmount = payment.amount;

    for (const inst of pendingInstallments) {
      const targetDate = inst.extendedDueDate ? startOfDay(inst.extendedDueDate) : startOfDay(inst.dueDate);
      const paymentDateStart = startOfDay(payment.submittedAt);
      const daysLate = targetDate < paymentDateStart ? differenceInDays(paymentDateStart, targetDate) : 0;
      const calculatedPenalty = inst.isDelayed ? 0 : Math.round(inst.amount * (group.penaltyRate / 100) * daysLate);

      const totalDueForInst = inst.amount + calculatedPenalty;
      if (remainingPaymentAmount >= totalDueForInst) {
        remainingPaymentAmount -= totalDueForInst;
        inst.status = 'paid';
        inst.paidAt = payment.submittedAt;
        inst.penaltyAmount = calculatedPenalty;
        inst.penaltyDays = daysLate;
        inst.advancePaymentId = payment._id;
        await inst.save();
        coveredInstallmentIds.push(inst._id);
      } else {
        break; // Not enough to cover the next installment
      }
    }

    payment.installmentIds = coveredInstallmentIds as any;
    await payment.save();

    // Create transaction record
    await Transaction.create({
      userId: payment.userId,
      groupId: payment.groupId,
      paymentId: payment._id,
      type: 'credit',
      category: payment.coverageMonths > 1 ? 'advance' : 'installment',
      amount: payment.amount,
      balance: 0, // Would be calculated from group balance
      description: `Payment of ₹${payment.amount} approved`,
      date: new Date(),
    });

    // Notify member
    await Notification.create({
      userId: payment.userId,
      groupId: payment.groupId,
      type: 'payment_approved',
      title: '✅ Payment Approved',
      message: `Your payment of ₹${payment.amount} has been approved!`,
      data: { paymentId: payment._id },
    });

    await ActivityLog.create({
      userId: req.user?.userId,
      groupId: payment.groupId,
      action: 'PAYMENT_APPROVED',
      entityType: 'payment',
      entityId: payment._id,
      description: `Payment of ₹${payment.amount} approved`,
    });

    res.json({ success: true, message: 'Payment approved', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/payments/:id/reject (admin)
export const rejectPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { adminNote } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Payment not found or already processed' });
      return;
    }

    payment.status = 'rejected';
    payment.adminNote = adminNote;
    payment.reviewedBy = req.user?.userId as any;
    payment.reviewedAt = new Date();
    await payment.save();

    await Notification.create({
      userId: payment.userId,
      groupId: payment.groupId,
      type: 'payment_rejected',
      title: '❌ Payment Rejected',
      message: `Your payment of ₹${payment.amount} was rejected. Reason: ${adminNote || 'No reason provided'}`,
      data: { paymentId: payment._id },
    });

    res.json({ success: true, message: 'Payment rejected', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/payments/pending-count (admin)
export const getPendingCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await Payment.countDocuments({ status: 'pending' });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
