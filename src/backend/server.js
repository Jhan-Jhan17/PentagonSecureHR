const express = require('express');
const cors = require('cors');
const path = require('path'); // Add this line
require('dotenv').config();

const db = require('./database');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ADD THESE TWO BLOCKS:
// 1. Tell Express where your HTML/CSS/JS files are
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. Make the root URL automatically load the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ... Keep the rest of your api routes below (app.post('/api/login', etc.))
app.post('/api/login', (req, res) => {
    const { userId, password, role } = req.body;
    if (role === 'applicant') {
        return res.status(200).json({ success: true, user: { id: 'PUBLIC', name: 'Guest Applicant', role: 'applicant' } });
    }
    const sql = `SELECT * FROM users WHERE id = ? AND password = ? AND role = ?`;
    db.get(sql, [userId, password, role], (err, row) => {
        if (err) return res.status(500).json({ success: false });
        if (row) res.status(200).json({ success: true, user: row });
        else res.status(401).json({ success: false, message: "Invalid Credentials" });
    });
});

app.post('/api/tickets', (req, res) => db.run(`INSERT INTO support_tickets (type, details) VALUES (?, ?)`, [req.body.type, req.body.details], (err) => res.json({ success: !err })));
app.get('/api/admin/tickets', (req, res) => db.all(`SELECT * FROM support_tickets ORDER BY id DESC`, [], (err, rows) => res.json({ success: !err, data: rows })));
app.post('/api/admin/tickets/resolve', (req, res) => db.run(`UPDATE support_tickets SET status = 'Resolved' WHERE id = ?`, [req.body.id], (err) => res.json({ success: !err })));

app.post('/api/apply', (req, res) => {
    const date = new Date().toLocaleDateString();
    db.run(`INSERT INTO applications (applicant_name, role_applied, contact_email, resume_filename, resume_data, applied_date) VALUES (?, ?, ?, ?, ?, ?)`,
    [req.body.name, req.body.role, req.body.email, req.body.resume_filename, req.body.resume_data, date], (err) => {
        if (err) console.error(err);
        res.json({ success: !err });
    });
});

app.get('/api/admin/resume/:id', (req, res) => {
    db.get(`SELECT resume_data, resume_filename FROM applications WHERE id = ?`, [req.params.id], (err, row) => {
        if(err || !row) return res.status(404).json({ success: false });
        res.json({ success: true, data: row.resume_data, filename: row.resume_filename });
    });
});

app.post('/api/clock-in', (req, res) => {
    const { id, timestamp, location } = req.body;
    db.get(`SELECT name FROM users WHERE id = ?`, [id], (err, user) => {
        if (err || !user) return res.status(401).json({ success: false, message: "Unrecognized ID" });
        const datePrefix = timestamp.split('T')[0];
        db.get(`SELECT count(*) as count FROM attendance WHERE user_id = ? AND timestamp LIKE ?`, [id, datePrefix + '%'], (err, row) => {
            if (err) return res.status(500).json({ success: false });
            let newStatus = row.count === 1 ? 'Clocked Out' : 'Clocked In';
            if (row.count >= 2) return res.status(400).json({ success: false, message: "Shift completed for today." });

            db.run(`INSERT INTO attendance (user_id, timestamp, location, status) VALUES (?, ?, ?, ?)`, [id, timestamp, location, newStatus], function(err) {
                res.status(200).json({ success: !err, name: user.name, status: newStatus });
            });
        });
    });
});

app.post('/api/upload', (req, res) => db.run(`INSERT INTO documents (user_id, doc_type, filename) VALUES (?, ?, ?)`, [req.body.user_id, req.body.doc_type, req.body.filename], (err) => res.json({ success: !err })));
app.get('/api/documents/:id', (req, res) => db.all(`SELECT doc_type FROM documents WHERE user_id = ?`, [req.params.id], (err, rows) => res.json({ success: !err, data: rows })));
app.post('/api/leave', (req, res) => db.run(`INSERT INTO leaves (user_id, type, days) VALUES (?, ?, ?)`, [req.body.user_id, req.body.type, req.body.days], (err) => res.json({ success: !err })));
app.post('/api/overtime', (req, res) => db.run(`INSERT INTO overtime (user_id, date, hours, reason) VALUES (?, ?, ?, ?)`, [req.body.user_id, req.body.date, req.body.hours, req.body.reason], (err) => res.json({ success: !err })));
app.post('/api/profile/password', (req, res) => db.run(`UPDATE users SET password = ? WHERE id = ?`, [req.body.newPassword, req.body.userId], (err) => res.json({ success: !err })));

