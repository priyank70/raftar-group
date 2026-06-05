import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/raftar-group');
  const db = mongoose.connection.db;
  if (!db) {
    console.log("DB is undefined");
    return;
  }
  const users = await db.collection('users').find({}).toArray();
  console.log("--- USERS ---");
  for (const u of users) {
    console.log({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isDisabled: u.isDisabled,
    });
  }

  console.log("--- GROUPS ---");
  const groups = await db.collection('groups').find({}).toArray();
  for (const g of groups) {
    console.log({
      _id: g._id,
      name: g.name,
      minimumVotesRequired: g.minimumVotesRequired,
    });
  }

  console.log("--- DISABLE REQUESTS ---");
  const disableRequests = await db.collection('disablerequests').find({}).toArray();
  for (const dr of disableRequests) {
    console.log({
      _id: dr._id,
      targetUserId: dr.targetUserId,
      status: dr.status,
      votes: dr.votes,
    });
  }

  process.exit(0);
}

check().catch(console.error);


