window.switchView = function(viewId, title) {
    document.querySelectorAll('.view-section, .tab-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${viewId}`) || document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-corporate-navy', 'border-corporate-navy', 'border-b-4');
        btn.classList.add('text-gray-500', 'border-transparent');
    });
    const activeBtn = document.getElementById(`btn-${viewId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-500', 'border-transparent');
        activeBtn.classList.add('text-corporate-navy', 'border-corporate-navy', 'border-b-4');
    }

    if(document.getElementById('viewTitle') && title) document.getElementById('viewTitle').textContent = title;

    const user = JSON.parse(localStorage.getItem('pentagonUser'));

    if (viewId === 'dashboard' && document.getElementById('ticketTable')) { 
        fetchTickets(); 
        fetchWorkforceCount(); 
    }
    if (viewId === 'directory') fetchDirectory();
    if (viewId === 'time') { if (user && user.role !== 'admin') fetchEmployeeDTR(); }
    if (viewId === 'leaves') { if (user && user.role !== 'admin') fetchEmployeeLeaves(); }
    if (viewId === 'att' && user && user.role === 'admin') { fetchAdminLogs(); fetchPendingLeaves(); }
    if (viewId === 'pay') { if (user && user.role === 'admin') { fetchPayrollHistory(); checkPayrollLock(); } }
    if (viewId === 'payroll') { if (user && user.role !== 'admin') fetchEmployeePayslips(); }
    if (viewId === 'profile') loadProfileData();
    if (viewId === 'sec') fetchBiometricEmployees();
    if (viewId === 'rec') fetchApplicants();
};

window.secureLogout = function() {
    localStorage.removeItem('pentagonUser');
    window.location.href = 'login.html';
};

let videoStream = null;

document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('pentagonUser');
    if (!userJson && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('scanner.html')) {
        window.location.href = 'login.html'; return;
    }
    
    let user = userJson ? JSON.parse(userJson) : null;
    const today = new Date().toLocaleDateString();

    if (user && window.location.pathname.includes('index.html')) {
        document.querySelectorAll('.display-name').forEach(el => el.textContent = user.name);
        document.querySelectorAll('.display-id').forEach(el => el.textContent = user.id === 'PUBLIC' ? 'Guest Access' : "ID: " + user.id);
        
        if (user.name) {
            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.querySelectorAll('.display-initials').forEach(el => el.textContent = initials);
        }

        if (user.role === 'applicant') {
            document.getElementById('employee-tabs').classList.add('hidden');
            document.getElementById('applicant-tabs').classList.remove('hidden');
            switchView('applicant-dash', 'Careers Board');
        } else {
            document.getElementById('employee-tabs').classList.remove('hidden');
            if(document.getElementById('applicant-tabs')) document.getElementById('applicant-tabs').classList.add('hidden');
            switchView('dashboard', 'Dashboard Overview');
            loadUserDocuments(user.id);
        }
    } else if (user && window.location.pathname.includes('admin.html')) {
        // Ensure Admin Name & Initials populate perfectly on admin.html
        document.querySelectorAll('.display-name').forEach(el => el.textContent = user.name);
        if (user.name) {
            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.querySelectorAll('.display-initials').forEach(el => el.textContent = initials);
        }
    }

    const clockInBtn = document.getElementById('clockInBtn');
    if (clockInBtn && user && user.role !== 'applicant') {
        const savedState = localStorage.getItem(`attendance_${user.id}_${today}`);
        updateAttendanceState(clockInBtn, savedState || 'Pending');

        clockInBtn.addEventListener('click', () => {
            if(clockInBtn.disabled) return; 
            document.getElementById('faceModal').classList.remove('hidden');
            startFaceScan(user);
        });

        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '<i class="fa-solid fa-rotate-right mr-2"></i> DEV TOOL: Reset My Attendance';
        resetBtn.className = 'w-full mt-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-2 font-bold text-xs rounded transition-colors';
        resetBtn.onclick = async () => {
            localStorage.removeItem(`attendance_${user.id}_${today}`);
            try {
                await fetch('http://localhost:5000/api/dev/reset', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ id: user.id })
                });
                alert("Test records wiped! The page will now refresh so you can test the scanner again.");
                window.location.reload();
            } catch(e) { alert("Server error connecting to reset endpoint."); }
        };
        clockInBtn.parentNode.appendChild(resetBtn);
    }

    if(document.getElementById('auditTrail')) {
        if (typeof fetchTickets === 'function') fetchTickets();
        if (typeof fetchWorkforceCount === 'function') fetchWorkforceCount();
        fetchAdminLogs();
        fetchPendingLeaves();
        fetchDirectory(); 
    }
});

// --- NEW DYNAMIC WORKFORCE COUNTER ---
window.fetchWorkforceCount = async function() {
    const countEl = document.getElementById('totalWorkforceCount');
    if(!countEl) return;
    try {
        const res = await fetch('http://localhost:5000/api/admin/stats/workforce');
        const result = await res.json();
        if(result.success) countEl.textContent = result.count;
    } catch(e) {
        countEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500"></i>';
    }
};

window.fetchEmployeeDTR = async function() {
    const user = JSON.parse(localStorage.getItem('pentagonUser'));
    if(!user) return;
    const tbody = document.getElementById('empDtrTable');
    if(!tbody) return;
    
    const res = await fetch(`http://localhost:5000/api/employee/dtr/${user.id}`);
    const result = await res.json();
    tbody.innerHTML = '';
    if(result.data.length === 0) return tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500">No attendance records found.</td></tr>';

    result.data.forEach(log => {
        const dateObj = new Date(log.timestamp);
        const badge = log.status === 'Clocked In' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
        tbody.innerHTML += `<tr class="border-b"><td class="px-6 py-3 font-bold">${dateObj.toLocaleDateString()}</td><td class="px-6 py-3 text-corporate-textMuted">${dateObj.toLocaleTimeString()}</td><td class="px-6 py-3"><span class="${badge} text-xs px-2 py-1 rounded">${log.status}</span></td></tr>`;
    });
};

