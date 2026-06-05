import { Response } from 'express';
import mongoose from 'mongoose';
import DelayRequest from '../models/DelayRequest';
import Installment from '../models/Installment';
import Group from '../models/Group';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

import User from '../models/User';

// POST /api/delay-requests
export const createDelayRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { installmentId, requestedDate, reason, notes } = req.body;
    const userId = req.user?.userId;

    const installment = await Installment.findById(installmentId);
    if (!installment || installment.userId.toString() !== userId) {
      res.status(404).json({ success: false, message: 'Installment not found' });
      return;
    }

    if (installment.status === 'paid' || installment.status === 'covered_by_advance') {
      res.status(400).json({ success: false, message: 'Installment already paid' });
      return;
    }

    // Validate that current date is before the installment due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(installment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (today >= dueDate) {
      res.status(400).json({ success: false, message: 'Delay requests must be submitted before the installment due date.' });
      return;
    }

    // Validate that the requested date is after the original due date
    const reqDate = new Date(requestedDate);
    reqDate.setHours(0, 0, 0, 0);
    if (reqDate <= dueDate) {
      res.status(400).json({ success: false, message: 'Requested date must be after the original due date.' });
      return;
    }

    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    // Check if a pending or approved request already exists for this installment
    const existing = await DelayRequest.findOne({ installmentId, status: { $in: ['pending', 'approved'] } });
    if (existing) {
      const msg = existing.status === 'approved'
        ? 'A delay has already been approved for this installment. You cannot request another delay this month.'
        : 'A pending delay request already exists for this installment. Wait for the group to vote.';
      res.status(400).json({ success: false, message: msg });
      return;
    }

    const delayReq = await DelayRequest.create({
      userId,
      groupId: group._id,
      installmentId,
      originalDueDate: installment.dueDate,
      requestedDate: new Date(requestedDate),
      reason,
      notes,
      status: 'pending',
    });

    // Notify all members
    const members = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const notifPromises = members.map((member) =>
      Notification.create({
        userId: member._id,
        groupId: group._id,
        type: 'delay_request',
        title: 'New Delay Request',
        message: 'A member has requested to delay their installment payment. Please review.',
      })
    );
    await Promise.all(notifPromises);

    res.status(201).json({ success: true, message: 'Delay request submitted', data: delayReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/delay-requests
export const getDelayRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await DelayRequest.countDocuments();
    const requests = await DelayRequest.find()
      .populate('userId', 'name avatar email')
      .populate('installmentId')
      .populate('votes.userId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: requests,
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

// PUT /api/delay-requests/:id/vote
export const voteOnDelayRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vote, comment } = req.body;
    const userId = req.user?.userId;
    const reqId = req.params.id;

    const delayReq = await DelayRequest.findById(reqId);
    if (!delayReq) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }
    if (delayReq.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Request is no longer pending' });
      return;
    }

    // Check if voter is the requester
    if (delayReq.userId.toString() === userId) {
      res.status(400).json({ success: false, message: 'You cannot vote on your own delay request' });
      return;
    }

    // Check if user already voted
    const existingVote = delayReq.votes.find((v) => v.userId.toString() === userId);
    if (existingVote) {
      existingVote.vote = vote;
      existingVote.comment = comment;
      existingVote.votedAt = new Date();
    } else {
      delayReq.votes.push({ userId: userId as any, vote, comment, votedAt: new Date() });
    }

    await delayReq.save();

    // Check approval
    const activeMembers = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const otherActiveMembers = activeMembers.filter(
      (m) => m._id.toString() !== delayReq.userId.toString()
    );
    const requiredApprovals = otherActiveMembers.length;

    // Filter votes to only include those from active members (excluding the requester)
    const activeMemberIds = activeMembers.map((m) => m._id.toString());
    const otherVotes = delayReq.votes.filter(
      (v) =>
        activeMemberIds.includes(v.userId.toString()) &&
        v.userId.toString() !== delayReq.userId.toString()
    );

    const approveCount = otherVotes.filter((v) => v.vote === 'approve').length;
    const rejectCount = otherVotes.filter((v) => v.vote === 'reject').length;

    if (rejectCount > 0) {
      delayReq.status = 'rejected';
      await delayReq.save();
      
      await Notification.create({
        userId: delayReq.userId,
        groupId: delayReq.groupId,
        type: 'delay_rejected',
        title: '❌ Delay Request Rejected',
        message: 'Your request to delay your installment has been rejected by the group.',
      });
    } else if (approveCount >= requiredApprovals) {
      delayReq.status = 'approved';
      delayReq.approvedAt = new Date();
      delayReq.penaltyStartsFrom = delayReq.requestedDate;
      await delayReq.save();

      // Update installment
      const installment = await Installment.findById(delayReq.installmentId);
      if (installment) {
        installment.extendedDueDate = delayReq.requestedDate;
        installment.isDelayed = false; // ensure penalty is calculated after the requestedDate
        await installment.save();
      }

      await Notification.create({
        userId: delayReq.userId,
        groupId: delayReq.groupId,
        type: 'delay_approved',
        title: '✅ Delay Request Approved',
        message: 'Your request to delay your installment has been approved by the group.',
      });
    }

    res.json({ success: true, message: 'Vote recorded', data: delayReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
