// ── Firebase SDKs ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Init ──
const app  = initializeApp(FIREBASE_CONFIG);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Category config ──
const CATEGORIES = {
  attractions: { label:'🏛️ Attractions', color:'var(--sea)',   emoji:'🏛️' },
  hotels:      { label:'🏨 Hotels',      color:'var(--teal)',  emoji:'🏨' },
  food:        { label:'🍛 Food',        color:'var(--saffron)',emoji:'🍛' },
  events:      { label:'🎉 Events',      color:'var(--pink)',  emoji:'🎉' },
};

// ── State ──
let allPlaces = [];
let currentTab = 'attractions';

// ── DOM refs ──
const tabs     = document.querySelectorAll('.tab');
const sections = document.querySelectorAll('.section');
const navBtns  = document.querySelectorAll('.nav-btn');
const searchInput = document.querySelector('#search-input');

// ── Tab switching ──
function switchTab(name) {
  currentTab = name;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  sections.forEach(s => s.classList.toggle('active', s.id === name));
  navBtns.forEach(n => n.classList.toggle('active', n.dataset.nav === name));
  window.scrollTo({ top:0, behavior:'smooth' });
  renderTab(name);
}

tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
navBtns.forEach(n => n.addEventListener('click', () => switchTab(n.dataset.nav)));

// ── Load all places from Firestore ──
async function loadPlaces() {
  try {
    const snap = await getDocs(collection(db, 'places'));
    allPlaces = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTab(currentTab);
  } catch(e) {
    console.error('Load error:', e);
    showEmpty('attractions', '⚠️', 'Could not load places. Check your connection.');
  }
}

