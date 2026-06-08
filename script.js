/**
 * AlfCasino Bonus Tool – Orangebonus
 * Vollständig clientseitige Bonus-Hunt-Anwendung
 */

// ─── State ───────────────────────────────────────────────────────────────────
let allSlots = [];
let bonusSlots = [];
let azSeed = Date.now();
let bingoSlots = [];
let bingoMarked = new Set();
let selectedTheme = null;
let wheelSpinning = false;
let wheelSegments = [];
let communityEntries = [];

const STORAGE_KEYS = {
  community: 'orangebonus_community_hunt',
  azSeed: 'orangebonus_az_seed',
  azHunt: 'orangebonus_az_hunt',
};

// Theme-Konfiguration mit Labels und Emojis
const THEMES = [
  { id: 'halloween', label: 'Halloween', emoji: '🎃' },
  { id: 'christmas', label: 'Weihnachten', emoji: '🎄' },
  { id: 'newyear', label: 'Sylvester', emoji: '🎆' },
  { id: 'summer', label: 'Summer', emoji: '☀️' },
  { id: 'egyptian', label: 'Egyptian', emoji: '🏛️' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'mythology', label: 'Mythology', emoji: '⚡' },
  { id: 'western', label: 'Western', emoji: '🤠' },
  { id: 'fruit', label: 'Fruit', emoji: '🍒' },
  { id: 'asian', label: 'Asian', emoji: '🐉' },
  { id: 'fantasy', label: 'Fantasy', emoji: '✨' },
  { id: 'adventure', label: 'Adventure', emoji: '🗺️' },
];

// ─── Seeded Random (reproduzierbar) ─────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Daten laden ─────────────────────────────────────────────────────────────
async function loadSlots() {
  try {
    const res = await fetch('slots.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allSlots = await res.json();

    // startingLetter berechnen falls nicht vorhanden
    allSlots.forEach((slot) => {
      if (!slot.startingLetter) {
        slot.startingLetter = slot.name[0].toUpperCase();
      }
    });

    bonusSlots = allSlots.filter((s) => s.hasBonus);
    document.getElementById('slot-count').textContent = bonusSlots.length;

    initApp();
  } catch (err) {
    console.error('Fehler beim Laden von slots.json:', err);
    showToast('Fehler beim Laden der Slots! Prüfe slots.json.', 'error');
  }
}

// ─── App initialisieren ──────────────────────────────────────────────────────
function initApp() {
  initNavigation();
  initProviders();
  initAZHunt();
  renderFreeSpinsList();
  initBingo();
  initWheel();
  initThemedSessions();
  initCommunityHunt();
  initModal();
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.section-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(tab.dataset.section).classList.add('active');
    });
  });
}

// ─── Provider-Filter ─────────────────────────────────────────────────────────
function initProviders() {
  const providers = [...new Set(bonusSlots.map((s) => s.provider))].sort();
  const select = document.getElementById('filter-provider');
  providers.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });

  select.addEventListener('change', renderFreeSpinsList);
  document.getElementById('search-slots').addEventListener('input', renderFreeSpinsList);
}

// ─── 1. A-Z Bonus Hunt ───────────────────────────────────────────────────────
function initAZHunt() {
  const savedSeed = localStorage.getItem(STORAGE_KEYS.azSeed);
  if (savedSeed) azSeed = parseInt(savedSeed, 10);

  generateAZHunt();

  document.getElementById('btn-generate-az').addEventListener('click', () => {
    azSeed = Date.now();
    localStorage.setItem(STORAGE_KEYS.azSeed, azSeed.toString());
    generateAZHunt();
    showToast('Neuer A-Z Hunt generiert!', 'success');
  });
}

function generateAZHunt() {
  const rng = mulberry32(azSeed);
  const grid = document.getElementById('az-grid');
  grid.innerHTML = '';

  document.getElementById('az-seed-display').textContent = `Seed: ${azSeed}`;

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const huntResult = {};

  letters.forEach((letter) => {
    const matching = bonusSlots.filter((s) => s.startingLetter === letter);
    huntResult[letter] = matching.length > 0 ? pickRandom(matching, rng) : null;
  });

  // In localStorage speichern für Reproduzierbarkeit
  localStorage.setItem(STORAGE_KEYS.azHunt, JSON.stringify(
    Object.fromEntries(
      Object.entries(huntResult).map(([k, v]) => [k, v ? v.name : null])
    )
  ));

  letters.forEach((letter) => {
    const col = document.createElement('div');
    col.className = 'az-column';

    const letterEl = document.createElement('div');
    letterEl.className = 'az-letter';
    letterEl.textContent = letter;
    col.appendChild(letterEl);

    const slotEl = document.createElement('div');
    const slot = huntResult[letter];

    if (slot) {
      slotEl.className = 'az-slot';
      slotEl.textContent = slot.name;
      slotEl.title = `${slot.provider} – ${slot.bonusDescription}`;
      slotEl.addEventListener('click', () => openSlotModal(slot));
    } else {
      slotEl.className = 'az-slot empty';
      slotEl.textContent = '–';
    }

    col.appendChild(slotEl);
    grid.appendChild(col);
  });
}

