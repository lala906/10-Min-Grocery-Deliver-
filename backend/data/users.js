const bcrypt = require('bcryptjs');

const users = [
    {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
    },
    {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
    },
    {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        role: 'user',
    },
];

module.exports = users;
