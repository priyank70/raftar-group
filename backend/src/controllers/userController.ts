import { Response } from 'express';
import User from '../models/User';
import Installment from '../models/Installment';
import Payment from '../models/Payment';
import { AuthRequest } from '../middleware/auth';
import { createInstallmentsForUser } from './installmentController';

// GET /api/users
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    // Fetch all active users
    const allUsers = await User.find({ isActive: true });

    // Aggregate payment totals for all users (approved payments only)
    const paymentSums = await Payment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$userId', totalPaid: { $sum: '$amount' } } }
    ]);

    // Create a map for fast lookup
    const paymentMap = new Map<string, number>();
    paymentSums.forEach((p) => {
      if (p._id) {
        paymentMap.set(p._id.toString(), p.totalPaid);
      }
    });

    // Attach totalPaid and sort users
    const usersWithStats = allUsers.map((user) => {
      const totalPaid = paymentMap.get(user._id.toString()) || 0;
      const userObj = user.toJSON();
      return {
        ...userObj,
        totalPaid
      };
    });

    // Sort by totalPaid descending, then joinedAt ascending
    usersWithStats.sort((a, b) => {
      if (b.totalPaid !== a.totalPaid) {
        return b.totalPaid - a.totalPaid;
      }
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    // Assign rank
    const rankedUsers = usersWithStats.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Apply search filter if query is present
    let filteredUsers = rankedUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = rankedUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    // Paginate results
    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:id
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/users (admin only)
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, role, joinedAt } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'member',
      joinedAt: joinedAt ? new Date(joinedAt) : new Date()
    });

    // Create installments for new member
    await createInstallmentsForUser(user._id.toString());

    res.status(201).json({ success: true, message: 'Member added successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/:id (admin only)
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, isActive, joinedAt } = req.body;
    // Only update fields that are explicitly provided to avoid accidentally nullifying fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (joinedAt !== undefined) updateData.joinedAt = new Date(joinedAt);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (joinedAt !== undefined) {
      await createInstallmentsForUser(user._id.toString());
    }
    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/users/:id (admin only)
export const removeUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!user.isDisabled) {
      res.status(400).json({ success: false, message: 'Cannot delete user. Member must be disabled first.' });
      return;
    }
    user.isActive = false;
    await user.save();
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/:id/promote (admin only)
export const promoteToAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'admin' },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, message: 'User promoted to admin', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:id/summary
export const getUserSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const payments = await Payment.find({ userId, status: 'approved' });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingInstallments = await Installment.countDocuments({ userId, status: 'pending' });
    const overdueInstallments = await Installment.countDocuments({ userId, status: 'overdue' });
    const totalPenalty = await Installment.aggregate([
      { $match: { userId, status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$penaltyAmount' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalPaid,
        pendingInstallments,
        overdueInstallments,
        totalPenalty: totalPenalty[0]?.total || 0,
        paymentsCount: payments.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/profile/avatar
export const updateAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image uploaded' });
      return;
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user?.userId, { avatar: avatarUrl }, { new: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/profile/me — self-edit (any authenticated user)
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user?.userId;

    // Check email uniqueness only if changing
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: userId } });
      if (existing) {
        res.status(400).json({ success: false, message: 'Email is already in use by another account' });
        return;
      }
    }

    const updateData: Record<string, string> = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone.trim();

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

