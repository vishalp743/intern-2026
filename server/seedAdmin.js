// server/seedAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User'); // Adjust path if needed

// Load env vars
dotenv.config();

// Default Admin Credentials
const adminUser = {
  name: 'System Admin',
  email: 'admin@nutanix.com',
  password: 'admin', // Plain text default password
  role: 'Admin'
};

const seedDB = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('📦 MongoDB Connected for Seeding...');

    // 2. Check if Admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. No changes made.');
      process.exit();
    }

    // 3. Create the Admin User
    // Note: We are creating it directly with the plain text password here.
    // The authController's "Lazy Migration" will handle the login.
    await User.create(adminUser);

    console.log('✅ Default Admin created!');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🔑 Password: ${adminUser.password}`);
    
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  }
};

seedDB();