// ─── 2. Free Spins Liste ─────────────────────────────────────────────────────
function renderFreeSpinsList() {
  const search = document.getElementById('search-slots').value.toLowerCase();
  const provider = document.getElementById('filter-provider').value;

  let filtered = bonusSlots;

  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.provider.toLowerCase().includes(search) ||
        s.bonusDescription.toLowerCase().includes(search)
    );
  }

  if (provider) {
    filtered = filtered.filter((s) => s.provider === provider);
  }

  const tbody = document.getElementById('free-spins-tbody');
  tbody.innerHTML = '';

  filtered.forEach((slot) => {
    const tr = document.createElement('tr');
    tr.className = 'cursor-pointer';
    tr.innerHTML = `
      <td class="font-semibold text-white">${escapeHtml(slot.name)}</td>
      <td class="text-gray-300">${escapeHtml(slot.provider)}</td>
      <td class="text-gray-400">${escapeHtml(slot.bonusDescription)}</td>
    `;
    tr.addEventListener('click', () => openSlotModal(slot));
    tbody.appendChild(tr);
  });

  document.getElementById('free-spins-count').textContent =
    `${filtered.length} von ${bonusSlots.length} Slots angezeigt`;
}

// ─── 3. Bingo 5×5 ───────────────────────────────────────────────────────────
function initBingo() {
  rollBingo();

  document.getElementById('btn-roll-bingo').addEventListener('click', rollBingo);
  document.getElementById('btn-reset-bingo').addEventListener('click', () => {
    bingoMarked.clear();
    renderBingoGrid();
    showToast('Alle Markierungen zurückgesetzt.', 'success');
  });
}

function rollBingo() {
  const rng = mulberry32(Date.now());
  bingoSlots = shuffleArray(bonusSlots, rng).slice(0, 25);
  bingoMarked.clear();
  renderBingoGrid();
  showToast('Bingo-Felder neu gerollt!', 'success');
}

function renderBingoGrid() {
  const grid = document.getElementById('bingo-grid');
  grid.innerHTML = '';

  bingoSlots.forEach((slot, i) => {
    const cell = document.createElement('div');
    cell.className = 'bingo-cell' + (bingoMarked.has(i) ? ' marked' : '');
    cell.textContent = slot.name;
    cell.title = `${slot.provider} – ${slot.bonusDescription}`;

    cell.addEventListener('click', () => {
      if (bingoMarked.has(i)) {
        bingoMarked.delete(i);
      } else {
        bingoMarked.add(i);
      }
      cell.classList.toggle('marked');
    });

    grid.appendChild(cell);
  });
}

// ─── 4. Bonus Wheel ──────────────────────────────────────────────────────────
let wheelCanvas, wheelCtx, wheelRotation = 0;

function initWheel() {
  wheelCanvas = document.getElementById('wheel-canvas');
  wheelCtx = wheelCanvas.getContext('2d');

  // Max. 24 Segmente für Lesbarkeit – zufällige Auswahl
  const rng = mulberry32(42);
  wheelSegments = shuffleArray(bonusSlots, rng).slice(0, 24);

  drawWheel(wheelRotation);

  document.getElementById('btn-spin-wheel').addEventListener('click', spinWheel);
  document.getElementById('btn-spin-again').addEventListener('click', spinWheel);
}

function drawWheel(rotation) {
  const canvas = wheelCanvas;
  const ctx = wheelCtx;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 10;
  const segments = wheelSegments;
  const sliceAngle = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Äußerer Ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, 2 * Math.PI);
  ctx.fillStyle = '#cc5500';
  ctx.fill();

  segments.forEach((slot, i) => {
    const start = rotation + i * sliceAngle;
    const end = start + sliceAngle;

    // Segment-Farbe alternierend
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#1a1d27' : '#242836';
    ctx.fill();
    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f0f2f5';
    ctx.font = 'bold 9px Inter, sans-serif';
    const label = slot.name.length > 18 ? slot.name.slice(0, 16) + '…' : slot.name;
    ctx.fillText(label, radius - 12, 4);
    ctx.restore();
  });

  // Mittelkreis
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
  ctx.fillStyle = '#ff6b00';
  ctx.fill();
  ctx.strokeStyle = '#ff8c33';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPIN', cx, cy);
}