window.fetchEmployeeLeaves = async function() {
    const user = JSON.parse(localStorage.getItem('pentagonUser'));
    if(!user) return;
    const tbody = document.getElementById('empLeaveTable');
    if(!tbody) return;
    
    const res = await fetch(`http://localhost:5000/api/employee/leaves/${user.id}`);
    const result = await res.json();
    tbody.innerHTML = '';
    if(result.data.length === 0) return tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500">No leave requests found.</td></tr>';

    result.data.forEach(l => {
        const badge = l.status === 'Approved' ? 'bg-green-100 text-green-800' : (l.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
        tbody.innerHTML += `<tr class="border-b"><td class="px-4 py-3 font-bold">${l.type} (${l.days} Days)</td><td class="px-4 py-3 text-gray-500">Recently</td><td class="px-4 py-3 text-right"><span class="${badge} text-xs px-2 py-1 rounded font-bold">${l.status}</span></td></tr>`;
    });
};

window.fetchEmployeePayslips = async function() {
    const container = document.getElementById('empPayslipGallery');
    if(!container) return;
    
    const res = await fetch(`http://localhost:5000/api/admin/payroll`);
    const result = await res.json();
    container.innerHTML = '';
    if(result.data.length === 0) return container.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No payslips generated yet.</p>';

    result.data.forEach(p => {
        container.innerHTML += `<div class="flex justify-between items-center p-3 border rounded mb-3 bg-white"><div><p class="font-bold text-sm">${p.run_date}</p><p class="text-xs text-green-600 font-bold"><i class="fa-solid fa-circle-check"></i> Processed</p></div><button onclick="printPayslip('${p.run_date}')" class="bg-gray-200 px-3 py-1 rounded text-xs font-bold hover:bg-gray-300"><i class="fa-solid fa-print mr-1"></i> Print / PDF</button></div>`;
    });
};

window.startFaceScan = async function(user) {
    const video = document.getElementById('webcam');
    const statusBox = document.getElementById('faceStatusBox');
    const scanLine = document.getElementById('scanLine');
    
    statusBox.className = 'mt-6 p-3 rounded font-bold text-blue-700 bg-blue-100 text-sm';
    statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Booting Neural Networks...';
    scanLine.classList.add('hidden');

    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('./models')
        ]);

        statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching your security profile...';

        let referenceImage;
        try { referenceImage = await faceapi.fetchImage(`./assets/faces/${user.id}.jpg`); } 
        catch (e) { throw new Error(`Biometric data not enrolled. HR must upload ${user.id}.jpg to the system.`); }

        const referenceDetection = await faceapi.detectSingleFace(referenceImage).withFaceLandmarks().withFaceDescriptor();

        if (!referenceDetection) throw new Error("Could not detect a clear face in your HR reference photo. Please retake it.");
        const referenceDescriptor = referenceDetection.descriptor;

        statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing Camera...';

        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = videoStream;
        
        video.onplaying = async () => {
            scanLine.classList.remove('hidden');
            statusBox.innerHTML = '<i class="fa-solid fa-fingerprint mr-2"></i> Mapping live facial topology... Hold still.';
            
            setTimeout(async () => {
                statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying biometrics...';
                
                const liveDetection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

                if (!liveDetection) {
                    scanLine.classList.add('hidden');
                    statusBox.className = 'mt-6 p-3 rounded font-bold text-red-800 bg-red-100 text-sm border border-red-300';
                    statusBox.innerHTML = `❌ No face detected. Please look directly at the camera.`;
                    setTimeout(closeFaceModal, 3000);
                    return;
                }

                const distance = faceapi.euclideanDistance(referenceDescriptor, liveDetection.descriptor);
                const threshold = 0.6; 

                if (distance < threshold) {
                    try {
                        const res = await fetch('http://localhost:5000/api/clock-in', {
                            method: 'POST', headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ id: user.id, timestamp: new Date().toISOString(), location: "Biometric Kiosk" })
                        });
                        const result = await res.json();
                        
                        if (result.success) {
                            scanLine.classList.add('hidden');
                            statusBox.className = 'mt-6 p-3 rounded font-bold text-green-800 bg-green-100 text-sm border border-green-300';
                            const confidence = ((1 - distance) * 100).toFixed(1);
                            statusBox.innerHTML = `✅ IDENTITY VERIFIED: ${result.name}<br>Match Confidence: ${confidence}%<br>${result.status} Logged.`;
                            
                            updateAttendanceState(document.getElementById('clockInBtn'), result.status);
                            localStorage.setItem(`attendance_${user.id}_${new Date().toLocaleDateString()}`, result.status);
                            setTimeout(closeFaceModal, 3500); 
                        } else { throw new Error(result.message); }
                    } catch (e) { 
                        statusBox.innerHTML = `❌ Server Error: ${e.message}`;
                        setTimeout(closeFaceModal, 3000);
                    }
                } else {
                    scanLine.classList.add('hidden');
                    statusBox.className = 'mt-6 p-3 rounded font-bold text-red-800 bg-red-100 text-sm border border-red-300';
                    statusBox.innerHTML = `❌ ACCESS DENIED: Face Mismatch.<br>Unrecognized biometrics detected.`;
                    setTimeout(closeFaceModal, 4000);
                }
            }, 2000);
        };
    } catch (err) {
        statusBox.className = 'mt-6 p-3 rounded font-bold text-red-800 bg-red-100 text-sm border border-red-300';
        statusBox.innerHTML = `❌ SYSTEM ERROR: ${err.message || "Failed to load AI models or webcam."}`;
        setTimeout(closeFaceModal, 5000);
    }
};

