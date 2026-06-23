import mongoose from 'mongoose';
import dns from 'dns';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DNS_SERVERS = process.env.MONGODB_DNS_SERVERS;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (cached.conn) {
    cached.conn = null;
    cached.promise = null;
  }

  const uri = MONGODB_URI || '';

  if (!uri) {
    console.error('MONGODB_URI is not defined in .env file');
  }

  if (uri.startsWith('mongodb+srv://')) {
    const dnsServers = MONGODB_DNS_SERVERS
      ? MONGODB_DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean)
      : ['1.1.1.1', '8.8.8.8'];

    if (dnsServers.length > 0) {
      dns.setServers(dnsServers);
    }
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB connection error:', error);
    throw error;
  }

  return cached.conn;
}

export default dbConnect;
