import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Prefer IPv4 for DNS resolution to avoid MongoDB connection timeouts on IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Fallback to Google and Cloudflare DNS to ensure reliable resolution of MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('⚠️ Could not set custom DNS servers:', dnsErr.message);
}

dotenv.config();

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (process.env.USE_TEST_DB === 'true') {
      mongoUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
      let dbName = '';
      try {
        const parsed = new URL((mongoUri || '').replace(/^mongodb(\+srv)?:\/\//, 'http://'));
        dbName = (parsed.pathname || '').replace(/^\//, '').split('?')[0];
      } catch (e) {
        dbName = '';
      }

      if (!dbName.toLowerCase().includes('test')) {
        console.error(`❌ Refusing to connect in test mode: database name "${dbName || '(none)'}" does not contain "test".`);
        process.exit(1);
      }
      console.log(`[Test Mode] Target test database: "${dbName}"`);
    }
    
    if (!mongoUri || mongoUri.includes('<username>')) {
      console.warn('⚠️  MongoDB URI not configured properly in .env');
      console.warn('⚠️  Running without MongoDB connection (Simulation Mode for Development)');
      return;
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;