import { config } from 'dotenv';
config();
import mongoose from 'mongoose';

const mongoUri: string = process.env.DB || '';

const connectDB = async () => {
    if (!mongoUri) {
        console.warn('Warning: No DB connection URI specified in .env');
        return;
    }
    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('Successfully connected to MongoDB');
    } catch (error: any) {
        console.error('MongoDB connection failed:', error.message || error);
    }
};

export default connectDB;
