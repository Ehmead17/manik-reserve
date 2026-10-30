import {
  seedOutlets,
  mockOperaGuests,
  sampleAppointments,
  appointmentTypes,
  generateTimeSlots,
  searchOpera,
  getGuestById,
  getReservation
} from './data/mock.js';

import {
  detectAllergies,
  suggestTimeSlot,
  forecastDemand,
  detectConflicts,
  daySummary
} from './data/ai.js';

const customOutlets = [
  { id: 'the-market', name: 'The Market', short: 'Market', type: 'Dining', iconClass: 'market', icon: 'M', operatingPeriods: [{ name: 'Dinner', start: '18:30', end: '22:30', maxPax: 60 }], active: true },
  { id: 'bottega', name: 'Bottega', short: 'Bottega', type: 'Fine Dining', iconClass: 'bottega', icon: 'B', operatingPeriods: [{ name: 'Dinner', start: '18:30', end: '22:30', maxPax: 40 }], active: true },
  { id: 'sip-sand', name: 'Sip & Sand', short: 'Sip & Sand', type: 'Bar & Lounge', iconClass: 'sip', icon: 'S', operatingPeriods: [{ name: 'All Day', start: '11:00', end: '23:00', maxPax: 50 }], active: true },
  { id: 'point', name: 'Point', short: 'Point', type: 'Dining', iconClass: 'point', icon: 'P', operatingPeriods: [{ name: 'Dinner', start: '19:00', end: '23:00', maxPax: 30 }], active: true },
  { id: 'drift', name: 'Drift', short: 'Drift', type: 'Bar & Lounge', iconClass: 'drift', icon: 'D', operatingPeriods: [{ name: 'Evening', start: '17:00', end: '00:00', maxPax: 45 }], active: true },
  { id: 'events', name: 'Events', short: 'Events', type: 'Experience', iconClass: 'events', icon: 'E', operatingPeriods: [{ name: 'Special', start: '18:00', end: '23:00', maxPax: 60 }], active: true }
];

