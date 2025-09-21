require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safechat');
    console.log('Connected to MongoDB');

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
        username: 'johnuser',
        email: 'john@example.com',
        password: 'user123',
        role: 'user',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      },
      {
        username: 'janeuser',
        email: 'jane@example.com',
        password: 'user123',
        role: 'user',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith'
        }
      }
    ];

    // Insert users one by one to trigger password hashing
    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.email} (${user.role})`);
    }

    console.log('Demo users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin@safechat.ai / admin123');
    console.log('Moderator: moderator@safechat.ai / moderator123');
    console.log('User: john@example.com / user123');
    console.log('User: jane@example.com / user123');

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
};

seedUsers();