function spinWheel() {
  if (wheelSpinning) return;
  wheelSpinning = true;

  const btnSpin = document.getElementById('btn-spin-wheel');
  const btnAgain = document.getElementById('btn-spin-again');
  btnSpin.disabled = true;
  document.getElementById('wheel-result').classList.add('hidden');

  const winIndex = Math.floor(Math.random() * wheelSegments.length);
  const sliceAngle = (2 * Math.PI) / wheelSegments.length;

  // Zielrotation: Gewinnersegment oben (Pointer bei -π/2)
  const targetAngle = -(winIndex * sliceAngle + sliceAngle / 2) - Math.PI / 2;
  const spins = 5 + Math.random() * 3;
  const totalRotation = spins * 2 * Math.PI + targetAngle;

  const startRotation = wheelRotation;
  const duration = 4000;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    wheelRotation = startRotation + totalRotation * eased;
    drawWheel(wheelRotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      wheelSpinning = false;
      btnSpin.disabled = false;
      btnAgain.classList.remove('hidden');

      const winner = wheelSegments[winIndex];
      showWheelResult(winner);
    }
  }

  requestAnimationFrame(animate);
}

function showWheelResult(slot) {
  const result = document.getElementById('wheel-result');
  result.classList.remove('hidden');
  document.getElementById('wheel-result-name').textContent = slot.name;
  document.getElementById('wheel-result-provider').textContent = slot.provider;
  document.getElementById('wheel-result-bonus').textContent = slot.bonusDescription;
}

// ─── 5. Themed Sessions ──────────────────────────────────────────────────────
function initThemedSessions() {
  const container = document.getElementById('theme-buttons');

  THEMES.forEach((theme) => {
    const btn = document.createElement('button');
    btn.className = 'theme-btn';
    btn.dataset.theme = theme.id;
    btn.innerHTML = `${theme.emoji} ${theme.label}`;
    btn.addEventListener('click', () => selectTheme(theme.id));
    container.appendChild(btn);
  });

  document.getElementById('btn-random-theme').addEventListener('click', () => {
    if (!selectedTheme) {
      showToast('Bitte zuerst ein Theme auswählen!', 'error');
      return;
    }
    renderThemeSlots(true);
  });
}

function selectTheme(themeId) {
  selectedTheme = themeId;

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === themeId);
  });

  const theme = THEMES.find((t) => t.id === themeId);
  document.getElementById('theme-label').textContent = theme
    ? `${theme.emoji} ${theme.label}`
    : 'Kein Theme ausgewählt';

  renderThemeSlots(false);
}

function renderThemeSlots(randomPick) {
  if (!selectedTheme) return;

  let matching = bonusSlots.filter((s) => s.themes && s.themes.includes(selectedTheme));

  if (matching.length === 0) {
    document.getElementById('theme-slots-grid').innerHTML =
      '<p class="text-gray-400 col-span-full">Keine Slots für dieses Theme gefunden.</p>';
    return;
  }

  if (randomPick) {
    const rng = mulberry32(Date.now());
    matching = shuffleArray(matching, rng).slice(0, 10);
  } else {
    matching = matching.slice(0, 10);
  }

  const grid = document.getElementById('theme-slots-grid');
  grid.innerHTML = '';

  matching.forEach((slot) => {
    const card = document.createElement('div');
    card.className = 'slot-card';
    card.innerHTML = `
      <h4 class="font-bold text-white text-sm mb-1">${escapeHtml(slot.name)}</h4>
      <p class="text-orange-glow text-xs mb-2">${escapeHtml(slot.provider)}</p>
      <p class="text-gray-400 text-xs">${escapeHtml(slot.bonusDescription)}</p>
    `;
    card.addEventListener('click', () => openSlotModal(slot));
    grid.appendChild(card);
  });
}

// ─── 6. Community Hunt ───────────────────────────────────────────────────────
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000; // 30 Minuten

