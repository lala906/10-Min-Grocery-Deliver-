const mongoose = require('mongoose');
const dotenv = require('dotenv');
const users = require('./data/users');
const products = require('./data/products');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/groceryapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const importData = async () => {
    try {
        await User.deleteMany();
        await Product.deleteMany();

        const createdUsers = await User.insertMany(users);

        // The user models have pre-save hooks for bcrypt, but insertMany does NOT trigger
        // pre-save hooks in Mongoose. We need to save them manually to hash passwords, 
        // OR we pre-hash them, but since we defined a pre-save hook in the User model, 
        // looping through and using .save() is better. Let's do that for the users to ensure
        // bcrypt hashing runs perfectly.

        await User.deleteMany(); // Clear again just to be safe

        const savedUsers = [];
        for (const u of users) {
            const user = new User(u);
            const savedUser = await user.save();
            savedUsers.push(savedUser);
        }

        // Now insert products
        await Product.insertMany(products);

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await User.deleteMany();
        await Product.deleteMany();

        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
