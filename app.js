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

const state = {
  loggedIn: false,
  user: null,
  view: 'dashboard',
  selectedDate: '2026-10-25',
  calendarYear: 2026,
  calendarMonth: 9, // 0-indexed (9 = October)
  selectedOutletId: 'bottega',
  appointments: JSON.parse(JSON.stringify(sampleAppointments)),
  outlets: JSON.parse(JSON.stringify(seedOutlets)),
  auditLog: [
    { time: '2026-10-25 09:12', user: 'Aisha Hassan', action: 'Created appointment', detail: 'Room 222 → Bottega 18:30' },
    { time: '2026-10-25 09:45', user: 'Rashid Ali', action: 'Created appointment', detail: 'Room 118 → Bottega 18:30' },
    { time: '2026-10-25 10:02', user: 'Aisha Hassan', action: 'Updated notes', detail: 'Room 125 allergy note' },
  ]
};

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatShortDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h \% 12 \vert{}\vert{} 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; } function getOutlet(id) { return state.outlets.find(o => o.id === id); } function getAppointmentsFor(outletId, date) { return state.appointments.filter(a => a.outletId === outletId && a.date === date); } function getCovers(outletId, date) { return getAppointmentsFor(outletId, date).reduce((s, a) => s + a.pax, 0); } function toast(msg) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); } function logAudit(action, detail) { const now = new Date(); const time = `${state.selectedDate} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  state.auditLog.unshift({ time, user: state.user?.name || 'System', action, detail });
}
function canAdmin() { return state.user?.role === 'admin' || state.user?.role === 'gem'; }

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="logo" style="justify-content:center;margin-bottom:28px">
          <span class="logo-mark">◇</span>
          <div class="logo-text"><strong>Manik Reserve</strong></div>
        </div>
        <h1 style="font-family:var(--serif);font-size:24px;font-weight:400;text-align:center;margin-bottom:6px">Welcome back</h1>
        <p style="text-align:center;color:var(--ink-400);font-size:13px;margin-bottom:28px">Sign in to manage dining & experiences</p>
        <div class="form-group"><label>Your name</label><input type="text" id="loginName" value="Aisha Hassan" /></div>
        <div class="form-group"><label>Role</label>
          <div class="role-select" id="roleSelect">
            <div class="role-option selected" data-role="gem"><span class="role-icon">◇</span>GEM</div>
            <div class="role-option" data-role="fnb"><span class="role-icon">🍽</span>F&B</div>
            <div class="role-option" data-role="admin"><span class="role-icon">⚙</span>Admin</div>
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px" id="loginBtn">Sign in</button>
        <p style="text-align:center;margin-top:16px;font-size:12px;color:var(--ink-400)">Mock login · no password required</p>
      </div>
    </div>`;
  let selectedRole = 'gem';
  document.querySelectorAll('.role-option').forEach(opt => {
    opt.onclick = () => {
      document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
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
    <header class="topbar">
      <div class="topbar-left">
        <div class="logo"><span class="logo-mark">◇</span>
          <div class="logo-text"><strong>Manik Reserve</strong></div>
        </div>
        <nav class="main-nav">
          <button class="nav-item active" data-view="dashboard">Dashboard</button>
          <button class="nav-item" data-view="appointments">Appointments</button>
          <button class="nav-item" data-view="guest-schedule">Guest Schedule</button>
          <button class="nav-item" data-view="reports">Reports</button>
          <button class="nav-item" data-view="audit">Audit</button>
        </nav>
      </div>
      <div class="topbar-right">
        <div class="date-pill" id="currentDateDisplay"></div>
        <div class="user-menu">
          <button class="user-btn" id="userMenuBtn">
            <span class="avatar" id="userAvatar"></span>
            <span class="user-name" id="userName"></span>
            <span class="role-badge" id="userRole"></span>
          </button>
          <div class="dropdown hidden" id="userDropdown">
            <div class="dropdown-header"><strong id="ddName"></strong><span id="ddEmail"></span></div>
            <button data-action="admin">Outlet Settings</button>
            <button data-action="audit">Audit Logs</button>
            <hr /><button data-action="logout">Sign out</button>
          </div>
        </div>
      </div>
    </header>
    <main id="mainContent"></main>
    <div id="modalRoot" class="modal-root hidden"></div>`;

  const u = state.user;
  const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = u.name;
  document.getElementById('userRole').textContent = u.role.toUpperCase();
  document.getElementById('ddName').textContent = u.name;
  document.getElementById('ddEmail').textContent = u.email;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => { state.view = btn.dataset.view; render(); };
  });
  document.getElementById('userMenuBtn').onclick = e => {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('hidden');
  };
  document.addEventListener('click', () => document.getElementById('userDropdown')?.classList.add('hidden'));
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
    btn.classList.toggle('active', btn.dataset.view === state.view);
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
    return `<div class="outlet-card" data-outlet="${o.id}">
      <div class="outlet-icon ${o.iconClass}">${o.icon}</div>
      <div class="outlet-info"><h3>${o.name}</h3>
        <div class="outlet-meta"><span>👥 ${covers} pax · ${apptCount} booking${apptCount !== 1 ? 's' : ''}</span>
        <span>🕐 ${period.name}: ${period.start} –${period.end}</span></div>
      </div>
      <div class="outlet-stats"><div class="covers-num">${covers}</div><div class="covers-label">${fc.level}</div></div>
    </div>`;
  }).join('');
  const insights = state.outlets.filter(o => o.active).map(o => {
    const covers = getCovers(o.id, state.selectedDate);
    const max = o.operatingPeriods[o.operatingPeriods.length - 1].maxPax;
    return { o, ...forecastDemand(o.name, covers, max) };
  }).sort((a, b) => b.fill - a.fill);
  const top = insights[0];
  return `<div class="view-header"><div>
    <h1>Matrix for ${formatDate(state.selectedDate)}</h1>
    <p>All outlets · click any outlet to open the booking board</p></div>
    <div class="header-actions"><button class="btn btn-secondary" id="btnNewAppt">+ New Appointment</button></div></div>
    ${top ? `<div class="ai-banner ${top.level}"><div class="ai-icon">AI</div><div><strong>Demand insight</strong><br>${top.message}</div></div>` : ''}
    <div class="outlet-grid"><div class="outlet-list">${cards}</div>
    <div class="side-panel"><h3>Calendar</h3>${renderCalendar()}</div></div>`;
}

function renderCalendar() {
  const year = state.calendarYear, month = state.calendarMonth;
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  let days = '';
  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) days += `<div class="cal-day other">${prevDays - i}</div>`; for (let day = 1; day <= daysInMonth; day++) { const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days += `<div class="cal-day ${iso === state.selectedDate ? 'selected' : ''}" data-date="${iso}">${day}</div>`;
  }
  return `<div class="calendar"><div class="cal-header"><span>${monthName}</span>
    <div class="cal-nav"><button data-cal="prev">‹</button><button data-cal="next">›</button></div></div>
    <div class="cal-grid">
      <div class="cal-day-name">S</div><div class="cal-day-name">M</div><div class="cal-day-name">T</div>
      <div class="cal-day-name">W</div><div class="cal-day-name">T</div><div class="cal-day-name">F</div>
      <div class="cal-day-name">S</div>${days}</div></div>`;
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
    `<button class="outlet-side-item ${o.id === state.selectedOutletId ? 'active' : ''}" data-outlet="${o.id}">
      <span class="outlet-side-dot"></span>${o.short}</button>`).join('');  const rows = slots.map(time => { const slotConfig = period.slots?.find(s => s.time === time); const perSlot = slotConfig ? slotConfig.maxPax : defaultPerSlot;  const slotAppts = getAppointmentsFor(outlet.id, state.selectedDate).filter(a => a.time === time); const used = slotAppts.reduce((s, a) => s + a.pax, 0); const cards = slotAppts.map(a => { const primary = a.guestIds[0] ? getGuestById(a.guestIds[0]) : null; const name = primary ? `${primary.title} ${primary.lastName}` : 'Guest'; const more = a.guestIds.length > 1 ? `+${a.guestIds.length - 1}` : '';
      const allergies = detectAllergies(a.comments);
      return `<div class="guest-card ${allergies.length ? 'has-allergy' : ''}" data-appt="${a.id}">
        <div class="gc-room">${a.table ? 'T' + a.table + ' · ' : ''}${a.room}</div>
        <div class="gc-name">${name}</div>
        <div class="gc-meta"><span>${appointmentTypes.find(t => t.id === a.type)?.name \vert{}\vert{} a.type}</span>${more ? `<span>${more}</span>` : ''}</div>
        ${allergies.length ? `<div class="allergy-tags">${allergies.map(x => `<span class="allergy-tag">${x}</span>`).join('')}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="time-row"><div class="time-label">
      <span class="time">${formatTime(time)}</span>
      <span class="cap ${used >= perSlot ? 'full' : ''}">${used} /${perSlot}</span></div>
      <div class="slot-cards">${cards}</div></div>`;
  }).join('');

  return `<div class="view-header"><div><h1>Appointments</h1><p>${formatDate(state.selectedDate)}</p></div>
    <div class="header-actions">
      <button class="btn btn-secondary" id="btnChangeDate">Change Date</button>
      <button class="btn btn-primary" id="btnNewAppt">+ New Appointment</button></div></div>
    <div class="ai-banner ${fc.level}"><div class="ai-icon">AI</div><div>${fc.message}</div></div>
    <div class="appt-layout"><div class="outlet-sidebar">${sideItems}</div>
    <div class="appt-board"><div class="board-header">
      <div class="board-header-left">
        <div class="board-outlet-icon outlet-icon ${outlet.iconClass}">${outlet.icon}</div>
        <div><h2>${outlet.name}</h2>
        <div class="covers-line">Current Covers: ${totalCovers} / ${maxPax} ·${period.name}: ${period.start} –${period.end}</div></div>
      </div>
      <div class="board-actions" style="position:relative;">
        <button class="btn btn-ghost" id="btnResvReport">Resv. Report</button>
        <button class="btn btn-secondary" id="actionMenuBtn" style="padding: 8px 12px; margin-left: 8px;" title="Actions">📖</button>
        <div class="dropdown hidden" id="actionMenuDropdown" style="position:absolute; right:0; top:42px; width:240px; z-index:100; background:var(--surface,#1e293b); border:1px solid var(--sand-200,#334155); border-radius:10px; box-shadow:0 10px 25px rgba(0,0,0,0.3); padding:6px 0;">
          <div class="action-dropdown-item" data-action="new-appt" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>New Appointment</span><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px;">N</span></div>
          <div class="action-dropdown-item" data-action="change-date" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Change Date</span><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px;">D</span></div>
          <div class="action-dropdown-item" data-action="switch-outlet" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Switch Outlet</span><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px;">X</span></div>
          <div style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
          <div class="action-dropdown-item" data-action="resv-report" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Resv
