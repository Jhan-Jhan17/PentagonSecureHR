import os
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)

# 1. Enterprise Security & Payload Rules
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB payload limit for base64 biometric face captures

# Required for Identity and Access Management (IAM) token logic
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'pentagon_secure_secret_string_123')
jwt = JWTManager(app)


app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:admin123@localhost:5432/securehr_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- DATABASE MODELS (Auto-Generates PostgreSQL Schema Elements) ---

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True)
    password = db.Column(db.String, nullable=False)
    name = db.Column(db.String, nullable=False)
    role = db.Column(db.String, nullable=False)
    department = db.Column(db.String)
    position = db.Column(db.String, default='Staff')
    basic_pay = db.Column(db.Float, default=45000.0)

class Attendance(db.Model):
    __tablename__ = 'attendance'
    log_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.String, nullable=False) # Retained string format for frontend ISO string parsing
    location = db.Column(db.String)
    status = db.Column(db.String)

class Leave(db.Model):
    __tablename__ = 'leaves'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String, nullable=False)
    days = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String, default='Pending')

class PayrollRun(db.Model):
    __tablename__ = 'payroll_runs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    run_date = db.Column(db.String, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String, default='Dispatched')
    processed_by = db.Column(db.String, nullable=False)

class Overtime(db.Model):
    __tablename__ = 'overtime'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String, nullable=False)
    date = db.Column(db.String, nullable=False)
    hours = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String, nullable=False)
    status = db.Column(db.String, default='Pending')

class EmergencyContact(db.Model):
    __tablename__ = 'emergency_contacts'
    user_id = db.Column(db.String, primary_key=True)
    contact_name = db.Column(db.String)
    contact_phone = db.Column(db.String)

class Document(db.Model):
    __tablename__ = 'documents'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String)
    doc_type = db.Column(db.String)
    filename = db.Column(db.String)
    status = db.Column(db.String, default='Uploaded')

class Application(db.Model):
    __tablename__ = 'applications'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    applicant_name = db.Column(db.String)
    role_applied = db.Column(db.String)
    contact_email = db.Column(db.String)
    resume_filename = db.Column(db.String)
    resume_data = db.Column(db.Text)
    status = db.Column(db.String, default='Initial Review')
    applied_date = db.Column(db.String)

class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.String)
    details = db.Column(db.Text)
    status = db.Column(db.String, default='Open')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- APPLICATION ROUTING GATEWAYS (Preserving Exact Feature Logic) ---

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))

@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'login.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(FRONTEND_DIR, path)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    user_id = data.get('userId')
    password = data.get('password')
    role = data.get('role')

    if role == 'applicant':
        # Upgraded to issue a legitimate secure access token matching IAM principles
        token = create_access_token(identity={'id': 'PUBLIC', 'role': 'applicant'})
        return jsonify({
            "success": True, 
            "token": token,
            "user": {"id": "PUBLIC", "name": "Guest Applicant", "role": "applicant"}
        }), 200

    user = User.query.filter_by(id=user_id, password=password, role=role).first()
    if user:
        token = create_access_token(identity={'id': user.id, 'role': user.role})
        return jsonify({
            "success": True, 
            "token": token,
            "user": {
                "id": user.id, "name": user.name, "role": user.role, 
                "department": user.department, "position": user.position, "basic_pay": user.basic_pay
            }
        }), 200
    
    return jsonify({"success": False, "message": "Invalid Credentials"}), 401

@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    data = request.json or {}
    try:
        ticket = SupportTicket(type=data.get('type'), details=data.get('details'))
        db.session.add(ticket)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False})

@app.route('/api/admin/tickets', methods=['GET'])
def get_tickets():
    tickets = SupportTicket.query.order_by(SupportTicket.id.desc()).all()
    data = [{"id": t.id, "type": t.type, "details": t.details, "status": t.status, "created_at": t.created_at.isoformat()} for t in tickets]
    return jsonify({"success": True, "data": data})

@app.route('/api/admin/tickets/resolve', methods=['POST'])
def resolve_ticket():
    data = request.json or {}
    ticket = SupportTicket.query.get(data.get('id'))
    if ticket:
        ticket.status = 'Resolved'
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/api/apply', methods=['POST'])
def apply():
    data = request.json or {}
    date_str = datetime.now().strftime('%m/%d/%Y') # Formatted match for standard locales
    try:
        app_record = Application(
            applicant_name=data.get('name'), role_applied=data.get('role'),
            contact_email=data.get('email'), resume_filename=data.get('resume_filename'),
            resume_data=data.get('resume_data'), applied_date=date_str
        )
        db.session.add(app_record)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False})

