import { Response } from 'express';
import Investment from '../models/Investment';
import Group from '../models/Group';
import Notification from '../models/Notification';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Calculate investment returns
const calculateReturns = (amount: number, interestRate: number, durationMonths: number, interestType: 'monthly' | 'yearly' = 'yearly') => {
  let totalReturn = amount;
  if (interestType === 'yearly') {
    totalReturn = amount * (1 + (interestRate / 100) * (durationMonths / 12));
  } else {
    totalReturn = amount * (1 + (interestRate / 100) * durationMonths);
  }
  const profit = totalReturn - amount;
  const monthlyEarning = profit / durationMonths;
  return { totalReturn: Math.round(totalReturn), profit: Math.round(profit), monthlyEarning: Math.round(monthlyEarning) };
};

// POST /api/investments (admin)
export const createInvestment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      personName, personPhone, personEmail, personAddress, personAadhaar,
      loanPurpose, collateral, guarantorName,
      type, amount, interestRate, interestType, durationMonths, startDate, notes,
      repaymentMode,
    } = req.body;

    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(durationMonths));

    const returns = calculateReturns(Number(amount), Number(interestRate), Number(durationMonths), interestType || 'yearly');
    const mode = repaymentMode === 'emi' ? 'emi' : 'lump_sum';
    const emiAmount = mode === 'emi' ? Math.round(returns.totalReturn / Number(durationMonths)) : 0;

    const investment = await Investment.create({
      groupId: group._id,
      createdBy: req.user?.userId,
      personName,
      personPhone,
      personEmail,
      personAddress,
      personAadhaar,
      loanPurpose,
      collateral,
      guarantorName,
      type,
      amount: Number(amount),
      interestRate: Number(interestRate),
      interestType: interestType || 'yearly',
      durationMonths: Number(durationMonths),
      startDate: start,
      endDate: end,
      notes,
      repaymentMode: mode,
      emiAmount,
      ...returns,
      status: 'pending_approval',
    });

    // Notify all members to vote
    const members = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const notifPromises = members.map((member) =>
      Notification.create({
        userId: member._id,
        groupId: group._id,
        type: 'investment_update',
        title: '💰 New Investment Proposed',
        message: `A new ${mode === 'emi' ? 'EMI-based' : 'lump-sum'} investment of ₹${amount} for ${personName} has been proposed. Please review and vote.`,
        data: { investmentId: investment._id },
      })
    );
    await Promise.all(notifPromises);

    res.status(201).json({ success: true, message: 'Investment proposed successfully', data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/investments
export const getInvestments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const total = await Investment.countDocuments(filter);
    const investments = await Investment.find(filter)
      .populate('createdBy', 'name email')
      .populate('votes.userId', 'name avatar')
      .populate('emiRepayments.recordedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: investments,
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

// POST /api/investments/:id/vote
export const voteOnInvestment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vote, comment } = req.body;
    const userId = req.user?.userId;
    const investment = await Investment.findById(req.params.id);

    if (!investment || investment.status !== 'pending_approval') {
      res.status(400).json({ success: false, message: 'Investment not available for voting' });
      return;
    }

    // Both admins and members can vote on investments


    const existingVote = investment.votes.find((v) => v.userId.toString() === userId);
    if (existingVote) {
      existingVote.vote = vote;
      existingVote.comment = comment;
      existingVote.votedAt = new Date();
    } else {
      investment.votes.push({ userId: userId as any, vote, comment, votedAt: new Date() });
    }

    const activeMembersCount = await User.countDocuments({ isActive: true, isDisabled: { $ne: true } });
    const approveVotes = investment.votes.filter((v) => v.vote === 'approve').length;
    const rejectVotes = investment.votes.filter((v) => v.vote === 'reject').length;

    let statusUpdated = false;
    let finalStatus = '';

    if (rejectVotes > 0) {
      investment.status = 'defaulted';
      investment.isApproved = false;
      statusUpdated = true;
      finalStatus = 'rejected';
    } else if (approveVotes === activeMembersCount) {
      statusUpdated = true;
      finalStatus = 'members_approved';
    }

    if (statusUpdated) {
      const members = await User.find({ isActive: true, isDisabled: { $ne: true } });
      const notifPromises = members.map((member) => {
        let title = '';
        let message = '';
        if (finalStatus === 'rejected') {
          title = '❌ Investment Rejected';
          message = `The proposed investment of ₹${investment.amount} for ${investment.personName} was rejected.`;
        } else if (finalStatus === 'members_approved') {
          title = '🗳️ Unanimous Member Approval';
          message = `The proposed investment of ₹${investment.amount} for ${investment.personName} has been approved by all members. Waiting for admin's final approval.`;
        }
        return Notification.create({
          userId: member._id,
          groupId: investment.groupId,
          type: 'investment_update',
          title,
          message,
          data: { investmentId: investment._id },
        });
      });
      await Promise.all(notifPromises);
    }

    await investment.save();
    res.json({ success: true, message: 'Vote recorded', data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/investments/:id
export const getInvestmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const investment = await Investment.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('votes.userId', 'name avatar')
      .populate('emiRepayments.recordedBy', 'name');
    if (!investment) {
      res.status(404).json({ success: false, message: 'Investment not found' });
      return;
    }
    res.json({ success: true, data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/investments/:id/emi (admin) — record a monthly EMI payment
export const recordEmiRepayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year, amount, note } = req.body;
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      res.status(404).json({ success: false, message: 'Investment not found' });
      return;
    }
    if (investment.status !== 'active') {
      res.status(400).json({ success: false, message: 'Investment is not active' });
      return;
    }
    if (investment.repaymentMode !== 'emi') {
      res.status(400).json({ success: false, message: 'This investment uses lump-sum repayment. Use the repayment endpoint instead.' });
      return;
    }

    // Check for duplicate EMI for the same month/year
    const alreadyPaid = investment.emiRepayments.find(
      (r) => r.month === Number(month) && r.year === Number(year)
    );
    if (alreadyPaid) {
      res.status(400).json({ success: false, message: `EMI for ${month}/${year} has already been recorded.` });
      return;
    }

    const emiEntry = {
      month: Number(month),
      year: Number(year),
      amount: Number(amount),
      paidAt: new Date(),
      note,
      recordedBy: req.user?.userId as any,
    };

    investment.emiRepayments.push(emiEntry);
    investment.repaidAmount = investment.emiRepayments.reduce((sum, r) => sum + r.amount, 0);

    // Mark completed if fully repaid
    if (investment.repaidAmount >= investment.totalReturn) {
      investment.status = 'completed';
    }

    await investment.save();

    // Notify all members about the EMI receipt
    const members = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('en-IN', { month: 'long' });
    const notifPromises = members.map((member) =>
      Notification.create({
        userId: member._id,
        groupId: investment.groupId,
        type: 'investment_update',
        title: '📥 EMI Payment Received',
        message: `${investment.personName} paid ₹${amount} EMI for ${monthName} ${year}. Total recovered: ₹${investment.repaidAmount} / ₹${investment.totalReturn}.`,
        data: { investmentId: investment._id },
      })
    );
    await Promise.all(notifPromises);

    res.json({ success: true, message: 'EMI payment recorded successfully', data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/investments/:id/repayment (admin) — lump-sum repayment
export const recordRepayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { repaidAmount } = req.body;
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      res.status(404).json({ success: false, message: 'Investment not found' });
      return;
    }
    if (investment.repaymentMode === 'emi') {
      res.status(400).json({ success: false, message: 'This investment uses EMI repayment. Use the /emi endpoint instead.' });
      return;
    }

    investment.repaidAmount = (investment.repaidAmount || 0) + Number(repaidAmount);
    if (investment.repaidAmount >= investment.totalReturn) {
      investment.status = 'completed';
    }
    await investment.save();

    res.json({ success: true, data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/investments/calculate - live calculator
export const calculateInvestment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, interestRate, durationMonths, interestType } = req.body;
    const returns = calculateReturns(Number(amount), Number(interestRate), Number(durationMonths), interestType || 'yearly');
    const emiAmount = Math.round(returns.totalReturn / Number(durationMonths));
    const roi = ((returns.profit / Number(amount)) * 100).toFixed(2);
    res.json({ success: true, data: { ...returns, roi, amount: Number(amount), emiAmount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/investments/:id (admin only)
export const updateInvestment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      personName, personPhone, personEmail, personAddress, personAadhaar,
      loanPurpose, collateral, guarantorName,
      type, amount, interestRate, interestType, durationMonths, startDate, notes,
      repaymentMode,
    } = req.body;

    const investment = await Investment.findById(req.params.id);
    if (!investment) {
      res.status(404).json({ success: false, message: 'Investment not found' });
      return;
    }

    // Recalculate terms if needed
    const start = new Date(startDate || investment.startDate);
    const duration = Number(durationMonths || investment.durationMonths);
    const end = new Date(start);
    end.setMonth(end.getMonth() + duration);

    const returns = calculateReturns(
      Number(amount || investment.amount),
      Number(interestRate || investment.interestRate),
      duration,
      interestType || investment.interestType
    );

    const mode = repaymentMode || investment.repaymentMode;
    const emiAmount = mode === 'emi' ? Math.round(returns.totalReturn / duration) : 0;

    // Update fields
    investment.personName = personName ?? investment.personName;
    investment.personPhone = personPhone ?? investment.personPhone;
    investment.personEmail = personEmail ?? investment.personEmail;
    investment.personAddress = personAddress ?? investment.personAddress;
    investment.personAadhaar = personAadhaar ?? investment.personAadhaar;
    investment.loanPurpose = loanPurpose ?? investment.loanPurpose;
    investment.collateral = collateral ?? investment.collateral;
    investment.guarantorName = guarantorName ?? investment.guarantorName;
    investment.type = type ?? investment.type;
    investment.amount = Number(amount ?? investment.amount);
    investment.interestRate = Number(interestRate ?? investment.interestRate);
    investment.interestType = interestType ?? investment.interestType;
    investment.durationMonths = duration;
    investment.startDate = start;
    investment.endDate = end;
    investment.notes = notes ?? investment.notes;
    investment.repaymentMode = mode;
    investment.emiAmount = emiAmount;
    investment.totalReturn = returns.totalReturn;
    investment.profit = returns.profit;
    investment.monthlyEarning = returns.monthlyEarning;

    // Reset approval / votes
    investment.votes = [];
    investment.status = 'pending_approval';
    investment.isApproved = false;
    investment.approvedAt = undefined;

    await investment.save();

    // Notify all members that the investment was updated and votes are reset
    const members = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const notifPromises = members.map((member) =>
      Notification.create({
        userId: member._id,
        groupId: investment.groupId,
        type: 'investment_update',
        title: '✏️ Investment Proposal Updated',
        message: `The proposed investment for ${investment.personName} has been updated by the admin. Previous votes are cleared, and all members must re-vote.`,
        data: { investmentId: investment._id },
      })
    );
    await Promise.all(notifPromises);

    res.json({ success: true, message: 'Investment updated successfully', data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/investments/:id/approve (admin only)
export const approveInvestment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const investment = await Investment.findById(req.params.id);
    if (!investment) {
      res.status(404).json({ success: false, message: 'Investment not found' });
      return;
    }

    if (investment.status !== 'pending_approval') {
      res.status(400).json({ success: false, message: 'Investment is not pending approval' });
      return;
    }

    // Verify all active members have approved
    const activeMembersCount = await User.countDocuments({ role: 'member', isActive: true, isDisabled: { $ne: true } });
    const approveVotes = investment.votes.filter((v) => v.vote === 'approve').length;
    const rejectVotes = investment.votes.filter((v) => v.vote === 'reject').length;

    if (rejectVotes > 0) {
      res.status(400).json({ success: false, message: 'Cannot approve. Investment was rejected by a member.' });
      return;
    }

    if (approveVotes < activeMembersCount) {
      res.status(400).json({
        success: false,
        message: `Cannot approve. Only ${approveVotes}/${activeMembersCount} group members have approved so far.`
      });
      return;
    }

    // Activate investment
    investment.status = 'active';
    investment.isApproved = true;
    investment.approvedAt = new Date();

    await investment.save();

    // Notify all members
    const members = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const notifPromises = members.map((member) =>
      Notification.create({
        userId: member._id,
        groupId: investment.groupId,
        type: 'investment_update',
        title: '✅ Investment Activated',
        message: `The investment of ₹${investment.amount} for ${investment.personName} has been approved by the admin and is now active!`,
        data: { investmentId: investment._id },
      })
    );
    await Promise.all(notifPromises);

    res.json({ success: true, message: 'Investment approved and activated successfully', data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
