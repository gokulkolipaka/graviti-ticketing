const express = require('express');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const { db } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Email configuration
const emailTransporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    }
});

// Generate ticket ID
const generateTicketId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GIT-${timestamp.slice(-6)}-${random}`;
};

// Create ticket
router.post('/create', auth, upload.array('attachments', 5), async (req, res) => {
    try {
        const {
            type,
            severity,
            supervisor_email,
            location,
            description
        } = req.body;

        const ticketId = generateTicketId();
        const attachments = req.files ? req.files.map(f => f.filename).join(',') : '';

        // Set default time to resolve based on severity
        const timeToResolve = {
            'High': 4, // 4 hours
            'Medium': 24, // 24 hours
            'Low': 72 // 72 hours
        };

        db.run(`INSERT INTO tickets 
            (ticket_id, employee_id, type, severity, supervisor_email, location, description, attachments, time_to_resolve)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ticketId, req.user.employee_id, type, severity, supervisor_email, location, description, attachments, timeToResolve[severity]],
            function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error creating ticket' });
                }

                // Send email notification
                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: supervisor_email,
                    subject: `New IT Ticket: ${ticketId} - ${type}`,
                    html: `
                        <h3>New IT Support Ticket</h3>
                        <p><strong>Ticket ID:</strong> ${ticketId}</p>
                        <p><strong>Type:</strong> ${type}</p>
                        <p><strong>Severity:</strong> ${severity}</p>
                        <p><strong>Requested by:</strong> ${req.user.full_name} (${req.user.employee_id})</p>
                        <p><strong>Location:</strong> ${location}</p>
                        <p><strong>Description:</strong> ${description}</p>
                        <p>Please review and assign this ticket to appropriate team member.</p>
                    `
                };

                emailTransporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Email error:', error);
                    }
                });

                res.json({
                    success: true,
                    message: 'Ticket created successfully',
                    ticket_id: ticketId
                });
            });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get user tickets
router.get('/my-tickets', auth, (req, res) => {
    db.all('SELECT * FROM tickets WHERE employee_id = ? ORDER BY created_at DESC', 
        [req.user.employee_id], (err, tickets) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching tickets' });
        }
        res.json({ success: true, tickets });
    });
});

// Get all tickets (admin only)
router.get('/all', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    db.all('SELECT t.*, u.full_name, u.email FROM tickets t LEFT JOIN users u ON t.employee_id = u.employee_id ORDER BY t.created_at DESC', 
        (err, tickets) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching tickets' });
        }
        res.json({ success: true, tickets });
    });
});

// Update ticket status
router.put('/:ticketId/status', auth, (req, res) => {
    const { status } = req.body;
    const { ticketId } = req.params;

    const resolvedAt = status === 'Closed' ? new Date().toISOString() : null;

    db.run('UPDATE tickets SET status = ?, resolved_at = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?',
        [status, resolvedAt, ticketId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating ticket' });
        }
        res.json({ success: true, message: 'Ticket updated successfully' });
    });
});

// Assign ticket
router.put('/:ticketId/assign', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { assigned_to } = req.body;
    const { ticketId } = req.params;

    db.run('UPDATE tickets SET assigned_to = ?, status = "In Progress", updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?',
        [assigned_to, ticketId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error assigning ticket' });
        }
        res.json({ success: true, message: 'Ticket assigned successfully' });
    });
});

module.exports = router;
