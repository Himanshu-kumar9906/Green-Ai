// --- Database Mock ---
let students = [
    { roll_no: 101, full_name: "Himanshu Kumar", department: "Engineering", current_score: 100 },
    { roll_no: 102, full_name: "Yashashvi Kumar", department: "Law", current_score: 100 },
    { roll_no: 103, full_name: "Saurabh Singh Negi", department: "MCA", current_score: 100 },
    { roll_no: 104, full_name: "Prince Ranjan", department: "Engineering", current_score: 100 },
    { roll_no: 105, full_name: "Amlan Roy", department: "Law", current_score: 100 },
    { roll_no: 106, full_name: "Virat Kohli", department: "MCA", current_score: 100 },
    { roll_no: 107, full_name: "Osama Bin Laden", department: "Engineering", current_score: 100 },
    { roll_no: 108, full_name: "Abu Bakr al-Baghdadi", department: "Law", current_score: 100 }
];

const cameras = [
    { camera_id: 'CAM-01', location_name: "Library Entrance", zone_type: "High Traffic" },
    { camera_id: 'CAM-02', location_name: "Boys-Canteen", zone_type: "Food Zone" },
    { camera_id: 'CAM-03', location_name: "Academic Block", zone_type: "Academic" },
    { camera_id: 'CAM-04', location_name: "Law Building", zone_type: "Academic" }
];

const action_types = [
    { action_id: 'A1', type: 'Eco-Positive', description: "Disposing of trash in correct bin", point_impact: 5 },
    { action_id: 'A2', type: 'Good Samaritan', description: "Picking up litter that wasn't theirs", point_impact: 15 },
    { action_id: 'A3', type: 'Minor Infraction', description: "Accidental littering or leaving a tray", point_impact: -10 },
    { action_id: 'A4', type: 'Major Infraction', description: "Intentional littering or dumping waste", point_impact: -25 },
    { action_id: 'A5', type: 'Repeat Offender', description: "Multiple littering incidents in single week", point_impact: -50 }
];

let behavior_logs = [];
let logIdCounter = 1000;
let simulationInterval;
let activeCameraId = 'CAM-01';
let webcamStream = null;

// --- Session State ---
let currentUserType = null; // 'admin' or 'student'
let currentStudentObj = null;

// --- DOM Elements ---
const globalLogStream = document.getElementById('global-log-stream');
const personalLogStream = document.getElementById('personal-log-stream');
const leaderboardBody = document.getElementById('leaderboard-body');
const cameraSelect = document.getElementById('camera-select');
const videoOverlay = document.getElementById('video-overlay');
const heatmapGrid = document.getElementById('heatmap-grid');
const webcamFeed = document.getElementById('webcam-feed');
const mockFeed = document.getElementById('mock-feed');

// --- Initialization ---
function initApp() {
    // Populate Camera Dropdown
    cameraSelect.innerHTML = cameras.map(cam =>
        `<option value="${cam.camera_id}">${cam.location_name} (${cam.camera_id})</option>`
    ).join('');

    cameraSelect.addEventListener('change', (e) => {
        activeCameraId = e.target.value;
    });

    renderLeaderboard();
    renderHeatmap();
    startSimulation(); // Start background simulation for events
}
window.onload = initApp;

// --- Login & Authentication Logic ---
function toggleLoginTab(tab) {
    document.getElementById('tab-student').classList.remove('active');
    document.getElementById('tab-admin').classList.remove('active');
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'student') {
        document.getElementById('login-student-form').style.display = 'block';
        document.getElementById('login-admin-form').style.display = 'none';
    } else {
        document.getElementById('login-student-form').style.display = 'none';
        document.getElementById('login-admin-form').style.display = 'block';
    }
}

function loginAdmin() {
    currentUserType = 'admin';
    currentStudentObj = null;

    // UI Updates
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('nav-admin').style.display = 'block';
    document.getElementById('nav-student').style.display = 'none';

    // Sidebar info
    document.getElementById('sidebar-name').innerText = "Admin Panel";
    document.getElementById('sidebar-role').innerText = "Campus Security";
    document.getElementById('sidebar-avatar').innerText = "A";

    switchTab('dashboard'); // Admin default
    initWebcam(); // Start external camera feed
}

