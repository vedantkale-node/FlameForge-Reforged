import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import User from '../src/models/userModel.js';
import { config } from 'dotenv';
config();

const seed = async () => {
  try {
    const mongoUri = process.env.DB || 'mongodb://127.0.0.1:27017/FlameForge';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);

    const email = 'admin@teyvat.com';
    const passwordPlain = 'admin@123';
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);
    const token = randomBytes(20).toString('hex');

    await User.deleteOne({ email });

    const adminUser = await User.create({
      firstName: 'Adepti',
      lastName: 'Admin',
      email: email,
      username: 'flameforge_admin',
      password: hashedPassword,
      role: 'admin',
      verified: true,
      token: token,
      isTokenUsed: true,
      profilePic: 'xiao',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Admin user created successfully!');
    console.log('------------------------------------');
    console.log('Email:   ', email);
    console.log('Password:', passwordPlain);
    console.log('Username:', adminUser.username);
    console.log('Role:    ', adminUser.role);
    console.log('ID:      ', adminUser._id.toString());
    console.log('------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error seeding admin user:', err.message || err);
    process.exit(1);
  }
};

seed();
