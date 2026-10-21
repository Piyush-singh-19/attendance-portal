/* ====================================================
   ATTENDANCE PORTAL — app.js
   Full client-side application with localStorage
   ==================================================== */

// ──────────────── DATA LAYER ────────────────
const DB = {
    _key(name) { return `attendPro_${name}`; },
    get(name) {
        try { return JSON.parse(localStorage.getItem(this._key(name))) || []; }
        catch { return []; }
    },
    set(name, data) { localStorage.setItem(this._key(name), JSON.stringify(data)); },
    getObj(name) {
        try { return JSON.parse(localStorage.getItem(this._key(name))) || {}; }
        catch { return {}; }
    },
    setObj(name, data) { localStorage.setItem(this._key(name), JSON.stringify(data)); }
};

// ──────────────── GLOBAL STATE ────────────────
let currentUser = null;   // { role: 'admin' | 'student', data: {...} }

// ──────────────── UTILITY FUNCTIONS ────────────────
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ──────────────── TOAST ────────────────
function showToast(msg, type = 'success') {
    const toast = $('#toast');
    const msgEl = $('#toastMessage');
    msgEl.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ──────────────── CONFIRM MODAL ────────────────
function showConfirm(title, message) {
    return new Promise(resolve => {
        $('#confirmTitle').textContent = title;
        $('#confirmMessage').textContent = message;
        const modal = $('#confirmModal');
        modal.classList.add('show');
        const cancel = () => { modal.classList.remove('show'); resolve(false); };
        const ok = () => { modal.classList.remove('show'); resolve(true); };
        $('#confirmCancelBtn').onclick = cancel;
        $('#confirmOkBtn').onclick = ok;
    });
}

// ──────────────── PAGE NAVIGATION ────────────────
function showPage(pageId) {
    $$('.page').forEach(p => p.classList.remove('active'));
    $(`#${pageId}`).classList.add('active');
}

// ──────────────── LOGIN LOGIC ────────────────
(function initLogin() {
    // Tab switching
    const adminTab = $('#adminTabBtn');
    const studentTab = $('#studentTabBtn');
    const adminForm = $('#adminLoginForm');
    const studentForm = $('#studentLoginForm');

    adminTab.addEventListener('click', () => {
        adminTab.classList.add('active');
        studentTab.classList.remove('active');
        adminForm.classList.add('active');
        studentForm.classList.remove('active');
    });

    studentTab.addEventListener('click', () => {
        studentTab.classList.add('active');
        adminTab.classList.remove('active');
        studentForm.classList.add('active');
        adminForm.classList.remove('active');
    });

    // Admin Login
    adminForm.addEventListener('submit', e => {
        e.preventDefault();
        const u = $('#adminUsername').value.trim();
        const p = $('#adminPassword').value.trim();
        if (u === 'admin' && p === 'admin123') {
            currentUser = { role: 'admin' };
            showPage('adminDashboard');
            refreshAdminDashboard();
        } else {
            showToast('Invalid admin credentials', 'error');
        }
    });

    // Student Login
    studentForm.addEventListener('submit', e => {
        e.preventDefault();
        const roll = $('#studentRoll').value.trim();
        const pass = $('#studentPassword').value.trim();
        const students = DB.get('students');
        const student = students.find(s => s.roll === roll);
        if (!student) {
            showToast('Student not found. Contact admin.', 'error');
            return;
        }
        if (pass !== roll) {
            showToast('Invalid password. Use your roll number.', 'error');
            return;
        }
        currentUser = { role: 'student', data: student };
        showPage('studentDashboard');
        initStudentDashboard();
    });
})();

// ──────────────── LOGOUT ────────────────
$('#adminLogoutBtn').addEventListener('click', () => {
    currentUser = null;
    showPage('loginPage');
});

$('#studentLogoutBtn').addEventListener('click', () => {
    currentUser = null;
    showPage('loginPage');
});

// ──────────────── SIDEBAR NAVIGATION (Admin) ────────────────
const sectionTitles = {
    adminHome: 'Dashboard',
    addStudent: 'Add Student',
    takeAttendance: 'Attendance',
    sectionReports: 'Section-wise Reports',
    uploadAssignment: 'Assignment',
    deleteStudent: 'Delete Student Record'
};

$$('#adminSidebar .nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        navigateTo(section);
    });
});

function navigateTo(section) {
    // Update nav active state
    $$('#adminSidebar .nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = $(`#adminSidebar .nav-item[data-section="${section}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Switch section
    $$('#adminDashboard .content-section').forEach(s => s.classList.remove('active'));
    $(`#${section}`).classList.add('active');

    // Update title
    $('#pageTitle').textContent = sectionTitles[section] || 'Dashboard';

    // Close mobile sidebar
    closeSidebar('admin');

    // Refresh data
    if (section === 'adminHome') refreshAdminDashboard();
    if (section === 'sectionReports') renderSectionReports();
    if (section === 'deleteStudent') renderAllStudents();
    if (section === 'uploadAssignment') renderAssignmentList();
}

// Student sidebar navigation
const studentSectionTitles = {
    studentHome: 'Dashboard',
    myAttendance: 'My Attendance',
    myAssignments: 'My Assignments'
};

$$('#studentSidebar .nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = btn.dataset.section;

        $$('#studentSidebar .nav-item').forEach(n => n.classList.remove('active'));
        btn.classList.add('active');

        $$('#studentDashboard .content-section').forEach(s => s.classList.remove('active'));
        $(`#${section}`).classList.add('active');

        $('#studentPageTitle').textContent = studentSectionTitles[section] || 'Dashboard';

        closeSidebar('student');

        if (section === 'studentHome') refreshStudentHome();
        if (section === 'myAttendance') showAttendanceView('today');
        if (section === 'myAssignments') renderMyAssignments();
    });
});

// ──────────────── MOBILE SIDEBAR ────────────────
function openSidebar(role) {
    const sidebar = role === 'admin' ? '#adminSidebar' : '#studentSidebar';
    $(sidebar).classList.add('open');
    // Create overlay
    let overlay = $(`.sidebar-overlay[data-role="${role}"]`);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.dataset.role = role;
        overlay.addEventListener('click', () => closeSidebar(role));
        $(sidebar).parentElement.appendChild(overlay);
    }
    overlay.classList.add('show');
}

function closeSidebar(role) {
    const sidebar = role === 'admin' ? '#adminSidebar' : '#studentSidebar';
    $(sidebar).classList.remove('open');
    const overlay = $(`.sidebar-overlay[data-role="${role}"]`);
    if (overlay) overlay.classList.remove('show');
}

$('#hamburgerBtn').addEventListener('click', () => openSidebar('admin'));
$('#sidebarCloseBtn').addEventListener('click', () => closeSidebar('admin'));
$('#studentHamburgerBtn').addEventListener('click', () => openSidebar('student'));
$('#studentSidebarCloseBtn').addEventListener('click', () => closeSidebar('student'));

// ────────────────────────────────────────────
//               ADMIN FEATURES
// ────────────────────────────────────────────

// ──────────────── ADMIN DASHBOARD STATS ────────────────
function refreshAdminDashboard() {
    const students = DB.get('students');
    const attendance = DB.getObj('attendance');
    const assignments = DB.get('assignments');

    $('#totalStudents').textContent = students.length;
    $('#totalAssignments').textContent = assignments.length;

    // Today's stats
    const today = todayStr();
    let present = 0, absent = 0;
    if (attendance[today]) {
        Object.values(attendance[today]).forEach(status => {
            if (status === 'present') present++;
            else if (status === 'absent') absent++;
        });
    }
    $('#presentToday').textContent = present;
    $('#absentToday').textContent = absent;

    // Render section overview on dashboard
    renderHomeSectionOverview();
}

// ──────────────── ADD STUDENT ────────────────
$('#addStudentForm').addEventListener('submit', e => {
    e.preventDefault();

    const name = $('#studentName').value.trim();
    const roll = $('#studentRollNo').value.trim();
    const email = $('#studentEmail').value.trim();
    const cls = $('#studentClass').value;
    const section = $('#studentSection').value;

    if (!name || !roll || !email || !cls || !section) {
        showToast('Please fill all fields', 'error');
        return;
    }

    const students = DB.get('students');

    // Check duplicate roll
    if (students.find(s => s.roll === roll)) {
        showToast('Roll number already exists!', 'error');
        return;
    }

    students.push({ name, roll, email, class: cls, section, createdAt: todayStr() });
    DB.set('students', students);

    showToast('✅ Student recorded successfully!');
    $('#addStudentForm').reset();
});

// ──────────────── TAKE ATTENDANCE ────────────────
function loadStudentsForAttendance() {
    const cls = $('#attendanceClass').value;
    const section = $('#attendanceSection').value;
    const date = $('#attendanceDate').value;

    if (!cls || !section || !date) {
        showToast('Please select class, section and date', 'error');
        return;
    }

    const students = DB.get('students').filter(s => s.class === cls && s.section === section);

    if (students.length === 0) {
        showToast('No students found for this class & section', 'error');
        $('#attendanceTableContainer').style.display = 'none';
        return;
    }

    // Check existing attendance
    const attendance = DB.getObj('attendance');
    const existing = attendance[date] || {};

    const tbody = $('#attendanceTableBody');
    tbody.innerHTML = '';

    students.sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }));

    students.forEach(s => {
        const status = existing[s.roll] || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.roll}</strong></td>
            <td>${s.name}</td>
            <td>
                <div class="status-toggle">
                    <button type="button" class="status-btn present ${status === 'present' ? 'active' : ''}" 
                            data-roll="${s.roll}" data-status="present" 
                            onclick="toggleAttendanceStatus(this)">Present</button>
                    <button type="button" class="status-btn absent ${status === 'absent' ? 'active' : ''}" 
                            data-roll="${s.roll}" data-status="absent" 
                            onclick="toggleAttendanceStatus(this)">Absent</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    $('#attendanceTableContainer').style.display = 'block';
}

function toggleAttendanceStatus(btn) {
    const row = btn.closest('.status-toggle');
    row.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function markAllPresent() {
    $$('#attendanceTableBody .status-btn.present').forEach(btn => {
        btn.closest('.status-toggle').querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
}

function markAllAbsent() {
    $$('#attendanceTableBody .status-btn.absent').forEach(btn => {
        btn.closest('.status-toggle').querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
}

function saveAttendance() {
    const date = $('#attendanceDate').value;
    if (!date) {
        showToast('Date is missing', 'error');
        return;
    }

    const attendance = DB.getObj('attendance');
    if (!attendance[date]) attendance[date] = {};

    let allMarked = true;
    $$('#attendanceTableBody tr').forEach(row => {
        const activeBtn = row.querySelector('.status-btn.active');
        if (!activeBtn) {
            allMarked = false;
            return;
        }
        const roll = activeBtn.dataset.roll;
        const status = activeBtn.dataset.status;
        attendance[date][roll] = status;
    });

    if (!allMarked) {
        showToast('Please mark all students before saving', 'error');
        return;
    }

    DB.setObj('attendance', attendance);
    showToast('✅ Attendance saved successfully!');
}

// ──────────────── SET DEFAULT DATE ────────────────
$('#attendanceDate').value = todayStr();

// ──────────────── UPLOAD ASSIGNMENT ────────────────
let selectedFile = null;

const fileUploadArea = $('#fileUploadArea');
const fileInput = $('#assignmentFile');
const filePreview = $('#filePreview');
const fileName = $('#fileName');
const fileRemoveBtn = $('#fileRemoveBtn');

fileUploadArea.addEventListener('click', (e) => {
    if (e.target === fileRemoveBtn || fileRemoveBtn.contains(e.target)) return;
    fileInput.click();
});

fileUploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    fileUploadArea.classList.add('drag-over');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('drag-over');
});

fileUploadArea.addEventListener('drop', e => {
    e.preventDefault();
    fileUploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        handleFile(fileInput.files[0]);
    }
});

function handleFile(file) {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showToast('Only PDF and Image files are allowed', 'error');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be under 10MB', 'error');
        return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    filePreview.style.display = 'flex';
    $('.file-upload-content').style.display = 'none';
}

fileRemoveBtn.addEventListener('click', e => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
    $('.file-upload-content').style.display = 'flex';
});

$('#assignmentForm').addEventListener('submit', e => {
    e.preventDefault();

    const title = $('#assignmentTitle').value.trim();
    const cls = $('#assignmentClass').value;
    const section = $('#assignmentSection').value;
    const desc = $('#assignmentDesc').value.trim();

    if (!title || !cls || !section) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    // Convert file to base64 for localStorage
    const saveAssignment = (fileData) => {
        const assignments = DB.get('assignments');
        assignments.push({
            id: Date.now(),
            title,
            class: cls,
            section,
            description: desc,
            file: fileData,
            date: todayStr()
        });
        DB.set('assignments', assignments);
        showToast('✅ Assignment uploaded successfully!');

        // Reset form
        $('#assignmentForm').reset();
        selectedFile = null;
        fileInput.value = '';
        filePreview.style.display = 'none';
        $('.file-upload-content').style.display = 'flex';

        renderAssignmentList();
    };

    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = () => {
            saveAssignment({ name: selectedFile.name, type: selectedFile.type, data: reader.result });
        };
        reader.readAsDataURL(selectedFile);
    } else {
        saveAssignment(null);
    }
});