window.closeFaceModal = function() {
    document.getElementById('faceModal').classList.add('hidden');
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
};

function updateAttendanceState(btn, status) {
    btn.className = "w-full text-white py-3 font-bold text-sm rounded shadow transition-colors mt-auto";
    const statusText = document.getElementById('attStatusText');

    if (status === 'Clocked In') {
        btn.innerHTML = '<i class="fa-solid fa-right-from-bracket mr-2"></i> FACE RECOGNITION CLOCK-OUT';
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
        btn.disabled = false;
        if(statusText) statusText.innerHTML = 'Status: <span class="text-blue-600">Currently Clocked In</span>';
    } 
    else if (status === 'Clocked Out') {
        btn.innerHTML = '<i class="fa-solid fa-lock mr-2"></i> SHIFT ENDED';
        btn.classList.add('bg-gray-600', 'cursor-not-allowed');
        btn.disabled = true;
        if(statusText) statusText.innerHTML = 'Status: <span class="text-gray-500">Shift Completed</span>';
    } 
    else {
        btn.innerHTML = '<i class="fa-solid fa-face-viewfinder mr-2"></i> FACE RECOGNITION CLOCK-IN';
        btn.classList.add('bg-corporate-button', 'hover:bg-corporate-buttonHover');
        btn.disabled = false;
        if(statusText) statusText.innerHTML = 'Status: <span class="text-green-600">Camera Ready</span>';
    }
}

window.triggerUpload = function(docType) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.jpg,.png';
    fileInput.onchange = async e => {
        const file = e.target.files[0];
        if(!file) return;
        const user = JSON.parse(localStorage.getItem('pentagonUser'));
        document.getElementById(`btn-${docType}`).innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        await fetch('http://localhost:5000/api/upload', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: user.id, doc_type: docType, filename: file.name })
        });
        setTimeout(() => { loadUserDocuments(user.id); alert(`${file.name} uploaded successfully.`); }, 1000);
    };
    fileInput.click();
};

