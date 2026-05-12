const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'pentagon.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('Error opening database', err.message);
    console.log('🛡️ Pentagon Secure Database Connected.');

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, department TEXT, position TEXT DEFAULT 'Staff', basic_pay REAL DEFAULT 45000)`);
        db.run(`CREATE TABLE IF NOT EXISTS attendance (log_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, timestamp DATETIME NOT NULL, location TEXT, status TEXT, FOREIGN KEY (user_id) REFERENCES users (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, type TEXT NOT NULL, days INTEGER NOT NULL, status TEXT DEFAULT 'Pending', FOREIGN KEY (user_id) REFERENCES users (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS payroll_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, run_date TEXT NOT NULL, total_amount REAL NOT NULL, status TEXT DEFAULT 'Dispatched', processed_by TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS overtime (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, date TEXT NOT NULL, hours INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT DEFAULT 'Pending')`);
        db.run(`CREATE TABLE IF NOT EXISTS emergency_contacts (user_id TEXT PRIMARY KEY, contact_name TEXT, contact_phone TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, doc_type TEXT, filename TEXT, status TEXT DEFAULT 'Uploaded')`);
        
        // PUBLIC APPLICATIONS TABLE (Now stores the actual file data)
        db.run(`CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, applicant_name TEXT, role_applied TEXT, contact_email TEXT, resume_filename TEXT, resume_data TEXT, status TEXT DEFAULT 'Initial Review', applied_date TEXT)`);
        
        db.run(`CREATE TABLE IF NOT EXISTS support_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, details TEXT, status TEXT DEFAULT 'Open', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, password, name, role, department, position, basic_pay) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        insertUser.run('ADMIN-01', 'admin123', 'System Admin', 'admin', 'Human Resources', 'HR Director', 65000);
        insertUser.run('EMP-01', 'emp123', 'First Employee', 'employee', 'Development', 'Software Engineer', 48500);
        insertUser.finalize();
    });
});
module.exports = db;