@app.route('/api/admin/resume/<int:id>', methods=['GET'])
def get_resume(id):
    record = Application.query.get(id)
    if not record:
        return jsonify({"success": False}), 404
    return jsonify({"success": True, "data": record.resume_data, "filename": record.resume_filename})

@app.route('/api/clock-in', methods=['POST'])
def clock_in():
    data = request.json or {}
    user_id = data.get('id')
    timestamp = data.get('timestamp')
    location = data.get('location')

    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "Unrecognized ID"}), 401

    date_prefix = timestamp.split('T')[0]
    # Retains exact shift completion state rule mapping logic
    count = Attendance.query.filter(Attendance.user_id == user_id, Attendance.timestamp.like(f"{date_prefix}%")).count()
    
    if count >= 2:
        return jsonify({"success": False, "message": "Shift completed for today."}), 400
        
    new_status = 'Clocked Out' if count == 1 else 'Clocked In'
    
    try:
        log = Attendance(user_id=user_id, timestamp=timestamp, location=location, status=new_status)
        db.session.add(log)
        db.session.commit()
        return jsonify({"success": True, "name": user.name, "status": new_status}), 200
    except Exception:
        return jsonify({"success": False}), 500

@app.route('/api/upload', methods=['POST'])
def upload_document():
    data = request.json or {}
    try:
        doc = Document(user_id=data.get('user_id'), doc_type=data.get('doc_type'), filename=data.get('filename'))
        db.session.add(doc)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False})

@app.route('/api/documents/<id>', methods=['GET'])
def get_documents(id):
    docs = Document.query.filter_by(user_id=id).all()
    data = [{"doc_type": d.doc_type} for d in docs]
    return jsonify({"success": True, "data": data})

@app.route('/api/leave', methods=['POST'])
def request_leave():
    data = request.json or {}
    try:
        lv = Leave(user_id=data.get('user_id'), type=data.get('type'), days=data.get('days'))
        db.session.add(lv)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False})

@app.route('/api/overtime', methods=['POST'])
def request_overtime():
    data = request.json or {}
    try:
        ot = Overtime(user_id=data.get('user_id'), date=data.get('date'), hours=data.get('hours'), reason=data.get('reason'))
        db.session.add(ot)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False})

@app.route('/api/profile/password', methods=['POST'])
def update_password():
    data = request.json or {}
    user = User.query.get(data.get('userId'))
    if user:
        user.password = data.get('newPassword')
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/api/employee/dtr/<id>', methods=['GET'])
def get_dtr(id):
    logs = Attendance.query.filter_by(user_id=id).order_by(Attendance.timestamp.desc()).all()
    data = [{"timestamp": log.timestamp, "status": log.status} for log in logs]
    return jsonify({"success": True, "data": data})

@app.route('/api/employee/leaves/<id>', methods=['GET'])
def get_employee_leaves(id):
    leaves = Leave.query.filter_by(user_id=id).order_by(Leave.id.desc()).all()
    data = [{"type": lv.type, "days": lv.days, "status": lv.status} for lv in leaves]
    return jsonify({"success": True, "data": data})

@app.route('/api/admin/logs', methods=['GET'])
def get_admin_logs():
    records = db.session.query(Attendance, User).join(User, Attendance.user_id == User.id).order_by(Attendance.timestamp.desc()).limit(15).all()
    data = [{"timestamp": att.timestamp, "name": usr.name, "status": att.status, "location": att.location} for att, usr in records]
    return jsonify({"success": True, "data": data})

@app.route('/api/admin/leaves', methods=['GET'])
def get_admin_leaves():
    records = db.session.query(Leave, User).join(User, Leave.user_id == User.id).filter(Leave.status == 'Pending').all()
    data = [{"id": lv.id, "name": usr.name, "type": lv.type, "days": lv.days, "status": lv.status} for lv, usr in records]
    return jsonify({"success": True, "data": data})

