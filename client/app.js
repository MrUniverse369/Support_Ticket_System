/* ── Config ────────────────────────────────────────────────── */
const API_URL = '/api';

/* ── State ─────────────────────────────────────────────────── */
let allTickets     = [];
let statusChart    = null;
let assignTicketId = null;

/* ── Page meta ──────────────────────────────────────────────── */
const pageMeta = {
  dashboard: { title: 'Overview',   lead: 'All ticket activity at a glance' },
  tickets:   { title: 'Tickets',    lead: 'Manage and action your support queue' },
  create:    { title: 'New Ticket', lead: 'Log a new issue for the queue' },
};

/* ══════════════════════════════════════════════════════════════
   MOBILE NAV
══════════════════════════════════════════════════════════════ */
const mobMenuBtn = document.getElementById('mob-menu-btn');
const mobNav     = document.getElementById('mob-nav');

mobMenuBtn.addEventListener('click', () => {
  mobNav.classList.toggle('open');
  mobMenuBtn.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!mobMenuBtn.contains(e.target) && !mobNav.contains(e.target)) {
    mobNav.classList.remove('open');
    mobMenuBtn.classList.remove('open');
  }
});

/* ══════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
function showSection(key) {
  // Sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`section-${key}`);
  if (target) target.classList.add('active');

  // Header nav
  document.querySelectorAll('.hnav-item').forEach(b => b.classList.remove('active'));
  const hBtn = document.querySelector(`.hnav-item[data-section="${key}"]`);
  if (hBtn) hBtn.classList.add('active');

  // Mobile nav
  document.querySelectorAll('.mob-nav-item').forEach(b => b.classList.remove('active'));
  const mBtn = document.querySelector(`.mob-nav-item[data-section="${key}"]`);
  if (mBtn) mBtn.classList.add('active');

  // Page strip
  const meta = pageMeta[key] || { title: key, lead: '' };
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-lead').textContent  = meta.lead;

  // Close mobile nav
  mobNav.classList.remove('open');
  mobMenuBtn.classList.remove('open');

  if (key === 'dashboard') updateDashboard();
  if (key === 'tickets')   renderTickets();
}

document.querySelectorAll('.hnav-item').forEach(btn =>
  btn.addEventListener('click', () => showSection(btn.dataset.section))
);
document.querySelectorAll('.mob-nav-item').forEach(btn =>
  btn.addEventListener('click', () => showSection(btn.dataset.section))
);
document.getElementById('open-form-btn').addEventListener('click', () => showSection('create'));

/* ══════════════════════════════════════════════════════════════
   DATA FETCHING
══════════════════════════════════════════════════════════════ */
async function fetchTickets() {
  try {
    const res = await fetch(`${API_URL}/tickets`);
    if (!res.ok) throw new Error(`${res.status}`);
    allTickets = await res.json();
    updateDashboard();
    renderTickets();
  } catch (err) {
    console.error('fetchTickets:', err);
  }
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════ */
function updateDashboard() {
  const total      = allTickets.length;
  const open       = allTickets.filter(t => t.status === 'open').length;
  const inProgress = allTickets.filter(t => t.status === 'in_progress').length;
  const completed  = allTickets.filter(t => t.status === 'completed').length;

  document.getElementById('kpi-total').textContent    = total;
  document.getElementById('kpi-open').textContent     = open;
  document.getElementById('kpi-progress').textContent = inProgress;
  document.getElementById('kpi-done').textContent     = completed;

  renderChart(open, inProgress, completed);
}

function renderChart(open, inProgress, completed) {
  const ctx = document.getElementById('statusChart').getContext('2d');
  if (statusChart) statusChart.destroy();

  statusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Open', 'In Progress', 'Completed'],
      datasets: [{
        data: [open, inProgress, completed],
        backgroundColor: [
          'rgba(14,165,233,0.12)',
          'rgba(217,119,6,0.12)',
          'rgba(101,163,13,0.12)',
        ],
        borderColor: ['#0ea5e9', '#d97706', '#65a30d'],
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1, precision: 0,
            color: '#9ca3af',
            font: { family: "'Fira Code', monospace", size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
          border: { color: 'transparent' }
        },
        x: {
          ticks: {
            color: '#6b7280',
            font: { family: "'Bricolage Grotesque', sans-serif", size: 12, weight: '600' }
          },
          grid: { display: false },
          border: { color: 'transparent' }
        }
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   RENDER TICKETS
══════════════════════════════════════════════════════════════ */
function renderTickets() {
  const active    = allTickets.filter(t => t.status !== 'completed');
  const completed = allTickets.filter(t => t.status === 'completed');

  const activeBody     = document.getElementById('ticket-tbody');
  const completedBody  = document.getElementById('completed-tbody');
  const mobActive      = document.getElementById('mob-cards-active');
  const mobCompleted   = document.getElementById('mob-cards-completed');
  const emptyActive    = document.getElementById('empty-active');
  const emptyCompleted = document.getElementById('empty-completed');
  const countEl        = document.getElementById('tickets-count');

  activeBody.innerHTML    = '';
  completedBody.innerHTML = '';
  mobActive.innerHTML     = '';
  mobCompleted.innerHTML  = '';

  const currentTab = document.querySelector('.tbl-tab.active')?.dataset.tab || 'active';
  const count = currentTab === 'active' ? active.length : completed.length;
  countEl.textContent = `${count} ticket${count !== 1 ? 's' : ''}`;

  // Active
  const showEmptyActive = active.length === 0;
  emptyActive.style.display = showEmptyActive ? 'block' : 'none';
  active.forEach(t => {
    activeBody.appendChild(buildTableRow(t, false));
    mobActive.appendChild(buildMobCard(t, false));
  });

  // Completed
  const showEmptyCompleted = completed.length === 0;
  emptyCompleted.style.display = showEmptyCompleted ? 'block' : 'none';
  completed.forEach(t => {
    completedBody.appendChild(buildTableRow(t, true));
    mobCompleted.appendChild(buildMobCard(t, true));
  });
}

/* ── Table row ─────────────────────────────────────────────── */
function buildTableRow(ticket, isCompleted) {
  const tr = document.createElement('tr');

  const date = new Date(ticket.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: '2-digit'
  });

  const statusPill = pillHtml(ticket.status, 'status');
  const priPill    = pillHtml(ticket.priority, 'priority');

  const actionsCols = isCompleted ? '' : `
    <td class="col-actions">
      <div class="row-actions">
        ${ticket.status === 'open'
          ? `<button class="row-btn row-btn-progress" data-id="${ticket.ticket_id}" data-action="progress">In Progress</button>`
          : ''}
        <button class="row-btn row-btn-complete" data-id="${ticket.ticket_id}" data-action="complete">Complete</button>
        <button class="row-btn row-btn-assign"   data-id="${ticket.ticket_id}" data-action="assign">Assign</button>
      </div>
    </td>`;

  tr.innerHTML = `
    <td class="col-id"><span class="td-id">#${ticket.ticket_id}</span></td>
    <td class="col-title"><span class="td-title">${ticket.title}</span></td>
    <td class="col-pri">${priPill}</td>
    <td class="col-status">${statusPill}</td>
    <td class="col-assigned">${ticket.assigned_to
      ? `<span class="pill pill-neutral">👤 ${ticket.assigned_to}</span>`
      : `<span class="td-none">—</span>`
    }</td>
    <td class="col-date"><span class="td-date">${date}</span></td>
    ${actionsCols}
  `;

  tr.querySelectorAll('[data-action]').forEach(btn => wireAction(btn));
  return tr;
}

/* ── Mobile card ───────────────────────────────────────────── */
function buildMobCard(ticket, isCompleted) {
  const div = document.createElement('div');
  div.className = 'mob-card';

  const date = new Date(ticket.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const actionHtml = isCompleted ? '' : `
    <div class="mob-card-actions">
      ${ticket.status === 'open'
        ? `<button class="row-btn row-btn-progress" data-id="${ticket.ticket_id}" data-action="progress">In Progress</button>`
        : ''}
      <button class="row-btn row-btn-complete" data-id="${ticket.ticket_id}" data-action="complete">Complete</button>
      <button class="row-btn row-btn-assign"   data-id="${ticket.ticket_id}" data-action="assign">Assign</button>
    </div>`;

  div.innerHTML = `
    <div class="mob-card-top">
      <div>
        <div class="mob-card-id">#${ticket.ticket_id}</div>
        <div class="mob-card-title">${ticket.title}</div>
      </div>
      ${pillHtml(ticket.priority, 'priority')}
    </div>
    <div class="mob-card-desc">${ticket.description}</div>
    <div class="mob-card-meta">
      ${pillHtml(ticket.status, 'status')}
      ${ticket.assigned_to ? `<span class="pill pill-neutral">👤 ${ticket.assigned_to}</span>` : ''}
      <span class="td-date">${date}</span>
    </div>
    ${actionHtml}
  `;

  div.querySelectorAll('[data-action]').forEach(btn => wireAction(btn));
  return div;
}

/* ── Pill helper ────────────────────────────────────────────── */
function pillHtml(value, type) {
  const statusMap = {
    open:        'pill-open',
    in_progress: 'pill-progress',
    completed:   'pill-completed',
  };
  const priorityMap = {
    low:    'pill-low',
    medium: 'pill-medium',
    high:   'pill-high',
  };
  const cls = type === 'status' ? statusMap[value] : priorityMap[value];
  const label = value === 'in_progress' ? 'In Progress' : value;
  return `<span class="pill ${cls || ''}">${label}</span>`;
}

/* ── Wire action button ─────────────────────────────────────── */
function wireAction(btn) {
  btn.addEventListener('click', () => {
    const { id, action } = btn.dataset;
    if (action === 'progress') updateStatus(id, 'in_progress');
    if (action === 'complete') updateStatus(id, 'completed');
    if (action === 'assign')   openAssignModal(id);
  });
}

/* ══════════════════════════════════════════════════════════════
   STATUS UPDATE
══════════════════════════════════════════════════════════════ */
async function updateStatus(id, status) {
  try {
    const res = await fetch(`${API_URL}/tickets/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed');
    await fetchTickets();
  } catch (err) {
    console.error('updateStatus:', err);
    alert('Error updating ticket status');
  }
}

/* ══════════════════════════════════════════════════════════════
   ASSIGN MODAL
══════════════════════════════════════════════════════════════ */
function openAssignModal(id) {
  assignTicketId = id;
  document.getElementById('assign-user-id').value = '';
  document.getElementById('assign-modal').style.display = 'flex';
}
function closeAssignModal() {
  document.getElementById('assign-modal').style.display = 'none';
  assignTicketId = null;
}

document.getElementById('modal-close').addEventListener('click', closeAssignModal);
document.getElementById('cancel-assign').addEventListener('click', closeAssignModal);
document.getElementById('assign-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAssignModal();
});
document.getElementById('confirm-assign').addEventListener('click', async () => {
  const userId = document.getElementById('assign-user-id').value.trim();
  if (!userId) return alert('Please enter a user ID');
  try {
    const res = await fetch(`${API_URL}/tickets/${assignTicketId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: parseInt(userId, 10) })
    });
    if (!res.ok) throw new Error('Failed');
    closeAssignModal();
    await fetchTickets();
  } catch (err) {
    console.error('assignTicket:', err);
    alert('Error assigning ticket');
  }
});

/* ══════════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.tbl-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tbl-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isActive = tab.dataset.tab === 'active';
    document.getElementById('tab-active').style.display    = isActive ? 'block' : 'none';
    document.getElementById('tab-completed').style.display = isActive ? 'none'  : 'block';
    renderTickets();
  });
});

/* ══════════════════════════════════════════════════════════════
   CREATE TICKET
══════════════════════════════════════════════════════════════ */
document.getElementById('create-ticket-form').addEventListener('submit', async e => {
  e.preventDefault();
  const title       = document.getElementById('f-title').value.trim();
  const description = document.getElementById('f-description').value.trim();
  const priority    = document.getElementById('f-priority').value;
  if (!title || !description || !priority) return alert('Please fill all fields');
  try {
    const res = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority, created_by: 1 })
    });
    if (!res.ok) throw new Error('Failed');
    document.getElementById('create-ticket-form').reset();
    await fetchTickets();
    showSection('tickets');
  } catch (err) {
    console.error('createTicket:', err);
    alert('Error creating ticket');
  }
});

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
fetchTickets();