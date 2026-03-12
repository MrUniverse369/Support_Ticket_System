const API_URL = 'http://localhost:3000';

/* ── DOM refs ─────────────────────────────────────────────── */
const ticketList       = document.getElementById('ticket-list');
const completedList    = document.getElementById('completed-ticket-list');
const emptyActive      = document.getElementById('empty-active');
const emptyCompleted   = document.getElementById('empty-completed');
const ticketsCount     = document.getElementById('tickets-count');
const pageTitle        = document.getElementById('page-title');

const statEls = {
  total:      document.getElementById('total-tickets'),
  open:       document.getElementById('open-tickets'),
  inProgress: document.getElementById('in-progress-tickets'),
  completed:  document.getElementById('completed-tickets'),
};

const createTicketForm = document.getElementById('create-ticket-form');

/* ── Sidebar navigation ───────────────────────────────────── */
const navItems   = document.querySelectorAll('.nav-item');
const sections   = { dashboard: 'section-dashboard', tickets: 'section-tickets', create: 'section-create' };
const sectionTitles = { dashboard: 'Dashboard', tickets: 'Tickets', create: 'New Ticket' };

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const key = item.dataset.section;
    showSection(key);
  });
});

document.getElementById('open-form-btn').addEventListener('click', () => showSection('create'));

function showSection(key) {
  navItems.forEach(n => n.classList.toggle('active', n.dataset.section === key));
  Object.values(sections).forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(sections[key]).classList.add('active');
  pageTitle.textContent = sectionTitles[key];
}

/* ── Ticket tabs ──────────────────────────────────────────── */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isActive = tab.dataset.tab === 'active';
    document.getElementById('tab-active').style.display     = isActive ? '' : 'none';
    document.getElementById('tab-completed').style.display  = isActive ? 'none' : '';
  });
});

/* ── Helpers ──────────────────────────────────────────────── */
function statusBadge(status) {
  const map = { open: 'badge-open', in_progress: 'badge-progress', completed: 'badge-completed' };
  const label = { open: 'Open', in_progress: 'In Progress', completed: 'Completed' };
  return `<span class="badge ${map[status] || 'badge-open'}">${label[status] || status}</span>`;
}

function priorityBadge(priority) {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };
  return `<span class="badge ${map[priority] || ''}">${priority}</span>`;
}

function buildCard(ticket) {
  const li = document.createElement('li');
  li.className = 'ticket-card';

  const isCompleted  = ticket.status === 'completed';
  const isInProgress = ticket.status === 'in_progress';

  li.innerHTML = `
    <div class="ticket-body">
      <div class="ticket-title">#${ticket.ticket_id} — ${ticket.title}</div>
      <div class="ticket-desc">${ticket.description}</div>
      <div class="ticket-meta">
        ${statusBadge(ticket.status)}
        ${priorityBadge(ticket.priority)}
      </div>
    </div>
    <div class="ticket-actions">
      <button class="btn-assign" onclick="openAssignModal(${ticket.ticket_id})">Assign</button>
      ${!isInProgress && !isCompleted
        ? `<button class="btn-progress" onclick="setStatus(${ticket.ticket_id}, 'in_progress')">In Progress</button>`
        : ''}
      ${!isCompleted
        ? `<button class="btn-complete" onclick="setStatus(${ticket.ticket_id}, 'completed')">Complete</button>`
        : ''}
    </div>
  `;
  return li;
}

/* ── Fetch tickets ────────────────────────────────────────── */
async function fetchTickets() {
  try {
    const res     = await fetch(`${API_URL}/tickets`);
    const tickets = await res.json();

    ticketList.innerHTML    = '';
    completedList.innerHTML = '';

    const active    = tickets.filter(t => t.status !== 'completed');
    const completed = tickets.filter(t => t.status === 'completed');

    active.forEach(t    => ticketList.appendChild(buildCard(t)));
    completed.forEach(t => completedList.appendChild(buildCard(t)));

    emptyActive.style.display    = active.length    === 0 ? '' : 'none';
    emptyCompleted.style.display = completed.length === 0 ? '' : 'none';

    const currentTab = document.querySelector('.tab.active')?.dataset.tab;
    ticketsCount.textContent = currentTab === 'completed'
      ? `${completed.length} ticket${completed.length !== 1 ? 's' : ''}`
      : `${active.length} ticket${active.length !== 1 ? 's' : ''}`;

    updateDashboard(tickets);
  } catch (err) {
    console.error('Failed to fetch tickets:', err);
  }
}