function renderAssignmentList() {
    const assignments = DB.get('assignments');
    const students = DB.get('students');
    const submissions = DB.get('submissions');
    const tbody = $('#assignmentListBody');

    if (assignments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No assignments uploaded yet</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    assignments.forEach((a, i) => {
        // Calculate eligible students and how many submitted
        const eligible = students.filter(s => {
            const classMatch = a.class === 'all' || s.class === a.class;
            const secMatch = a.section === 'all' || s.section === a.section;
            return classMatch && secMatch;
        });

        const doneCount = eligible.filter(s =>
            submissions.some(sub => sub.assignmentId === a.id && sub.roll === s.roll)
        ).length;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td><strong>${a.title}</strong></td>
            <td>${a.class === 'all' ? 'All Classes' : a.class}</td>
            <td>${a.section === 'all' ? 'All' : a.section}</td>
            <td>${formatDate(a.date)}</td>
            <td>${a.file ? `<a href="${a.file.data}" download="${a.file.name}" class="file-link">${a.file.name}</a>` : '—'}</td>
            <td>
                <button class="btn-check-sub" onclick="openSubmissionsModal(${a.id})" title="Click to view all students submission status">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    <span>Check Submissions (${doneCount}/${eligible.length})</span>
                </button>
            </td>
            <td>
                <button class="action-btn delete" title="Delete Assignment" onclick="deleteAssignment(${a.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteAssignment(id) {
    const ok = await showConfirm('Delete Assignment', 'Are you sure you want to delete this assignment?');
    if (!ok) return;
    let assignments = DB.get('assignments');
    assignments = assignments.filter(a => a.id !== id);
    DB.set('assignments', assignments);
    showToast('Assignment deleted');
    renderAssignmentList();
}

// ──────────────── ADMIN CHECK SUBMISSIONS LOGIC ────────────────
let activeSubAssignmentId = null;
let currentSubFilter = 'all';

function openSubmissionsModal(assignmentId) {
    activeSubAssignmentId = assignmentId;
    currentSubFilter = 'all';
    $$('.sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    const searchInput = $('#subSearchInput');
    if (searchInput) searchInput.value = '';

    renderSubmissionsTable();
    $('#assignmentSubmissionsModal').classList.add('show');
}

function closeSubmissionsModal() {
    $('#assignmentSubmissionsModal').classList.remove('show');
    activeSubAssignmentId = null;
}

function filterSubmissionsView(filter) {
    currentSubFilter = filter;
    $$('.sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    renderSubmissionsTable();
}

function renderSubmissionsTable() {
    if (!activeSubAssignmentId) return;

    const assignments = DB.get('assignments');
    const a = assignments.find(x => x.id === activeSubAssignmentId);
    if (!a) return;

    const students = DB.get('students');
    const submissions = DB.get('submissions');

    // Eligible students for this assignment
    const eligible = students.filter(s => {
        const classMatch = a.class === 'all' || s.class === a.class;
        const secMatch = a.section === 'all' || s.section === a.section;
        return classMatch && secMatch;
    });

    // Compute stats
    let doneCount = 0;
    eligible.forEach(s => {
        if (submissions.some(sub => sub.assignmentId === a.id && sub.roll === s.roll)) {
            doneCount++;
        }
    });
    const pendingCount = eligible.length - doneCount;
    const rate = eligible.length > 0 ? Math.round((doneCount / eligible.length) * 100) : 0;

    $('#subModalTitle').textContent = `Submissions: ${a.title}`;
    $('#subModalDetails').innerHTML = `Class: <strong>${a.class === 'all' ? 'All Classes' : a.class}</strong> &bull; Section: <strong>${a.section === 'all' ? 'All Sections' : a.section}</strong> &bull; Date Uploaded: <strong>${formatDate(a.date)}</strong>`;
    $('#subTotalCount').textContent = eligible.length;
    $('#subDoneCount').textContent = doneCount;
    $('#subPendingCount').textContent = pendingCount;
    $('#subRate').textContent = rate + '%';

    $('#tabCountAll').textContent = eligible.length;
    $('#tabCountSubmitted').textContent = doneCount;
    $('#tabCountPending').textContent = pendingCount;

    const search = ($('#subSearchInput')?.value || '').trim().toLowerCase();

    // Filter students
    let displayList = eligible.filter(s => {
        const sub = submissions.find(x => x.assignmentId === a.id && x.roll === s.roll);
        const isSubmitted = !!sub;

        if (currentSubFilter === 'submitted' && !isSubmitted) return false;
        if (currentSubFilter === 'pending' && isSubmitted) return false;

        if (search) {
            const matchName = s.name.toLowerCase().includes(search);
            const matchRoll = s.roll.toLowerCase().includes(search);
            if (!matchName && !matchRoll) return false;
        }

        return true;
    });

    displayList.sort((x, y) => x.roll.localeCompare(y.roll, undefined, { numeric: true }));

    const tbody = $('#submissionsTableBody');
    if (displayList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No matching students found</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    displayList.forEach((s, idx) => {
        const sub = submissions.find(x => x.assignmentId === a.id && x.roll === s.roll);
        const isSubmitted = !!sub;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${s.roll}</strong></td>
            <td><strong>${s.name}</strong></td>
            <td>${s.class} (${s.section})</td>
            <td>
                <span class="status-pill ${isSubmitted ? 'submitted' : 'pending'}">
                    ${isSubmitted ? '✓ Submitted' : 'Pending'}
                </span>
            </td>
            <td>${isSubmitted && sub.submittedAt ? sub.submittedAt : '—'}</td>
            <td>
                ${isSubmitted && sub.file ? `
                    <a href="${sub.file.data}" download="${sub.file.name}" class="file-link">
                        ${sub.file.name}
                    </a>
                ` : (isSubmitted ? '<span style="color:var(--text-muted)">Submitted (No file)</span>' : '—')}
            </td>
            <td>
                <button class="btn-toggle-sub" onclick="toggleStudentSubmission(${a.id}, '${s.roll}')">
                    ${isSubmitted ? 'Mark as Pending' : 'Mark as Submitted'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleStudentSubmission(assignmentId, roll) {
    let submissions = DB.get('submissions');
    const existingIndex = submissions.findIndex(s => s.assignmentId === assignmentId && s.roll === roll);
    const students = DB.get('students');
    const st = students.find(s => s.roll === roll);

    if (existingIndex >= 0) {
        submissions.splice(existingIndex, 1);
        showToast(`Marked Roll ${roll} as Pending`);
    } else {
        submissions.push({
            id: Date.now(),
            assignmentId,
            roll,
            studentName: st ? st.name : 'Student ' + roll,
            submittedAt: todayStr() + ' (Manual mark)',
            file: null,
            notes: 'Marked as submitted by admin'
        });
        showToast(`Marked Roll ${roll} as Submitted`);
    }

    DB.set('submissions', submissions);
    renderSubmissionsTable();
    renderAssignmentList();
}

function exportSubmissionsCSV() {
    if (!activeSubAssignmentId) return;
    const assignments = DB.get('assignments');
    const a = assignments.find(x => x.id === activeSubAssignmentId);
    if (!a) return;

    const students = DB.get('students');
    const submissions = DB.get('submissions');

    const eligible = students.filter(s => {
        const classMatch = a.class === 'all' || s.class === a.class;
        const secMatch = a.section === 'all' || s.section === a.section;
        return classMatch && secMatch;
    });

    let csv = `Assignment:,"${a.title}"\nClass:,"${a.class}"\nSection:,"${a.section}"\nDate:,"${a.date}"\n\n`;
    csv += 'Roll No,Student Name,Email,Class,Section,Submission Status,Submitted At,File Name\n';

    eligible.forEach(s => {
        const sub = submissions.find(x => x.assignmentId === a.id && x.roll === s.roll);
        const isSub = !!sub;
        csv += `"${s.roll}","${s.name}","${s.email || ''}","${s.class}","${s.section}","${isSub ? 'Submitted' : 'Pending'}","${isSub && sub.submittedAt ? sub.submittedAt : ''}","${isSub && sub.file ? sub.file.name : ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Submissions_${a.title.replace(/\s+/g, '_')}_${todayStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Submissions report exported');
}

// ──────────────── BULK ADD STUDENTS (1-Click & CSV) ────────────────

const sampleBatchNames = [
    { name: 'Kunal Sharma', class: 'BCA 1st Year', sec: 'A' },
    { name: 'Pooja Verma', class: 'BCA 1st Year', sec: 'A' },
    { name: 'Sameer Khan', class: 'BCA 1st Year', sec: 'B' },
    { name: 'Tanvi Mehra', class: 'BCA 1st Year', sec: 'B' },
    { name: 'Varun Joshi', class: 'BCA 1st Year', sec: 'B' },
    { name: 'Snehal Patil', class: 'BCA 2nd Year', sec: 'C' },
    { name: 'Ritesh Deshmukh', class: 'BCA 2nd Year', sec: 'C' },
    { name: 'Kritika Sen', class: 'BCA 2nd Year', sec: 'C' },
    { name: 'Deepak Bhatt', class: 'MCA 1st Year', sec: 'D' },
    { name: 'Megha Agarwal', class: 'MCA 1st Year', sec: 'D' }
];

function quickBulkAddStudents() {
    let students = DB.get('students');
    const existingRolls = new Set(students.map(s => s.roll));

    let nextRoll = 501;
    while (existingRolls.has(String(nextRoll))) {
        nextRoll += 10;
    }

    const newBatch = [];
    sampleBatchNames.forEach((item, idx) => {
        let r = String(nextRoll + idx);
        while (existingRolls.has(r)) {
            nextRoll += 1;
            r = String(nextRoll + idx);
        }
        existingRolls.add(r);

        const email = item.name.toLowerCase().replace(/\s+/g, '.') + '@college.edu';
        newBatch.push({
            name: item.name,
            roll: r,
            email,
            class: item.class,
            section: item.sec,
            createdAt: todayStr()
        });
    });

    students.push(...newBatch);
    DB.set('students', students);

    // Also seed realistic past 8 days attendance for new batch
    const attendance = DB.getObj('attendance');
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        if (!attendance[dateStr]) attendance[dateStr] = {};

        newBatch.forEach((st, idx) => {
            const mod = (idx * 3 + i * 4) % 6;
            attendance[dateStr][st.roll] = (mod === 0) ? 'absent' : 'present';
        });
    }
    DB.setObj('attendance', attendance);

    showToast(`⚡ 1-Click: Added ${newBatch.length} new students across sections!`);
    refreshAdminDashboard();
    renderAllStudents();
    renderSectionReports();
}

function openBulkCsvModal() {
    $('#bulkCsvModal').classList.add('show');
}

function closeBulkCsvModal() {
    $('#bulkCsvModal').classList.remove('show');
    $('#bulkCsvText').value = '';
    $('#bulkCsvFileInput').value = '';
}

function downloadSampleCsvTemplate() {
    const csvContent = 'Full Name,Roll Number,Email Address,Class,Section\n' +
        'Gaurav Mehta,601,gaurav@college.edu,BCA 1st Year,A\n' +
        'Rani Mukherjee,602,rani@college.edu,BCA 1st Year,A\n' +
        'Yash Singhania,603,yash@college.edu,BCA 1st Year,B\n' +
        'Bhavna Chawla,604,bhavna@college.edu,BCA 2nd Year,C\n' +
        'Harsh Vardhan,605,harsh@college.edu,MCA 1st Year,D\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Template downloaded');
}

function processBulkCsvImport() {
    const fileInput = $('#bulkCsvFileInput');
    const textVal = $('#bulkCsvText').value.trim();

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = e => parseAndImportCsvContent(e.target.result);
        reader.readAsText(file);
    } else if (textVal) {
        parseAndImportCsvContent(textVal);
    } else {
        showToast('Please paste CSV data or choose a file', 'error');
    }
}

function parseAndImportCsvContent(raw) {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        showToast('CSV is empty', 'error');
        return;
    }

    let students = DB.get('students');
    const existingRolls = new Set(students.map(s => s.roll));
    const newStudents = [];
    let duplicates = 0;

    lines.forEach((line, index) => {
        // Skip header line if present
        if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('roll'))) return;

        const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
            const name = parts[0];
            const roll = parts[1];
            const email = parts[2] || `${name.toLowerCase().replace(/\s+/g, '')}@college.edu`;
            const cls = parts[3] || 'BCA 1st Year';
            const sec = (parts[4] || 'A').toUpperCase().replace('SECTION', '').trim() || 'A';

            if (!name || !roll) return;

            if (existingRolls.has(roll)) {
                duplicates++;
            } else {
                existingRolls.add(roll);
                newStudents.push({
                    name,
                    roll,
                    email,
                    class: cls,
                    section: sec,
                    createdAt: todayStr()
                });
            }
        }
    });

    if (newStudents.length === 0) {
        showToast(`No new students imported (${duplicates} duplicates skipped)`, 'error');
        return;
    }

    students.push(...newStudents);
    DB.set('students', students);

    // Seed attendance for new students
    const attendance = DB.getObj('attendance');
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        if (!attendance[dateStr]) attendance[dateStr] = {};

        newStudents.forEach((st, idx) => {
            const mod = (idx * 3 + i * 2) % 5;
            attendance[dateStr][st.roll] = (mod === 0) ? 'absent' : 'present';
        });
    }
    DB.setObj('attendance', attendance);

    showToast(`✅ Successfully imported ${newStudents.length} students! (${duplicates} duplicates skipped)`);
    closeBulkCsvModal();
    refreshAdminDashboard();
    renderAllStudents();
    renderSectionReports();
}

// ──────────────── ALL STUDENTS ────────────────
function renderAllStudents() {
    const students = DB.get('students');
    const filterClass = $('#filterClass').value;
    const filterSection = $('#filterSection').value;
    const search = ($('#searchStudent').value || '').toLowerCase();

    let filtered = students;

    if (filterClass) filtered = filtered.filter(s => s.class === filterClass);
    if (filterSection) filtered = filtered.filter(s => s.section === filterSection);
    if (search) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(search) ||
            s.roll.toLowerCase().includes(search)
        );
    }

    const tbody = $('#allStudentsBody');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No students found</td></tr>';
        $('#studentCountBadge').textContent = '0 students';
        return;
    }

    $('#studentCountBadge').textContent = `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`;

    filtered.sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }));

    tbody.innerHTML = '';
    filtered.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td>${s.roll}</td>
            <td>${s.email}</td>
            <td>${s.class}</td>
            <td>${s.section}</td>
            <td>
                <button class="btn-delete-student" title="Delete Student" onclick="deleteStudent('${s.roll}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <span>Delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteStudent(roll) {
    const ok = await showConfirm('Delete Student', `Are you sure you want to delete student with roll number "${roll}"?`);
    if (!ok) return;
    let students = DB.get('students');
    students = students.filter(s => s.roll !== roll);
    DB.set('students', students);
    showToast('Student deleted');
    renderAllStudents();
    refreshAdminDashboard();
}

// ──────────────── SECTION ATTENDANCE REPORT & ANALYTICS ────────────────

// Helper: Calculate attendance statistics for any student by roll number
function getStudentAttendanceStats(roll) {
    const attendance = DB.getObj('attendance');
    let present = 0;
    let absent = 0;
    const history = [];

    // Sort recorded dates chronologically descending
    const dates = Object.keys(attendance).sort().reverse();
    dates.forEach(date => {
        const status = attendance[date]?.[roll];
        if (status === 'present') {
            present++;
            history.push({ date, status: 'present' });
        } else if (status === 'absent') {
            absent++;
            history.push({ date, status: 'absent' });
        }
    });

    const totalDays = present + absent;
    const rate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
    let statusClass = 'good';
    let statusText = 'Good';

    if (totalDays === 0) {
        statusClass = 'warning';
        statusText = 'No Records';
    } else if (rate < 65) {
        statusClass = 'danger';
        statusText = 'Shortage';
    } else if (rate < 75) {
        statusClass = 'warning';
        statusText = 'Warning';
    }

    return { present, absent, totalDays, rate, statusClass, statusText, history };
}

// Render quick section attendance breakdown cards on Admin Dashboard Home
function renderHomeSectionOverview() {
    const container = $('#homeSectionOverview');
    if (!container) return;

    const students = DB.get('students');
    if (students.length === 0) {
        container.innerHTML = '<div class="empty-state">No student records available yet.</div>';
        return;
    }

    const activeSections = [...new Set(students.map(s => s.section))].sort();
    const displaySections = activeSections.length ? activeSections : ['A', 'B', 'C', 'D'];

    let html = '';
    displaySections.forEach(sec => {
        const secStudents = students.filter(s => s.section === sec);
        if (secStudents.length === 0) return;

        let totalPresent = 0;
        let totalAbsent = 0;
        secStudents.forEach(st => {
            const stats = getStudentAttendanceStats(st.roll);
            totalPresent += stats.present;
            totalAbsent += stats.absent;
        });

        const totalMarked = totalPresent + totalAbsent;
        const rate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
        const barColor = rate >= 75 ? 'linear-gradient(90deg, #10B981, #059669)' : (rate >= 60 ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, #EF4444, #DC2626)');

        html += `
            <div class="section-stat-pill-card">
                <div class="sec-card-header">
                    <span class="sec-badge">Section ${sec}</span>
                    <span class="sec-student-count">${secStudents.length} student${secStudents.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="sec-metrics-row">
                    <div class="sec-metric present">
                        <span class="sec-metric-val">${totalPresent}</span>
                        <span class="sec-metric-label">Presents</span>
                    </div>
                    <div class="sec-metric absent">
                        <span class="sec-metric-val">${totalAbsent}</span>
                        <span class="sec-metric-label">Absents</span>
                    </div>
                    <div class="sec-metric rate">
                        <span class="sec-metric-val">${rate}%</span>
                        <span class="sec-metric-label">Avg Rate</span>
                    </div>
                </div>
                <div class="sec-progress-wrap">
                    <div class="sec-progress-bar" style="width: ${rate}%; background: ${barColor};"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<div class="empty-state">No section data found.</div>';
}

// Render full Section-wise Report page
function renderSectionReports() {
    const students = DB.get('students');
    const filterClass = $('#reportClassFilter')?.value || '';
    const filterSection = $('#reportSectionFilter')?.value || '';
    const search = ($('#reportSearchInput')?.value || '').trim().toLowerCase();

    // Filter students
    let filtered = students;
    if (filterClass) filtered = filtered.filter(s => s.class === filterClass);
    if (filterSection) filtered = filtered.filter(s => s.section === filterSection);
    if (search) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(search) ||
            s.roll.toLowerCase().includes(search)
        );
    }

    const summaryCardsContainer = $('#sectionSummaryCards');
    const groupsContainer = $('#sectionGroupsContainer');

    if (!summaryCardsContainer || !groupsContainer) return;

    if (filtered.length === 0) {
        summaryCardsContainer.innerHTML = '';
        groupsContainer.innerHTML = `
            <div class="table-container glass-card" style="text-align: center; padding: 3rem;">
                <p class="empty-state">No students found matching your filter criteria.</p>
            </div>`;
        return;
    }

    // Group students by section
    const grouped = {};
    filtered.forEach(s => {
        const sec = s.section || 'Unassigned';
        if (!grouped[sec]) grouped[sec] = [];
        grouped[sec].push(s);
    });

    // Sort sections alphabetically
    const sortedSections = Object.keys(grouped).sort();

    // 1. Render Summary KPI Cards for Sections
    let summaryHtml = '';
    sortedSections.forEach(sec => {
        const secStudents = grouped[sec];
        let secPresent = 0;
        let secAbsent = 0;

        secStudents.forEach(st => {
            const stats = getStudentAttendanceStats(st.roll);
            secPresent += stats.present;
            secAbsent += stats.absent;
        });

        const secTotal = secPresent + secAbsent;
        const secRate = secTotal > 0 ? Math.round((secPresent / secTotal) * 100) : 0;
        const barColor = secRate >= 75 ? 'linear-gradient(90deg, #10B981, #059669)' : (secRate >= 60 ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, #EF4444, #DC2626)');

        summaryHtml += `
            <div class="section-sum-card">
                <div class="section-sum-top">
                    <span class="section-tag">Section ${sec}</span>
                    <span class="student-count-badge">${secStudents.length} Students</span>
                </div>
                <div class="section-sum-stats">
                    <div class="section-sum-stat pres">
                        <span class="num">${secPresent}</span>
                        <span class="label">Total Present</span>
                    </div>
                    <div class="section-sum-stat abs">
                        <span class="num">${secAbsent}</span>
                        <span class="label">Total Absent</span>
                    </div>
                    <div class="section-sum-stat pct">
                        <span class="num">${secRate}%</span>
                        <span class="label">Attendance %</span>
                    </div>
                </div>
                <div class="sec-progress-wrap">
                    <div class="sec-progress-bar" style="width: ${secRate}%; background: ${barColor};"></div>
                </div>
            </div>
        `;
    });
    summaryCardsContainer.innerHTML = summaryHtml;

    // 2. Render Separated Section Groups with Tables
    let groupsHtml = '';
    sortedSections.forEach(sec => {
        const secStudents = grouped[sec];
        // Sort students by roll number within section
        secStudents.sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }));

        let secTotalPresent = 0;
        let secTotalAbsent = 0;

        // Build Table Rows
        let rowsHtml = '';
        secStudents.forEach((st, idx) => {
            const stats = getStudentAttendanceStats(st.roll);
            secTotalPresent += stats.present;
            secTotalAbsent += stats.absent;

            rowsHtml += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${st.roll}</strong></td>
                    <td><strong>${st.name}</strong></td>
                    <td>${st.class}</td>
                    <td><span class="sec-badge">Sec ${st.section}</span></td>
                    <td><span class="stat-chip pres"><strong>${stats.present}</strong> Days</span></td>
                    <td><span class="stat-chip abs"><strong>${stats.absent}</strong> Days</span></td>
                    <td><span class="stat-chip students">${stats.totalDays} Days</span></td>
                    <td>
                        <div class="att-progress-cell">
                            <span class="progress-val">${stats.rate}%</span>
                            <div class="att-bar-track">
                                <div class="att-bar-fill ${stats.statusClass}" style="width: ${stats.rate}%"></div>
                            </div>
                        </div>
                    </td>
                    <td><span class="status-pill ${stats.statusClass}">${stats.statusText}</span></td>
                    <td>
                        <button class="btn-view-log" onclick="openStudentHistoryModal('${st.roll}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <span>View Log</span>
                        </button>
                    </td>
                </tr>
            `;
        });

        const secTotalMarked = secTotalPresent + secTotalAbsent;
        const secOverallRate = secTotalMarked > 0 ? Math.round((secTotalPresent / secTotalMarked) * 100) : 0;

        groupsHtml += `
            <div class="section-group-card">
                <div class="section-group-header">
                    <div class="sec-title-cluster">
                        <span class="sec-pill-badge">SECTION ${sec}</span>
                        <span class="sec-name-text">Students List (${secStudents.length})</span>
                    </div>
                    <div class="sec-header-pills">
                        <span class="stat-chip students">${secStudents.length} Students</span>
                        <span class="stat-chip pres">Total Present: <strong>${secTotalPresent}</strong></span>
                        <span class="stat-chip abs">Total Absent: <strong>${secTotalAbsent}</strong></span>
                        <span class="stat-chip rate">Overall: <strong>${secOverallRate}%</strong></span>
                    </div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Roll No</th>
                                <th>Student Name</th>
                                <th>Class</th>
                                <th>Section</th>
                                <th>Total Present</th>
                                <th>Total Absent</th>
                                <th>Total Recorded</th>
                                <th>Attendance %</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    groupsContainer.innerHTML = groupsHtml;
}

// ──────────────── STUDENT ATTENDANCE HISTORY MODAL ────────────────
function openStudentHistoryModal(roll) {
    const students = DB.get('students');
    const student = students.find(s => s.roll === roll);
    if (!student) {
        showToast('Student not found', 'error');
        return;
    }

    const stats = getStudentAttendanceStats(roll);

    $('#historyModalStudentName').textContent = student.name;
    $('#historyModalSubtitle').innerHTML = `Roll No: <strong>${student.roll}</strong> &bull; Class: <strong>${student.class}</strong> &bull; Section: <strong>${student.section}</strong>`;
    $('#histPresCount').textContent = stats.present + ' Days';
    $('#histAbsCount').textContent = stats.absent + ' Days';
    $('#histRate').textContent = stats.rate + '%';

    const tbody = $('#studentHistoryTableBody');
    if (stats.history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No attendance has been recorded for this student yet.</td></tr>';
    } else {
        tbody.innerHTML = '';
        stats.history.forEach((rec, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${formatDate(rec.date)}</strong> (${rec.date})</td>
                <td><span class="status-pill ${rec.status}">${rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    $('#studentHistoryModal').classList.add('show');
}

function closeStudentHistoryModal() {
    $('#studentHistoryModal').classList.remove('show');
}

// ──────────────── EXPORT SECTION REPORT CSV ────────────────
function exportSectionReportCSV() {
    const students = DB.get('students');
    if (students.length === 0) {
        showToast('No student data to export', 'error');
        return;
    }

    const filterClass = $('#reportClassFilter')?.value || '';
    const filterSection = $('#reportSectionFilter')?.value || '';
    const search = ($('#reportSearchInput')?.value || '').trim().toLowerCase();

    let filtered = students;
    if (filterClass) filtered = filtered.filter(s => s.class === filterClass);
    if (filterSection) filtered = filtered.filter(s => s.section === filterSection);
    if (search) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(search) ||
            s.roll.toLowerCase().includes(search)
        );
    }

    filtered.sort((a, b) => {
        if (a.section !== b.section) return a.section.localeCompare(b.section);
        return a.roll.localeCompare(b.roll, undefined, { numeric: true });
    });

    let csv = 'Roll No,Student Name,Email,Class,Section,Total Present Days,Total Absent Days,Total Days Recorded,Attendance Percentage,Status\n';

    filtered.forEach(st => {
        const stats = getStudentAttendanceStats(st.roll);
        const row = [
            `"${st.roll}"`,
            `"${st.name}"`,
            `"${st.email || ''}"`,
            `"${st.class}"`,
            `"${st.section}"`,
            stats.present,
            stats.absent,
            stats.totalDays,
            `"${stats.rate}%"`,
            `"${stats.statusText}"`
        ];
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_By_Section_${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('✅ Section attendance report exported successfully!');
}

// ────────────────────────────────────────────
//              STUDENT FEATURES
// ────────────────────────────────────────────

function initStudentDashboard() {
    if (!currentUser || currentUser.role !== 'student') return;
    const s = currentUser.data;

    // Set names
    $('#welcomeStudentName').textContent = s.name.split(' ')[0];
    $('#studentNameDisplay').textContent = s.name;
    $('#studentAvatarLetter').textContent = s.name.charAt(0).toUpperCase();

    refreshStudentHome();

    // Reset to home
    $$('#studentSidebar .nav-item').forEach(n => n.classList.remove('active'));
    $('#navStudentHome').classList.add('active');
    $$('#studentDashboard .content-section').forEach(s => s.classList.remove('active'));
    $('#studentHome').classList.add('active');
    $('#studentPageTitle').textContent = 'Dashboard';
}

function refreshStudentHome() {
    if (!currentUser || currentUser.role !== 'student') return;
    const roll = currentUser.data.roll;
    const attendance = DB.getObj('attendance');
    const today = todayStr();

    let totalPresent = 0, totalAbsent = 0;

    Object.entries(attendance).forEach(([date, records]) => {
        if (records[roll] === 'present') totalPresent++;
        else if (records[roll] === 'absent') totalAbsent++;
    });

    const total = totalPresent + totalAbsent;
    const percent = total > 0 ? Math.round((totalPresent / total) * 100) : 0;

    $('#myTotalPresent').textContent = totalPresent;
    $('#myTotalAbsent').textContent = totalAbsent;
    $('#myAttendancePercent').textContent = percent + '%';

    // Today's status
    const todayStatus = attendance[today]?.[roll];
    const statusDiv = $('#todayStatus');
    if (todayStatus === 'present') {
        statusDiv.innerHTML = `
            <div class="status-badge status-present">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Present Today</span>
            </div>`;
    } else if (todayStatus === 'absent') {
        statusDiv.innerHTML = `
            <div class="status-badge status-absent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span>Absent Today</span>
            </div>`;
    } else {
        statusDiv.innerHTML = `
            <div class="status-badge status-unknown">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Not marked yet</span>
            </div>`;
    }
}

// ──────────────── MY ATTENDANCE ────────────────
function showAttendanceView(view) {
    if (!currentUser || currentUser.role !== 'student') return;

    // Toggle buttons
    if (view === 'today') {
        $('#todayAttendanceBtn').classList.add('active');
        $('#allAttendanceBtn').classList.remove('active');
    } else {
        $('#allAttendanceBtn').classList.add('active');
        $('#todayAttendanceBtn').classList.remove('active');
    }

    const roll = currentUser.data.roll;
    const attendance = DB.getObj('attendance');
    const tbody = $('#myAttendanceBody');
    const today = todayStr();

    let records = [];

    Object.entries(attendance).forEach(([date, data]) => {
        if (data[roll]) {
            records.push({ date, status: data[roll] });
        }
    });

    // Sort by date descending
    records.sort((a, b) => b.date.localeCompare(a.date));

    if (view === 'today') {
        records = records.filter(r => r.date === today);
    }

    if (records.length === 0) {
        const msg = view === 'today' ? 'No attendance marked for today' : 'No attendance records found';
        tbody.innerHTML = `<tr><td colspan="2" class="empty-state">${msg}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(r.date)}</td>
            <td><span class="status-pill ${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ──────────────── MY ASSIGNMENTS ────────────────
function renderMyAssignments() {
    if (!currentUser || currentUser.role !== 'student') return;
    const student = currentUser.data;
    const assignments = DB.get('assignments');

    const filtered = assignments.filter(a => {
        const classMatch = a.class === 'all' || a.class === student.class;
        const sectionMatch = a.section === 'all' || a.section === student.section;
        return classMatch && sectionMatch;
    });

    const container = $('#myAssignmentsList');

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card glass-card">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p>No assignments available</p>
            </div>`;
        return;
    }

    const submissions = DB.get('submissions');
    const roll = student.roll;

    container.innerHTML = '';
    filtered.forEach(a => {
        const mySub = submissions.find(s => s.assignmentId === a.id && s.roll === roll);
        const isSubmitted = !!mySub;

        const card = document.createElement('div');
        card.className = 'assignment-card glass-card';
        card.innerHTML = `
            <div class="assignment-card-header">
                <div class="assignment-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                    <h4>${a.title}</h4>
                    <small>${formatDate(a.date)} &bull; ${a.class === 'all' ? 'All Classes' : a.class} (${a.section === 'all' ? 'All Sections' : 'Sec ' + a.section})</small>
                </div>
            </div>
            ${a.description ? `<p class="assignment-desc">${a.description}</p>` : ''}
            ${a.file ? `
                <a href="${a.file.data}" download="${a.file.name}" class="assignment-file-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Download Question File: ${a.file.name}
                </a>` : ''}
            
            <div class="assignment-footer-actions">
                <div>
                    ${isSubmitted ? `
                        <span class="submission-status-chip submitted">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Submitted (${mySub.submittedAt ? mySub.submittedAt.split(' ')[0] : 'Done'})
                        </span>
                        ${mySub.file ? `<small style="display:block; color:var(--text-muted); font-size:0.75rem; margin-top:0.25rem;">Attached: ${mySub.file.name}</small>` : ''}
                    ` : `
                        <span class="submission-status-chip pending">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            Pending Submission
                        </span>
                    `}
                </div>
                <button class="btn-submit-assignment" onclick="openSubmitAssignmentModal(${a.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>${isSubmitted ? 'Update Submission' : 'Submit Assignment'}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ──────────────── STUDENT SUBMISSION MODAL HANDLERS ────────────────
function openSubmitAssignmentModal(assignmentId) {
    const assignments = DB.get('assignments');
    const a = assignments.find(x => x.id === assignmentId);
    if (!a) return;

    $('#studentSubmitAssignmentId').value = assignmentId;
    $('#studentSubmitModalTitle').textContent = `Submit: ${a.title}`;
    $('#studentSubmitModalSubtitle').textContent = `Class: ${a.class === 'all' ? 'All Classes' : a.class} | Section: ${a.section === 'all' ? 'All Sections' : a.section}`;

    if (currentUser && currentUser.role === 'student') {
        const roll = currentUser.data.roll;
        const submissions = DB.get('submissions');
        const sub = submissions.find(s => s.assignmentId === assignmentId && s.roll === roll);
        if (sub && sub.notes) {
            $('#studentSubmissionNotes').value = sub.notes;
        } else {
            $('#studentSubmissionNotes').value = '';
        }
    }

    $('#submitAssignmentModal').classList.add('show');
}

function closeSubmitAssignmentModal() {
    $('#submitAssignmentModal').classList.remove('show');
    $('#studentSubmitForm').reset();
}

$('#studentSubmitForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'student') return;

    const assignmentId = parseInt($('#studentSubmitAssignmentId').value, 10);
    const fileInput = $('#studentSubmissionFile');
    const notes = $('#studentSubmissionNotes').value.trim();
    const roll = currentUser.data.roll;
    const name = currentUser.data.name;

    const saveSub = (fileObj) => {
        let submissions = DB.get('submissions');
        // Remove existing submission if any
        submissions = submissions.filter(s => !(s.assignmentId === assignmentId && s.roll === roll));

        submissions.push({
            id: Date.now(),
            assignmentId,
            roll,
            studentName: name,
            submittedAt: todayStr() + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            file: fileObj,
            notes
        });

        DB.set('submissions', submissions);
        showToast('✅ Assignment submitted successfully!');
        closeSubmitAssignmentModal();
        renderMyAssignments();
    };

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            saveSub({ name: file.name, type: file.type, data: reader.result });
        };
        reader.readAsDataURL(file);
    } else {
        saveSub(null);
    }
});

// ──────────────── SEED DEMO DATA (If clean / fresh state) ────────────────
function seedDemoDataIfNeeded() {
    let students = DB.get('students');
    if (!students || students.length === 0) {
        students = [
            // Section A (BCA 1st Year)
            { name: 'Aarav Sharma', roll: '101', email: 'aarav.sharma@college.edu', class: 'BCA 1st Year', section: 'A', createdAt: '2026-10-01' },
            { name: 'Priya Patel', roll: '102', email: 'priya.patel@college.edu', class: 'BCA 1st Year', section: 'A', createdAt: '2026-10-01' },
            { name: 'Rohan Gupta', roll: '103', email: 'rohan.gupta@college.edu', class: 'BCA 1st Year', section: 'A', createdAt: '2026-10-01' },
            { name: 'Sneha Verma', roll: '104', email: 'sneha.verma@college.edu', class: 'BCA 1st Year', section: 'A', createdAt: '2026-10-01' },
            // Section B (BCA 1st Year)
            { name: 'Kabir Malhotra', roll: '201', email: 'kabir.m@college.edu', class: 'BCA 1st Year', section: 'B', createdAt: '2026-10-01' },
            { name: 'Ananya Roy', roll: '202', email: 'ananya.roy@college.edu', class: 'BCA 1st Year', section: 'B', createdAt: '2026-10-01' },
            { name: 'Vikram Joshi', roll: '203', email: 'vikram.j@college.edu', class: 'BCA 1st Year', section: 'B', createdAt: '2026-10-01' },
            { name: 'Neha Reddy', roll: '204', email: 'neha.reddy@college.edu', class: 'BCA 1st Year', section: 'B', createdAt: '2026-10-01' },
            // Section C (BCA 2nd Year)
            { name: 'Arjun Nair', roll: '301', email: 'arjun.nair@college.edu', class: 'BCA 2nd Year', section: 'C', createdAt: '2026-10-01' },
            { name: 'Divya Iyer', roll: '302', email: 'divya.iyer@college.edu', class: 'BCA 2nd Year', section: 'C', createdAt: '2026-10-01' },
            { name: 'Karan Mehra', roll: '303', email: 'karan.m@college.edu', class: 'BCA 2nd Year', section: 'C', createdAt: '2026-10-01' },
            // Section D (MCA 1st Year)
            { name: 'Simran Kaur', roll: '401', email: 'simran.k@college.edu', class: 'MCA 1st Year', section: 'D', createdAt: '2026-10-01' },
            { name: 'Aditya Rao', roll: '402', email: 'aditya.rao@college.edu', class: 'MCA 1st Year', section: 'D', createdAt: '2026-10-01' }
        ];
        DB.set('students', students);

        // Generate past 8 attendance dates
        const attendance = {};
        const today = new Date();
        for (let i = 7; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;
            attendance[dateStr] = {};

            students.forEach((st, idx) => {
                const mod = (idx * 5 + i * 2) % 7;
                attendance[dateStr][st.roll] = (mod === 0) ? 'absent' : 'present';
            });
        }
        DB.setObj('attendance', attendance);
    }

    // Seed demo assignments if none exist
    let assignments = DB.get('assignments');
    if (!assignments || assignments.length === 0) {
        assignments = [
            {
                id: 1001,
                title: 'Data Structures & Algorithms - Lab 1',
                class: 'BCA 1st Year',
                section: 'A',
                description: 'Implement Stack and Queue operations with test cases.',
                date: '2026-10-15',
                file: null
            },
            {
                id: 1002,
                title: 'Web Technologies Project Milestone',
                class: 'BCA 1st Year',
                section: 'all',
                description: 'Build responsive student portal interface with HTML, CSS, JS.',
                date: '2026-10-18',
                file: null
            }
        ];
        DB.set('assignments', assignments);

        // Seed demo submissions
        const submissions = [
            {
                id: 2001,
                assignmentId: 1001,
                roll: '101',
                studentName: 'Aarav Sharma',
                submittedAt: '2026-10-16 02:30 PM',
                file: { name: 'Aarav_DSA_Lab1.pdf', type: 'application/pdf', data: '#' },
                notes: 'All tasks completed'
            },
            {
                id: 2002,
                assignmentId: 1001,
                roll: '102',
                studentName: 'Priya Patel',
                submittedAt: '2026-10-17 11:15 AM',
                file: { name: 'Priya_StackQueue.pdf', type: 'application/pdf', data: '#' },
                notes: 'Verified with all inputs'
            },
            {
                id: 2003,
                assignmentId: 1001,
                roll: '104',
                studentName: 'Sneha Verma',
                submittedAt: '2026-10-18 09:40 AM',
                file: { name: 'Sneha_DSA_Assignment.pdf', type: 'application/pdf', data: '#' },
                notes: 'Solutions attached'
            },
            {
                id: 2004,
                assignmentId: 1002,
                roll: '101',
                studentName: 'Aarav Sharma',
                submittedAt: '2026-10-19 04:20 PM',
                file: { name: 'WebProject_Aarav.zip', type: 'application/zip', data: '#' },
                notes: 'Responsive UI implemented'
            },
            {
                id: 2005,
                assignmentId: 1002,
                roll: '201',
                studentName: 'Kabir Malhotra',
                submittedAt: '2026-10-19 05:10 PM',
                file: { name: 'Kabir_Frontend.zip', type: 'application/zip', data: '#' },
                notes: 'Student dashboard completed'
            }
        ];
        DB.set('submissions', submissions);
    }
}

// ──────────────── INIT ────────────────
seedDemoDataIfNeeded();
showPage('loginPage');
