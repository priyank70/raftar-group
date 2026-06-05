import { Response } from 'express';
import Group from '../models/Group';
import User from '../models/User';
import Payment from '../models/Payment';
import Installment from '../models/Installment';
import Investment from '../models/Investment';
import ActivityLog from '../models/ActivityLog';
import Settlement from '../models/Settlement';
import { AuthRequest } from '../middleware/auth';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const getGroupStats = async (currentMonthStart: Date, currentMonthEnd: Date) => {
  const [
    totalCollectedResult,
    currentMonthCollected,
    totalInvested,
    settlementsResult,
    investmentProfitResult,
    paymentPenaltyResult,
    totalRepaidResult,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'approved', submittedAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Investment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Settlement.aggregate([
      { $match: { status: 'accepted_by_member' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]),
    Investment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $project: {
          actualProfit: {
            $max: [{ $subtract: ['$repaidAmount', '$amount'] }, 0]
          }
        }
      },
      { $group: { _id: null, totalProfit: { $sum: '$actualProfit' } } }
    ]),
    Installment.aggregate([
      { $match: { status: { $in: ['paid', 'covered_by_advance'] }, penaltyAmount: { $gt: 0 } } },
      { $group: { _id: null, totalPenalty: { $sum: '$penaltyAmount' } } }
    ]),
    Investment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$repaidAmount' } } }
    ]),
  ]);

  const grossCollected = totalCollectedResult[0]?.total || 0;
  const totalSettlementsPaid = settlementsResult[0]?.total || 0;
  const netCollected = grossCollected - totalSettlementsPaid;

  const totalProfit = (investmentProfitResult[0]?.totalProfit || 0) + (paymentPenaltyResult[0]?.totalPenalty || 0);
  const totalRepaid = totalRepaidResult[0]?.total || 0;

  return {
    totalCollected: netCollected,
    currentMonthCollected: currentMonthCollected[0]?.total || 0,
    totalInvested: totalInvested[0]?.total || 0,
    totalProfit,
    totalRepaid,
    groupBalance: netCollected - (totalInvested[0]?.total || 0) + totalRepaid,
  };
};