window.loadUserDocuments = async function(userId) {
    const res = await fetch(`http://localhost:5000/api/documents/${userId}`);
    const result = await res.json();
    if(result.success) {
        result.data.forEach(doc => {
            const btn = document.getElementById(`btn-${doc.doc_type}`);
            if(btn) {
                btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> UPLOADED';
                btn.classList.replace('bg-corporate-button', 'bg-green-600');
                btn.disabled = true;
            }
        });
    }
};

window.printPayslip = function(month) {
    const user = JSON.parse(localStorage.getItem('pentagonUser'));
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <html><head><title>Payslip - ${month}</title>
        <style>body{font-family:Arial; padding:40px; color:#333;} .header{border-bottom:2px solid #1E3A8A; padding-bottom:20px;} h1{color:#1E3A8A;}</style>
        </head><body>
        <div class="header"><h1>PENTAGON SecureHR</h1><p>Official Payslip for ${month}</p></div>
        <h3>Employee: ${user.name} (ID: ${user.id})</h3>
        <p><strong>Department:</strong> ${user.department}</p>
        <hr><br>
        <table style="width:100%; text-align:left;">
            <tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
            <tr><td>Basic Salary</td><td>₱48,500.00</td><td>SSS Contribution</td><td>₱1,125.00</td></tr>
            <tr><td>Overtime</td><td>₱1,200.00</td><td>PhilHealth</td><td>₱900.00</td></tr>
            <tr><td></td><td></td><td>Pag-IBIG</td><td>₱200.00</td></tr>
            <tr><td></td><td></td><td>Withholding Tax</td><td>₱2,245.00</td></tr>
        </table>
        <br><hr>
        <h2>NET PAY: ₱45,230.00</h2>
        </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
};

window.fetchAdminLogs = async function() {
    const tbody = document.getElementById('auditTrail');
    const res = await fetch('http://localhost:5000/api/admin/logs');
    const result = await res.json();
    if(tbody) {
        tbody.innerHTML = '';
        result.data.forEach(log => {
            const badgeClass = log.status === 'Clocked In' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800';
            tbody.innerHTML += `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4">${new Date(log.timestamp).toLocaleTimeString()}</td><td class="py-3 px-4 font-bold">${log.name}</td><td class="py-3 px-4"><span class="text-xs px-2 py-1 rounded ${badgeClass}">${log.status}</span></td></tr>`;
        });
    }
};

window.fetchPendingLeaves = async function() {
    const tbody = document.getElementById('leaveQueue');
    if(!tbody) return;
    const res = await fetch('http://localhost:5000/api/admin/leaves');
    const result = await res.json();
    tbody.innerHTML = '';
    if(result.data.length === 0) tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500">No pending requests.</td></tr>';
    result.data.forEach(leave => {
        tbody.innerHTML += `<tr id="leave-${leave.id}" class="border-b hover:bg-gray-50"><td class="py-3 px-4 font-bold">${leave.name}</td><td class="py-3 px-4">${leave.type} (${leave.days}d)</td><td class="py-3 px-4 text-right"><button onclick="reviewLeave(${leave.id}, 'Approved')" class="bg-green-600 text-white px-3 py-1 rounded text-xs mr-2 font-bold hover:bg-green-700">Approve</button><button onclick="reviewLeave(${leave.id}, 'Rejected')" class="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700">Reject</button></td></tr>`;
    });
};

window.reviewLeave = async function(id, action) {
    await fetch('http://localhost:5000/api/admin/leaves/action', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ leave_id: id, action }) });
    document.getElementById(`leave-${id}`).remove();
    if(document.getElementById('leaveQueue').children.length === 0) fetchPendingLeaves();
};

window.submitLeave = async function(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('pentagonUser'));
    if (!user) return;
    const leaveType = document.getElementById('leaveType').value;
    const leaveDays = document.getElementById('leaveDuration').value;

    try {
        const res = await fetch('http://localhost:5000/api/leave', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: user.id, type: leaveType, days: leaveDays })
        });
        const result = await res.json();
        if(result.success) {
            alert(`✅ SUCCESS: Your request for ${leaveDays} day(s) of ${leaveType} has been submitted securely to HR.`);
            e.target.reset();           
            fetchEmployeeLeaves();      
        } else { alert("Database Error: Could not submit leave."); }
    } catch(err) { alert("Server Offline: Could not reach HR database."); }
};