function loginStudent() {
    const rollNo = parseInt(document.getElementById('roll-input').value);
    const student = students.find(s => s.roll_no === rollNo);

    if (!student) {
        alert("Invalid Roll Number! Try entering a valid ID (101-108).");
        return;
    }

    currentUserType = 'student';
    currentStudentObj = student;

    // UI Updates
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('nav-admin').style.display = 'none';
    document.getElementById('nav-student').style.display = 'block';

    // Sidebar info
    document.getElementById('sidebar-name').innerText = student.full_name;
    document.getElementById('sidebar-role').innerText = `Roll No: ${student.roll_no}`;
    document.getElementById('sidebar-avatar').innerText = student.full_name.charAt(0);

    // Initial population of personal data
    updateStudentDashboard();
    switchTab('student-dashboard'); // Student default

    // Stop webcam if running
    stopWebcam();
}

function logout() {
    currentUserType = null;
    currentStudentObj = null;
    stopWebcam();

    document.getElementById('app-wrapper').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('roll-input').value = '';
    document.getElementById('admin-pass').value = '';
}

// --- Webcam Logic ---
async function initWebcam() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamFeed.srcObject = webcamStream;
        webcamFeed.style.display = 'block';
        mockFeed.style.display = 'none';
    } catch (err) {
        console.error("Error accessing webcam:", err);
        webcamFeed.style.display = 'none';
        mockFeed.style.display = 'flex';
        document.getElementById('rec-status').innerText = 'ERROR ⚠️';
    }
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
}

// --- Navigation Tabs ---
function switchTab(tabId) {
    // Update active nav depending on who is logged in
    const activeNavId = currentUserType === 'admin' ? 'nav-admin' : 'nav-student';
    document.querySelectorAll(`#${activeNavId} li`).forEach(li => li.classList.remove('active'));
    document.querySelector(`#${activeNavId} li[onclick="switchTab('${tabId}')"]`).classList.add('active');

    // Hide all
    document.querySelectorAll('.view-section').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active-view');
    });

    // Show target
    const targetView = document.getElementById(`${tabId}-view`);
    targetView.style.display = 'flex';
    setTimeout(() => targetView.classList.add('active-view'), 10);

    // Title
    const titles = {
        'dashboard': 'Admin CCTV Live Monitor',
        'student-dashboard': 'My Behavior Profile',
        'leaderboard': 'Campus Leaderboard',
        'heatmap': 'Admin Incident Heatmap'
    };
    document.getElementById('page-title-text').innerText = titles[tabId];
}

// --- Simulation Engine ---
function startSimulation() {
    function loop() {
        const delay = Math.floor(Math.random() * 5000) + 3000;
        setTimeout(() => {
            simulateEvent();
            loop();
        }, delay);
    }
    loop();
}

function simulateEvent() {
    const student = students[Math.floor(Math.random() * students.length)];
    const camera = cameras[Math.floor(Math.random() * cameras.length)];

    let action;
    const rand = Math.random();
    if (rand < 0.6) {
        action = action_types[Math.floor(Math.random() * 2)];
    } else {
        action = action_types[Math.floor(Math.random() * 3) + 2];
    }

    const log = {
        log_id: `LOG-${logIdCounter++}`,
        roll_no: student.roll_no,
        camera_id: camera.camera_id,
        action_id: action.action_id,
        timestamp: new Date().toLocaleTimeString(),
        evidence_url: `https://mock-cctv.campus.edu/vid/${logIdCounter}.mp4`,
        confidence_score: (Math.random() * (0.99 - 0.85) + 0.85).toFixed(2),
        student_name: student.full_name,
        action_desc: action.description,
        action_type: action.type,
        point_impact: action.point_impact,
        location: camera.location_name
    };

    behavior_logs.unshift(log);
    if (behavior_logs.length > 100) behavior_logs.pop();

    student.current_score += action.point_impact;
    if (student.current_score > 100) student.current_score = 100;
    if (student.current_score < 0) student.current_score = 0;

    // UI Updates
    if (currentUserType === 'admin') {
        renderNewLogGlobal(log);
        showBoundingBoxIfMatch(log);
    } else if (currentUserType === 'student' && currentStudentObj && student.roll_no === currentStudentObj.roll_no) {
        updateStudentDashboard();
    }

    // Always update these in background
    renderLeaderboard();
    renderHeatmap();
}

