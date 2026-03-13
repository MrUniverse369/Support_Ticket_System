const API_URL = window.location.origin + '/api';

const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('page-title');
const openFormBtn = document.getElementById('open-form-btn');
const createForm = document.getElementById('create-ticket-form');

// ---------------- SPA Navigation ----------------
function showSection(key) {
  // Hide all sections
  sections.forEach(sec => sec.classList.remove('active'));
  // Show target section
  const target = document.getElementById(`section-${key}`);
  if (target) target.classList.add('active');

  // Update sidebar active
  navItems.forEach(btn => btn.classList.remove('active'));
  const navBtn = Array.from(navItems).find(btn => btn.dataset.section === key);
  if (navBtn) navBtn.classList.add('active');

  // Update topbar title
  pageTitle.textContent = key.charAt(0).toUpperCase() + key.slice(1);
}

// Sidebar navigation clicks
navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault(); // prevent # jump
    const key = item.dataset.section;
    showSection(key);
  });
});

// Topbar new ticket button
openFormBtn.addEventListener('click', e => {
  e.preventDefault();
  showSection('create');
});

// ---------------- Ticket Creation ----------------
createForm.addEventListener('submit', async e => {
  e.preventDefault();

  const title = document.getElementById('f-title').value.trim();
  const description = document.getElementById('f-description').value.trim();
  const priority = document.getElementById('f-priority').value;

  if (!title || !description || !priority) return alert('Please fill all fields');

  const payload = { title, description, priority, created_by: 1 }; // replace with real user ID

  try {
    const res = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Ticket creation failed');

    const ticket = await res.json();
    alert('Ticket created successfully!');
    createForm.reset();
    showSection('tickets');
    // Optionally refresh ticket list here
  } catch (err) {
    console.error(err);
    alert('Error creating ticket');
  }
});