window.fetchDirectory = async function() {
    const tbody = document.getElementById('directoryTable');
    if(!tbody) return;
    const res = await fetch('http://localhost:5000/api/admin/users');
    const result = await res.json();
    tbody.innerHTML = '';
    result.data.forEach(u => {
        tbody.innerHTML += `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4 font-mono text-xs">${u.id}</td><td class="py-3 px-4 font-bold">${u.name}</td><td class="py-3 px-4 uppercase text-xs">${u.role}</td><td class="py-3 px-4 text-right"><button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs"><i class="fa-solid fa-trash mr-1"></i> Terminate</button></td></tr>`;
    });
};

window.addUser = async function(e) {
    e.preventDefault();
    const data = { id: document.getElementById('newEmpId').value, name: document.getElementById('newEmpName').value, role: document.getElementById('newEmpRole').value, department: document.getElementById('newEmpDept').value, password: document.getElementById('newEmpPass').value || 'password123' };
    await fetch('http://localhost:5000/api/admin/users', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    document.getElementById('addEmpForm').reset();
    fetchDirectory();
    if(document.getElementById('totalWorkforceCount')) fetchWorkforceCount(); // Update dynamic counter
    alert(`✅ New account successfully created!\n\nSend these credentials to the user:\nID / Username: ${data.id}\nPassword: ${data.password}`);
};

window.deleteUser = async function(id) {
    if(confirm(`WARNING: Terminate ID: ${id}?`)) {
        await fetch(`http://localhost:5000/api/admin/users/${id}`, { method: 'DELETE' });
        fetchDirectory();
        if(document.getElementById('totalWorkforceCount')) fetchWorkforceCount(); // Update dynamic counter
    }
};

window.fetchPayrollHistory = async function() {
    const tbody = document.getElementById('payrollTable');
    if(!tbody) return;
    const res = await fetch('http://localhost:5000/api/admin/payroll');
    const result = await res.json();
    tbody.innerHTML = '';
    result.data.forEach(p => {
        const formattedAmount = '₱' + p.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        tbody.innerHTML += `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4 font-bold">${p.run_date}</td><td class="py-3 px-4 text-green-700 font-bold">${formattedAmount}</td><td class="py-3 px-4 text-xs">${p.processed_by}</td><td class="py-3 px-4 text-right"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">${p.status}</span></td></tr>`;
    });
};

window.checkPayrollLock = function() {
    const btn = document.getElementById('executePayrollBtn');
    if (!btn) return;

    const today = new Date().getDate();
    
    if (today !== 15 && today !== 30) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-lock mr-2"></i> LOCKED (Available 15th & 30th)';
        btn.classList.replace('bg-corporate-button', 'bg-gray-500');
        btn.classList.replace('hover:bg-corporate-buttonHover', 'hover:bg-gray-600');
        btn.classList.add('cursor-not-allowed', 'opacity-50');
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play mr-2"></i> EXECUTE CURRENT PAYROLL';
        btn.classList.replace('bg-gray-500', 'bg-corporate-button');
        btn.classList.replace('hover:bg-gray-600', 'hover:bg-corporate-buttonHover');
        btn.classList.remove('cursor-not-allowed', 'opacity-50');
    }
};

window.executePayroll = async function() {
    const btn = document.getElementById('executePayrollBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CALCULATING...';
    btn.disabled = true;
    
    const user = JSON.parse(localStorage.getItem('pentagonUser'));
    try {
        const res = await fetch('http://localhost:5000/api/admin/payroll/execute', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ adminName: user.name })
        });
        const result = await res.json();
        
        if(result.success) {
            setTimeout(() => {
                alert("SYSTEM NOTIFICATION:\n\n" + result.message);
                fetchPayrollHistory();
                btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> DISPATCHED';
                btn.classList.replace('bg-corporate-button', 'bg-green-600');
            }, 1500);
        } else {
            alert("SYSTEM ALERT:\n" + result.message);
            checkPayrollLock();
        }
    } catch(err) {
        alert("Server Offline.");
        checkPayrollLock(); 
    }
};

