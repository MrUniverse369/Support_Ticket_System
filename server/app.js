const API_URL = window.location.origin + '/api';

const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('page-title');
const openFormBtn = document.getElementById('open-form-btn');
const createForm = document.getElementById('create-ticket-form');

// ---------------- SPA Navigation ----------------
function showSection(key) {
  sections.forEach(sec => sec.classList.remove('active'));
  document.getElementById(`section-${key}`).classList.add('active');

  navItems.forEach(btn => btn.classList.remove('active'));
  const navBtn = Array.from(navItems).find(btn => btn.dataset.section === key);
  if (navBtn) navBtn.classList.add('active');

  pageTitle.textContent = key.charAt(0).toUpperCase() + key.slice(1);
}

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const key = item.dataset.section;
    showSection(key);
  });
});

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

  const payload = { title, description, priority, created_by: 1 }; // replace with actual user ID

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
    // optionally refresh ticket list
  } catch (err) {
    console.error(err);
    alert('Error creating ticket');
  }
});