// --- Render Logic ---
function createLogHTML(log, showDispute) {
    const isNegative = log.point_impact < 0;
    const severityClass = isNegative ? 'severity-high' : 'severity-pos';
    const impactClass = isNegative ? 'impact-neg' : 'impact-pos';
    const sign = log.point_impact > 0 ? '+' : '';

    return `
        <div class="log-item ${severityClass}">
            <div class="log-header">
                <span><i class="fa-solid fa-clock"></i> ${log.timestamp} | ${log.camera_id}</span>
                <span>AI Conf: ${(log.confidence_score * 100).toFixed(0)}%</span>
            </div>
            <div class="log-body">
                <strong>${log.student_name} (Roll: ${log.roll_no})</strong> - <em>${log.action_type}</em><br>
                ${log.action_desc}. Score impact: <span class="${impactClass}">${sign}${log.point_impact}</span>
            </div>
            <div class="log-actions">
                ${(isNegative && showDispute) ? `<button class="btn-dispute" onclick="openDisputeModal('${log.log_id}')">Dispute Event</button>` : ''}
            </div>
        </div>
    `;
}

function renderNewLogGlobal(log) {
    const div = document.createElement('div');
    div.innerHTML = createLogHTML(log, true);
    globalLogStream.prepend(div.firstElementChild);
}