@app.route('/api/admin/leaves/action', methods=['POST'])
def action_leave():
    data = request.json or {}
    lv = Leave.query.get(data.get('leave_id'))
    if lv:
        lv.status = data.get('action')
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/api/admin/stats/workforce', methods=['GET'])
def get_workforce_stats():
    count = User.query.filter(User.role.in_(['employee', 'admin'])).count()
    return jsonify({"success": True, "count": count})

@app.route('/api/admin/users', methods=['GET'])
def get_users():
    users = User.query.filter(User.role != 'admin').order_by(User.role).all()
    data = [{"id": u.id, "name": u.name, "role": u.role, "department": u.department} for u in users]
    return jsonify({"success": True, "data": data})

@app.route('/api/admin/users', methods=['POST'])
def add_user():
    data = request.json or {}
    try:
        user = User(id=data.get('id'), password=data.get('password'), name=data.get('name'), role=data.get('role'), department=data.get('department'))
        db.session.add(user)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False})

@app.delete('/api/admin/users/<id>')
def delete_user(id):
    user = User.query.get(id)
    if user:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/api/admin/payroll', methods=['GET'])
def get_payroll_runs():
    runs = PayrollRun.query.order_by(PayrollRun.id.desc()).all()
    data = [{"id": r.id, "run_date": r.run_date, "total_amount": r.total_amount, "status": r.status, "processed_by": r.processed_by} for r in runs]
    return jsonify({"success": True, "data": data})

@app.route('/api/admin/payroll/execute', methods=['POST'])
def execute_payroll():
    today = datetime.now()
    day = today.day

    # Retains strict calculation unlock rules window (15th or 30th)
    if day != 15 and day != 30:
        return jsonify({"success": False, "message": "SYSTEM LOCKED: Payroll can only be processed on the 15th or 30th of the month."}), 403

    run_date = today.strftime('%B %d, %Y')
    admin_name = request.json.get('adminName', 'System Admin')

    if PayrollRun.query.filter_by(run_date=run_date).first():
        return jsonify({"success": False, "message": f"Payroll for {run_date} has already been dispatched."}), 400

    employees = User.query.filter_by(role='employee').all()
    total_amount = 0.0

    for emp in employees:
        completed_shifts = Attendance.query.filter_by(user_id=emp.id, status='Clocked Out').count()
        basic_pay = emp.basic_pay or 45000.0
        hourly_rate = basic_pay / 160.0
        hours_worked = completed_shifts * 8.0
        total_amount += (hourly_rate * hours_worked)

    if total_amount == 0.0:
        return jsonify({"success": False, "message": "Computation Complete: ₱0.00.\nNo employee work hours logged in the database for this period."}), 400

    try:
        run = PayrollRun(run_date=run_date, total_amount=total_amount, status='Dispatched', processed_by=admin_name)
        db.session.add(run)
        db.session.commit()
        
        formatted_money = f"{total_amount:,.2f}"
        return jsonify({"success": True, "message": f"Payroll successfully computed based on actual logged work hours.\n\nTotal Disbursed: ₱{formatted_money}"})
    except Exception:
        return jsonify({"success": False, "message": "Database transaction failure."}), 500

@app.route('/api/admin/applicants', methods=['GET'])
def get_applicants():
    applicants = Application.query.order_by(Application.id.desc()).all()
    data = [{"id": a.id, "applicant_name": a.applicant_name, "role_applied": a.role_applied, "contact_email": a.contact_email, "resume_filename": a.resume_filename, "resume_data": a.resume_data, "status": a.status, "applied_date": a.applied_date} for a in applicants]
    return jsonify({"success": True, "data": data})

@app.route('/api/dev/reset', methods=['POST'])
def dev_reset():
    user_id = request.json.get('id')
    try:
        Attendance.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        return jsonify({"success": False})

# --- SEED ROOT ADMIN DATA RETENTION BLOCK ---
with app.app_context():
    db.create_all() # Creates your production tables inside PostgreSQL instantly
    
    # Seeds default credentials securely without destroying active profiles
    if not User.query.get('ADMIN-01'):
        admin = User(id='ADMIN-01', password='admin123', name='System Admin', role='admin', department='Human Resources', position='HR Director', basic_pay=65000.0)
        db.session.add(admin)
    if not User.query.get('EMP-01'):
        emp = User(id='EMP-01', password='emp123', name='First Employee', role='employee', department='Development', position='Software Engineer', basic_pay=48500.0)
        db.session.add(emp)
    db.session.commit()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)