// ── Render a tab ──
function renderTab(tab) {
  const q = (searchInput?.value || '').toLowerCase();
  const filtered = allPlaces.filter(p => {
    const matchCat = p.category === tab;
    const matchQ = !q || p.name?.toLowerCase().includes(q) || p.about?.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (tab === 'events') renderEvents(filtered);
  else if (tab === 'hotels') renderHotels(filtered);
  else if (tab === 'food') renderFood(filtered);
  else renderAttractions(filtered);
}

// ── Attractions (2-col grid) ──
function renderAttractions(places) {
  const grid = document.getElementById('attractions-grid');
  if (!grid) return;
  if (!places.length) { grid.innerHTML = emptyHTML('🏛️','No attractions added yet.'); return; }
  grid.innerHTML = places.map(p => placeCardHTML(p)).join('');
}

function placeCardHTML(p) {
  const img = p.photoURL
    ? `<img src="${p.photoURL}" alt="${p.name}" loading="lazy"/>`
    : `<span class="emoji-fallback">${p.emoji || categoryEmoji(p.category)}</span>`;
  const stars = '★'.repeat(Math.round(p.rating||5)) + '☆'.repeat(5-Math.round(p.rating||5));
  return `
  <a class="place-card" href="pages/place.html?id=${p.id}" onclick="savePlaceId('${p.id}')">
    <div class="place-card-img" style="background:${p.cardBg||gradientFor(p.category)}">${img}</div>
    <div class="place-card-body">
      <div class="place-card-name">${p.name}</div>
      <div class="place-card-rating">${stars}</div>
      <span class="place-card-cat" style="background:${catBg(p.category)};color:${catColor(p.category)}">${p.category}</span>
    </div>
  </a>`;
}

// ── Events ──
function renderEvents(places) {
  const el = document.getElementById('events-list');
  if (!el) return;
  if (!places.length) { el.innerHTML = emptyHTML('🎉','No events added yet.'); return; }
  el.innerHTML = places.map(p => {
    const date = p.eventDate ? new Date(p.eventDate) : null;
    const d = date ? date.getDate() : '—';
    const m = date ? date.toLocaleString('default',{month:'short'}) : '—';
    return `
    <div class="ev-card" onclick="location.href='pages/place.html?id=${p.id}'">
      <div class="ev-date" style="background:${p.cardBg||gradientFor('events')}">
        <div class="d">${d}</div><div class="m">${m}</div>
      </div>
      <div class="ev-info">
        <h3>${p.name}</h3>
        <p>🕐 ${p.timing||'TBD'} · ${p.location||'Byndoor'}</p>
        <span class="ev-tag" style="background:var(--pink)">${p.subcategory||'Event'}</span>
      </div>
    </div>`;
  }).join('');
}

// ── Hotels ──
function renderHotels(places) {
  const el = document.getElementById('hotels-list');
  if (!el) return;
  if (!places.length) { el.innerHTML = emptyHTML('🏨','No hotels added yet.'); return; }
  el.innerHTML = places.map(p => {
    const img = p.photoURL
      ? `<img src="${p.photoURL}" alt="${p.name}" loading="lazy"/>`
      : `<span>${p.emoji||'🏨'}</span>`;
    return `
    <div class="list-card" onclick="location.href='pages/place.html?id=${p.id}'">
      <div class="list-card-img" style="background:${p.cardBg||gradientFor('hotels')}">${img}</div>
      <div class="list-card-body">
        <div class="list-card-row">
          <div><div class="list-card-name">${p.name}</div><div class="stars">${'★'.repeat(Math.round(p.rating||4))}</div></div>
          ${p.price ? `<div class="list-card-price">₹${p.price} <small>/night</small></div>` : ''}
        </div>
        <div class="card-desc">${p.about||''}</div>
        <div class="tags">${(p.amenities||[]).map(a=>`<span class="tag" style="background:#e8f5e9;color:#2e7d32">${a}</span>`).join('')}</div>
      </div>
    </div>`;
  }).join('');
}

// ── Food ──
function renderFood(places) {
  const el = document.getElementById('food-list');
  if (!el) return;
  if (!places.length) { el.innerHTML = emptyHTML('🍛','No food places added yet.'); return; }
  el.innerHTML = places.map(p => {
    const img = p.photoURL
      ? `<img src="${p.photoURL}" alt="${p.name}" loading="lazy"/>`
      : `<span>${p.emoji||'🍛'}</span>`;
    return `
    <div class="list-card" onclick="location.href='pages/place.html?id=${p.id}'">
      <div class="list-card-img" style="background:${p.cardBg||gradientFor('food')}">${img}</div>
      <div class="list-card-body">
        <div class="list-card-name">${p.name}</div>
        <div class="stars">${'★'.repeat(Math.round(p.rating||5))}</div>
        <div class="card-desc">${p.about||''}</div>
        <div class="tags">
          ${p.cuisine ? `<span class="tag" style="background:#FFF3E0;color:#E65100">${p.cuisine}</span>` : ''}
          ${p.price ? `<span class="tag" style="background:#e8f5e9;color:#2e7d32">₹${p.price}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Helpers ──
function gradientFor(cat) {
  const g = { attractions:'linear-gradient(135deg,#1AAFCC,#0D8C76)', hotels:'linear-gradient(135deg,#1AAFCC,#283593)', food:'linear-gradient(135deg,#E8651A,#F5B731)', events:'linear-gradient(135deg,#E8397A,#E8651A)' };
  return g[cat] || g.attractions;
}
function catBg(cat) {
  return { attractions:'#E0F7FA', hotels:'#E8F5E9', food:'#FFF3E0', events:'#FCE4EC' }[cat] || '#eee';
}
function catColor(cat) {
  return { attractions:'#006064', hotels:'#2E7D32', food:'#E65100', events:'#880E4F' }[cat] || '#555';
}
function categoryEmoji(cat) {
  return { attractions:'🏛️', hotels:'🏨', food:'🍛', events:'🎉' }[cat] || '📍';
}
function emptyHTML(icon, msg) {
  return `<div class="empty-state"><div class="icon">${icon}</div><p>${msg}</p></div>`;
}
function showEmpty(tab, icon, msg) {
  const el = document.getElementById(`${tab}-grid`) || document.getElementById(`${tab}-list`);
  if (el) el.innerHTML = emptyHTML(icon, msg);
}
function savePlaceId(id) { localStorage.setItem('selectedPlace', id); }

// ── Search ──
searchInput?.addEventListener('input', () => renderTab(currentTab));

// ── Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

// ── PWA Install ──
let deferredPrompt;
const banner = document.getElementById('install-banner');
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  banner?.classList.add('show');
});
document.getElementById('install-btn')?.addEventListener('click', async () => {
  banner?.classList.remove('show');
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
});
document.getElementById('dismiss-btn')?.addEventListener('click', () => banner?.classList.remove('show'));

// ── Offline Toast ──
window.addEventListener('offline', () => {
  const t = document.getElementById('offline-toast');
  t?.classList.add('show');
  setTimeout(() => t?.classList.remove('show'), 3000);
});

// ── Boot ──
loadPlaces();