function updateStudentDashboard() {
    if (!currentStudentObj) return;

    // Update Score Circle Visually
    const scoreVal = currentStudentObj.current_score;
    const scoreText = document.getElementById('student-score-display');
    const statusText = document.getElementById('student-status-text');
    const circle = document.querySelector('.score-circle');

    scoreText.innerText = scoreVal;

    if (scoreVal >= 100) {
        circle.style.borderColor = 'var(--success-color)';
        circle.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
        statusText.innerText = "Excellent Campus Citizen";
        statusText.style.color = 'var(--success-color)';
    } else if (scoreVal > 50) {
        circle.style.borderColor = 'var(--warning-color)';
        circle.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.3)';
        statusText.innerText = "Warning: Multiple Infractions";
        statusText.style.color = 'var(--warning-color)';
    } else {
        circle.style.borderColor = 'var(--danger-color)';
        circle.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.3)';
        statusText.innerText = "Critical: Immediate Action Required";
        statusText.style.color = 'var(--danger-color)';
    }

    // Update Personal Logs
    const myLogs = behavior_logs.filter(l => l.roll_no === currentStudentObj.roll_no);
    if (myLogs.length === 0) {
        personalLogStream.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No specific logs yet... Keep the campus clean!</div>`;
    } else {
        personalLogStream.innerHTML = myLogs.map(l => createLogHTML(l, true)).join('');
    }
}

function showBoundingBoxIfMatch(log) {
    if (currentUserType !== 'admin') return;
    if (log.camera_id !== activeCameraId) return;

    // Keep box within 10% to 80% to avoid edge clipping on 16:9 video
    const top = Math.floor(Math.random() * 60) + 10;
    const left = Math.floor(Math.random() * 70) + 10;

    const isNegative = log.point_impact < 0;
    const boxColor = isNegative ? 'var(--danger-color)' : 'var(--success-color)';
    const sign = log.point_impact > 0 ? '+' : '';

    const box = document.createElement('div');
    box.className = 'bounding-box';
    box.style.top = `${top}%`;
    box.style.left = `${left}%`;
    box.style.width = '160px';
    box.style.height = '160px';
    box.style.borderColor = boxColor;

    box.innerHTML = `
        <div class="bounding-info" style="border-color: ${boxColor}">
            <span>ID: ${log.roll_no}</span>
            <span>${log.student_name}</span>
            <span class="score-impact" style="color: ${boxColor}">${sign}${log.point_impact}</span>
        </div>
    `;

    videoOverlay.appendChild(box);
    setTimeout(() => {
        box.style.opacity = '0';
        setTimeout(() => box.remove(), 500);
    }, 4000); // linger slightly longer over live webcam
}

// ... Additional helper renders for heatmap and leaderboard remain mostly identical 
function renderLeaderboard() {
    const filter = document.getElementById('dept-filter').value;
    let filteredStudents = students;
    if (filter !== 'All') {
        filteredStudents = students.filter(s => s.department === filter);
    }

    const sorted = [...filteredStudents].sort((a, b) => b.current_score - a.current_score);

    leaderboardBody.innerHTML = sorted.map((student, index) => {
        const rank = index + 1;
        let rankHtml = `<span>${rank}</span>`;
        if (rank <= 3) {
            rankHtml = `<span class="rank-badge rank-${rank}">${rank}</span>`;
        }

        return `
            <tr>
                <td>${rankHtml}</td>
                <td>${student.roll_no}</td>
                <td><strong>${student.full_name}</strong></td>
                <td>${student.department}</td>
                <td class="score-cell ${student.current_score < 100 ? 'impact-neg' : 'impact-pos'}">${student.current_score}</td>
            </tr>
        `;
    }).join('');
}

function runFilter() { renderLeaderboard(); }

function renderHeatmap() {
    const heatData = cameras.map(cam => {
        const camLogs = behavior_logs.filter(ln => ln.camera_id === cam.camera_id);
        const positive = camLogs.filter(ln => ln.point_impact > 0).length;
        const negative = camLogs.filter(ln => ln.point_impact < 0).length;
        return { ...cam, positive, negative, total: camLogs.length };
    });

    heatmapGrid.innerHTML = heatData.map(data => `
        <div class="heatmap-card">
            <h4><i class="fa-solid fa-video"></i> ${data.location_name}</h4>
            <div style="font-size: 0.85rem; color: var(--text-muted)">ID: ${data.camera_id} | ${data.zone_type}</div>
            <div class="heatmap-stats">
                <div class="stat-item">
                    <span class="stat-value impact-neg">${data.negative}</span>
                    <span class="stat-label">Infractions</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value impact-pos">${data.positive}</span>
                    <span class="stat-label">Eco-Positives</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${data.total}</span>
                    <span class="stat-label">Total Scans</span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Dispute Modal ---
let activeDisputeLogId = null;
function openDisputeModal(logId) {
    const log = behavior_logs.find(l => l.log_id === logId);
    if (!log) return;

    activeDisputeLogId = logId;
    document.getElementById('dispute-details').innerHTML = `You are disputing behavior log <strong>${logId}</strong>.<br>Date: ${log.timestamp}<br>Infraction: ${log.action_desc}`;
    document.querySelector('.modal textarea').value = '';
    document.getElementById('dispute-modal').style.display = 'flex';
}

function closeDisputeModal() {
    document.getElementById('dispute-modal').style.display = 'none';
    activeDisputeLogId = null;
}

function submitDispute() {
    const text = document.querySelector('.modal textarea').value;
    if (text.trim() === '') {
        alert("Please provide some details for the dispute.");
        return;
    }

    const btn = document.querySelector('.modal-actions .btn-primary');
    const oldText = btn.innerText;
    btn.innerText = 'Submitting...';
    btn.disabled = true;

    setTimeout(() => {
        alert(`Dispute for log ${activeDisputeLogId} submitted successfully to Admin. Evidence is under review.`);
        btn.innerText = oldText;
        btn.disabled = false;
        closeDisputeModal();

        // Remove dispute button from UI
        const btns = document.querySelectorAll(`button[onclick="openDisputeModal('${activeDisputeLogId}')"]`);
        btns.forEach(b => {
            b.outerHTML = `<span style="color:var(--warning-color);font-size:0.75rem;"><i class="fa-solid fa-clock-rotate-left"></i> Under Review</span>`;
        });
    }, 800);
}
