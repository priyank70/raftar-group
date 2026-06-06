import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';
import Group from './models/Group';
import Installment from './models/Installment';
import Payment from './models/Payment';
import DelayRequest from './models/DelayRequest';
import PromotionRequest from './models/PromotionRequest';
import Notification from './models/Notification';
import ActivityLog from './models/ActivityLog';
import connectDB from './config/database';
import { createInstallmentsForUser } from './controllers/installmentController';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting database seed...');

    // Clear existing data from all collections
    await Promise.all([
      User.deleteMany({}),
      Group.deleteMany({}),
      Installment.deleteMany({}),
      Payment.deleteMany({}),
      DelayRequest.deleteMany({}),
      PromotionRequest.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);
    console.log('✅ Cleared all existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Priyank Patel',
      email: 'pgpatel1345@gmail.com',
      phone: '9876543210',
      password: 'Priyank@123',
      role: 'admin',
      joinedAt: new Date('2026-01-01'),
    });
    console.log(`✅ Admin created: ${admin.email}`);

    // Create group
    const group = await Group.create({
      name: 'Raftar Group',
      description: 'Digital Mandal Management System for Raftar Group members',
      installmentAmount: 1000,
      dueDay: 10,
      penaltyRate: 10,
      upiId: 'raftar@upi',
      upiName: 'Raftar Group',
      minimumVotesRequired: 1, // Start with 1 since only admin exists
      totalMembers: 1,
      createdBy: admin._id,
      startDate: new Date('2026-01-01'), // From user request
      rules: ['Installments must be paid by the 10th of every month.'],
    });
    console.log(`✅ Group created: ${group.name}`);

    // Generate installments for the admin from group startDate
    await createInstallmentsForUser(admin._id.toString());
    console.log(`✅ Installments created for admin`);

    console.log('\n🎉 Database reset and seeded successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('  Admin: pgpatel1345@gmail.com / Priyank@123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