function safeParseJSON(key, fallback) {
  try {
    const val = JSON.parse(localStorage.getItem(key));
    return Array.isArray(val) ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

const state = {
  loggedIn: false,
  user: null,
  view: 'dashboard',
  selectedDate: '2026-10-25',
  calendarYear: 2026,
  calendarMonth: 9, // 0-indexed (9 = October)
  selectedOutletId: 'bottega',
  appointments: JSON.parse(JSON.stringify(sampleAppointments)),
  outlets: customOutlets,
  inHouseGuests: safeParseJSON('manik_inhouse_guests', []),
  dietarySheet: safeParseJSON('manik_dietary_sheet', []),
  inHouseUpdated: localStorage.getItem('manik_inhouse_updated') || 'Never',
  dietaryUpdated: localStorage.getItem('manik_dietary_updated') || 'Never',
  auditLog: [
    { time: '2026-10-25 09:12', user: 'Aisha Hassan', action: 'Created appointment', detail: 'Room 222 → Bottega 18:30' },
    { time: '2026-10-25 09:45', user: 'Rashid Ali', action: 'Created appointment', detail: 'Room 118 → Bottega 18:30' },
    { time: '2026-10-25 10:02', user: 'Aisha Hassan', action: 'Updated notes', detail: 'Room 125 allergy note' },
  ]
};

const mealPlans = [
  { id: 'HB', name: 'HB' },
  { id: 'FB', name: 'FB' },
  { id: 'BB', name: 'BB' },
  { id: 'FBSA', name: 'FBSA' },
  { id: 'FBSI', name: 'FBSI' },
  { id: 'HB/FB', name: 'HB/FB' }
];

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function formatShortDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function getNationalityCode(nat) {
  if (!nat) return 'GB';
  const upper = nat.toUpperCase();
  if (upper.length <= 3) return upper;
  const map = {
    'UNITED KINGDOM': 'GB', 'BRITISH': 'GB', 'RUSSIA': 'RU', 'RUSSIAN': 'RU',
    'MALDIVES': 'MV', 'MALDIVIAN': 'MV', 'GERMANY': 'DE', 'GERMAN': 'DE',
    'FRANCE': 'FR', 'FRENCH': 'FR', 'UNITED STATES': 'US', 'USA': 'US',
    'AUSTRALIA': 'AU', 'CHINA': 'CN', 'INDIA': 'IN'
  };
  return map[upper] || upper.slice(0, 2);
}
function getOutlet(id) { return state.outlets.find(o => o.id === id); }
function getAppointmentsFor(outletId, date) {
  return state.appointments.filter(a => a.outletId === outletId && a.date === date);
}
function getCovers(outletId, date) {
  return getAppointmentsFor(outletId, date).reduce((s, a) => s + a.pax, 0);
}
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
function logAudit(action, detail) {
  const now = new Date();
  const time = `${state.selectedDate} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  state.auditLog.unshift({ time, user: state.user?.name || 'System', action, detail });
}
function canAdmin() { return state.user?.role === 'admin' || state.user?.role === 'gem'; }

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^["']|["']$/g, ''));
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = currentLine[index] || '';
    });
    result.push(obj);
  }
  return result;
}

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:100vh; padding:16px; background:#fff;">
      <div style="width:100%; max-width:400px; padding:24px; border-radius:12px; background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:24px">
          <span style="color:#d97706; font-size:22px;">◇</span>
          <div style="color:#0f172a; font-size:16px;"><strong>Manik Reserve</strong></div>
        </div>
        <h1 style="font-size:22px; font-weight:500; text-align:center; margin-bottom:6px; color:#0f172a;">Welcome back</h1>
        <p style="text-align:center; color:#64748b; font-size:13px; margin-bottom:24px">Sign in to manage dining & experiences</p>
        <div style="margin-bottom:16px;"><label style="display:block; margin-bottom:6px; font-size:13px; color:#334155;">Your name</label><input type="text" id="loginName" value="Aisha Hassan" style="width:100%; padding:10px; border-radius:6px; border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a;" /></div>
        <div style="margin-bottom:20px;"><label style="display:block; margin-bottom:6px; font-size:13px; color:#334155;">Role</label>
          <div id="roleSelect" style="display:flex; gap:8px;">
            <div class="role-option selected" data-role="gem" style="flex:1; text-align:center; padding:8px; border:1px solid #d97706; background:rgba(217,119,6,0.1); color:#d97706; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600;">GEM</div>
            <div class="role-option" data-role="fnb" style="flex:1; text-align:center; padding:8px; border:1px solid #cbd5e1; color:#334155; border-radius:6px; cursor:pointer; font-size:13px;">F&B</div>
            <div class="role-option" data-role="admin" style="flex:1; text-align:center; padding:8px; border:1px solid #cbd5e1; color:#334155; border-radius:6px; cursor:pointer; font-size:13px;">Admin</div>
          </div>
        </div>
        <button id="loginBtn" style="width:100%; padding:12px; background:#d97706; color:#fff; border:none; border-radius:6px; font-weight:600; cursor:pointer;">Sign in</button>
      </div>
    </div>`;
  let selectedRole = 'gem';
  document.querySelectorAll('.role-option').forEach(opt => {
    opt.onclick = () => {
      document.querySelectorAll('.role-option').forEach(o => {
        o.classList.remove('selected');
        o.style.borderColor = '#cbd5e1';
        o.style.background = 'transparent';
        o.style.color = '#334155';
        o.style.fontWeight = '400';
      });
      opt.classList.add('selected');
      opt.style.borderColor = '#d97706';
      opt.style.background = 'rgba(217,119,6,0.1)';
      opt.style.color = '#d97706';
      opt.style.fontWeight = '600';
      selectedRole = opt.dataset.role;
    };
  });
  document.getElementById('loginBtn').onclick = () => {
    const name = document.getElementById('loginName').value.trim() || 'Staff';
    state.user = { name, email: name.toLowerCase().replace(/\s+/g,'.') + '@manikreserve.com', role: selectedRole };
    state.loggedIn = true;
    mountApp();
  };
}

function mountApp() {
  document.getElementById('app').innerHTML = `
    <header style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; padding:12px 20px; background:#ffffff; border-bottom:1px solid #e2e8f0; position:sticky; top:0; z-index:100;">
      <div style="display:flex; align-items:center; gap:20px;">
        <div style="display:flex; align-items:center; gap:6px;"><span style="color:#d97706; font-size:18px;">◇</span>
          <div style="font-size:15px; color:#0f172a;"><strong>Manik Reserve</strong></div>
        </div>
        <nav style="display:flex; gap:6px; overflow-x:auto;">
          <button class="nav-item active" data-view="dashboard" style="background:none; border:none; color:#0f172a; padding:6px 12px; cursor:pointer; font-size:13px; font-weight:600; border-radius:4px;">Dashboard</button>
          <button class="nav-item" data-view="appointments" style="background:none; border:none; color:#64748b; padding:6px 12px; cursor:pointer; font-size:13px; border-radius:4px;">Appointments</button>
          <button class="nav-item" data-view="guest-schedule" style="background:none; border:none; color:#64748b; padding:6px 12px; cursor:pointer; font-size:13px; border-radius:4px;">Guest Schedule</button>
          <button class="nav-item" data-view="reports" style="background:none; border:none; color:#64748b; padding:6px 12px; cursor:pointer; font-size:13px; border-radius:4px;">Reports</button>
          <button class="nav-item" data-view="audit" style="background:none; border:none; color:#64748b; padding:6px 12px; cursor:pointer; font-size:13px; border-radius:4px;">Audit</button>
        </nav>
      </div>
      <div style="display:flex; align-items:center; gap:12px; margin-top:6px;">
        <button id="btnInHouseList" style="display:inline-flex; align-items:center; gap:6px; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; color: #0f172a; border-radius: 6px; cursor: pointer; font-size:12px;">
          <span>🏨 In-House</span>
        </button>
        <div id="currentDateDisplay" style="font-size:12px; color:#475569; background:#f1f5f9; padding:4px 10px; border-radius:4px;"></div>
        <div style="position:relative;">
          <button id="userMenuBtn" style="background:none; border:none; display:flex; align-items:center; gap:6px; cursor:pointer;">
            <span id="userAvatar" style="width:28px;height:28px;background:#d97706;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;"></span>
          </button>
          <div id="userDropdown" class="hidden" style="position:absolute; right:0; top:36px; width:180px; background:#fff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.1); padding:6px 0; z-index:100;">
            <div style="padding:8px 12px; border-bottom:1px solid #e2e8f0;"><strong id="ddName" style="display:block;font-size:12px;color:#0f172a;"></strong><span id="ddEmail" style="font-size:10px;color:#64748b;"></span></div>
            <button data-action="admin" style="width:100%;text-align:left;background:none;border:none;padding:8px 12px;color:#0f172a;font-size:12px;cursor:pointer;">Outlet Settings</button>
            <button data-action="audit" style="width:100%;text-align:left;background:none;border:none;padding:8px 12px;color:#0f172a;font-size:12px;cursor:pointer;">Audit Logs</button>
            <hr style="border:0;border-top:1px solid #e2e8f0;margin:4px 0;" /><button data-action="logout" style="width:100%;text-align:left;background:none;border:none;padding:8px 12px;color:#ef4444;font-size:12px;cursor:pointer;">Sign out</button>
          </div>
        </div>
      </div>
    </header>
    <main id="mainContent" style="padding:20px; max-width:1280px; margin:0 auto; background:#f8fafc; min-height:calc(100vh - 61px);"></main>
    <div id="modalRoot" class="hidden" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:999;padding:16px;"></div>`;

  const u = state.user;
  const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('ddName').textContent = u.name;
  document.getElementById('ddEmail').textContent = u.email;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => { 
      state.view = btn.dataset.view; 
      render(); 
    };
  });
  document.getElementById('userMenuBtn').onclick = e => {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('hidden');
  };
  document.addEventListener('click', () => document.getElementById('userDropdown')?.classList.add('hidden'));
  
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btnInHouseList')) {
      openInHouseModal();
    }
  });

  document.getElementById('userDropdown').onclick = e => {
    const a = e.target.dataset.action;
    if (a === 'admin') { state.view = 'admin'; render(); }
    if (a === 'audit') { state.view = 'audit'; render(); }
    if (a === 'logout') { state.loggedIn = false; state.user = null; renderLogin(); }
  };
  render();
}

