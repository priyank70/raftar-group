import { Response } from 'express';
import mongoose from 'mongoose';
import PromotionRequest from '../models/PromotionRequest';
import User from '../models/User';
import Group from '../models/Group';
import Notification from '../models/Notification';
import ActivityLog from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';

export const createPromotionRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const candidateId = req.params.id;
    const adminId = req.user?.userId;

    if (!adminId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const candidate = await User.findById(candidateId);
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate user not found' });
      return;
    }

    if (candidate.role === 'admin') {
      res.status(400).json({ success: false, message: 'User is already an admin' });
      return;
    }

    const group = await Group.findOne({ isActive: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Active group not found' });
      return;
    }

    const candidateObjectId = new mongoose.Types.ObjectId(candidateId as string);
    const adminObjectId = new mongoose.Types.ObjectId(adminId as string);

    // Check if there is already a pending request for this candidate
    const existingRequest = await PromotionRequest.findOne({
      candidateId: candidateObjectId,
      status: 'pending',
    });

    if (existingRequest) {
      res.status(400).json({ success: false, message: 'A promotion request is already pending for this member' });
      return;
    }

    // Create the promotion request with the admin's initial approval vote
    const promotionReq = await PromotionRequest.create({
      candidateId: candidateObjectId,
      requestedBy: adminObjectId,
      groupId: group._id,
      status: 'pending',
      votes: [
        {
          userId: adminObjectId,
          vote: 'approve',
          comment: 'Initiated promotion request',
          votedAt: new Date(),
        },
      ],
    });

    // Notify all active members except the admin who initiated it and the candidate
    const activeMembers = await User.find({ isActive: true, isDisabled: { $ne: true } });
    const usersToNotify = activeMembers.filter(
      (m) => m._id.toString() !== adminId && m._id.toString() !== candidateId
    );

    const notifPromises = usersToNotify.map((member) =>
      Notification.create({
        userId: member._id,
        groupId: group._id,
        type: 'promotion_request',
        title: 'Admin Promotion Vote Needed',
        message: `${candidate.name} has been proposed to become an admin. Your vote is required.`,
        data: { requestId: promotionReq._id.toString() },
      })
    );
    await Promise.all(notifPromises);

    res.status(201).json({
      success: true,
      message: 'Promotion request submitted to members for voting',
      data: promotionReq,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPromotionRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await PromotionRequest.countDocuments();
    const requests = await PromotionRequest.find()
      .populate('candidateId', 'name email avatar phone role')
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

export const voteOnPromotionRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vote, comment } = req.body;
    const userId = req.user?.userId;
    const reqId = req.params.id;

    const promotionReq = await PromotionRequest.findById(reqId);
    if (!promotionReq) {
      res.status(404).json({ success: false, message: 'Promotion request not found' });
      return;
    }

    if (promotionReq.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Promotion request is no longer pending' });
      return;
    }

    // Candidate cannot vote on their own request
    if (promotionReq.candidateId.toString() === userId) {
      res.status(400).json({ success: false, message: 'Candidates cannot vote on their own promotion request' });
      return;
    }

    // Check if user already voted
    const existingVote = promotionReq.votes.find((v) => v.userId.toString() === userId);
    if (existingVote) {
      existingVote.vote = vote;
      existingVote.comment = comment;
      existingVote.votedAt = new Date();
    } else {
      promotionReq.votes.push({ userId: userId as any, vote, comment, votedAt: new Date() });
    }

    await promotionReq.save();

    // Check status transition
    const activeMembers = await User.find({ isActive: true, isDisabled: { $ne: true } });
    // Required voters are all active members EXCEPT the candidate
    const requiredVoters = activeMembers.filter(
      (m) => m._id.toString() !== promotionReq.candidateId.toString()
    );
    const requiredApprovals = requiredVoters.length;

    // Filter votes to only include those from active members (excluding candidate)
    const activeMemberIds = activeMembers.map((m) => m._id.toString());
    const otherVotes = promotionReq.votes.filter(
      (v) =>
        activeMemberIds.includes(v.userId.toString()) &&
        v.userId.toString() !== promotionReq.candidateId.toString()
    );

    const approveCount = otherVotes.filter((v) => v.vote === 'approve').length;
    const rejectCount = otherVotes.filter((v) => v.vote === 'reject').length;

    if (rejectCount > 0) {
      promotionReq.status = 'rejected';
      await promotionReq.save();

      // Notify candidate and admins
      await Notification.create({
        userId: promotionReq.candidateId,
        groupId: promotionReq.groupId,
        type: 'promotion_rejected',
        title: '❌ Promotion Request Rejected',
        message: 'The request to promote you to admin has been rejected by the group.',
      });
    } else if (approveCount >= requiredApprovals) {
      promotionReq.status = 'approved';
      promotionReq.approvedAt = new Date();
      await promotionReq.save();

      // Update candidate's role to admin
      await User.findByIdAndUpdate(promotionReq.candidateId, { role: 'admin' });

      // Notify candidate and group
      await Notification.create({
        userId: promotionReq.candidateId,
        groupId: promotionReq.groupId,
        type: 'promotion_approved',
        title: '🎉 Promotion Approved!',
        message: 'Congratulations! You have been promoted to admin by the group.',
      });

      await ActivityLog.create({
        userId: promotionReq.candidateId,
        groupId: promotionReq.groupId,
        action: 'USER_PROMOTED',
        entityType: 'user',
        entityId: promotionReq.candidateId,
        description: `${(await User.findById(promotionReq.candidateId))?.name} promoted to admin after full group approval`,
      });
    }

    res.json({ success: true, message: 'Vote recorded', data: promotionReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
