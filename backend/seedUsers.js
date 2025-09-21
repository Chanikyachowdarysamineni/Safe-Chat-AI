const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safechat');
    console.log('MongoDB Connected for seeding');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create demo users
    const demoUsers = [
      {
        username: 'admin',
        email: 'admin@safechat.ai',
        password: 'admin123',
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        }
      },
      {
        username: 'moderator',
        email: 'moderator@safechat.ai',
        password: 'moderator123',
        role: 'moderator',
        profile: {
          firstName: 'Moderator',
          lastName: 'User'
        }
      },
      {
        username: 'testuser',
        email: 'user@safechat.ai',
        password: 'user123',
        role: 'user',
        profile: {
          firstName: 'Test',
          lastName: 'User'
        }
      }
    ];

    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.email} (${user.role})`);
    }

    console.log('\n✅ Demo users created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Admin: admin@safechat.ai / admin123');
    console.log('Moderator: moderator@safechat.ai / moderator123');
    console.log('User: user@safechat.ai / user123');

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

const main = async () => {
  await connectDB();
  await seedUsers();
};

main().catch(console.error);