const API_URL = 'http://localhost:3000';
const ticketList = document.getElementById('ticket-list');
const completedList = document.getElementById('completed-ticket-list');

// Dashboard elements
const dashboardStats = {
    total: document.getElementById('total-tickets'),
    open: document.getElementById('open-tickets'),
    inProgress: document.getElementById('in-progress-tickets'),
    completed: document.getElementById('completed-tickets')
};

async function fetchTickets() {
    const res = await fetch(`${API_URL}/tickets`);
    const tickets = await res.json();

    ticketList.innerHTML = '';
    completedList.innerHTML = '';

    tickets.forEach(ticket => {
        const li = document.createElement('li');
        li.className = 'ticket-card';
        li.innerHTML = `
            <h3>${ticket.title}</h3>
            <p>${ticket.description}</p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <p><strong>Priority:</strong> ${ticket.priority}</p>
            <button onclick="assignTicket(${ticket.ticket_id})">Assign</button>
            <button onclick="completeTicket(${ticket.ticket_id})">Complete</button>
        `;
        if(ticket.status === 'completed') completedList.appendChild(li);
        else ticketList.appendChild(li);
    });

    updateDashboard(tickets);
}

function updateDashboard(tickets) {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const completed = tickets.filter(t => t.status === 'completed').length;

    dashboardStats.total.textContent = `Total: ${total}`;
    dashboardStats.open.textContent = `Open: ${open}`;
    dashboardStats.inProgress.textContent = `In Progress: ${inProgress}`;
    dashboardStats.completed.textContent = `Completed: ${completed}`;

    // Bar chart for status
    const ctx = document.getElementById('statusChart').getContext('2d');
    if(window.statusBarChart) window.statusBarChart.destroy();
    window.statusBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Open', 'In Progress', 'Completed'],
            datasets: [{
                label: 'Tickets',
                data: [open, inProgress, completed],
                backgroundColor: ['#007bff', '#17a2b8', '#6c757d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, precision:0 },
                x: { ticks: { font: { size: 12 } } }
            }
        }
    });
}

// Placeholder buttons
function assignTicket(id) { alert(`Assign ticket ${id}`); }
function completeTicket(id) { alert(`Complete ticket ${id}`); }

fetchTickets();