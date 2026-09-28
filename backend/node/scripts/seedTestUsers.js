import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';

// Prefer IPv4 for DNS resolution to avoid MongoDB connection timeouts on IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

// Safety: use MONGODB_URI_TEST if set (assign it to process.env.MONGODB_URI)
if (process.env.MONGODB_URI_TEST) {
  process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
}

const mongoUri = process.env.MONGODB_URI || '';
let dbName = '';
try {
  const parsed = new URL(mongoUri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
  dbName = (parsed.pathname || '').replace(/^\//, '').split('?')[0];
} catch (e) {
  dbName = '';
}

if (!dbName.toLowerCase().includes('test')) {
  console.error('❌ Refusing to run seed script: Database name in MONGODB_URI (or MONGODB_URI_TEST) must contain "test" (e.g. kisanbazaar_test).');
  console.error(`   Target database: "${dbName || '(none)'}"`);
  console.error('   Please define MONGODB_URI_TEST in .env pointing to your test database.');
  process.exit(1);
}

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Listing from '../models/Listing.js';

const RAW_TEST_PASSWORD = 'Test@1234';

async function seedTestUsers() {
  console.log('====================================================');
  console.log('  KisanBazaar Test Environment User & Listing Seeder ');
  console.log('====================================================\n');

  await connectDB();

  try {
    // ----------------------------------------------------
    // Idempotency: Clean up existing test users and their listings
    // ----------------------------------------------------
    const existingTestUsers = await User.find({ email: /@kisan\.test$/i }).select('_id email');
    const existingUserIds = existingTestUsers.map(u => u._id);

    if (existingUserIds.length > 0) {
      console.log(`[Clean] Removing ${existingUserIds.length} existing @kisan.test user(s) and their listings...`);
      await Listing.deleteMany({ farmer: { $in: existingUserIds } });
      await User.deleteMany({ _id: { $in: existingUserIds } });
    }

    // ----------------------------------------------------
    // Define the 7 test user definitions
    // ----------------------------------------------------
    const userDefinitions = [
      {
        name: 'Test Buyer',
        role: 'buyer',
        email: 'buyer@kisan.test',
        phone: '9000000001',
        passwordHash: RAW_TEST_PASSWORD,
        location: {
          address: 'Bengaluru',
          district: 'Bengaluru',
          state: 'Karnataka',
          lat: 12.9716,
          lng: 77.5946,
        },
        isVerified: true,
        verificationStatus: 'verified',
        buyerProfile: {
          businessName: 'Kisan Consumer Retail',
        },
      },
      {
        name: 'Farmer A',
        role: 'farmer',
        email: 'farmer.a@kisan.test',
        phone: '9000000002',
        passwordHash: RAW_TEST_PASSWORD,
        location: {
          address: 'Kolar',
          district: 'Kolar',
          state: 'Karnataka',
          lat: 13.1358,
          lng: 78.1294,
        },
        isVerified: true,
        verificationStatus: 'verified',
        farmerProfile: {
          farmSize: '5 acres',
          primaryCrops: ['Tomato', 'Potato'],
        },
      },
      {
        name: 'Farmer B',
        role: 'farmer',
        email: 'farmer.b@kisan.test',
        phone: '9000000003',
        passwordHash: RAW_TEST_PASSWORD,
        location: {
          address: 'Tumakuru',
          district: 'Tumakuru',
          state: 'Karnataka',
          lat: 13.3379,
          lng: 77.1173,
        },
        isVerified: true,
        verificationStatus: 'verified',
        farmerProfile: {
          farmSize: '10 acres',
          primaryCrops: ['Onion', 'Groundnut'],
        },
      },
      {
        name: 'Agent One',
        role: 'delivery_agent',
        email: 'agent1@kisan.test',
        phone: '9000000011',
        passwordHash: RAW_TEST_PASSWORD,
        location: {
          address: 'Kolar',
          district: 'Kolar',
          state: 'Karnataka',
          lat: 13.14,
          lng: 78.13,
        },
        isVerified: true,
        verificationStatus: 'verified',
        deliveryAgentProfile: {
          vehicleType: 'Mini-van',
          vehicleNumber: 'KA-07-EA-1001',
          drivingLicense: 'DL-KA07-20230001',
          perKmCharge: 15,
          availabilityStatus: 'available',
          currentLocation: {
            lat: 13.14,
            lng: 78.13,
            lastUpdated: new Date(),
          },
        },
      },
      {
        name: 'Agent Two',
        role: 'delivery_agent',
        email: 'agent2@kisan.test',
        phone: '9000000012',
        passwordHash: RAW_TEST_PASSWORD,
        location: {
          address: 'Hoskote',
          district: 'Bengaluru Rural',
          state: 'Karnataka',
          lat: 13.07,
          lng: 77.80,
        },
        isVerified: true,
        verificationStatus: 'verified',
        deliveryAgentProfile: {
          vehicleType: 'Bike',
          vehicleNumber: 'KA-53-EA-2002',
          drivingLicense: 'DL-KA53-20230002',
          perKmCharge: 12,
          availabilityStatus: 'available',
          currentLocation: {
            lat: 13.07,
            lng: 77.80,
            lastUpdated: new Date(),
          },
        },
      },
      {
        name: 'Agent Three',
        role: 'delivery_agent',
        email: 'agent3@kisan.test',
        phone: '9000000013',
        passwordHash: RAW_TEST_PASSWORD,
        location: {
          address: 'Mysuru',
          district: 'Mysuru',
          state: 'Karnataka',
          lat: 12.2958,
          lng: 76.6394,
        },
        isVerified: true,
        verificationStatus: 'verified',
        deliveryAgentProfile: {
          vehicleType: 'Truck',
          vehicleNumber: 'KA-09-EA-3003',
          drivingLicense: 'DL-KA09-20230003',
          perKmCharge: 18,
          availabilityStatus: 'available',
          currentLocation: {
            lat: 12.2958,
            lng: 76.6394,
            lastUpdated: new Date(),
          },
        },
      },
      {
        name: 'Outsider',
        role: 'buyer',
        email: 'outsider@kisan.test',
        phone: '9000000099',
        passwordHash: RAW_TEST_PASSWORD,
        location: {
          address: 'Bengaluru',
          district: 'Bengaluru',
          state: 'Karnataka',
          lat: 12.98,
          lng: 77.60,
        },
        isVerified: true,
        verificationStatus: 'verified',
        buyerProfile: {
          businessName: 'Outsider Retail Ltd',
        },
      },
    ];

    // ----------------------------------------------------
    // Create users individually via User.create() to trigger bcrypt pre-save hook
    // ----------------------------------------------------
    const createdUsers = [];
    for (const def of userDefinitions) {
      const user = await User.create(def);
      createdUsers.push(user);
    }
    console.log(`[Seed] Created ${createdUsers.length} test users with bcrypt-hashed passwords.`);

    const farmerA = createdUsers.find(u => u.email === 'farmer.a@kisan.test');
    const farmerB = createdUsers.find(u => u.email === 'farmer.b@kisan.test');

    // ----------------------------------------------------
    // Create test listings for Farmer A and Farmer B
    // ----------------------------------------------------
    const listingA = await Listing.create({
      farmer: farmerA._id,
      cropName: 'Tomato',
      variety: 'Hybrid F1',
      quantity: 10,
      unit: 'kg',
      pricePerUnit: 30,
      description: 'Fresh organic farm tomatoes from Kolar.',
      location: farmerA.location,
      isVerified: true,
      status: 'active',
    });

    const listingB = await Listing.create({
      farmer: farmerB._id,
      cropName: 'Onion',
      variety: 'Bellary Red',
      quantity: 1,
      unit: 'kg',
      pricePerUnit: 25,
      description: 'High-quality storage onions from Tumakuru.',
      location: farmerB.location,
      isVerified: true,
      status: 'active',
    });

    console.log('[Seed] Created test listings for Farmer A and Farmer B.');

    // ----------------------------------------------------
    // Print User Table and Listing IDs
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log('  Seeded Test Users');
    console.log('====================================================');

    const summaryTable = createdUsers.map(u => ({
      Name: u.name,
      Role: u.role,
      Email: u.email,
      Phone: u.phone,
      Password: RAW_TEST_PASSWORD,
      District: u.location?.district || u.location?.address || 'Karnataka',
    }));
    console.table(summaryTable);

    console.log('====================================================');
    console.log('  Seeded Test Listings');
    console.log('====================================================');
    console.table([
      {
        ListingID: listingA._id.toString(),
        Farmer: 'Farmer A (farmer.a@kisan.test)',
        Crop: listingA.cropName,
        Quantity: `${listingA.quantity} ${listingA.unit}`,
        PricePerUnit: `₹${listingA.pricePerUnit}`,
        Location: listingA.location?.address || 'Kolar',
      },
      {
        ListingID: listingB._id.toString(),
        Farmer: 'Farmer B (farmer.b@kisan.test)',
        Crop: listingB.cropName,
        Quantity: `${listingB.quantity} ${listingB.unit}`,
        PricePerUnit: `₹${listingB.pricePerUnit}`,
        Location: listingB.location?.address || 'Tumakuru',
      },
    ]);

    console.log(`Farmer A Listing ID: ${listingA._id.toString()}`);
    console.log(`Farmer B Listing ID: ${listingB._id.toString()}`);
    console.log('\nSeed completed successfully!\n');

  } catch (err) {
    console.error('Error during test user seeding:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedTestUsers().catch(err => {
  console.error('Unhandled failure in seedTestUsers:', err);
  process.exit(1);
});
