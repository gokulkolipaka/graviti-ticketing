const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'graviti-secret-key-2024';

const auth = (req, res, next) => {
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
            
            req.user = user;
            next();
        });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = auth;
