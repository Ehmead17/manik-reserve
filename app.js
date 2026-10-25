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
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
    'UNITED KINGDOM': 'GB',
    'BRITISH': 'GB',
    'RUSSIA': 'RU',
    'RUSSIAN': 'RU',
    'MALDIVES': 'MV',
    'MALDIVIAN': 'MV',
    'GERMANY': 'DE',
    'GERMAN': 'DE',
    'FRANCE': 'FR',
    'FRENCH': 'FR',
    'UNITED STATES': 'US',
    'USA': 'US',
    'AUSTRALIA': 'AU',
    'CHINA': 'CN',
    'INDIA': 'IN'
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
        <span>🕐 ${period.name}: ${period.start} – ${period.end}</span></div>
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
  let bannerHtml = '';
  if (top) {
    bannerHtml = `<div class="ai-banner ${top.level}"><div class="ai-icon">AI</div><div><strong>Demand insight</strong><br>${top.message}</div></div>`;
  }

  return `<div class="view-header"><div>
    <h1>Matrix for ${formatDate(state.selectedDate)}</h1>
    <p>All outlets · click any outlet to open the booking board</p></div>
    <div class="header-actions"><button class="btn btn-secondary" id="btnNewAppt">+ New Appointment</button></div></div>
    ${bannerHtml}
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
  for (let i = startDay - 1; i >= 0; i--) days += `<div class="cal-day other">${prevDays - i}</div>`;
  
  const todayIso = '2026-10-25';
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = iso === state.selectedDate;
    const isToday = iso === todayIso;
    
    let extraStyle = '';
    if (isToday && !isSelected) {
      extraStyle = 'border: 2px solid var(--accent, #38bdf8); border-radius: 50%;';
    } else if (isToday && isSelected) {
      extraStyle = 'box-shadow: inset 0 0 0 2px #fff;';
    }
    
    days += `<div class="cal-day ${isSelected ? 'selected' : ''}" data-date="${iso}" style="${extraStyle}">${day}</div>`;
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
      <span class="outlet-side-dot"></span>${o.short}</button>`).join('');

  const rows = slots.map(time => {
    const slotConfig = period.slots?.find(s => s.time === time);
    const perSlot = slotConfig ? slotConfig.maxPax : defaultPerSlot;

    const slotAppts = getAppointmentsFor(outlet.id, state.selectedDate).filter(a => a.time === time);
    const used = slotAppts.reduce((s, a) => s + a.pax, 0);
    const cards = slotAppts.map(a => {
      const primaryName = a.customGuests && a.customGuests.length ? a.customGuests[0].name : (a.guestIds[0] ? (() => { const g = getGuestById(a.guestIds[0]); return g ? `${g.title} ${g.lastName}` : 'Guest'; })() : 'Guest');
      const totalGuestsCount = (a.customGuests?.length || 0) + (a.guestIds?.length || 0);
      const more = totalGuestsCount > 1 ? `+${totalGuestsCount - 1}` : '';
      const allergies = detectAllergies(a.comments);
      
      let allergyTagsHtml = '';
      if (allergies.length) {
        allergyTagsHtml = `<div class="allergy-tags">${allergies.map(x => `<span class="allergy-tag">${x}</span>`).join('')}</div>`;
      }

      return `<div class="guest-card ${allergies.length ? 'has-allergy' : ''}" data-appt="${a.id}">
        <div class="gc-room">${a.room || 'Ext'}${a.mealPlan ? ' · ' + a.mealPlan : ''}</div>
        <div class="gc-name">${primaryName}</div>
        <div class="gc-meta">
          <span>${appointmentTypes.find(t => t.id === a.type)?.name || a.type}</span>
          <span style="color:var(--accent,#38bdf8);font-weight:600;">👥 ${a.pax} Pax</span>
          ${more ? `<span>${more}</span>` : ''}
        </div>
        ${allergyTagsHtml}
      </div>`;
    }).join('');
    return `<div class="time-row"><div class="time-label">
      <span class="time">${formatTime(time)}</span>
      <span class="cap ${used >= perSlot ? 'full' : ''}">${used} / ${perSlot}</span></div>
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
        <div class="covers-line">Current Covers: ${totalCovers} / ${maxPax} · ${period.name}: ${period.start} – ${period.end}</div></div>
      </div>
      <div class="board-actions" style="position:relative;">
        <button class="btn btn-ghost" id="btnResvReport">Resv. Report</button>
        <button class="btn btn-secondary" id="actionMenuBtn" style="padding: 8px 12px; margin-left: 8px;" title="Actions">📖</button>
        <div class="dropdown hidden" id="actionMenuDropdown" style="position:absolute; right:0; top:42px; width:240px; z-index:100; background:var(--surface,#1e293b); border:1px solid var(--sand-200,#334155); border-radius:10px; box-shadow:0 10px 25px rgba(0,0,0,0.3); padding:6px 0;">
          <div class="action-dropdown-item" data-action="new-appt" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>New Appointment</span><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px;">N</span></div>
          <div class="action-dropdown-item" data-action="change-date" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Change Date</span><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px;">D</span></div>
          <div class="action-dropdown-item" data-action="switch-outlet" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Switch Outlet</span><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px;">X</span></div>
          <div style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
          <div class="action-dropdown-item" data-action="resv-report" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Resv. Report</span><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px;">R</span></div>
          <div class="action-dropdown-item" data-action="refresh-guests" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Refresh Guests</span></div>
          <div class="action-dropdown-item" data-action="update-slots" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Update Slots Capacity</span></div>
          <div class="action-dropdown-item" data-action="update-dates" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; cursor:pointer; font-size:13.5px; color:#f8fafc;"><span>Update Operating Dates</span></div>
        </div>
      </div>
    </div><div class="time-grid">${rows}</div></div></div>`;
}

function renderGuestSchedule() {
  return `<div class="view-header"><div><h1>Guest Schedule</h1><p>Full-stay itinerary across all outlets</p></div></div>
    <div style="max-width:520px;margin:40px auto;">
      <div class="form-group relative"><label>Search by Room / Confirmation Number</label>
        <input type="text" id="guestScheduleSearch" placeholder="e.g. 222 or SSK-77102" autocomplete="off" />
        <div id="gsSearchResults" class="search-results hidden"></div></div>
      <div id="guestScheduleResult" class="empty-state">
        <div class="empty-icon">🗓</div><h3>No guest selected</h3>
        <p>Search a room or confirmation to see their itinerary across all outlets.</p></div></div>`;
}

function renderReports() {
  const outlet = getOutlet(state.selectedOutletId) || state.outlets.find(o => o.id === 'bottega');
  const appts = getAppointmentsFor(outlet.id, state.selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const byTime = {};
  appts.forEach(a => { (byTime[a.time] ||= []).push(a); });
  let totalAdults = 0, totalChildren = 0;
  appts.forEach(a => {
    const res = getReservation(a.reservationId);
    if (res) { totalAdults += res.adults; totalChildren += res.children; }
    totalAdults += (a.customGuests?.length || 0);
  });
  const summary = daySummary(outlet.name, appts, getReservation);
  let rows = '';
  Object.keys(byTime).sort().forEach(time => {
    const group = byTime[time];
    let ga = 0, gc = 0;
    group.forEach(a => {
      const res = getReservation(a.reservationId);
      if (res) { ga += res.adults; gc += res.children; }
      ga += (a.customGuests?.length || 0);
    });
    rows += `<tr class="slot-header" style="background:#f1f5f9; color:#0f172a; font-weight:600;"><td colspan="8" style="padding:10px 16px;">${formatTime(time)} · Adults: ${ga} · Children: ${gc}</td></tr>`;
    group.forEach(a => {
      const res = getReservation(a.reservationId);
      const allergies = detectAllergies(a.comments);
      const mp = a.mealPlan || (res ? res.billing : 'HB');
      
      let allergyTagsHtml = '';
      if (allergies.length) {
        allergyTagsHtml = `<div class="allergy-tags" style="margin-top:4px">${allergies.map(x => `<span class="allergy-tag" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; display:inline-block; margin-right:4px;">${x}</span>`).join('')}</div>`;
      }

      if (res) {
        res.guests.forEach((g, idx) => {
          const natCode = getNationalityCode(g.nationality);
          rows += `<tr style="border-bottom:1px solid #e2e8f0; color:#0f172a;">
            <td style="padding:12px 16px; color:#0f172a;">${res.room}</td>
            <td style="padding:12px 16px; color:#0f172a; font-weight:500;">${g.title} ${g.firstName} ${g.lastName}</td>
            <td style="padding:12px 16px; color:#334155;">${idx === 0 ? (res.butler || '') : ''}</td>
            <td style="padding:12px 16px; color:#334155;">${idx === 0 ? natCode : ''}</td>
            <td style="padding:12px 16px; color:#334155;">${idx === 0 ? formatShortDate(res.departure) : ''}</td>
            <td style="padding:12px 16px; color:#334155;">${idx === 0 ? mp : ''}</td>
            <td style="padding:12px 16px; color:#334155;">${idx === 0 ? `${res.adults}A${res.children ? ' + ' + res.children + 'C' : ''}` : ''}</td>
            <td style="padding:12px 16px; color:#334155;">${idx === 0 ? (a.comments || '') : ''}
              ${idx === 0 ? allergyTagsHtml : ''}
            </td></tr>`;
        });
      }
      if (a.customGuests && a.customGuests.length) {
        a.customGuests.forEach((cg, idx) => {
          rows += `<tr style="border-bottom:1px solid #e2e8f0; color:#0f172a;">
            <td style="padding:12px 16px; color:#0f172a;">Ext</td>
            <td style="padding:12px 16px; color:#0f172a; font-weight:500;"><strong>${cg.name}</strong> (Custom Guest)</td>
            <td style="padding:12px 16px; color:#334155;">—</td>
            <td style="padding:12px 16px; color:#334155;">${cg.nationalityCode ? cg.nationalityCode.toUpperCase() : '—'}</td>
            <td style="padding:12px 16px; color:#334155;">—</td>
            <td style="padding:12px 16px; color:#334155;">${mp}</td>
            <td style="padding:12px 16px; color:#334155;">1A</td>
            <td style="padding:12px 16px; color:#334155;">${idx === 0 ? (a.comments || '') : ''}
              ${idx === 0 ? allergyTagsHtml : ''}
            </td></tr>`;
        });
      }
    });
  });
  return `<div class="view-header"><div>
    <h1 style="color:#0f172a;">${outlet.name}</h1>
    <p style="color:#475569;">Reservations for ${formatDate(state.selectedDate)} · Total: ${totalAdults}A + ${totalChildren}C</p></div>
    <div class="header-actions"><button class="btn btn-secondary" id="btnPrintReport">Print</button></div></div>
    <div class="ai-banner" style="background:#f8fafc; border:1px solid #cbd5e1; color:#0f172a;"><div class="ai-icon" style="background:#e2e8f0; color:#0f172a;">AI</div><div>${summary}</div></div>
    <div style="background:white; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <table class="report-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:13.5px;"><thead><tr style="background:#0f172a; color:#ffffff;">
        <th style="padding:12px 16px; color:#ffffff;">Room</th>
        <th style="padding:12px 16px; color:#ffffff;">Name</th>
        <th style="padding:12px 16px; color:#ffffff;">GEM</th>
        <th style="padding:12px 16px; color:#ffffff;">Nationality</th>
        <th style="padding:12px 16px; color:#ffffff;">Departure</th>
        <th style="padding:12px 16px; color:#ffffff;">Meal Plan</th>
        <th style="padding:12px 16px; color:#ffffff;">Pax</th>
        <th style="padding:12px 16px; color:#ffffff;">Notes</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748b">No reservations</td></tr>'}</tbody>
      </table></div>`;
}

function renderAdmin() {
  if (!canAdmin()) {
    return `<div class="empty-state"><h3>Access restricted</h3><p>Outlet settings require GEM or Admin role.</p></div>`;
  }
  const cards = state.outlets.map(o => `
    <div class="admin-outlet-card"><h3>${o.name}</h3>
      <span class="type-tag">${o.type}${o.active ? '' : ' · Inactive'}</span>
      <div class="hours">${o.operatingPeriods.map(p => `${p.name}: ${p.start} – ${p.end} (max ${p.maxPax})`).join('<br>')}</div>
      <div class="card-actions">
        <button class="btn btn-secondary" data-edit-outlet="${o.id}">Edit</button>
        <button class="btn btn-ghost" data-toggle-outlet="${o.id}">${o.active ? 'Deactivate' : 'Activate'}</button>
      </div></div>`).join('');
  return `<div class="view-header"><div><h1>Outlet Settings</h1>
    <p>Add, edit or deactivate restaurants and experiences</p></div>
    <div class="header-actions"><button class="btn btn-primary" id="btnAddOutlet">+ Add Outlet</button></div></div>
    <div class="admin-grid">${cards}</div>`;
}

function renderAudit() {
  const items = state.auditLog.map(a => `
    <div class="audit-item"><div class="audit-time">${a.time}</div>
    <div><span class="audit-action">${a.action}</span> · ${a.detail}</div>
    <div style="color:var(--ink-400);font-size:12px">${a.user}</div></div>`).join('');
  return `<div class="view-header"><div><h1>Audit Logs</h1><p>Who changed what, and when</p></div></div>
    <div class="audit-list">${items}</div>`;
}

function openSlotCapacityModal() {
  const outlet = getOutlet(state.selectedOutletId);
  const period = outlet?.operatingPeriods[outlet.operatingPeriods.length - 1] || { name: 'Dinner', start: '18:30', end: '22:30', maxPax: 40 };
  const initialSlots = period.slots ? period.slots.map(s => s.time) : generateTimeSlots(period.start, period.end, 30);
  const modalRoot = document.getElementById('modalRoot');
  modalRoot.classList.remove('hidden');
  modalRoot.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-header">
        <h2>Manage Slots Capacity</h2>
        <button class="modal-close" id="modalClose">×</button>
      </div>
      <div class="modal-body" style="max-height:75vh; overflow-y:auto;">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="capPeriodName" value="${period.name || 'Dinner'}" />
        </div>
        <div class="form-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="form-group"><label>Start at</label><input type="time" id="capStart" value="${period.start || '18:30'}" /></div>
          <div class="form-group"><label>End at</label><input type="time" id="capEnd" value="${period.end || '22:30'}" /></div>
          <div class="form-group"><label>Max Bookings / Day</label><input type="number" id="capMaxDay" value="${period.maxPax || 60}" /></div>
        </div>
        <div class="form-row" style="grid-template-columns:1fr 1fr">
          <div class="form-group"><label>Timeslots Enabled</label>
            <select id="capEnabled"><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select>
          </div>
          <div class="form-group"><label>Duration (min) | Max Pax</label>
            <div style="display:flex; gap:8px;">
              <input type="number" value="30" style="width:70px;" />
              <input type="number" id="genMaxPax" value="15" style="width:70px;" />
              <button class="btn btn-secondary" id="btnGenSlots" style="padding:6px 12px; font-size:12px;">Generate</button>
            </div>
          </div>
        </div>
        <div class="form-row" style="grid-template-columns:1fr 1fr">
          <div class="form-group"><label>Appointments Cut Off</label>
            <select><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select>
          </div>
          <div class="form-group"><label>Appointments Cut Off Prior to</label>
            <input type="number" value="1" />
            <div class="form-hint" style="font-size:11px; color:var(--ink-400); margin-top:2px;">The cut off is number of hours prior to period start time.</div>
          </div>
        </div>
        
        <div style="margin-top:20px;">
          <h3 style="font-size:14px; font-weight:600; margin-bottom:10px;">Current list of Time Slots</h3>
          <div style="border:1px solid var(--sand-200,#334155); border-radius:8px; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
              <thead>
                <tr style="border-bottom:1px solid var(--sand-200,#334155); background:rgba(255,255,255,0.02);">
                  <th style="padding:10px 14px;">Time</th>
                  <th style="padding:10px 14px;">Max Concurrent</th>
                  <th style="padding:10px 14px; text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody id="slotsTableBody">
                ${initialSlots.map(t => {
                  const existing = period.slots?.find(s => s.time === t);
                  const maxVal = existing ? existing.maxPax : Math.ceil(period.maxPax / initialSlots.length);
                  return `
                  <tr style="border-bottom:1px solid var(--sand-100,#1e293b);">
                    <td style="padding:8px 14px;"><input type="time" class="slot-time-input" value="${t}" style="background:var(--surface-dark,#0f172a); border:1px solid var(--sand-200,#334155); color:#fff; padding:4px 8px; border-radius:4px;" /></td>
                    <td style="padding:8px 14px;"><input type="number" class="slot-max-input" value="${maxVal}" style="background:var(--surface-dark,#0f172a); border:1px solid var(--sand-200,#334155); color:#fff; padding:4px 8px; border-radius:4px; width:90px;" /></td>
                    <td style="padding:8px 14px; text-align:right;"><button class="btn btn-danger btn-sm slot-delete-btn" style="padding:4px 10px; font-size:11px; background:#ef4444; color:#fff; border:none; border-radius:4px; cursor:pointer;">Delete</button></td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top:12px; text-align:center;">
            <button class="btn btn-secondary" id="btnAddTimeSlot" style="width:100%; padding:8px;">+ Add Time Slot</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modalCancel">Cancel</button>
        <button class="btn btn-primary" id="modalSave">Save</button>
      </div>
    </div>`;

  const close = () => { modalRoot.classList.add('hidden'); modalRoot.innerHTML = ''; };
  document.getElementById('modalClose').onclick = close;
  document.getElementById('modalCancel').onclick = close;
  modalRoot.onclick = e => { if (e.target === modalRoot) close(); };

  document.getElementById('btnGenSlots').onclick = () => {
    const start = document.getElementById('capStart').value;
    const end = document.getElementById('capEnd').value;
    const defaultMax = parseInt(document.getElementById('genMaxPax').value) || 15;
    const generatedTimes = generateTimeSlots(start, end, 30);
    const tbody = document.getElementById('slotsTableBody');
    tbody.innerHTML = generatedTimes.map(t => `
      <tr style="border-bottom:1px solid var(--sand-100,#1e293b);">
        <td style="padding:8px 14px;"><input type="time" class="slot-time-input" value="${t}" style="background:var(--surface-dark,#0f172a); border:1px solid var(--sand-200,#334155); color:#fff; padding:4px 8px; border-radius:4px;" /></td>
        <td style="padding:8px 14px;"><input type="number" class="slot-max-input" value="${defaultMax}" style="background:var(--surface-dark,#0f172a); border:1px solid var(--sand-200,#334155); color:#fff; padding:4px 8px; border-radius:4px; width:90px;" /></td>
        <td style="padding:8px 14px; text-align:right;"><button class="btn btn-danger btn-sm slot-delete-btn" style="padding:4px 10px; font-size:11px; background:#ef4444; color:#fff; border:none; border-radius:4px; cursor:pointer;">Delete</button></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.slot-delete-btn').forEach(btn => {
      btn.onclick = (e) => e.target.closest('tr').remove();
    });
  };

  document.getElementById('btnAddTimeSlot').onclick = () => {
    const tbody = document.getElementById('slotsTableBody');
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom:1px solid var(--sand-100,#1e293b);';
    tr.innerHTML = `
      <td style="padding:8px 14px;"><input type="time" class="slot-time-input" value="20:00" style="background:var(--surface-dark,#0f172a); border:1px solid var(--sand-200,#334155); color:#fff; padding:4px 8px; border-radius:4px;" /></td>
      <td style="padding:8px 14px;"><input type="number" class="slot-max-input" value="15" style="background:var(--surface-dark,#0f172a); border:1px solid var(--sand-200,#334155); color:#fff; padding:4px 8px; border-radius:4px; width:90px;" /></td>
      <td style="padding:8px 14px; text-align:right;"><button class="btn btn-danger btn-sm slot-delete-btn" style="padding:4px 10px; font-size:11px; background:#ef4444; color:#fff; border:none; border-radius:4px; cursor:pointer;">Delete</button></td>
    `;
    tr.querySelector('.slot-delete-btn').onclick = () => tr.remove();
    tbody.appendChild(tr);
  };

  document.querySelectorAll('.slot-delete-btn').forEach(btn => {
    btn.onclick = (e) => e.target.closest('tr').remove();
  });

  document.getElementById('modalSave').onclick = () => {
    const name = document.getElementById('capPeriodName').value.trim();
    const start = document.getElementById('capStart').value;
    const end = document.getElementById('capEnd').value;
    const maxPax = parseInt(document.getElementById('capMaxDay').value) || 40;
    
    const customSlots = [];
    document.querySelectorAll('#slotsTableBody tr').forEach(tr => {
      const tInput = tr.querySelector('.slot-time-input');
      const mInput = tr.querySelector('.slot-max-input');
      if (tInput && mInput) {
        customSlots.push({
          time: tInput.value,
          maxPax: parseInt(mInput.value) || 15
        });
      }
    });

    period.name = name;
    period.start = start;
    period.end = end;
    period.maxPax = maxPax;
    period.slots = customSlots;

    logAudit('Updated slot capacities', `${outlet.name} slots updated`);
    toast('Slots capacity updated successfully');
    close();
    render();
  };
}

function openAppointmentModal(apptId = null) {
  const isEdit = !!apptId;
  const appt = isEdit ? state.appointments.find(a => a.id === apptId) : null;
  const outlet = getOutlet(appt?.outletId || state.selectedOutletId);
  const period = outlet?.operatingPeriods[outlet.operatingPeriods.length - 1];
  const slots = period?.slots ? period.slots.map(s => s.time) : (period ? generateTimeSlots(period.start, period.end, 30) : []);
  const defaultPerSlot = period ? Math.ceil(period.maxPax / Math.max(slots.length - 2, 1)) : 8;
  
  let selectedGuests = [];
  let customGuests = appt?.customGuests ? JSON.parse(JSON.stringify(appt.customGuests)) : [];
  let selectedReservation = null;
  let currentMealPlan = appt?.mealPlan || 'HB';

  if (appt && !appt.isCustom && appt.guestIds) {
    selectedGuests = appt.guestIds.map(id => getGuestById(id)).filter(Boolean);
  }
  if (appt && appt.reservationId) {
    selectedReservation = getReservation(appt.reservationId);
    if (selectedReservation?.billing) currentMealPlan = selectedReservation.billing;
  }

  const slotCovers = {};
  slots.forEach(t => {
    slotCovers[t] = getAppointmentsFor(outlet.id, state.selectedDate)
      .filter(a => a.time === t && a.id !== apptId)
      .reduce((s, a) => s + a.pax, 0);
  });

  const modalRoot = document.getElementById('modalRoot');
  modalRoot.classList.remove('hidden');
  modalRoot.innerHTML = `
    <div class="modal" style="max-width:600px">
      <div class="modal-header"><h2>${isEdit ? 'Edit Appointment' : 'Appointment Management'}</h2>
        <button class="modal-close" id="modalClose">×</button></div>
      <div class="modal-body">
        <div class="form-group relative">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label style="margin:0;">Search Profiles or Add Custom Guest (+CB)</label>
          </div>
          <div style="display:flex; gap:8px; margin-bottom:6px;">
            <input type="text" id="profileSearch" placeholder="Room number, confirmation, or guest name…" autocomplete="off" style="flex:1;" />
            <input type="text" id="customNationality" placeholder="Nat (e.g. GB, RU)" maxlength="3" style="width:120px; text-transform:uppercase;" />
            <button type="button" class="btn btn-secondary" id="btnAddCB" style="padding:0 14px; font-size:12px; font-weight:600; background:var(--accent,#38bdf8); color:#0f172a; border:none; border-radius:6px; cursor:pointer;" title="Add Custom Booking">+CB</button>
          </div>
          <div id="profileResults" class="search-results hidden"></div>
        </div>

        <div class="form-row">
          <div class="form-group"><label>Outlet</label>
            <select id="apptOutlet">${state.outlets.filter(o => o.active).map(o =>
              `<option value="${o.id}" ${o.id === (appt?.outletId || state.selectedOutletId) ? 'selected' : ''}>${o.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Time Slot</label>
            <select id="apptTime"><option value="">Select…</option>
              ${slots.map(t => {
                const sc = period?.slots?.find(s => s.time === t);
                const maxC = sc ? sc.maxPax : defaultPerSlot;
                return `<option value="${t}" ${appt?.time === t ? 'selected' : ''}>${formatTime(t)} (${slotCovers[t] || 0}/${maxC})</option>`;
              }).join('')}
            </select></div>
          <div class="form-group"><label>Appointment</label>
            <select id="apptType">${appointmentTypes.map(t =>
              `<option value="${t.id}" ${appt?.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
        </div>

        <div class="form-row" style="grid-template-columns:1fr 2fr">
          <div class="form-group"><label>Meal Plan</label>
            <select id="apptMealPlan">
              ${mealPlans.map(mp => `<option value="${mp.id}" ${currentMealPlan === mp.id ? 'selected' : ''}>${mp.name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label>AI suggested slots</label>
            <div class="suggest-chips" id="suggestChips"><span style="color:var(--ink-400);font-size:12px">Select guests first</span></div></div>
        </div>

        <div id="conflictWarning" class="ai-banner critical hidden" style="margin-bottom:12px"></div>
        <div class="form-group">
          <label>Guests <span id="guestCountBadge" style="color:var(--accent,#38bdf8); font-weight:600;">(0 total)</span></label>
          <div id="guestChips"></div>
        </div>
        <div class="form-group"><label>Comments</label>
          <textarea id="apptComments" placeholder="Allergies, special requests…">${appt?.comments || ''}</textarea>
          <div id="allergyPreview" class="allergy-tags" style="margin-top:8px"></div></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modalCancel">Cancel</button>
        ${isEdit ? '<button class="btn btn-danger" id="modalDelete">Delete</button>' : ''}
        <button class="btn btn-primary" id="modalSave">Save</button>
      </div></div>`;

  function renderChips() {
    const el = document.getElementById('guestChips');
    const badgeEl = document.getElementById('guestCountBadge');
    const totalPax = selectedGuests.length + customGuests.length;
    if (badgeEl) badgeEl.textContent = `(${totalPax} total)`;

    if (!selectedGuests.length && !customGuests.length) {
      el.innerHTML = '<span style="color:var(--ink-400);font-size:13px">No guests selected yet</span>';
      updateSuggestions(); return;
    }
    let html = '';
    
    // Render custom guests
    customGuests.forEach(cg => {
      html += `
        <div class="guest-chip" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--sand-200,#334155); border-radius:8px; padding:8px 12px; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; background:var(--surface-dark,#0f172a); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:12px; color:var(--accent,#38bdf8);">${cg.initials}</div>
            <div>
              <div style="font-weight:600; font-size:13.5px; color:#fff;">${cg.name} ${cg.nationalityCode ? '[' + cg.nationalityCode.toUpperCase() + ']' : ''}</div>
              <div style="font-size:12px; color:var(--ink-400);">Custom Guest</div>
            </div>
          </div>
          <button class="btn btn-sm" data-remove-cg="${cg.id}" style="background:transparent; color:#ef4444; border:none; cursor:pointer; font-size:12px; font-weight:500;">Remove</button>
        </div>`;
    });

    // Render Opera guests
    selectedGuests.forEach(g => {
      html += `
        <div class="guest-chip" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--sand-200,#334155); border-radius:8px; padding:8px 12px; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; background:var(--surface-dark,#0f172a); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:12px; color:var(--accent,#38bdf8);">${(g.firstName?.[0] || 'G') + (g.lastName?.[0] || '')}</div>
            <div>
              <div style="font-weight:600; font-size:13.5px; color:#fff;">${g.title || ''} ${g.firstName || ''} ${g.lastName || ''}</div>
              <div style="font-size:12px; color:var(--ink-400);">Room ${g.room} · ${g.billing || ''}</div>
            </div>
          </div>
          <button class="btn btn-sm" data-remove-guest="${g.id}" style="background:transparent; color:#ef4444; border:none; cursor:pointer; font-size:12px; font-weight:500;">Remove</button>
        </div>`;
    });

    el.innerHTML = html;

    el.querySelectorAll('[data-remove-cg]').forEach(btn => {
      btn.onclick = () => {
        customGuests = customGuests.filter(cg => cg.id !== btn.dataset.removeCg);
        renderChips();
      };
    });
    el.querySelectorAll('[data-remove-guest]').forEach(btn => {
      btn.onclick = () => {
        selectedGuests = selectedGuests.filter(g => g.id !== btn.dataset.removeGuest);
        renderChips();
      };
    });

    updateSuggestions(); checkConflicts();
  }

  function updateSuggestions() {
    const el = document.getElementById('suggestChips');
    const totalPax = selectedGuests.length + customGuests.length;
    if (!totalPax) {
      el.innerHTML = '<span style="color:var(--ink-400);font-size:12px">Select guests first</span>'; return;
    }
    const dynamicPerSlot = (t) => {
      const sc = period?.slots?.find(s => s.time === t);
      return sc ? sc.maxPax : defaultPerSlot;
    };
    const suggestions = slots.map(t => ({
      time: t,
      remaining: dynamicPerSlot(t) - (slotCovers[t] || 0)
    })).filter(s => s.remaining >= totalPax).slice(0, 3);

    if (!suggestions.length) {
      el.innerHTML = '<span style="color:var(--coral-500);font-size:12px">No slots fit this party size</span>'; return;
    }
    el.innerHTML = suggestions.map(s =>
      `<button class="suggest-chip" data-suggest="${s.time}"><strong>${formatTime(s.time)}</strong> ${s.remaining} left</button>`).join('');
    el.querySelectorAll('[data-suggest]').forEach(btn => {
      btn.onclick = () => { document.getElementById('apptTime').value = btn.dataset.suggest; };
    });
  }

  function checkConflicts() {
    const warn = document.getElementById('conflictWarning');
    if (!selectedReservation) { warn.classList.add('hidden'); return; }
    const conflicts = detectConflicts(state.appointments, selectedReservation.reservationId, state.selectedDate, apptId);
    if (!conflicts.length) { warn.classList.add('hidden'); return; }
    warn.classList.remove('hidden');
    warn.innerHTML = `<div class="ai-icon">!</div><div><strong>Possible conflict</strong><br>This guest already has ${conflicts.length} booking(s) today: ${
      conflicts.map(c => `${getOutlet(c.outletId)?.name} at ${formatTime(c.time)}`).join(', ')}</div>`;
  }

  function updateAllergyPreview() {
    const tags = detectAllergies(document.getElementById('apptComments').value);
    document.getElementById('allergyPreview').innerHTML = tags.map(t => `<span class="allergy-tag">${t}</span>`).join('');
  }

  renderChips(); updateAllergyPreview();
  document.getElementById('apptComments').oninput = updateAllergyPreview;

  const searchInput = document.getElementById('profileSearch');
  const resultsEl = document.getElementById('profileResults');
  
  function addCurrentSearchAsCustom() {
    const q = searchInput.value.trim();
    if (!q) return;
    const nameParts = q.split(' ');
    const initials = nameParts.map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CG';
    const nationalityCode = document.getElementById('customNationality').value.trim();

    customGuests.push({
      id: 'cg_' + Date.now() + Math.random(),
      name: q,
      initials: initials,
      room: 'Ext',
      pax: 1,
      nationalityCode
    });
    searchInput.value = '';
    document.getElementById('customNationality').value = '';
    resultsEl.classList.add('hidden');
    renderChips();
  }

  document.getElementById('btnAddCB').onclick = addCurrentSearchAsCustom;

  searchInput.oninput = () => {
    const q = searchInput.value.trim();
    if (!q) { resultsEl.classList.add('hidden'); return; }
    const results = searchOpera(q);
    
    let html = '';
    if (results.length) {
      html += results.map(res => `
        <div class="search-result-item" data-res="${res.reservationId}">
          <span class="sr-room">${res.room}</span>
          <div><div class="sr-name">${res.guests.map(g => g.lastName).join(' / ')}</div>
          <div class="sr-meta">${res.confirmation} · ${res.adults}A${res.children ? '+' + res.children + 'C' : ''} · ${res.butler}</div></div>
        </div>`).join('');
    } else {
      html += `<div style="padding:10px 14px; color:var(--ink-400); font-size:13px;">No reservations found</div>`;
    }

    html += `
      <div class="search-result-item" id="addCustomProfileOption" style="border-top:1px solid var(--sand-200,#334155); color:var(--accent,#38bdf8); font-weight:500; padding:10px 14px; cursor:pointer;">
        + Add "${q}" as custom guest (+CB)
      </div>`;

    resultsEl.classList.remove('hidden');
    resultsEl.innerHTML = html;

    resultsEl.querySelectorAll('[data-res]').forEach(item => {
      item.onclick = () => {
        const res = getReservation(item.dataset.res);
        selectedReservation = res;
        selectedGuests.push(...res.guests.map(g => ({ ...g, room: res.room, billing: res.billing })));
        if (res.billing) {
          document.getElementById('apptMealPlan').value = res.billing;
        }
        if (res.notes) { document.getElementById('apptComments').value = res.notes; updateAllergyPreview(); }
        searchInput.value = '';
        resultsEl.classList.add('hidden');
        renderChips();
      };
    });

    const addCustomOpt = document.getElementById('addCustomProfileOption');
    if (addCustomOpt) {
      addCustomOpt.onclick = addCurrentSearchAsCustom;
    }
  };

  const close = () => { modalRoot.classList.add('hidden'); modalRoot.innerHTML = ''; };
  document.getElementById('modalClose').onclick = close;
  document.getElementById('modalCancel').onclick = close;
  modalRoot.onclick = e => { if (e.target === modalRoot) close(); };

  document.getElementById('modalSave').onclick = () => {
    const outletId = document.getElementById('apptOutlet').value;
    const time = document.getElementById('apptTime').value;
    const type = document.getElementById('apptType').value;
    const mealPlan = document.getElementById('apptMealPlan').value;
    const comments = document.getElementById('apptComments').value.trim();
    
    // Auto-add text from search box if no guest has been added yet
    const searchVal = searchInput.value.trim();
    if (selectedGuests.length === 0 && customGuests.length === 0 && searchVal) {
      const nameParts = searchVal.split(' ');
      const initials = nameParts.map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CG';
      const nationalityCode = document.getElementById('customNationality').value.trim();
      customGuests.push({
        id: 'cg_' + Date.now() + Math.random(),
        name: searchVal,
        initials: initials,
        room: 'Ext',
        pax: 1,
        nationalityCode
      });
    }

    const totalPax = selectedGuests.length + customGuests.length;
    if (totalPax === 0) { alert('Select or add at least one guest'); return; }
    if (!time) { alert('Select a time slot'); return; }

    if (isEdit) {
      const idx = state.appointments.findIndex(a => a.id === apptId);
      state.appointments[idx] = {
        ...state.appointments[idx],
        outletId,
        time,
        type,
        mealPlan,
        comments,
        customGuests: customGuests,
        reservationId: selectedReservation ? selectedReservation.reservationId : state.appointments[idx].reservationId,
        room: selectedReservation ? selectedReservation.room : state.appointments[idx].room,
        guestIds: selectedGuests.map(g => g.id),
        pax: totalPax
      };
      logAudit('Updated appointment', `→ ${getOutlet(outletId).name} ${time}`);
      toast('Appointment updated');
    } else {
      state.appointments.push({
        id: 'a' + Date.now(),
        outletId,
        date: state.selectedDate,
        time,
        type,
        mealPlan,
        customGuests: customGuests,
        reservationId: selectedReservation ? selectedReservation.reservationId : null,
        room: selectedReservation ? selectedReservation.room : 'Ext',
        guestIds: selectedGuests.map(g => g.id),
        pax: totalPax,
        comments,
        createdBy: state.user.name
      });
      logAudit('Created appointment', `→ ${getOutlet(outletId).name} ${time}`);
      toast('Appointment created');
    }
    close(); render();
  };

  if (isEdit) {
    document.getElementById('modalDelete').onclick = () => {
      if (confirm('Delete this appointment?')) {
        const a = state.appointments.find(x => x.id === apptId);
        state.appointments = state.appointments.filter(x => x.id !== apptId);
        logAudit('Deleted appointment', `from ${getOutlet(a?.outletId)?.name}`);
        toast('Appointment deleted'); close(); render();
      }
    };
  }
}

function openOutletModal(outletId = null) {
  const isEdit = !!outletId;
  const o = isEdit ? getOutlet(outletId) : null;
  const modalRoot = document.getElementById('modalRoot');
  modalRoot.classList.remove('hidden');
  modalRoot.innerHTML = `
    <div class="modal"><div class="modal-header">
      <h2>${isEdit ? 'Edit Outlet' : 'Add Outlet'}</h2>
      <button class="modal-close" id="modalClose">×</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Name</label>
          <input type="text" id="outName" value="${o?.name || ''}" placeholder="e.g. Beach BBQ" /></div>
        <div class="form-row" style="grid-template-columns:1fr 1fr">
          <div class="form-group"><label>Short name</label>
            <input type="text" id="outShort" value="${o?.short || ''}" placeholder="BBQ" /></div>
          <div class="form-group"><label>Type</label>
            <input type="text" id="outType" value="${o?.type || ''}" placeholder="Dining / Experience" /></div>
        </div>
        <div class="form-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="form-group"><label>Period name</label>
            <input type="text" id="outPeriod" value="${o?.operatingPeriods?.[0]?.name || 'Dinner'}" /></div>
          <div class="form-group"><label>Start</label>
            <input type="time" id="outStart" value="${o?.operatingPeriods?.[0]?.start || '18:30'}" /></div>
          <div class="form-group"><label>End</label>
            <input type="time" id="outEnd" value="${o?.operatingPeriods?.[0]?.end || '22:30'}" /></div>
        </div>
        <div class="form-group"><label>Max covers</label>
          <input type="number" id="outMax" value="${o?.operatingPeriods?.[0]?.maxPax || 40}" /></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modalCancel">Cancel</button>
        <button class="btn btn-primary" id="modalSave">Save</button>
      </div></div>`;
  const close = () => { modalRoot.classList.add('hidden'); modalRoot.innerHTML = ''; };
  document.getElementById('modalClose').onclick = close;
  document.getElementById('modalCancel').onclick = close;
  document.getElementById('modalSave').onclick = () => {
    const name = document.getElementById('outName').value.trim();
    if (!name) { alert('Name required'); return; }
    const period = {
      name: document.getElementById('outPeriod').value || 'Service',
      start: document.getElementById('outStart').value,
      end: document.getElementById('outEnd').value,
      maxPax: parseInt(document.getElementById('outMax').value) || 40
    };
    if (isEdit) {
      Object.assign(o, {
        name, short: document.getElementById('outShort').value || name,
        type: document.getElementById('outType').value || 'Dining', operatingPeriods: [period]
      });
      logAudit('Updated outlet', name); toast('Outlet updated');
    } else {
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      state.outlets.push({
        id, name, short: document.getElementById('outShort').value || name,
        type: document.getElementById('outType').value || 'Dining',
        iconClass: 'market', icon: name[0].toUpperCase(),
        operatingPeriods: [period], active: true
      });
      logAudit('Created outlet', name); toast('Outlet added');
    }
    close(); render();
  };
}

function bindViewEvents() {
  document.querySelectorAll('.outlet-card').forEach(card => {
    card.onclick = () => { state.selectedOutletId = card.dataset.outlet; state.view = 'appointments'; render(); };
  });
  
  document.querySelectorAll('.cal-day[data-date]').forEach(day => {
    day.onclick = () => { 
      state.selectedDate = day.dataset.date;
      const [y, m] = day.dataset.date.split('-').map(Number);
      state.calendarYear = y;
      state.calendarMonth = m - 1;
      render(); 
    };
  });

  document.querySelectorAll('.cal-nav button').forEach(btn => {
    btn.onclick = () => {
      const dir = btn.dataset.cal;
      if (dir === 'prev') {
        state.calendarMonth--;
        if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
      } else {
        state.calendarMonth++;
        if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
      }
      render();
    };
  });

  document.querySelectorAll('.outlet-side-item').forEach(btn => {
    btn.onclick = () => { state.selectedOutletId = btn.dataset.outlet; render(); };
  });
  document.querySelectorAll('.guest-card').forEach(card => {
    card.onclick = () => openAppointmentModal(card.dataset.appt);
  });
  document.getElementById('btnNewAppt')?.addEventListener('click', () => openAppointmentModal());
  document.getElementById('btnResvReport')?.addEventListener('click', () => { state.view = 'reports'; render(); });
  document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());
  document.getElementById('btnAddOutlet')?.addEventListener('click', () => openOutletModal());
  
  const actionMenuBtn = document.getElementById('actionMenuBtn');
  const actionMenuDropdown = document.getElementById('actionMenuDropdown');
  if (actionMenuBtn && actionMenuDropdown) {
    actionMenuBtn.onclick = (e) => {
      e.stopPropagation();
      actionMenuDropdown.classList.toggle('hidden');
    };
    document.addEventListener('click', () => actionMenuDropdown.classList.add('hidden'));
    actionMenuDropdown.onclick = (e) => {
      e.stopPropagation();
      const item = e.target.closest('.action-dropdown-item');
      if (!item) return;
      actionMenuDropdown.classList.add('hidden');
      const action = item.dataset.action;
      if (action === 'new-appt') openAppointmentModal();
      if (action === 'change-date') {
        const newD = prompt('Enter date (YYYY-MM-DD):', state.selectedDate);
        if (newD) { 
          state.selectedDate = newD; 
          const [y, m] = newD.split('-').map(Number);
          state.calendarYear = y;
          state.calendarMonth = m - 1;
          render(); 
        }
      }
      if (action === 'switch-outlet') {
        const nextO = state.outlets[(state.outlets.findIndex(o => o.id === state.selectedOutletId) + 1) % state.outlets.length];
        state.selectedOutletId = nextO.id;
        render();
      }
      if (action === 'resv-report') { state.view = 'reports'; render(); }
      if (action === 'refresh-guests') { toast('Guests list refreshed'); }
      if (action === 'update-slots') { openSlotCapacityModal(); }
      if (action === 'update-dates') { alert('Operating dates configuration'); }
    };
  }

  document.querySelectorAll('[data-edit-outlet]').forEach(btn => {
    btn.onclick = () => openOutletModal(btn.dataset.editOutlet);
  });
  document.querySelectorAll('[data-toggle-outlet]').forEach(btn => {
    btn.onclick = () => {
      const o = getOutlet(btn.dataset.toggleOutlet);
      o.active = !o.active;
      logAudit(o.active ? 'Activated outlet' : 'Deactivated outlet', o.name);
      toast(`${o.name} ${o.active ? 'activated' : 'deactivated'}`);
      render();
    };
  });
  const gsSearch = document.getElementById('guestScheduleSearch');
  if (gsSearch) {
    gsSearch.oninput = () => {
      const results = searchOpera(gsSearch.value);
      const el = document.getElementById('gsSearchResults');
      if (!results.length) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      el.innerHTML = results.map(res => `
        <div class="search-result-item" data-res="${res.reservationId}">
          <span class="sr-room">${res.room}</span>
          <div><div class="sr-name">${res.guests.map(g => `${g.title} ${g.lastName}`).join(', ')}</div>
          <div class="sr-meta">${res.confirmation}</div></div></div>`).join('');
      el.querySelectorAll('.search-result-item').forEach(item => {
        item.onclick = () => {
          const res = getReservation(item.dataset.res);
          el.classList.add('hidden');
          gsSearch.value = `Room ${res.room}`;
          showGuestItinerary(res);
        };
      });
    };
  }
}

function showGuestItinerary(res) {
  const guestAppts = state.appointments
    .filter(a => a.reservationId === res.reservationId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const resultEl = document.getElementById('guestScheduleResult');
  if (!guestAppts.length) {
    resultEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🗓</div>
      <h3>No appointments yet</h3><p>Room ${res.room} has no bookings across outlets.</p></div>`;
    return;
  }
  resultEl.innerHTML = `
    <div style="text-align:left;background:white;border:1px solid var(--sand-200);border-radius:12px;padding:20px;">
      <h3 style="margin-bottom:4px">${res.guests.map(g => `${g.title} ${g.firstName} ${g.lastName}`).join(' & ')}</h3>
      <p style="color:var(--ink-400);font-size:13.5px;margin-bottom:16px">
        Room ${res.room} · ${res.confirmation} · GEM ${res.butler} · ${formatShortDate(res.arrival)} → ${formatShortDate(res.departure)}</p>
      ${guestAppts.map(a => {
        const o = getOutlet(a.outletId);
        const allergies = detectAllergies(a.comments);
        
        let allergyTagsHtml = '';
        if (allergies.length) {
          allergyTagsHtml = `<div class="allergy-tags" style="margin-top:4px">${allergies.map(x => `<span class="allergy-tag">${x}</span>`).join('')}</div>`;
        }

        return `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--sand-100)">
          <div style="min-width:90px;font-weight:600;color:var(--sage-700)">${formatTime(a.time)}</div>
          <div><strong>${o?.name || a.outletId}</strong>${a.mealPlan ? ` · ${a.mealPlan}` : ''}
            <div style="font-size:12.5px;color:var(--ink-400)">${appointmentTypes.find(t => t.id === a.type)?.name} · ${a.pax} pax</div>
            ${allergyTagsHtml}
          </div></div>`;
      }).join('')}</div>`;
}

renderLogin();