function initCommunityHunt() {
  const saved = localStorage.getItem(STORAGE_KEYS.community);
  if (saved) {
    try {
      communityEntries = JSON.parse(saved);
    } catch {
      communityEntries = [];
    }
  }

  renderCommunityTable();

  document.getElementById('btn-add-community').addEventListener('click', addCommunityEntry);
  document.getElementById('community-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCommunityEntry();
  });

  document.getElementById('btn-delete-last').addEventListener('click', () => {
    if (communityEntries.length === 0) return;
    communityEntries.pop();
    saveCommunity();
    renderCommunityTable();
    showToast('Letzter Eintrag gelöscht.', 'success');
  });

  document.getElementById('btn-clear-community').addEventListener('click', () => {
    communityEntries = [];
    saveCommunity();
    renderCommunityTable();
    showToast('Tabelle geleert.', 'success');
  });
}

function parseCommunityInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('!bonushunt ')) return null;

  const rest = trimmed.slice('!Bonushunt '.length).trim();
  if (!rest) return null;

  // Format: "!Bonushunt Slotname" oder "!Bonushunt Username: Slotname"
  let username = 'Chat';
  let slotName = rest;

  const colonIdx = rest.indexOf(':');
  if (colonIdx > 0 && colonIdx < 30) {
    username = rest.slice(0, colonIdx).trim();
    slotName = rest.slice(colonIdx + 1).trim();
  }

  return { username, slotName };
}

function findSlotByName(name) {
  const lower = name.toLowerCase();
  return bonusSlots.find((s) => s.name.toLowerCase() === lower)
    || bonusSlots.find((s) => s.name.toLowerCase().includes(lower));
}

function isDuplicateSlot(slotName) {
  const now = Date.now();
  const lower = slotName.toLowerCase();

  return communityEntries.some((entry) => {
    const entryTime = new Date(entry.time).getTime();
    return (
      entry.slotName.toLowerCase() === lower &&
      now - entryTime < DUPLICATE_WINDOW_MS
    );
  });
}

function addCommunityEntry() {
  const input = document.getElementById('community-input');
  const parsed = parseCommunityInput(input.value);

  if (!parsed) {
    showToast('Ungültiges Format! Nutze: !Bonushunt Slotname', 'error');
    return;
  }

  const matchedSlot = findSlotByName(parsed.slotName);
  const finalName = matchedSlot ? matchedSlot.name : parsed.slotName;

  if (isDuplicateSlot(finalName)) {
    showToast(`"${finalName}" wurde in den letzten 30 Min. bereits eingereicht!`, 'error');
    return;
  }

  const entry = {
    time: new Date().toISOString(),
    username: parsed.username,
    slotName: finalName,
    action: matchedSlot ? '✅ Akzeptiert' : '⚠️ Nicht in DB',
  };

  communityEntries.unshift(entry);
  saveCommunity();
  renderCommunityTable();
  input.value = '';
  showToast(`"${finalName}" hinzugefügt!`, 'success');
}

function saveCommunity() {
  localStorage.setItem(STORAGE_KEYS.community, JSON.stringify(communityEntries));
}

function renderCommunityTable() {
  const tbody = document.getElementById('community-tbody');
  tbody.innerHTML = '';

  if (communityEntries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-8">Noch keine Einträge</td></tr>';
    return;
  }

  communityEntries.forEach((entry) => {
    const tr = document.createElement('tr');
    const time = new Date(entry.time).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    tr.innerHTML = `
      <td class="text-gray-400 font-mono text-sm">${time}</td>
      <td class="text-orange-glow font-semibold">${escapeHtml(entry.username)}</td>
      <td class="text-white font-semibold">${escapeHtml(entry.slotName)}</td>
      <td>${escapeHtml(entry.action)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function initModal() {
  const modal = document.getElementById('slot-modal');
  document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

function openSlotModal(slot) {
  document.getElementById('modal-name').textContent = slot.name;
  document.getElementById('modal-provider').textContent = slot.provider;
  document.getElementById('modal-bonus').textContent = slot.bonusDescription;

  const themesEl = document.getElementById('modal-themes');
  themesEl.innerHTML = '';
  (slot.themes || []).forEach((t) => {
    const theme = THEMES.find((th) => th.id === t);
    const badge = document.createElement('span');
    badge.className = 'inline-block bg-dark border border-dark-border rounded-full px-2 py-0.5 text-xs text-gray-300 mr-1';
    badge.textContent = theme ? `${theme.emoji} ${theme.label}` : t;
    themesEl.appendChild(badge);
  });

  document.getElementById('slot-modal').classList.add('open');
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Start ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadSlots);