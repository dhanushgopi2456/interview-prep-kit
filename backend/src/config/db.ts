import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-prep-kit';
  try {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.warn('MongoDB not connected — some features may not work');
  }
}

export function disconnectDB(): Promise<void> {
  return mongoose.disconnect();
}