app.get('/api/employee/dtr/:id', (req, res) => db.all(`SELECT timestamp, status FROM attendance WHERE user_id = ? ORDER BY timestamp DESC`, [req.params.id], (err, rows) => res.json({ success: !err, data: rows })));
app.get('/api/employee/leaves/:id', (req, res) => db.all(`SELECT type, days, status FROM leaves WHERE user_id = ? ORDER BY id DESC`, [req.params.id], (err, rows) => res.json({ success: !err, data: rows })));

app.get('/api/admin/logs', (req, res) => db.all(`SELECT a.timestamp, u.name, a.status, a.location FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.timestamp DESC LIMIT 15`, [], (err, rows) => res.json({ success: !err, data: rows })));
app.get('/api/admin/leaves', (req, res) => db.all(`SELECT l.id, u.name, l.type, l.days, l.status FROM leaves l JOIN users u ON l.user_id = u.id WHERE l.status = 'Pending'`, [], (err, rows) => res.json({ success: !err, data: rows })));
app.post('/api/admin/leaves/action', (req, res) => db.run(`UPDATE leaves SET status = ? WHERE id = ?`, [req.body.action, req.body.leave_id], (err) => res.json({ success: !err })));

// NEW ENDPOINT: Total Workforce Count
app.get('/api/admin/stats/workforce', (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM users WHERE role IN ('employee', 'admin')`, [], (err, row) => {
        res.json({ success: !err, count: row ? row.count : 0 });
    });
});

app.get('/api/admin/users', (req, res) => db.all(`SELECT id, name, role, department FROM users WHERE role != 'admin' ORDER BY role`, [], (err, rows) => res.json({ success: !err, data: rows })));
app.post('/api/admin/users', (req, res) => db.run(`INSERT INTO users (id, password, name, role, department) VALUES (?, ?, ?, ?, ?)`, [req.body.id, req.body.password, req.body.name, req.body.role, req.body.department], (err) => res.json({ success: !err })));
app.delete('/api/admin/users/:id', (req, res) => db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], (err) => res.json({ success: !err })));
app.get('/api/admin/payroll', (req, res) => db.all(`SELECT * FROM payroll_runs ORDER BY id DESC`, [], (err, rows) => res.json({ success: !err, data: rows })));

app.post('/api/admin/payroll/execute', (req, res) => {
    const today = new Date();
    const day = today.getDate();

    if (day !== 15 && day !== 30) {
        return res.status(403).json({ success: false, message: "SYSTEM LOCKED: Payroll can only be processed on the 15th or 30th of the month." });
    }

    const runDate = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' });
    const adminName = req.body.adminName || 'System Admin';

    db.get(`SELECT id FROM payroll_runs WHERE run_date = ?`, [runDate], (err, existing) => {
        if (existing) return res.status(400).json({ success: false, message: `Payroll for ${runDate} has already been dispatched.` });

        const query = `
            SELECT u.id, u.basic_pay,
                (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND a.status = 'Clocked Out') as completed_shifts
            FROM users u WHERE u.role = 'employee'
        `;

        db.all(query, [], (err, employees) => {
            if (err) return res.status(500).json({ success: false, message: "Database computation error." });

            let totalAmount = 0;
            employees.forEach(emp => {
                const hourlyRate = (emp.basic_pay || 45000) / 160;
                const hoursWorked = (emp.completed_shifts || 0) * 8;
                totalAmount += (hourlyRate * hoursWorked);
            });

            if (totalAmount === 0) {
                return res.status(400).json({ success: false, message: "Computation Complete: ₱0.00.\nNo employee work hours logged in the database for this period." });
            }

            db.run(`INSERT INTO payroll_runs (run_date, total_amount, status, processed_by) VALUES (?, ?, ?, ?)`, 
            [runDate, totalAmount, 'Dispatched', adminName], function(err) {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, message: `Payroll successfully computed based on actual logged work hours.\n\nTotal Disbursed: ₱${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` });
            });
        });
    });
});

app.get('/api/admin/applicants', (req, res) => db.all(`SELECT * FROM applications ORDER BY id DESC`, [], (err, rows) => res.json({ success: !err, data: rows })));
app.post('/api/dev/reset', (req, res) => db.run(`DELETE FROM attendance WHERE user_id = ?`, [req.body.id], (err) => res.json({success: !err})));

app.listen(PORT, () => console.log(`🛡️ Pentagon SecureHR Backend running on http://localhost:${PORT}`));