function render() {
  if (!state.loggedIn) { renderLogin(); return; }
  document.getElementById('currentDateDisplay').textContent = formatDate(state.selectedDate);
  document.querySelectorAll('.nav-item').forEach(btn => {
    const isActive = btn.dataset.view === state.view;
    btn.classList.toggle('active', isActive);
    btn.style.color = isActive ? '#0f172a' : '#64748b';
    btn.style.fontWeight = isActive ? '600' : '400';
    btn.style.background = isActive ? '#f1f5f9' : 'transparent';
  });
  const main = document.getElementById('mainContent');
  const map = {
    dashboard: renderDashboard, appointments: renderAppointments,
    'guest-schedule': renderGuestSchedule, reports: renderReports,
    admin: renderAdmin, audit: renderAudit
  };
  main.innerHTML = (map[state.view] || renderDashboard)();
  bindViewEvents();
}

function renderDashboard() {
  const cards = state.outlets.filter(o => o.active).map(o => {
    const covers = getCovers(o.id, state.selectedDate);
    const apptCount = getAppointmentsFor(o.id, state.selectedDate).length;
    const period = o.operatingPeriods[o.operatingPeriods.length - 1];
    const fc = forecastDemand(o.name, covers, period.maxPax);
    return `<div class="outlet-card" data-outlet="${o.id}" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:16px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:40px; height:40px; background:#f8fafc; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:600; color:#d97706; border:1px solid #e2e8f0;">${o.icon}</div>
        <div><h3 style="font-size:15px; margin:0 0 4px 0; color:#0f172a;">${o.name}</h3>
          <div style="font-size:12px; color:#64748b;">👥 ${covers} pax · ${apptCount} booking${apptCount !== 1 ? 's' : ''}<br>🕐 ${period.name}: ${period.start} – ${period.end}</div>
        </div>
      </div>
      <div style="text-align:right;"><div style="font-size:18px; font-weight:700; color:#d97706;">${covers}</div><div style="font-size:10px; text-transform:uppercase; color:#64748b;">${fc.level}</div></div>
    </div>`;
  }).join('');

  const insights = state.outlets.filter(o => o.active).map(o => {
    const covers = getCovers(o.id, state.selectedDate);
    const max = o.operatingPeriods[o.operatingPeriods.length - 1].maxPax;
    return { o, ...forecastDemand(o.name, covers, max) };
  }).sort((a, b) => b.fill - a.fill);

  const top = insights[0];
  let bannerHtml = '';
  if (top) {
    bannerHtml = `<div style="background:rgba(217,119,6,0.1); border:1px solid #d97706; padding:12px 16px; border-radius:8px; margin-bottom:16px; display:flex; gap:12px; align-items:center;">
      <div style="background:#d97706; color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;">AI</div>
      <div style="font-size:13px; color:#0f172a;"><strong>Demand insight</strong><br>${top.message}</div></div>`;
  }

  return `<div style="display:flex; flex-direction:column; gap:16px;">
    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
      <div><h1 style="font-size:20px; font-weight:500; margin:0; color:#0f172a;">Matrix for ${formatDate(state.selectedDate)}</h1>
      <p style="font-size:13px; color:#64748b; margin:2px 0 0 0;">All outlets · click any outlet to open booking board</p></div>
      <button class="btn btn-primary" id="btnNewAppt" style="background:#d97706; color:#fff; border:none; padding:8px 14px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">+ New Appointment</button>
    </div>
    ${bannerHtml}
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
      <div style="display:flex; flex-direction:column; gap:12px;">${cards}</div>
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <h3 style="font-size:14px; margin-bottom:12px; color:#0f172a;">Calendar</h3>
        ${renderCalendar()}
      </div>
    </div></div>`;
}

