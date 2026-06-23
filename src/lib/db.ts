import mongoose from 'mongoose';
import dns from 'dns';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DNS_SERVERS = process.env.MONGODB_DNS_SERVERS;
const FALLBACK_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

function configuredDnsServers(): string[] {
  return MONGODB_DNS_SERVERS
    ? MONGODB_DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean)
    : [];
}

async function resolveSrvWithFallback(hostname: string): Promise<dns.SrvRecord[]> {
  const explicitServers = configuredDnsServers();
  if (explicitServers.length > 0) {
    dns.setServers(explicitServers);
    return dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
  }

  try {
    return await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
  } catch {
    dns.setServers(FALLBACK_DNS_SERVERS);
    return dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
  }
}

async function resolveTxtOptions(hostname: string): Promise<URLSearchParams> {
  try {
    const records = await dns.promises.resolveTxt(hostname);
    return new URLSearchParams(records.flat().join('&'));
  } catch {
    return new URLSearchParams();
  }
}

async function resolveMongoSrvUri(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  const match = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!match) {
    return uri;
  }

  const [, auth, hostname, pathname = '/', query = ''] = match;
  const [srvRecords, txtParams] = await Promise.all([
    resolveSrvWithFallback(hostname),
    resolveTxtOptions(hostname),
  ]);

  const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(',');
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);

  txtParams.forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });

  if (!params.has('tls') && !params.has('ssl')) {
    params.set('tls', 'true');
  }

  const normalizedPath = pathname === '/' ? '/digital-twin' : pathname;
  return `mongodb://${auth}@${hosts}${normalizedPath}?${params.toString()}`;
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

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
    };

    cached.promise = resolveMongoSrvUri(uri).then((resolvedUri) => mongoose.connect(resolvedUri, opts)).then((mongoose) => {
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
