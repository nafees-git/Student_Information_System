/* ============================================================
   Student Profile Manager — JavaScript
   ============================================================ */


/* ── Avatar colour palette (background + foreground pairs) ── */
const COLORS = [
  { bg: '#c8f54a22', color: '#c8f54a' },
  { bg: '#4af5c822', color: '#4af5c8' },
  { bg: '#f5554a22', color: '#f5554a' },
  { bg: '#f5a44a22', color: '#f5a44a' },
  { bg: '#a44af522', color: '#c8a4f5' },
  { bg: '#4a8af522', color: '#4aacf5' },
];


/* ── App State ── */
let students     = JSON.parse(localStorage.getItem('sis_students') || '[]');
let editingId    = null;   // ID of student being edited (null = adding new)
let deleteId     = null;   // ID of student pending deletion
let activeFilter = 'all'; // Currently selected department filter
let toastTimer;            // Reference for toast auto-hide


/* ============================================================
   Utility Functions
   ============================================================ */

/** Persist the students array to localStorage. */
function save() {
  localStorage.setItem('sis_students', JSON.stringify(students));
}

/**
 * Pick a consistent colour from the palette based on a string hash.
 * @param {string} str
 * @returns {{ bg: string, color: string }}
 */
function colorFor(str) {
  let hash = 0;
  for (let ch of str) {
    hash = (hash * 31 + ch.charCodeAt(0)) % COLORS.length;
  }
  return COLORS[hash];
}

/**
 * Generate two-letter initials from first and last name.
 * @param {string} fname
 * @param {string} lname
 * @returns {string}
 */
function initials(fname, lname) {
  return ((fname[0] || '') + (lname[0] || '')).toUpperCase();
}


/* ============================================================
   Department Filter Tabs
   ============================================================ */

/**
 * Set the active department filter and re-render cards.
 * @param {string} dept - Department name or 'all'
 * @param {HTMLElement} el - The clicked tab button
 */
function setFilter(dept, el) {
  activeFilter = dept;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderCards();
}

/** Rebuild the filter tab bar from current unique departments. */
function updateTabs() {
  const depts = [...new Set(students.map(s => s.dept).filter(Boolean))];
  const container = document.getElementById('filter-tabs');

  const allTab = `<button class="tab ${activeFilter === 'all' ? 'active' : ''}"
    data-dept="all" onclick="setFilter('all', this)" role="tab">All</button>`;

  const deptTabs = depts.map(d => {
    const isActive = activeFilter === d ? 'active' : '';
    return `<button class="tab ${isActive}" data-dept="${d}"
      onclick="setFilter('${d}', this)" role="tab">${d}</button>`;
  });

  container.innerHTML = [allTab, ...deptTabs].join('');
}


/* ============================================================
   Render Student Cards
   ============================================================ */

/** Filter, sort, and render all student cards into the grid. */
function renderCards() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const sort  = document.getElementById('sort-select').value;
  const grid  = document.getElementById('student-grid');

  /* --- Filter by search query and active department --- */
  let filtered = students.filter(s => {
    const fullName    = (s.fname + ' ' + s.lname).toLowerCase();
    const matchSearch = !query ||
      fullName.includes(query) ||
      s.sid.toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query);

    const matchDept = activeFilter === 'all' || s.dept === activeFilter;
    return matchSearch && matchDept;
  });

  /* --- Sort --- */
  filtered.sort((a, b) => {
    if (sort === 'name') return (a.fname + a.lname).localeCompare(b.fname + b.lname);
    if (sort === 'id')   return a.sid.localeCompare(b.sid);
    if (sort === 'age')  return (Number(a.age) || 0) - (Number(b.age) || 0);
    if (sort === 'dept') return (a.dept || '').localeCompare(b.dept || '');
    return 0;
  });

  /* --- Update stat pills --- */
  document.getElementById('total-count').textContent = students.length;
  document.getElementById('dept-count').textContent  =
    new Set(students.map(s => s.dept).filter(Boolean)).size;

  /* --- Empty state --- */
  if (!filtered.length) {
    const msg = students.length
      ? 'No students match your search.'
      : 'No students yet. Add your first student!';

    const addBtn = !students.length
      ? `<button class="btn btn-primary" onclick="openModal()">+ Add Student</button>`
      : '';

    grid.innerHTML = `
      <div class="empty-state">
        <div class="big-icon">◉</div>
        <p>${msg}</p>
        ${addBtn}
      </div>`;
    return;
  }

  /* --- Render cards --- */
  grid.innerHTML = filtered.map((s, i) => {
    const avatarClr = colorFor(s.fname + s.lname);
    const deptClr   = colorFor(s.dept || 'x');
    const gpaColor  = s.gpa >= 8 ? '#c8f54a' : s.gpa >= 6 ? '#f5a44a' : '#f5554a';
    const gpaText   = s.gpa ? `${s.gpa}/10` : '—';

    return `
      <div class="student-card" style="animation-delay: ${i * 0.04}s">

        <div class="card-top">
          <div class="avatar"
            style="background: ${avatarClr.bg}; color: ${avatarClr.color}">
            ${initials(s.fname, s.lname)}
          </div>
          <div>
            <div class="card-name">${s.fname} ${s.lname}</div>
            <div class="card-id">${s.sid}</div>
          </div>
        </div>

        <div class="card-details">
          <div class="detail-item">
            <label>Email</label>
            <span>${s.email || '—'}</span>
          </div>
          <div class="detail-item">
            <label>Age</label>
            <span>${s.age || '—'}</span>
          </div>
          <div class="detail-item">
            <label>Department</label>
            <span>
              <span class="dept-badge"
                style="background: ${deptClr.bg}; color: ${deptClr.color}">
                ${s.dept || '—'}
              </span>
            </span>
          </div>
          <div class="detail-item">
            <label>Year</label>
            <span>${s.year || '—'}</span>
          </div>
          <div class="detail-item">
            <label>Phone</label>
            <span>${s.phone || '—'}</span>
          </div>
          <div class="detail-item">
            <label>GPA</label>
            <span style="color: ${gpaColor}; font-weight: 600">${gpaText}</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn btn-ghost btn-sm" onclick="openEdit('${s.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDelete('${s.id}')">Delete</button>
        </div>

      </div>`;
  }).join('');
}