function renderCalendar() {
  const year = state.calendarYear, month = state.calendarMonth;
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  let days = '';
  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) days += `<div style="color:#cbd5e1; text-align:center; padding:8px; font-size:12px;">${prevDays - i}</div>`;
  
  const todayIso = '2026-10-25';
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = iso === state.selectedDate;
    const isToday = iso === todayIso;
    
    let style = 'text-align:center; padding:8px; font-size:12px; cursor:pointer; border-radius:6px;';
    if (isSelected) style += 'background:#d97706; color:#fff; font-weight:600;';
    else if (isToday) style += 'border:1px solid #d97706; color:#d97706; font-weight:600;';
    else style += 'color:#0f172a;';
    
    days += `<div data-date="${iso}" style="${style}">${day}</div>`;
  }
  return `<div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:13px; font-weight:600; color:#0f172a;">
      <span>${monthName}</span>
      <div><button data-cal="prev" style="background:none; border:1px solid #cbd5e1; color:#0f172a; cursor:pointer; padding:2px 8px; border-radius:4px;">‹</button><button data-cal="next" style="background:none; border:1px solid #cbd5e1; color:#0f172a; cursor:pointer; padding:2px 8px; border-radius:4px; margin-left:4px;">›</button></div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:2px; text-align:center; font-size:11px; color:#64748b; margin-bottom:4px;">
      <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:2px;">${days}</div>
  </div>`;
}

