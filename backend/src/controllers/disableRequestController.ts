import { Response } from 'express';
import mongoose from 'mongoose';
import DisableRequest from '../models/DisableRequest';
import User from '../models/User';
import Group from '../models/Group';
import Notification from '../models/Notification';
import ActivityLog from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';

export const createDisableRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.user?.userId;
    const { reason } = req.body;

    if (!adminId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!reason || reason.trim() === '') {
      res.status(400).json({ success: false, message: 'A solid reason is required to disable a member' });
      return;
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Target user not found' });
      return;
    }

    if (targetUser.isDisabled) {
      res.status(400).json({ success: false, message: 'User is already disabled' });
      return;
    }

    if (!targetUser.isActive) {
      res.status(400).json({ success: false, message: 'User is not active in the group' });
      return;
    }

    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Active group not found' });
      return;
    }

    const targetObjectId = new mongoose.Types.ObjectId(targetUserId as string);
    const adminObjectId = new mongoose.Types.ObjectId(adminId as string);

    // Check if there is already a pending disable request for this candidate
    const existingRequest = await DisableRequest.findOne({
      targetUserId: targetObjectId,
      status: 'pending',
    });

    if (existingRequest) {
      res.status(400).json({ success: false, message: 'A disable request is already pending for this member' });
      return;
    }

    const disableReq = await DisableRequest.create({
      targetUserId: targetObjectId,
      requestedBy: adminObjectId,
      groupId: group._id,
      reason: reason.trim(),
      status: 'pending',
      votes: [
        {
          userId: adminObjectId,
          vote: 'approve',
          comment: 'Initiated disable request',
          votedAt: new Date(),
        },
      ],
    });

    // Notify all active non-disabled members except the target member
    const activeMembers = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const usersToNotify = activeMembers.filter(
      (m) => m._id.toString() !== targetUserId
    );

    const notifPromises = usersToNotify.map((member) =>
      Notification.create({
        userId: member._id,
        groupId: group._id,
        type: 'disable_request',
        title: '⚠️ Member Disable Vote Needed',
        message: `${targetUser.name} has been proposed to be disabled. Reason: "${reason.trim()}". Your vote is required.`,
        data: { requestId: disableReq._id.toString() },
      })
    );
    await Promise.all(notifPromises);

    res.status(201).json({
      success: true,
      message: 'Disable request submitted to members for voting',
      data: disableReq,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDisableRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await DisableRequest.countDocuments();
    const requests = await DisableRequest.find()
      .populate('targetUserId', 'name email avatar phone role isDisabled')
      .populate('requestedBy', 'name email')
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

export const voteOnDisableRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vote, comment } = req.body;
    const userId = req.user?.userId;
    const reqId = req.params.id;

    const disableReq = await DisableRequest.findById(reqId);
    if (!disableReq) {
      res.status(404).json({ success: false, message: 'Disable request not found' });
      return;
    }

    if (disableReq.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Disable request is no longer pending' });
      return;
    }

    // Target member cannot vote on their own disable request
    if (disableReq.targetUserId.toString() === userId) {
      res.status(400).json({ success: false, message: 'You cannot vote on your own disable request' });
      return;
    }

    // Check if user already voted
    const existingVote = disableReq.votes.find((v) => v.userId.toString() === userId);
    if (existingVote) {
      existingVote.vote = vote;
      existingVote.comment = comment;
      existingVote.votedAt = new Date();
    } else {
      disableReq.votes.push({ userId: userId as any, vote, comment, votedAt: new Date() });
    }

    await disableReq.save();

    // Check status transition
    // Active members that are NOT disabled
    const activeMembers = await User.find({ isActive: true, isDisabled: { $ne: true } });
    
    // Required voters are all active, non-disabled members EXCEPT the target member
    const requiredVoters = activeMembers.filter(
      (m) => m._id.toString() !== disableReq.targetUserId.toString()
    );
    const requiredApprovals = requiredVoters.length;

    // Filter votes to only include those from active, non-disabled members (excluding target)
    const activeMemberIds = activeMembers.map((m) => m._id.toString());
    const validVotes = disableReq.votes.filter(
      (v) =>
        activeMemberIds.includes(v.userId.toString()) &&
        v.userId.toString() !== disableReq.targetUserId.toString()
    );

    const approveCount = validVotes.filter((v) => v.vote === 'approve').length;
    const rejectCount = validVotes.filter((v) => v.vote === 'reject').length;

    if (rejectCount > 0) {
      disableReq.status = 'rejected';
      await disableReq.save();

      // Notify target member and admins
      const targetUser = await User.findById(disableReq.targetUserId);
      const groupAdmins = await User.find({ role: 'admin', isActive: true });
      
      const notifUsers = [disableReq.targetUserId, ...groupAdmins.map((a) => a._id)];
      const notifPromises = notifUsers.map((uId) =>
        Notification.create({
          userId: uId,
          groupId: disableReq.groupId,
          type: 'disable_rejected',
          title: '❌ Disable Request Rejected',
          message: `The request to disable member ${targetUser?.name || ''} has been rejected by the group.`,
        })
      );
      await Promise.all(notifPromises);

    } else if (approveCount >= requiredApprovals) {
      disableReq.status = 'approved';
      disableReq.approvedAt = new Date();
      await disableReq.save();

      // Update target member to disabled
      const targetUser = await User.findByIdAndUpdate(
        disableReq.targetUserId,
        { isDisabled: true },
        { new: true }
      );

      // Notify target member and group
      const allUsers = await User.find({ isActive: true });
      const notifPromises = allUsers.map((u) =>
        Notification.create({
          userId: u._id,
          groupId: disableReq.groupId,
          type: 'disable_approved',
          title: '🔒 Member Account Disabled',
          message: `${targetUser?.name || ''} has been disabled after unanimous group approval.`,
        })
      );
      await Promise.all(notifPromises);

      await ActivityLog.create({
        userId: disableReq.targetUserId,
        groupId: disableReq.groupId,
        action: 'USER_DISABLED',
        entityType: 'user',
        entityId: disableReq.targetUserId,
        description: `${targetUser?.name || ''} was disabled following unanimous member approval. Reason: "${disableReq.reason}"`,
      });
    }

    res.json({ success: true, message: 'Vote recorded', data: disableReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
