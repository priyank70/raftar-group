import { Response } from 'express';
import { differenceInDays, startOfDay } from 'date-fns';
import mongoose from 'mongoose';
import Installment from '../models/Installment';
import Group from '../models/Group';
import User from '../models/User';
import Payment from '../models/Payment';
import { AuthRequest } from '../middleware/auth';

// Helper: create installments for a user for current and upcoming months
export const createInstallmentsForUser = async (userId: string): Promise<void> => {
  const group = await Group.findOne({ isActive: true });
  if (!group) return;

  const user = await User.findById(userId);
  if (!user) return;

  const startDate = user.joinedAt || group.startDate || new Date();
  const now = new Date();

  // 1. Clean up pending/overdue installments from before the user's joined date
  const joinedMonth = startDate.getMonth() + 1;
  const joinedYear = startDate.getFullYear();

  await Installment.deleteMany({
    userId,
    status: { $in: ['pending', 'overdue'] },
    $or: [
      { year: { $lt: joinedYear } },
      { year: joinedYear, month: { $lt: joinedMonth } }
    ]
  });

  // 2. Generate installments from user's joinedAt date up to now + 12 months
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 12;
  const totalMonths = Math.max(12, monthsDiff);

  for (let i = 0; i < totalMonths; i++) {
    const targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, group.dueDay);
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    const existing = await Installment.findOne({ userId, month, year });
    if (!existing) {
      await Installment.create({
        userId,
        groupId: group._id,
        month,
        year,
        amount: group.installmentAmount,
        dueDate: targetDate,
        status: 'pending',
      });
    }
  }
};

// GET /api/installments - get all installments (admin sees all, member sees own)
export const getInstallments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, month, year, status } = req.query;
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};

    if (req.user?.role !== 'admin') {
      filter.userId = req.user?.userId;
    } else if (userId) {
      filter.userId = userId;
    }

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;

    const total = await Installment.countDocuments(filter);
    const installments = await Installment.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: installments,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/installments/calculate-penalty - live penalty calculation
export const calculateLivePenalty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    const now = startOfDay(new Date());
    const userId = req.user?.role === 'admin' ? (req.query.userId as string) : req.user?.userId;

    const overdueInstallments = await Installment.find({
      ...(userId ? { userId } : {}),
      status: { $in: ['pending', 'overdue'] },
      dueDate: { $lt: now },
    }).populate('userId', 'name email');

    const results = overdueInstallments.map((inst) => {
      const targetDate = inst.extendedDueDate ? startOfDay(inst.extendedDueDate) : startOfDay(inst.dueDate);
      const daysLate = targetDate < now ? differenceInDays(now, targetDate) : 0;
      const penaltyAmount = inst.isDelayed ? 0 : Math.round(inst.amount * (group.penaltyRate / 100) * daysLate);
      const totalDue = inst.amount + penaltyAmount;
      return { ...inst.toJSON(), daysLate, penaltyAmount, totalDue };
    });

    // Update installments with current penalty
    for (const result of results) {
      await Installment.findByIdAndUpdate(result._id, {
        penaltyAmount: result.penaltyAmount,
        penaltyDays: result.daysLate,
        status: 'overdue',
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/installments/my-status - member's installment summary
export const getMyInstallmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Current month installment
    const currentInstallment = await Installment.findOne({ userId, month: currentMonth, year: currentYear });

    // All pending/overdue
    const pendingInstallments = await Installment.find({
      userId,
      status: { $in: ['pending', 'overdue'] },
    }).sort({ year: 1, month: 1 });

    // Total paid
    const paidInstallments = await Installment.find({ userId, status: 'paid' });
    const totalPaid = paidInstallments.reduce((sum, i) => sum + i.amount, 0);
    const totalPenaltyPaid = paidInstallments.reduce((sum, i) => sum + i.penaltyAmount, 0);

    // Current penalty calculation
    const todayStart = startOfDay(now);
    let currentPenalty = 0;
    
    // Next month calculation (for when current month is already paid)
    const nextMonthDate = new Date(currentYear, currentMonth, 1); // currentMonth is 1-indexed → this gives 1st of next month
    const nextMonth = nextMonthDate.getMonth() + 1;
    const nextYear = nextMonthDate.getFullYear();

    // Check if current month has any pending/overdue installment in DB
    const currentMonthHasPending = pendingInstallments.some(
      (i) => i.year === currentYear && i.month === currentMonth
    );

    // Filter pending installments:
    // - Past overdue months (always shown)
    // - Current month if still pending/overdue
    // - Next month ONLY if current month is already paid (so member sees upcoming due)
    const visiblePendingInstallments = pendingInstallments.filter((inst) => {
      const isPastMonth = inst.year < currentYear || (inst.year === currentYear && inst.month < currentMonth);
      const isCurrentMonth = inst.year === currentYear && inst.month === currentMonth;
      const isNextMonth = !currentMonthHasPending && inst.year === nextYear && inst.month === nextMonth;
      return isPastMonth || isCurrentMonth || isNextMonth;
    });

    for (const inst of visiblePendingInstallments) {
      const targetDate = inst.extendedDueDate ? startOfDay(inst.extendedDueDate) : startOfDay(inst.dueDate);
      if (!inst.isDelayed && targetDate < todayStart) {
        const daysLate = differenceInDays(todayStart, targetDate);
        const penalty = Math.round(inst.amount * (group.penaltyRate / 100) * daysLate);
        inst.penaltyAmount = penalty; // Add to object for frontend
        inst.penaltyDays = daysLate;
        currentPenalty += penalty;
      }
    }

    // Next due date (next valid pending one)
    const nextPending = pendingInstallments.find((i) => i.status === 'pending');

    // Check if user has any pending payment awaiting approval
    const pendingPayment = await Payment.findOne({ userId, status: 'pending' });

    res.json({
      success: true,
      data: {
        currentInstallment,
        pendingInstallments: visiblePendingInstallments,
        paidInstallmentsCount: paidInstallments.length,
        totalPaid,
        totalPenaltyPaid,
        currentPenalty,
        totalOwed: pendingInstallments.reduce((sum, i) => sum + i.amount, 0) + currentPenalty,
        nextDueDate: nextPending?.dueDate,
        group: { 
          installmentAmount: group.installmentAmount, 
          dueDay: group.dueDay, 
          penaltyRate: group.penaltyRate,
          upiId: group.upiId,
          upiName: group.upiName,
          qrCodeImage: group.qrCodeImage
        },
        hasPendingPayment: !!pendingPayment,
        pendingPaymentDetails: pendingPayment ? {
          _id: pendingPayment._id,
          amount: pendingPayment.amount,
          submittedAt: pendingPayment.submittedAt,
          transactionId: pendingPayment.transactionId
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/installments/regenerate (admin)
export const regenerateInstallments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({ isActive: true, isDisabled: { $ne: true } });
    for (const user of users) {
      await createInstallmentsForUser(user._id.toString());
    }
    res.json({ success: true, message: 'Installments regenerated for all members' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/installments/:id/delay (admin)
export const delayInstallment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const installment = await Installment.findById(req.params.id);
    if (!installment) {
      res.status(404).json({ success: false, message: 'Installment not found' });
      return;
    }
    installment.isDelayed = !installment.isDelayed;
    if (installment.isDelayed) {
      // Clear penalty if delayed
      installment.penaltyAmount = 0;
      installment.penaltyDays = 0;
    }
    await installment.save();
    res.json({ success: true, message: `Installment marked as ${installment.isDelayed ? 'delayed' : 'normal'}`, data: installment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