function renderAppointments() {
  const outlet = getOutlet(state.selectedOutletId);
  if (!outlet) return '<p>Select an outlet</p>';
  const period = outlet.operatingPeriods[outlet.operatingPeriods.length - 1];
  
  const slots = period.slots ? period.slots.map(s => s.time) : generateTimeSlots(period.start, period.end, 30);
  const maxPax = period.maxPax;
  const defaultPerSlot = Math.ceil(maxPax / Math.max(slots.length - 2, 1));
  const totalCovers = getCovers(outlet.id, state.selectedDate);
  const fc = forecastDemand(outlet.name, totalCovers, maxPax);

  const sideItems = state.outlets.filter(o => o.active).map(o =>
    `<button class="outlet-side-item ${o.id === state.selectedOutletId ? 'active' : ''}" data-outlet="${o.id}" style="width:100%; text-align:left; background:${o.id === state.selectedOutletId ? '#d97706' : 'transparent'}; color:${o.id === state.selectedOutletId ? '#fff' : '#0f172a'}; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:13px; margin-bottom:4px; font-weight:${o.id === state.selectedOutletId ? '600' : '400'};">
      ${o.name}</button>`).join('');

  const rows = slots.map(time => {
    const slotConfig = period.slots?.find(s => s.time === time);
    const perSlot = slotConfig ? slotConfig.maxPax : defaultPerSlot;
    const slotAppts = getAppointmentsFor(outlet.id, state.selectedDate).filter(a => a.time === time);
    const used = slotAppts.reduce((s, a) => s + a.pax, 0);

    const cards = slotAppts.map(a => {
      const primaryName = a.customGuests && a.customGuests.length ? a.customGuests[0].name : (a.guestIds[0] ? (() => { const g = getGuestById(a.guestIds[0]); return g ? g.title + ' ' + g.lastName : 'Guest'; })() : 'Guest');
      const totalGuestsCount = (a.customGuests?.length || 0) + (a.guestIds?.length || 0);
      const more = totalGuestsCount > 1 ? '+' + (totalGuestsCount - 1) : '';
      const allergies = detectAllergies(a.comments);
      return `<div class="guest-card" data-appt="${a.id}" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; cursor:pointer; margin-bottom:6px;">
        <div style="font-size:11px; color:#d97706; font-weight:600;">Room ${a.room || 'Ext'}${a.mealPlan ? ' · ' + a.mealPlan : ''}</div>
        <div style="font-size:13px; font-weight:600; color:#0f172a;">${primaryName}</div>
        <div style="font-size:11px; color:#64748b; display:flex; justify-content:space-between; margin-top:2px;">
          <span>👥 ${a.pax} Pax</span>${more ? '<span style="color:#d97706">' + more + '</span>' : ''}
        </div>
      </div>`;
    }).join('');

    return `<div style="display:flex; flex-direction:column; sm:flex-row; border-bottom:1px solid #e2e8f0; padding:10px 0; gap:8px;">
      <div style="min-width:110px; font-size:13px;"><strong style="color:#0f172a;">${formatTime(time)}</strong><br><span style="font-size:11px; color:#64748b;">${used} / ${perSlot} pax</span></div>
      <div style="flex:1; display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px;">${cards || '<span style="color:#94a3b8; font-size:12px; font-style:italic;">No bookings</span>'}</div>
    </div>`;
  }).join('');

  return `<div style="display:flex; flex-direction:column; gap:16px;">
    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
      <div><h1 style="font-size:20px; font-weight:500; margin:0; color:#0f172a;">Appointments</h1><p style="font-size:13px; color:#64748b; margin:2px 0 0 0;">${formatDate(state.selectedDate)}</p></div>
      <button class="btn btn-primary" id="btnNewAppt" style="background:#d97706; color:#fff; border:none; padding:8px 14px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">+ New Appointment</button>
    </div>
    <div style="display:grid; grid-template-columns:220px 1fr; gap:16px; align-items:start;">
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <h4 style="font-size:12px; color:#64748b; margin-bottom:8px; text-transform:uppercase;">Outlets</h4>
        ${sideItems}
      </div>
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
          <div><h2 style="font-size:16px; margin:0; color:#0f172a;">${outlet.name}</h2><span style="font-size:12px; color:#64748b;">Covers: ${totalCovers} / ${maxPax}</span></div>
          <button class="btn btn-secondary" id="btnResvReport" style="background:#f8fafc; border:1px solid #cbd5e1; color:#0f172a; padding:6px 10px; border-radius:6px; font-size:12px; cursor:pointer;">Resv. Report</button>
        </div>
        <div>${rows}</div>
      </div>
    </div></div>`;
}

