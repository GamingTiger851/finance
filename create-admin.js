require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User'); // Adjust path as needed

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fintrack');
        console.log('Connected to DB');

        const email = 'admin@fintrack.com';
        const password = 'AdminPassword123!';
        
        let adminUser = await User.findOne({ email });
        
        if (adminUser) {
            console.log('Admin user already exists. Updating role and resetting password...');
            adminUser.role = 'admin';
            adminUser.passwordHash = await bcrypt.hash(password, 12);
            await adminUser.save();
        } else {
            console.log('Creating new admin user...');
            const passwordHash = await bcrypt.hash(password, 12);
            adminUser = await User.create({
                email,
                passwordHash,
                name: 'Super Admin',
                role: 'admin'
            });
        }
        
        console.log('Admin user ready:');
        console.log('Email:', email);
        console.log('Password:', password);
        
    } catch (err) {
        console.error('Error creating admin:', err);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();
