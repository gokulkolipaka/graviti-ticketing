const express = require('express');
const multer = require('multer');
const { db } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const upload = multer({ dest: 'public/images/' });

// Get dashboard stats
router.get('/dashboard-stats', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const stats = {};
    
    // Get total tickets
    db.get('SELECT COUNT(*) as total FROM tickets', (err, result) => {
        stats.total = result.total;
        
        // Get open tickets
        db.get('SELECT COUNT(*) as open FROM tickets WHERE status = "Open"', (err, result) => {
            stats.open = result.open;
            
            // Get in progress tickets
            db.get('SELECT COUNT(*) as inProgress FROM tickets WHERE status = "In Progress"', (err, result) => {
                stats.inProgress = result.inProgress;
                
                // Get closed tickets
                db.get('SELECT COUNT(*) as closed FROM tickets WHERE status = "Closed"', (err, result) => {
                    stats.closed = result.closed;
                    
                    res.json({ success: true, stats });
                });
            });
        });
    });
});

// Get team members
router.get('/team-members', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    db.all('SELECT * FROM team_members ORDER BY name', (err, members) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching team members' });
        }
        res.json({ success: true, members });
    });
});

// Add team member
router.post('/team-members', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { employee_id, name, email, department } = req.body;

    db.run('INSERT INTO team_members (employee_id, name, email, department) VALUES (?, ?, ?, ?)',
        [employee_id, name, email, department], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error adding team member' });
        }
        res.json({ success: true, message: 'Team member added successfully' });
    });
});

// Update company settings
router.post('/settings', auth, upload.single('logo'), (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { company_name } = req.body;
    const logo_filename = req.file ? req.file.filename : null;

    if (company_name) {
        db.run('UPDATE settings SET value = ? WHERE key = "company_name"', [company_name]);
    }

    if (logo_filename) {
        db.run('UPDATE settings SET value = ? WHERE key = "company_logo"', [logo_filename]);
    }

    res.json({ success: true, message: 'Settings updated successfully' });
});

// Get settings
router.get('/settings', auth, (req, res) => {
    db.all('SELECT * FROM settings', (err, settings) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching settings' });
        }
        
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });
        
        res.json({ success: true, settings: settingsObj });
    });
});

module.exports = router;