// GET /api/dashboard/admin
export const getAdminDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const groupStats = await getGroupStats(currentMonthStart, currentMonthEnd);

    const [
      totalMembers,
      pendingPayments,
      activeInvestments,
      recentActivities,
      overdueCount,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Payment.countDocuments({ status: 'pending' }),
      Investment.countDocuments({ status: 'active' }),
      ActivityLog.find({ groupId: group._id }).populate('userId', 'name avatar').sort({ createdAt: -1 }).limit(10),
      Installment.countDocuments({ status: 'overdue' }),
    ]);

    // Monthly collection data for chart (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const collected = await Payment.aggregate([
        { $match: { status: 'approved', submittedAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      monthlyData.push({
        month: monthStart.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        amount: collected[0]?.total || 0,
      });
    }

    // Fetch active users, current month installments, and pending payments
    const [users, currentMonthInstallments, pendingPaymentsList] = await Promise.all([
      User.find({ isActive: true }).select('name email phone avatar role joinedAt').sort({ joinedAt: 1 }),
      Installment.find({ month: currentMonthStart.getMonth() + 1, year: currentMonthStart.getFullYear() }),
      Payment.find({ status: 'pending' })
    ]);

    const installmentMap = new Map();
    currentMonthInstallments.forEach((inst) => {
      installmentMap.set(inst.userId.toString(), inst);
    });

    const pendingPaymentMap = new Map();
    pendingPaymentsList.forEach((p) => {
      pendingPaymentMap.set(p.userId.toString(), p);
    });

    const memberStatuses = users.map((user) => {
      const inst = installmentMap.get(user._id.toString());
      const pendingPayment = pendingPaymentMap.get(user._id.toString());

      let displayStatus = 'pending';
      if (inst) {
        if (inst.status === 'paid' || inst.status === 'covered_by_advance') {
          displayStatus = 'paid';
        } else if (pendingPayment) {
          displayStatus = 'awaiting_approval';
        } else if (inst.status === 'overdue') {
          displayStatus = 'overdue';
        } else if (inst.extendedDueDate) {
          if (new Date(inst.extendedDueDate) < now) {
            displayStatus = 'overdue';
          } else {
            displayStatus = 'delayed';
          }
        } else {
          if (new Date(inst.dueDate) < now) {
            displayStatus = 'overdue';
          } else {
            displayStatus = 'pending';
          }
        }
      } else {
        displayStatus = pendingPayment ? 'awaiting_approval' : 'pending';
      }

      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        displayStatus,
        installment: inst ? {
          _id: inst._id,
          status: inst.status,
          dueDate: inst.dueDate,
          extendedDueDate: inst.extendedDueDate,
          paidAt: inst.paidAt,
          amount: inst.amount,
          penaltyAmount: inst.penaltyAmount
        } : null,
        pendingPayment: pendingPayment ? {
          _id: pendingPayment._id,
          amount: pendingPayment.amount,
          submittedAt: pendingPayment.submittedAt,
          transactionId: pendingPayment.transactionId
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalMembers,
          activeInvestments,
          pendingPayments,
          overdueCount,
          ...groupStats
        },
        monthlyData,
        recentActivities,
        group,
        memberStatuses
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/dashboard/member
export const getMemberDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const group = await Group.findOne({ isActive: true });
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Next month for "current month paid" scenario
    const nextMonthDate = new Date(currentYear, currentMonth, 1);
    const nextMonth = nextMonthDate.getMonth() + 1;
    const nextYear = nextMonthDate.getFullYear();

    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const mongoose = require('mongoose');
    const [totalPaidResult, allPendingInstallments, recentPayments, notifications, paidInstallmentsCount, groupStats] = await Promise.all([
      Payment.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId as string), status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Installment.find({ userId, status: { $in: ['pending', 'overdue'] } }).sort({ year: 1, month: 1 }),
      Payment.find({ userId }).sort({ createdAt: -1 }).limit(5),
      (await import('../models/Notification')).default.find({ userId, isRead: false }).limit(5),
      Installment.countDocuments({ userId, status: 'paid' }),
      getGroupStats(currentMonthStart, currentMonthEnd),
    ]);

    // Apply the same visibility filter as getMyInstallmentStatus
    // Only show: past overdue + current month + next month (if current is paid)
    const currentMonthHasPending = allPendingInstallments.some(
      (i) => i.year === currentYear && i.month === currentMonth
    );

    const visiblePendingInstallments = allPendingInstallments.filter((inst) => {
      const isPastMonth = inst.year < currentYear || (inst.year === currentYear && inst.month < currentMonth);
      const isCurrentMonth = inst.year === currentYear && inst.month === currentMonth;
      const isNextMonth = !currentMonthHasPending && inst.year === nextYear && inst.month === nextMonth;
      return isPastMonth || isCurrentMonth || isNextMonth;
    });

    // Next due is the first visible pending installment
    // Respect extendedDueDate (approved delay) for countdown
    const nextDue = visiblePendingInstallments[0] || null;
    const effectiveDueDate = nextDue?.extendedDueDate || nextDue?.dueDate;
    const daysUntilDue = effectiveDueDate
      ? Math.ceil((new Date(effectiveDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      success: true,
      data: {
        totalPaid: totalPaidResult[0]?.total || 0,
        pendingInstallments: visiblePendingInstallments,
        totalPending: visiblePendingInstallments.length,
        paidInstallmentsCount,
        nextDue,
        daysUntilDue,
        recentPayments,
        notifications,
        groupStats,
        unreadNotifications: notifications.length,
        group,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/dashboard/group-settings (admin)
export const getGroupSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await Group.findOne({ isActive: true });
    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/dashboard/group-settings (admin)
export const updateGroupSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { installmentAmount, dueDay, penaltyRate, upiId, upiName, startDate, rules } = req.body;
    const updateData: Record<string, unknown> = {};
    if (installmentAmount) updateData.installmentAmount = Number(installmentAmount);
    if (dueDay) updateData.dueDay = Number(dueDay);
    if (penaltyRate) updateData.penaltyRate = Number(penaltyRate);
    if (upiId !== undefined) updateData.upiId = upiId;
    if (upiName !== undefined) updateData.upiName = upiName;
    if (startDate) updateData.startDate = new Date(startDate);
    if (rules !== undefined) {
      try {
        updateData.rules = typeof rules === 'string' ? JSON.parse(rules) : rules;
      } catch (e) {
        updateData.rules = [];
      }
    }

    if (req.file) {
      updateData.qrCodeImage = `/uploads/qr/${req.file.filename}`;
    }

    const group = await Group.findOneAndUpdate({ isActive: true }, updateData, { new: true });
    res.json({ success: true, message: 'Group settings updated', data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/dashboard/activity-log
export const getActivityLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await Group.findOne({ isActive: true });
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const query = { groupId: group?._id };
    
    const total = await ActivityLog.countDocuments(query);
    const activities = await ActivityLog.find(query)
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: activities,
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

// POST /api/dashboard/announcement (admin)
export const sendAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, message } = req.body;
    const group = await Group.findOne({ isActive: true });
    const members = await User.find({ isActive: true });
    const notifPromises = members.map((member) =>
      (require('../models/Notification').default).create({
        userId: member._id,
        groupId: group?._id,
        type: 'announcement',
        title,
        message,
      })
    );
    await Promise.all(notifPromises);
    res.json({ success: true, message: 'Announcement sent to all members' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
