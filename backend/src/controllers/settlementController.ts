import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Settlement from '../models/Settlement';
import Group from '../models/Group';
import Payment from '../models/Payment';
import User from '../models/User';
import Investment from '../models/Investment';
import Notification from '../models/Notification';

export const initiateLeaveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const group = await Group.findOne({ isActive: true });
    
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    // Check if user already requested
    const existing = await Settlement.findOne({ userId, status: { $ne: 'accepted_by_member' } });
    if (existing) {
      res.status(400).json({ success: false, message: 'You already have an active leave request.' });
      return;
    }

    const request = await Settlement.create({
      userId,
      groupId: group._id,
      status: 'requested_by_member'
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: admin._id,
      groupId: group._id,
      title: 'Member Leave Request',
      message: 'A member has requested to leave the group and requires a settlement calculation.',
      type: 'announcement'
    }));
    await Notification.insertMany(notifications);

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getSettlements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const filter: any = {};
    
    if (!isAdmin) {
      filter.userId = req.user?.userId;
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [settlements, total] = await Promise.all([
      Settlement.find(filter)
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Settlement.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: settlements,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const proposeSettlement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const { totalInvested, groupProfitShare, adminNote } = req.body;

    const settlement = await Settlement.findById(id).populate('userId', 'name');
    if (!settlement) {
      res.status(404).json({ success: false, message: 'Settlement request not found' });
      return;
    }

    settlement.totalInvested = totalInvested;
    settlement.groupProfitShare = groupProfitShare;
    settlement.finalAmount = Number(totalInvested) + Number(groupProfitShare);
    settlement.adminNote = adminNote;
    settlement.status = 'proposed_by_admin';
    settlement.proposedAt = new Date();
    await settlement.save();

    // Notify the member
    await Notification.create({
      userId: settlement.userId,
      title: 'Settlement Proposed',
      message: `Admin has proposed a settlement amount of ₹${settlement.finalAmount}. Please review and accept to finalize leaving the group.`,
      type: 'payment_approved'
    });

    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const acceptSettlement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const settlement = await Settlement.findById(id).populate('userId', 'name');
    
    if (!settlement) {
      res.status(404).json({ success: false, message: 'Settlement not found' });
      return;
    }

    if (settlement.userId._id.toString() !== req.user?.userId) {
      res.status(403).json({ success: false, message: 'Unauthorized to accept this settlement' });
      return;
    }

    settlement.status = 'accepted_by_member';
    settlement.acceptedAt = new Date();
    await settlement.save();

    // Disable the user
    await User.findByIdAndUpdate(settlement.userId._id, { isDisabled: true });

    // Notify all active members
    const activeUsers = await User.find({ isActive: true, isDisabled: false });
    const memberName = (settlement.userId as any).name;
    const notifications = activeUsers.map(u => ({
      userId: u._id,
      groupId: settlement.groupId,
      title: 'Member Left Group',
      message: `${memberName} has finalized their settlement of ₹${settlement.finalAmount} and left the group.`,
      type: 'member_removed'
    }));
    await Notification.insertMany(notifications);

    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