/* ── Create ticket ────────────────────────────────────────── */
createTicketForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(createTicketForm);

  try {
    await fetch(`${API_URL}/tickets`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:       data.get('title'),
        description: data.get('description'),
        priority:    data.get('priority'),
        created_by:  1,
      }),
    });

    createTicketForm.reset();
    showSection('tickets');
    fetchTickets();
  } catch (err) {
    console.error('Error creating ticket:', err);
  }
});


/* ── Set ticket status ────────────────────────────────────── */
async function setStatus(id, status) {
  try {
    await fetch(`${API_URL}/tickets/${id}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    });
    fetchTickets();
  } catch (err) {
    console.error('Error updating ticket status:', err);
  }
}

/* ── Assign modal ─────────────────────────────────────────── */
const assignModal  = document.getElementById('assign-modal');
const assignInput  = document.getElementById('assign-user-id');
let pendingAssignId = null;

function openAssignModal(id) {
  pendingAssignId = id;
  assignInput.value = '';
  assignModal.style.display = 'flex';
  assignInput.focus();
}

function closeAssignModal() {
  assignModal.style.display = 'none';
  pendingAssignId = null;
}

document.getElementById('modal-close').addEventListener('click',   closeAssignModal);
document.getElementById('cancel-assign').addEventListener('click', closeAssignModal);
assignModal.addEventListener('click', e => { if (e.target === assignModal) closeAssignModal(); });

document.getElementById('confirm-assign').addEventListener('click', async () => {
  const userId = assignInput.value.trim();
  if (!userId || !pendingAssignId) return;

  try {
    await fetch(`${API_URL}/tickets/${pendingAssignId}/assign`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ assigned_to: userId }),
    });
    closeAssignModal();
    fetchTickets();
  } catch (err) {
    console.error('Assignment failed:', err);
  }
});

/* ── Dashboard ────────────────────────────────────────────── */
function updateDashboard(tickets) {
  const total      = tickets.length;
  const open       = tickets.filter(t => t.status === 'open').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const completed  = tickets.filter(t => t.status === 'completed').length;

  statEls.total.querySelector('.stat-value').textContent      = total;
  statEls.open.querySelector('.stat-value').textContent       = open;
  statEls.inProgress.querySelector('.stat-value').textContent = inProgress;
  statEls.completed.querySelector('.stat-value').textContent  = completed;

  const ctx = document.getElementById('statusChart').getContext('2d');
  if (window.statusBarChart) window.statusBarChart.destroy();

  window.statusBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Open', 'In Progress', 'Completed'],
      datasets: [{
        data: [open, inProgress, completed],
        backgroundColor: ['rgba(30,64,175,0.75)', 'rgba(217,119,6,0.75)', 'rgba(22,163,74,0.75)'],
        borderColor:     ['#1e40af', '#d97706', '#16a34a'],
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0a0f1e',
          borderColor: '#1e3a8a',
          borderWidth: 1,
          titleColor: '#ffffff',
          bodyColor: '#94a3b8',
        }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { family: 'IBM Plex Mono', size: 11 } }, grid: { color: '#1e1f23' } },
        y: { beginAtZero: true, ticks: { color: '#64748b', font: { family: 'IBM Plex Mono', size: 11 }, precision: 0 }, grid: { color: '#1e1f23' } },
      },
    },
  });
}

/* ── Init ─────────────────────────────────────────────────── */
fetchTickets();