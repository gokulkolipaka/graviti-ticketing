const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'graviti_tickets.db');
const db = new sqlite3.Database(dbPath);

const initialize = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE,
                username TEXT UNIQUE,
                email TEXT,
                full_name TEXT,
                department TEXT,
                role TEXT DEFAULT 'user',
                supervisor_email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tickets table
            db.run(`CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id TEXT UNIQUE,
                employee_id TEXT,
                type TEXT,
                severity TEXT,
                supervisor_email TEXT,
                location TEXT,
                description TEXT,
                status TEXT DEFAULT 'Open',
                assigned_to TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME,
                time_to_resolve INTEGER,
                attachments TEXT,
                FOREIGN KEY (employee_id) REFERENCES users(employee_id)
            )`);

            // Settings table
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Team members table
            db.run(`CREATE TABLE IF NOT EXISTS team_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE,
                name TEXT,
                email TEXT,
                department TEXT,
                role TEXT DEFAULT 'technician',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Insert default admin
            db.run(`INSERT OR IGNORE INTO users 
                (employee_id, username, email, full_name, department, role) 
                VALUES ('ADMIN001', 'admin', 'admin@graviti.com', 'System Administrator', 'IT', 'admin')`);

            // Insert default settings
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('company_name', 'Graviti Pharmaceuticals')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('company_logo', 'default-logo.png')`);
            db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password_changed', 'false')`);

            resolve();
        });
    });
};

module.exports = { db, initialize };
