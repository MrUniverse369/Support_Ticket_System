/* ── Config ────────────────────────────────────────────────── */
const API_URL = '/api'; // same-origin on Render — no need for window.location.origin

/* ── DOM refs ──────────────────────────────────────────────── */
const navItems   = document.querySelectorAll('.nav-item');
const sections   = document.querySelectorAll('.content-section');
const pageTitle  = document.getElementById('page-title');
const openFormBtn = document.getElementById('open-form-btn');
const createForm = document.getElementById('create-ticket-form');

/* ── State ─────────────────────────────────────────────────── */
let allTickets    = [];
let statusChart   = null;
let assignTicketId = null;

/* ══════════════════════════════════════════════════════════════
   SPA NAVIGATION
══════════════════════════════════════════════════════════════ */
function showSection(key) {
  sections.forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(`section-${key}`);
  if (target) target.classList.add('active');

  navItems.forEach(btn => btn.classList.remove('active'));
  const navBtn = Array.from(navItems).find(btn => btn.dataset.section === key);
  if (navBtn) navBtn.classList.add('active');

  const titles = { dashboard: 'Dashboard', tickets: 'Tickets', create: 'New Ticket' };
  pageTitle.textContent = titles[key] || key;

  if (key === 'dashboard') updateDashboard();
  if (key === 'tickets')   renderTickets();
}

navItems.forEach(item =>
  item.addEventListener('click', e => { e.preventDefault(); showSection(item.dataset.section); })
);
openFormBtn.addEventListener('click', e => { e.preventDefault(); showSection('create'); });

/* ══════════════════════════════════════════════════════════════
   DATA FETCHING
══════════════════════════════════════════════════════════════ */
async function fetchTickets() {
  try {
    const res = await fetch(`${API_URL}/tickets`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
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

  document.querySelector('#total-tickets .stat-value').textContent      = total;
  document.querySelector('#open-tickets .stat-value').textContent       = open;
  document.querySelector('#in-progress-tickets .stat-value').textContent = inProgress;
  document.querySelector('#completed-tickets .stat-value').textContent  = completed;

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
          'rgba(30,64,175,0.12)',
          'rgba(217,119,6,0.12)',
          'rgba(22,163,74,0.12)'
        ],
        borderColor: ['#1e40af', '#d97706', '#16a34a'],
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
          ticks: { stepSize: 1, precision: 0 },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   TICKET LIST
══════════════════════════════════════════════════════════════ */
function renderTickets() {
  const active    = allTickets.filter(t => t.status !== 'completed');
  const completed = allTickets.filter(t => t.status === 'completed');

  const ticketList      = document.getElementById('ticket-list');
  const completedList   = document.getElementById('completed-ticket-list');
  const emptyActive     = document.getElementById('empty-active');
  const emptyCompleted  = document.getElementById('empty-completed');
  const countEl         = document.getElementById('tickets-count');

  ticketList.innerHTML    = '';
  completedList.innerHTML = '';

  const currentTab = document.querySelector('.tab.active')?.dataset.tab || 'active';
  const count = currentTab === 'active' ? active.length : completed.length;
  countEl.textContent = `${count} ticket${count !== 1 ? 's' : ''}`;

  // Active tab
  emptyActive.style.display = active.length === 0 ? 'block' : 'none';
  active.forEach(t => ticketList.appendChild(createTicketCard(t)));

  // Completed tab
  emptyCompleted.style.display = completed.length === 0 ? 'block' : 'none';
  completed.forEach(t => completedList.appendChild(createTicketCard(t, true)));
}

function createTicketCard(ticket, isCompleted = false) {
  const li = document.createElement('li');
  li.className = 'ticket-card';

  const statusMap = {
    open:        '<span class="badge badge-open">Open</span>',
    in_progress: '<span class="badge badge-progress">In Progress</span>',
    completed:   '<span class="badge badge-completed">Completed</span>',
  };

  const date = new Date(ticket.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const assignedBadge = ticket.assigned_to
    ? `<span class="badge" style="background:var(--cyan-dim);color:var(--cyan);border:1px solid rgba(2,132,199,0.2)">
         👤 ${ticket.assigned_to}
       </span>`
    : '';

  const actions = isCompleted ? '' : `
    <div class="ticket-actions">
      ${ticket.status === 'open'
        ? `<button class="btn-assign btn-progress" data-id="${ticket.ticket_id}" data-action="progress">In Progress</button>`
        : ''}
      <button class="btn-complete" data-id="${ticket.ticket_id}" data-action="complete">Complete</button>
      <button class="btn-assign"   data-id="${ticket.ticket_id}" data-action="assign">Assign</button>
    </div>`;

  li.innerHTML = `
    <div class="ticket-body">
      <div class="ticket-title">#${ticket.ticket_id} — ${ticket.title}</div>
      <div class="ticket-desc">${ticket.description}</div>
      <div class="ticket-meta">
        ${statusMap[ticket.status] || ''}
        <span class="badge badge-${ticket.priority}">${ticket.priority}</span>
        ${assignedBadge}
        <span style="font-size:0.72rem;color:var(--muted2);font-family:var(--mono)">${date}</span>
      </div>
    </div>
    ${actions}
  `;

  li.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, action } = btn.dataset;
      if (action === 'progress') updateStatus(id, 'in_progress');
      if (action === 'complete') updateStatus(id, 'completed');
      if (action === 'assign')   openAssignModal(id);
    });
  });

  return li;
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
    if (!res.ok) throw new Error('Failed to update status');
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

// Close modal on backdrop click
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
    if (!res.ok) throw new Error('Failed to assign ticket');
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
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const isActive = tab.dataset.tab === 'active';
    document.getElementById('tab-active').style.display    = isActive ? 'block' : 'none';
    document.getElementById('tab-completed').style.display = isActive ? 'none'  : 'block';

    renderTickets(); // refresh count label
  });
});

/* ══════════════════════════════════════════════════════════════
   CREATE TICKET
══════════════════════════════════════════════════════════════ */
createForm.addEventListener('submit', async e => {
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
    if (!res.ok) throw new Error('Ticket creation failed');

    createForm.reset();
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