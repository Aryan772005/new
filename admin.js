/**
 * CRAFTCON '26 — ORGANIZER ADMIN CONSOLE SCRIPT
 * Manages authentication, SQLite database interaction, live search/filters,
 * status transitions, CSV export, and email broadcasting.
 */

(function () {
  'use strict';

  // API Token State
  let adminToken = localStorage.getItem('craftcon_admin_token') || null;
  let allRegistrations = [];
  let currentViewingSquad = null;

  // DOM Elements
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const loginForm = document.getElementById('admin-login-form');
  const loginErrorBox = document.getElementById('login-error-box');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const autoFillChip = document.getElementById('auto-fill-chip');
  const togglePwdBtn = document.getElementById('toggle-pwd-btn');
  const adminIdInput = document.getElementById('admin-id');
  const adminPwdInput = document.getElementById('admin-password');

  const logoutBtn = document.getElementById('logout-btn');
  const refreshDataBtn = document.getElementById('refresh-data-btn');
  const currentUsernameDisplay = document.getElementById('current-username-display');

  // Stats
  const statTotalTeams = document.getElementById('stat-total-teams');
  const statTotalBuilders = document.getElementById('stat-total-builders');
  const statCheckedIn = document.getElementById('stat-checked-in');
  const statApprovedCount = document.getElementById('stat-approved-count');
  const statUniqueColleges = document.getElementById('stat-unique-colleges');

  // Toolbar
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterTrack = document.getElementById('filter-track');
  const filterStatus = document.getElementById('filter-status');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const copyEmailsBtn = document.getElementById('copy-emails-btn');
  const openAddModalBtn = document.getElementById('open-add-modal-btn');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

  // Table
  const tableBody = document.getElementById('table-body');
  const visibleCountEl = document.getElementById('visible-count');
  const emptyStateEl = document.getElementById('table-empty-state');

  // Dossier Modal
  const dossierModal = document.getElementById('dossier-modal');
  const closeDossierBtn = document.getElementById('close-dossier-btn');
  const modalCloseActionBtn = document.getElementById('modal-close-action-btn');
  const modalQuickCheckinBtn = document.getElementById('modal-quick-checkin-btn');
  const modalQuickApproveBtn = document.getElementById('modal-quick-approve-btn');

  // Add Squad Modal
  const addSquadModal = document.getElementById('add-squad-modal');
  const closeAddModalBtn = document.getElementById('close-add-modal-btn');
  const cancelAddBtn = document.getElementById('cancel-add-btn');
  const addSquadForm = document.getElementById('admin-add-squad-form');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // ================= UTILITIES & HELPERS ================= //
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function apiFetch(endpoint, options = {}) {
    options.headers = options.headers || {};
    if (adminToken) {
      options.headers['Authorization'] = `Bearer ${adminToken}`;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(endpoint, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        handleLogout();
        throw new Error(data.error || 'Session expired. Please sign in again.');
      }
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  }

  // ================= AUTHENTICATION ================= //
  async function checkExistingAuth() {
    if (!adminToken) {
      showLogin();
      return;
    }

    try {
      const data = await apiFetch('/api/admin/me');
      currentUsernameDisplay.textContent = data.user.username || 'admin';
      showDashboard();
      loadAllDashboardData();
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
  }

  function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'flex';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorBox.style.display = 'none';
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.innerHTML = '<span>AUTHENTICATING...</span>';

    const username = adminIdInput.value.trim();
    const password = adminPwdInput.value;

    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        body: { username, password }
      });

      adminToken = res.token;
      localStorage.setItem('craftcon_admin_token', adminToken);
      currentUsernameDisplay.textContent = res.username || 'admin';

      showToast(`Welcome back, Organizer ${res.username}!`, 'success');
      showDashboard();
      loadAllDashboardData();
    } catch (err) {
      loginErrorBox.textContent = err.message || 'Login failed. Please check your credentials.';
      loginErrorBox.style.display = 'block';
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.innerHTML = `<span>ENTER ORGANIZER TERMINAL</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    }
  });

  // Auto-fill chip removed for security

  togglePwdBtn.addEventListener('click', () => {
    const isPassword = adminPwdInput.type === 'password';
    adminPwdInput.type = isPassword ? 'text' : 'password';
    togglePwdBtn.textContent = isPassword ? '🔒' : '👁';
  });

  async function handleLogout() {
    if (adminToken) {
      try {
        await apiFetch('/api/admin/logout', { method: 'POST' });
      } catch (e) {
        // Ignore logout errors
      }
    }
    adminToken = null;
    localStorage.removeItem('craftcon_admin_token');
    allRegistrations = [];
    showLogin();
    showToast('Signed out of Organizer Console.', 'info');
  }

  logoutBtn.addEventListener('click', handleLogout);

  // ================= DASHBOARD DATA ================= //
  async function loadAllDashboardData() {
    refreshDataBtn.classList.add('spinning');
    try {
      await Promise.all([fetchStats(), fetchRegistrations()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTimeout(() => refreshDataBtn.classList.remove('spinning'), 500);
    }
  }

  refreshDataBtn.addEventListener('click', () => {
    loadAllDashboardData();
    showToast('Database records synchronized.', 'info');
  });

  async function fetchStats() {
    const res = await apiFetch('/api/admin/stats');
    if (res.stats) {
      const s = res.stats;
      statTotalTeams.textContent = s.totalTeams || 0;
      statTotalBuilders.textContent = s.totalBuilders || 0;
      statCheckedIn.textContent = s.checkedIn || 0;
      statApprovedCount.textContent = s.approved || 0;
      statUniqueColleges.textContent = s.uniqueColleges || 0;
    }
  }

  async function fetchRegistrations() {
    const res = await apiFetch('/api/admin/registrations');
    allRegistrations = res.registrations || [];
    renderTable();
  }

  // ================= TABLE RENDERING & FILTERING ================= //
  function getFilteredRegistrations() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const trackVal = filterTrack.value;
    const statusVal = filterStatus.value;

    return allRegistrations.filter((r) => {
      // Search filter
      if (searchTerm) {
        const match =
          r.team_name.toLowerCase().includes(searchTerm) ||
          r.leader_name.toLowerCase().includes(searchTerm) ||
          r.leader_email.toLowerCase().includes(searchTerm) ||
          r.leader_phone.toLowerCase().includes(searchTerm) ||
          r.college_name.toLowerCase().includes(searchTerm) ||
          r.pass_id.toLowerCase().includes(searchTerm);
        if (!match) return false;
      }

      // Track filter
      if (trackVal !== 'all') {
        if (!r.primary_track.includes(trackVal)) return false;
      }

      // Status filter
      if (statusVal !== 'all') {
        if (r.status !== statusVal) return false;
      }

      return true;
    });
  }

  function renderTable() {
    const filtered = getFilteredRegistrations();
    visibleCountEl.textContent = filtered.length;

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
      emptyStateEl.style.display = 'block';
      return;
    } else {
      emptyStateEl.style.display = 'none';
    }

    filtered.forEach((reg) => {
      const tr = document.createElement('tr');
      tr.dataset.id = reg.id;

      // Track class
      let trackClass = '';
      if (reg.primary_track.includes('Climate')) trackClass = 'climate';
      else if (reg.primary_track.includes('Redstone') || reg.primary_track.includes('Hardware')) trackClass = 'hardware';
      else if (reg.primary_track.includes('Security') || reg.primary_track.includes('Deep Dark')) trackClass = 'security';

      tr.innerHTML = `
        <td>
          <span class="pass-id-pill">${escapeHtml(reg.pass_id)}</span>
        </td>
        <td>
          <div class="team-cell">
            <span class="team-name-text">${escapeHtml(reg.team_name)}</span>
            <span class="concept-snippet" title="${escapeHtml(reg.concept_brief || '')}">
              ${escapeHtml(reg.concept_brief || 'No concept brief')}
            </span>
          </div>
        </td>
        <td>
          <div class="contact-cell">
            <span class="leader-name-text">${escapeHtml(reg.leader_name)}</span>
            <div class="contact-links">
              <a href="mailto:${escapeHtml(reg.leader_email)}" title="Send Email">${escapeHtml(reg.leader_email)}</a>
              <span>·</span>
              <a href="tel:${escapeHtml(reg.leader_phone)}" title="Call / WhatsApp">${escapeHtml(reg.leader_phone)}</a>
            </div>
          </div>
        </td>
        <td>
          <span class="college-text">${escapeHtml(reg.college_name)}</span>
        </td>
        <td>
          <span class="track-badge ${trackClass}">${escapeHtml(reg.primary_track.replace('Track ', 'T'))}</span>
        </td>
        <td>
          <span class="size-pill">${reg.team_size} Crafters</span>
        </td>
        <td>
          <select class="status-pill-select status-${reg.status}" data-id="${reg.id}" aria-label="Change status">
            <option value="confirmed" ${reg.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="approved" ${reg.status === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="checked_in" ${reg.status === 'checked_in' ? 'selected' : ''}>Checked In</option>
            <option value="waitlist" ${reg.status === 'waitlist' ? 'selected' : ''}>Waitlist</option>
            <option value="rejected" ${reg.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td class="text-right">
          <div class="action-btns">
            <button class="row-action-btn view-dossier-btn" data-id="${reg.id}" title="View Full Squad Dossier">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="row-action-btn checkin quick-checkin-btn" data-id="${reg.id}" title="Mark Checked In">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button class="row-action-btn delete delete-btn" data-id="${reg.id}" data-team="${escapeHtml(reg.team_name)}" title="Delete Registration">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    // Attach listeners to status selects
    document.querySelectorAll('.status-pill-select').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        await updateSquadStatus(id, newStatus, e.target);
      });
    });

    // Attach listeners to view buttons
    document.querySelectorAll('.view-dossier-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.dataset.id, 10);
        openDossierModal(id);
      });
    });

    // Attach listeners to quick checkin buttons
    document.querySelectorAll('.quick-checkin-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        await updateSquadStatus(id, 'checked_in');
      });
    });

    // Attach listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.id;
        const teamName = btn.dataset.team;
        if (confirm(`Are you sure you want to permanently delete Squad "${teamName}"?`)) {
          await deleteSquad(id, teamName);
        }
      });
    });
  }

  // Live filter handlers
  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    renderTable();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderTable();
  });

  filterTrack.addEventListener('change', renderTable);
  filterStatus.addEventListener('change', renderTable);

  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filterTrack.value = 'all';
    filterStatus.value = 'all';
    renderTable();
  });

  // ================= STATUS & CRUD ACTIONS ================= //
  async function updateSquadStatus(id, status, selectElement = null) {
    try {
      const res = await apiFetch(`/api/admin/registrations/${id}`, {
        method: 'PATCH',
        body: { status }
      });

      // Update in local memory
      const index = allRegistrations.findIndex((r) => r.id === parseInt(id, 10));
      if (index !== -1) {
        allRegistrations[index].status = status;
      }

      if (selectElement) {
        selectElement.className = `status-pill-select status-${status}`;
      } else {
        renderTable();
      }

      fetchStats();
      showToast(`Squad status updated to "${status}".`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      renderTable();
    }
  }

  async function deleteSquad(id, teamName) {
    try {
      await apiFetch(`/api/admin/registrations/${id}`, { method: 'DELETE' });
      allRegistrations = allRegistrations.filter((r) => r.id !== parseInt(id, 10));
      renderTable();
      fetchStats();
      showToast(`Squad "${teamName}" was removed from database.`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ================= SQUAD DOSSIER MODAL ================= //
  function openDossierModal(id) {
    const squad = allRegistrations.find((r) => r.id === id);
    if (!squad) return;
    currentViewingSquad = squad;

    document.getElementById('modal-pass-id').textContent = squad.pass_id;
    
    const badge = document.getElementById('modal-status-badge');
    badge.textContent = squad.status.toUpperCase();
    badge.className = `status-pill status-${squad.status}`;

    document.getElementById('modal-team-name').textContent = squad.team_name;
    document.getElementById('modal-track-name').textContent = squad.primary_track;
    document.getElementById('modal-leader-name').textContent = squad.leader_name;
    document.getElementById('modal-team-size').textContent = `${squad.team_size} Crafters`;

    const emailEl = document.getElementById('modal-leader-email');
    emailEl.textContent = squad.leader_email;
    emailEl.href = `mailto:${squad.leader_email}`;

    const phoneEl = document.getElementById('modal-leader-phone');
    phoneEl.textContent = squad.leader_phone;
    phoneEl.href = `tel:${squad.leader_phone}`;

    document.getElementById('modal-college-name').textContent = squad.college_name;

    const portfolioRow = document.getElementById('dossier-portfolio-row');
    const portfolioEl = document.getElementById('modal-portfolio-url');
    if (squad.portfolio_url) {
      portfolioRow.style.display = 'flex';
      portfolioEl.textContent = squad.portfolio_url;
      portfolioEl.href = squad.portfolio_url;
    } else {
      portfolioRow.style.display = 'none';
    }

    document.getElementById('modal-concept-brief').textContent =
      squad.concept_brief || 'No concept brief provided.';
    document.getElementById('modal-created-at').textContent = squad.created_at || 'Registered recently';

    dossierModal.style.display = 'flex';
    dossierModal.setAttribute('aria-hidden', 'false');
  }

  function closeDossier() {
    dossierModal.style.display = 'none';
    dossierModal.setAttribute('aria-hidden', 'true');
    currentViewingSquad = null;
  }

  closeDossierBtn.addEventListener('click', closeDossier);
  modalCloseActionBtn.addEventListener('click', closeDossier);

  modalQuickCheckinBtn.addEventListener('click', async () => {
    if (currentViewingSquad) {
      await updateSquadStatus(currentViewingSquad.id, 'checked_in');
      closeDossier();
    }
  });

  modalQuickApproveBtn.addEventListener('click', async () => {
    if (currentViewingSquad) {
      await updateSquadStatus(currentViewingSquad.id, 'approved');
      closeDossier();
    }
  });

  // ================= ADD SQUAD MODAL ================= //
  openAddModalBtn.addEventListener('click', () => {
    addSquadForm.reset();
    addSquadModal.style.display = 'flex';
    addSquadModal.setAttribute('aria-hidden', 'false');
  });

  function closeAddModal() {
    addSquadModal.style.display = 'none';
    addSquadModal.setAttribute('aria-hidden', 'true');
  }

  closeAddModalBtn.addEventListener('click', closeAddModal);
  cancelAddBtn.addEventListener('click', closeAddModal);

  addSquadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      team_name: document.getElementById('add-team-name').value.trim(),
      team_size: document.getElementById('add-team-size').value,
      leader_name: document.getElementById('add-leader-name').value.trim(),
      leader_email: document.getElementById('add-leader-email').value.trim(),
      leader_phone: document.getElementById('add-leader-phone').value.trim(),
      college_name: document.getElementById('add-college-name').value.trim(),
      primary_track: document.getElementById('add-primary-track').value,
      concept_brief: document.getElementById('add-concept-brief').value.trim()
    };

    try {
      const res = await apiFetch('/api/admin/registrations', {
        method: 'POST',
        body: payload
      });

      showToast(`Squad "${res.registration.team_name}" registered! Pass: ${res.registration.pass_id}`, 'success');
      closeAddModal();
      loadAllDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ================= EXPORT & BROADCAST UTILITIES ================= //
  exportCsvBtn.addEventListener('click', () => {
    if (!adminToken) return;
    const downloadUrl = `/api/admin/export-csv?token=${encodeURIComponent(adminToken)}`;
    window.open(downloadUrl, '_blank');
    showToast('Exporting registrations CSV...', 'info');
  });

  copyEmailsBtn.addEventListener('click', () => {
    const filtered = getFilteredRegistrations();
    if (filtered.length === 0) {
      showToast('No registrations in current view.', 'error');
      return;
    }

    const emails = [...new Set(filtered.map((r) => r.leader_email))].join(', ');
    navigator.clipboard.writeText(emails).then(() => {
      showToast(`Copied ${filtered.length} leader email(s) to clipboard!`, 'success');
    }).catch(() => {
      showToast('Clipboard access denied.', 'error');
    });
  });

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDossier();
      closeAddModal();
    }
  });

  // Check auth on load
  checkExistingAuth();
})();