/* ============================================================
   Add / Edit Modal
   ============================================================ */

/**
 * Open the Add/Edit modal.
 * @param {string|null} id - Student ID to edit, or null for a new student.
 */
function openModal(id = null) {
  editingId = id;
  const fields = ['fname', 'lname', 'sid', 'age', 'email', 'dept', 'year', 'phone', 'gpa'];

  if (id) {
    const student = students.find(s => s.id === id);
    document.getElementById('modal-title').textContent = 'Edit Student';
    fields.forEach(f => {
      const el = document.getElementById('f-' + f);
      if (el) el.value = student[f] || '';
    });
  } else {
    document.getElementById('modal-title').textContent = 'Add Student';
    fields.forEach(f => {
      const el = document.getElementById('f-' + f);
      if (el) el.value = '';
    });
  }

  document.getElementById('modal-overlay').classList.add('open');
  // Focus first input for accessibility
  setTimeout(() => document.getElementById('f-fname').focus(), 100);
}

/** Shorthand to open edit modal. */
function openEdit(id) { openModal(id); }

/** Close the Add/Edit modal. */
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
}

/** Read form values, validate, and save (add or update) a student. */
function saveStudent() {
  const fname = document.getElementById('f-fname').value.trim();
  const lname = document.getElementById('f-lname').value.trim();
  const sid   = document.getElementById('f-sid').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const dept  = document.getElementById('f-dept').value.trim();

  if (!fname || !lname || !sid || !email || !dept) {
    showToast('Please fill in all required fields.', true);
    return;
  }

  const isDuplicate = students.some(s => s.sid === sid && s.id !== editingId);
  if (isDuplicate) {
    showToast('Student ID already exists!', true);
    return;
  }

  const data = {
    id:    editingId || Date.now().toString(),
    fname, lname, sid, email, dept,
    age:   document.getElementById('f-age').value.trim(),
    year:  document.getElementById('f-year').value,
    phone: document.getElementById('f-phone').value.trim(),
    gpa:   document.getElementById('f-gpa').value.trim(),
  };

  if (editingId) {
    students = students.map(s => s.id === editingId ? data : s);
    showToast('Student updated successfully.');
  } else {
    students.unshift(data);
    showToast('Student added successfully.');
  }

  save();
  updateTabs();
  renderCards();
  closeModal();
}


/* ============================================================
   Delete Confirmation Modal
   ============================================================ */

/**
 * Open the delete confirmation modal.
 * @param {string} id
 */
function openDelete(id) {
  deleteId = id;
  document.getElementById('confirm-overlay').classList.add('open');
}

/** Close confirm modal without deleting. */
function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
  deleteId = null;
}

/** Permanently delete the student after confirmation. */
function confirmDelete() {
  students = students.filter(s => s.id !== deleteId);

  if (activeFilter !== 'all' && !students.some(s => s.dept === activeFilter)) {
    activeFilter = 'all';
  }

  save();
  updateTabs();
  renderCards();
  closeConfirm();
  showToast('Student deleted.', true);
}


/* ============================================================
   Shared Overlay — Click Outside to Close
   ============================================================ */

/**
 * Close modal when user clicks the dark backdrop.
 * @param {MouseEvent} e
 */
function overlayClick(e) {
  if (e.target === e.currentTarget) {
    closeModal();
    closeConfirm();
  }
}

/* Close modals on Escape key */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
});


/* ============================================================
   Toast Notification
   ============================================================ */

/**
 * Show a brief toast notification.
 * @param {string}  msg
 * @param {boolean} danger
 */
function showToast(msg, danger = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;

  toast.className = 'toast' + (danger ? ' danger' : '');
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}


/* ============================================================
   Seed Sample Data (first load only)
   ============================================================ */
if (!students.length) {
  students = [
    {
      id: '1', fname: 'Priya',  lname: 'Ramesh',   sid: 'CS2024001',
      email: 'priya@college.edu',  dept: 'Computer Science',
      age: '20', year: '2nd Year', phone: '9876543210', gpa: '9.1'
    },
    {
      id: '2', fname: 'Arjun',  lname: 'Nair',      sid: 'EC2023045',
      email: 'arjun@college.edu',  dept: 'Electronics',
      age: '21', year: '3rd Year', phone: '9123456789', gpa: '7.8'
    },
    {
      id: '3', fname: 'Divya',  lname: 'Meenakshi', sid: 'ME2024022',
      email: 'divya@college.edu',  dept: 'Mechanical',
      age: '19', year: '1st Year', phone: '',           gpa: '8.4'
    },
    {
      id: '4', fname: 'Kiran',  lname: 'Babu',       sid: 'CS2022099',
      email: 'kiran@college.edu',  dept: 'Computer Science',
      age: '22', year: '4th Year', phone: '9988776655', gpa: '6.2'
    },
    {
      id: '5', fname: 'Ananya', lname: 'Iyer',       sid: 'CV2023018',
      email: 'ananya@college.edu', dept: 'Civil',
      age: '21', year: '3rd Year', phone: '9871234560', gpa: '8.9'
    },
  ];
  save();
}


/* ── Initialise ── */
updateTabs();
renderCards();