window.fetchBiometricEmployees = async function() {
    const tbody = document.getElementById('biometricTable');
    if(!tbody) return;
    const res = await fetch('http://localhost:5000/api/admin/users');
    const result = await res.json();
    tbody.innerHTML = '';
    result.data.forEach(u => {
        if(u.role === 'employee') {
            tbody.innerHTML += `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4 font-mono text-xs">${u.id}</td><td class="py-3 px-4 font-bold">${u.name}</td><td class="py-3 px-4 text-right"><span class="bg-green-100 text-green-800 font-bold text-xs px-2 py-1 rounded"><i class="fa-solid fa-check-circle mr-1"></i> ENROLLED</span></td></tr>`;
        }
    });
};

window.fetchApplicants = async function() {
    const tbody = document.getElementById('atsTable');
    if(!tbody) return;
    const res = await fetch('http://localhost:5000/api/admin/applicants');
    const result = await res.json();
    tbody.innerHTML = '';
    if(result.data.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center">No applicants found.</td></tr>';
    result.data.forEach(a => {
        tbody.innerHTML += `<tr class="border-b"><td class="py-3 px-4 font-bold">${a.applicant_name || 'Guest'}</td><td class="py-3 px-4">${a.role_applied}</td><td class="py-3 px-4 text-blue-600">${a.contact_email}</td><td class="py-3 px-4 text-xs">${a.applied_date}</td><td class="py-3 px-4 text-right"><button onclick="viewResume(${a.id})" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1 rounded"><i class="fa-solid fa-file-pdf mr-1"></i> View Resume</button></td></tr>`;
    });
};

window.submitApplication = async function(e) {
    e.preventDefault();
    const resumeInput = document.getElementById('appResume').files[0];
    if (!resumeInput) return alert("Please attach a PDF resume.");

    const reader = new FileReader();
    reader.onload = async function(event) {
        const base64Data = event.target.result;
        const data = {
            name: document.getElementById('appName').value,
            email: document.getElementById('appEmail').value,
            role: document.getElementById('appRole').value,
            resume_filename: resumeInput.name,
            resume_data: base64Data
        };
        try {
            await fetch('http://localhost:5000/api/apply', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            alert("✅ Application Submitted! Our HR team will review your resume and contact you at " + data.email);
            e.target.reset();
        } catch (err) { alert("Server Error uploading application."); }
    };
    reader.readAsDataURL(resumeInput);
};

window.viewResume = async function(appId) {
    try {
        const res = await fetch(`http://localhost:5000/api/admin/resume/${appId}`);
        const result = await res.json();
        if(result.success && result.data) {
            const viewer = window.open('', '_blank');
            viewer.document.write(`
                <html><head><title>Resume Viewer - ${result.filename}</title></head>
                <body style="margin:0; padding:0; overflow:hidden;">
                    <iframe src="${result.data}" width="100%" height="100%" style="border:none;"></iframe>
                </body></html>
            `);
        } else { alert("No valid resume file found for this applicant."); }
    } catch(e) { alert("Error retrieving resume from database."); }
};

window.fetchTickets = async function() {
    const tbody = document.getElementById('ticketTable');
    if(!tbody) return;
    const res = await fetch('http://localhost:5000/api/admin/tickets');
    const result = await res.json();
    tbody.innerHTML = '';
    if(result.data.length === 0) tbody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500">No open requests.</td></tr>';
    result.data.forEach(t => {
        if(t.status !== 'Resolved') {
            tbody.innerHTML += `<tr class="border-b bg-red-50"><td class="py-3 px-4 font-bold text-red-700">${t.type}</td><td class="py-3 px-4 text-xs">${t.details}</td><td class="py-3 px-4 text-right"><button onclick="resolveTicket(${t.id})" class="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-700">Resolve</button></td></tr>`;
        }
    });
};

window.resolveTicket = async function(id) {
    await fetch('http://localhost:5000/api/admin/tickets/resolve', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
    fetchTickets();
};

window.submitEmergencyContact = function(e) { e.preventDefault(); alert("Emergency Contact Updated."); e.target.reset(); };
window.submitOvertime = function(e) { e.preventDefault(); alert("Overtime Request Submitted to HR."); e.target.reset(); };

function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('pentagonUser'));
    if (!user) return;
    if (document.getElementById('profName')) document.getElementById('profName').value = user.name;
    if (document.getElementById('profId')) document.getElementById('profId').value = user.id;
    if (document.getElementById('profDept')) document.getElementById('profDept').value = user.department || 'Unassigned';
    if (document.getElementById('profPos')) document.getElementById('profPos').value = user.position || 'Staff';
    if (document.getElementById('profRole')) document.getElementById('profRole').value = user.role ? user.role.toUpperCase() : 'EMPLOYEE';
}