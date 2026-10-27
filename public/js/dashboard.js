/**
 * PondyCollect - Role-Based Dashboard Controller
 * Handles profile loading, cross-role directory tables, safe DOM construction, and session termination
 */

let directoryData = [];
let currentDashboardRole = '';

/**
 * Initialize dashboard based on role ('employee' or 'admin')
 */
async function initDashboard(role) {
    currentDashboardRole = role;

    try {
        const response = await fetch(`/api/dashboard/${role}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.status === 401) {
            window.location.href = '/login.html?error=unauthorized';
            return;
        }

        if (response.status === 403) {
            // Role mismatch (e.g. Employee visiting admin dashboard)
            const target = role === 'admin' ? '/employee-dashboard.html' : '/admin-dashboard.html';
            window.location.href = target;
            return;
        }

        const data = await response.json();

        if (!data.success) {
            alert(data.message || 'Failed to load dashboard data.');
            return;
        }

        // Render Current User Profile
        renderProfile(data.profile);

        // Store and Render Directory records
        if (role === 'employee') {
            directoryData = data.administrators || [];
        } else {
            directoryData = data.employees || [];
        }
        renderTable(directoryData);

        // If Admin, fetch live statistical metrics
        if (role === 'admin') {
            fetchAdminStats();
        }

    } catch (err) {
        console.error('Dashboard initialization error:', err);
        const tbody = document.getElementById('directory-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.style.padding = '2rem';
            td.style.color = '#DC2626';
            td.textContent = 'Failed to communicate with MySQL backend. Please verify that the server is running.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
    }
}

/**
 * Render user profile card and greetings
 */
function renderProfile(profile) {
    if (!profile) return;

    // Header Greeting
    const displayName = document.getElementById('user-display-name');
    const displayEmail = document.getElementById('user-display-email');
    const avatarLetter = document.getElementById('user-avatar-letter');

    if (displayName) displayName.textContent = `Welcome, ${profile.name}`;
    if (displayEmail) displayEmail.textContent = `${profile.email} • ${profile.designation || 'Staff'}`;
    if (avatarLetter && profile.name) {
        avatarLetter.textContent = profile.name.trim().charAt(0).toUpperCase();
    }

    // Profile Grid Fields
    setText('profile-name', profile.name);
    setText('profile-email', profile.email);
    setText('profile-department', profile.department);
    setText('profile-designation', profile.designation);
    setText('profile-phone', profile.phone || 'Not provided');

    if (profile.created_at) {
        const date = new Date(profile.created_at);
        setText('profile-created', date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }));
    }
}

/**
 * Fetch and display dynamic KPI statistics for Admin Console
 */
async function fetchAdminStats() {
    try {
        const res = await fetch('/api/dashboard/admin/stats');
        if (!res.ok) return;

        const data = await res.json();
        if (data.success && data.stats) {
            setText('stat-total-employees', data.stats.totalEmployees);
            setText('stat-total-admins', data.stats.totalAdmins);
            setText('stat-total-depts', data.stats.totalDepartments);
            setText('stat-account-status', data.stats.accountStatus);
        }
    } catch (e) {
        console.warn('Could not load dynamic admin stats:', e);
    }
}

/**
 * Render cross-role directory records into responsive table
 * Uses pure DOM creation and textContent to prevent any XSS injection
 */
function renderTable(list) {
    const tbody = document.getElementById('directory-tbody');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('directory-table');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!list || list.length === 0) {
        if (table) table.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';

    list.forEach(item => {
        const tr = document.createElement('tr');

        // 1. Name with Avatar Cell
        const tdName = document.createElement('td');
        const userCell = document.createElement('div');
        userCell.className = 'table-user-cell';

        const avatar = document.createElement('div');
        avatar.className = 'table-avatar';
        avatar.textContent = (item.name || 'U').trim().charAt(0).toUpperCase();

        const nameSpan = document.createElement('strong');
        nameSpan.textContent = item.name;

        userCell.appendChild(avatar);
        userCell.appendChild(nameSpan);
        tdName.appendChild(userCell);

        // 2. Email Cell
        const tdEmail = document.createElement('td');
        tdEmail.textContent = item.email;

        // 3. Department Cell
        const tdDept = document.createElement('td');
        const deptBadge = document.createElement('span');
        deptBadge.className = 'badge';
        deptBadge.style.backgroundColor = '#F1F5F9';
        deptBadge.style.color = '#334155';
        deptBadge.textContent = item.department || 'General';
        tdDept.appendChild(deptBadge);

        // 4. Designation Cell
        const tdDesig = document.createElement('td');
        tdDesig.textContent = item.designation || 'Staff Member';

        // 5. Phone Cell
        const tdPhone = document.createElement('td');
        tdPhone.textContent = item.phone || 'N/A';

        // Append cells to row
        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdDept);
        tr.appendChild(tdDesig);
        tr.appendChild(tdPhone);

        tbody.appendChild(tr);
    });
}

/**
 * Filter directory records dynamically based on search query
 */
function filterDirectory() {
    const searchInput = document.getElementById('directory-search');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        renderTable(directoryData);
        return;
    }

    const filtered = directoryData.filter(item => {
        const name = (item.name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        const dept = (item.department || '').toLowerCase();
        const desig = (item.designation || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();

        return name.includes(query) ||
               email.includes(query) ||
               dept.includes(query) ||
               desig.includes(query) ||
               phone.includes(query);
    });

    renderTable(filtered);
}

/**
 * Handle Session Sign Out
 */
async function handleLogout() {
    if (!confirm('Are you sure you want to sign out of your session?')) {
        return;
    }

    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Accept': 'application/json' }
        });
    } catch (e) {
        console.warn('Logout network error, clearing client state:', e);
    } finally {
        window.location.href = '/login.html';
    }
}

// Safe text helper
function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = value || '—';
    }
}
