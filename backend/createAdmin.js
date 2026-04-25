const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables
dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/groceerynewstore';

const createAdmin = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected');

        // Check if admin already exists
        const adminExists = await User.findOne({ email: 'admin@blinkit.com' });

        if (adminExists) {
            console.log('Admin user already exists!');
            process.exit(0);
        }

        // Create the admin user
        // The password will be automatically hashed by the pre-save hook in the User model
        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@blinkit.com',
            password: '123456',
            role: 'admin'
        });

        await adminUser.save();

        console.log('Admin user created successfully!');
        process.exit(0);
    } catch (error) {
        console.error(`Error creating admin: ${error.message}`);
        process.exit(1);
    }
};

createAdmin();