function renderGuestSchedule() {
  return `<div style="max-width:560px; margin:24px auto; padding:0 12px;">
    <h1 style="font-size:20px; font-weight:500; margin-bottom:4px; color:#0f172a;">Guest Schedule</h1>
    <p style="font-size:13px; color:#64748b; margin-bottom:20px;">Full-stay itinerary across all outlets</p>
    <div style="position:relative; margin-bottom:16px;">
      <label style="display:block; margin-bottom:6px; font-size:13px; color:#334155;">Search by Room / Confirmation Number</label>
      <input type="text" id="guestScheduleSearch" placeholder="e.g. 222 or SSK-77102" autocomplete="off" style="width:100%; padding:10px; border-radius:6px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a;" />
      <div id="gsSearchResults" class="hidden" style="position:absolute; top:100%; left:0; right:0; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px; z-index:50; max-height:200px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.05);"></div>
    </div>
    <div id="guestScheduleResult" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:24px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size:32px; margin-bottom:8px;">🗓</div>
      <h3 style="font-size:15px; margin-bottom:4px; color:#0f172a;">No guest selected</h3>
      <p style="font-size:13px; color:#64748b;">Search a room or confirmation to see their itinerary.</p>
    </div></div>`;
}

function renderReports() {
  const outlet = getOutlet(state.selectedOutletId) || state.outlets.find(o => o.id === 'bottega');
  const appts = getAppointmentsFor(outlet.id, state.selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const summary = daySummary(outlet.name, appts, getReservation);
  return `<div style="display:flex; flex-direction:column; gap:16px;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div><h1 style="font-size:20px; font-weight:500; margin:0; color:#0f172a;">${outlet.name} Report</h1><p style="font-size:13px; color:#64748b; margin:2px 0 0 0;">Reservations for ${formatDate(state.selectedDate)}</p></div>
      <button class="btn btn-secondary" id="btnPrintReport" style="background:#ffffff; border:1px solid #cbd5e1; color:#0f172a; padding:6px 12px; border-radius:6px; font-size:13px; cursor:pointer;">Print Report</button>
    </div>
    <div style="background:rgba(217,119,6,0.1); border:1px solid #d97706; padding:12px 16px; border-radius:8px; font-size:13px; color:#0f172a;">${summary}</div>
  </div>`;
}

function renderAdmin() {
  if (!canAdmin()) return '<div style="text-align:center; padding:40px;"><h3 style="color:#0f172a;">Access restricted</h3></div>';
  const cards = state.outlets.map(o => `
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <h3 style="font-size:15px; margin:0; color:#0f172a;">${o.name}</h3>
      <span style="font-size:11px; color:#d97706; text-transform:uppercase; font-weight:600;">${o.type}</span>
      <div style="font-size:12px; color:#64748b;">${o.operatingPeriods.map(p => `${p.name}: ${p.start} – ${p.end} (max ${p.maxPax})`).join('<br>')}</div>
    </div>`).join('');
  return `<div style="display:flex; flex-direction:column; gap:16px;">
    <h1 style="font-size:20px; font-weight:500; margin:0; color:#0f172a;">Outlet Settings</h1>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px;">${cards}</div>
  </div>`;
}

function renderAudit() {
  const items = state.auditLog.map(a => `
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div><span style="font-weight:600; color:#d97706; font-size:13px;">${a.action}</span><div style="font-size:12px; color:#0f172a;">${a.detail}</div></div>
      <div style="text-align:right; font-size:11px; color:#64748b;">${a.time}<br>${a.user}</div>
    </div>`).join('');
  return `<div style="max-width:700px; margin:0 auto;"><h1 style="font-size:20px; font-weight:500; margin-bottom:16px; color:#0f172a;">Audit Logs</h1>${items}</div>`;
}

function openInHouseModal() {
  let modal = document.getElementById('inHouseModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'inHouseModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999; padding:16px;';
    document.body.appendChild(modal);
  }

  const inHouseList = Array.isArray(state.inHouseGuests) ? state.inHouseGuests : [];
  const inHouseCount = inHouseList.length;

  const inHouseRows = inHouseList.map(g => {
    const guestNames = g.guests ? g.guests.map(x => (x.title ? x.title + ' ' : '') + x.lastName).join(' / ') : (g.name || '');
    return '<tr style="border-bottom:1px solid #e2e8f0;">' +
      '<td style="padding:10px; font-weight:600; color:#d97706;">Villa ' + g.room + '</td>' +
      '<td style="padding:10px; color:#0f172a;">' + guestNames + '</td>' +
      '<td style="padding:10px; color:#64748b;">' + (g.departure || '—') + '</td>' +
      '<td style="padding:10px;"><span style="background:rgba(217,119,6,0.1); color:#d97706; padding:2px 6px; border-radius:4px; font-size:11px;">' + (g.mealPlan || 'HB') + '</span></td>' +
      '<td style="padding:10px; color:#db2777;">' + (g.gem || '—') + '</td>' +
    '</tr>';
  }).join('');

  modal.innerHTML = `
    <div style="background:#ffffff; border:1px solid #cbd5e1; width:100%; max-width:850px; max-height:85vh; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
      <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
        <div><h2 style="margin:0; font-size:16px; font-weight:600; color:#0f172a;">🏨 Resort Operations Directory</h2></div>
        <div style="display:flex; gap:10px; align-items:center;">
          <label style="cursor:pointer; padding:6px 12px; font-size:12px; background:#d97706; color:#fff; border-radius:6px; font-weight:600;">Upload CSV/JSON
            <input type="file" id="dailyListUpload" accept=".json,.csv" style="display:none;" />
          </label>
          <button id="closeInHouseModal" style="background:transparent; border:none; color:#0f172a; font-size:22px; cursor:pointer;">&times;</button>
        </div>
      </div>
      <div style="padding:16px 20px; overflow-y:auto; flex:1;">
        ${inHouseCount === 0 ? '<div style="text-align:center; padding:30px; color:#64748b;">No in-house guest manifest uploaded yet.</div>' : '<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><thead><tr style="border-bottom:2px solid #cbd5e1; text-align:left; color:#64748b;"><th style="padding:8px;">Villa</th><th style="padding:8px;">Guests</th><th style="padding:8px;">Departure</th><th style="padding:8px;">Meal Plan</th><th style="padding:8px;">GEM</th></tr></thead><tbody>' + inHouseRows + '</tbody></table>'}
      </div>
    </div>
  `;

  document.getElementById('closeInHouseModal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  document.getElementById('dailyListUpload').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let data = file.name.endsWith('.csv') ? parseCSV(text).map(row => ({
          room: row.room || row.villa || '',
          guests: [{ title: row.title || 'Mr', firstName: '', lastName: row.guestname || row.name || '', nationality: row.nationality || 'GB' }],
          departure: row.departure || '2026-10-30',
          mealPlan: row.mealplan || 'HB',
          gem: row.gem || 'Aisha'
        })) : JSON.parse(text);

        state.inHouseGuests = Array.isArray(data) ? data : [data];
        state.inHouseUpdated = new Date().toLocaleString();
        localStorage.setItem('manik_inhouse_guests', JSON.stringify(state.inHouseGuests));
        openInHouseModal();
      } catch (err) { alert('Invalid file format.'); }
    };
    reader.readAsText(file);
  };
}

function bindViewEvents() {
  document.querySelectorAll('.outlet-card').forEach(card => {
    card.onclick = () => { state.selectedOutletId = card.dataset.outlet; state.view = 'appointments'; render(); };
  });
  document.querySelectorAll('[data-date]').forEach(day => {
    day.onclick = () => { 
      state.selectedDate = day.dataset.date;
      const [y, m] = day.dataset.date.split('-').map(Number);
      state.calendarYear = y; state.calendarMonth = m - 1;
      render(); 
    };
  });
  document.querySelectorAll('.outlet-side-item').forEach(btn => {
    btn.onclick = () => { state.selectedOutletId = btn.dataset.outlet; render(); };
  });
  document.getElementById('btnNewAppt')?.addEventListener('click', () => toast('New Appointment feature'));
  document.getElementById('btnResvReport')?.addEventListener('click', () => { state.view = 'reports'; render(); });
}

renderLogin();
