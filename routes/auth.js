const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');
const { db } = require('../config/database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'graviti-secret-key-2024';

// LDAP Authentication
const authenticateLDAP = (username, password) => {
    return new Promise((resolve, reject) => {
        // For demo purposes, we'll simulate LDAP authentication
        // Replace this with actual LDAP configuration
        const ldapConfig = {
            url: process.env.LDAP_URL || 'ldap://localhost:389',
            bindDN: process.env.LDAP_BIND_DN || 'cn=admin,dc=graviti,dc=com',
            bindPassword: process.env.LDAP_BIND_PASSWORD || 'admin',
            searchBase: process.env.LDAP_SEARCH_BASE || 'ou=users,dc=graviti,dc=com'
        };

        // Simulate successful LDAP authentication for demo
        // In production, implement actual LDAP authentication
        if (username === 'admin' && password === 'admin123') {
            resolve({
                employee_id: 'ADMIN001',
                username: 'admin',
                email: 'admin@graviti.com',
                full_name: 'System Administrator',
                department: 'IT',
                role: 'admin'
            });
        } else if (username.startsWith('emp') && password === 'password123') {
            resolve({
                employee_id: username.toUpperCase(),
                username: username,
                email: `${username}@graviti.com`,
                full_name: `Employee ${username}`,
                department: 'General',
                role: 'user',
                supervisor_email: 'supervisor@graviti.com'
            });
        } else {
            reject(new Error('Invalid credentials'));
        }
    });
};

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Authenticate with LDAP
        const userData = await authenticateLDAP(username, password);

        // Store/update user in database
        db.run(`INSERT OR REPLACE INTO users 
            (employee_id, username, email, full_name, department, role, supervisor_email) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userData.employee_id, userData.username, userData.email, userData.full_name, 
             userData.department, userData.role, userData.supervisor_email || null]);

        // Generate JWT token
        const token = jwt.sign(
            { 
                employee_id: userData.employee_id, 
                username: userData.username, 
                role: userData.role 
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: userData
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
});

// Get current user
router.get('/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        db.get('SELECT * FROM users WHERE employee_id = ?', [decoded.employee_id], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            
            res.json({ success: true, user });
        });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

module.exports = router;
