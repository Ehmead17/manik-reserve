export const appointmentTypes = [
  { id: 'dinner', name: 'Dinner Reservation' },
  { id: 'wine_tasting', name: 'Wine Tasting Experience' },
  { id: 'teppanyaki', name: 'Teppanyaki Counter' },
  { id: 'cooking_class', name: 'Masterclass / Cooking Class' },
  { id: 'private_bbq', name: 'Private Beach BBQ' },
  { id: 'shisha', name: 'Shisha & Lounge' }
];

export const seedOutlets = [
  {
    id: 'bottega',
    name: 'Bottega',
    short: 'Bottega',
    type: 'Italian Dining',
    iconClass: 'market',
    icon: 'B',
    active: true,
    operatingPeriods: [
      { name: 'Dinner Service', start: '18:30', end: '22:30', maxPax: 60 }
    ]
  },
  {
    id: 'over-water',
    name: 'Over Water Restaurant',
    short: 'Over Water',
    type: 'Fine Dining & Seafood',
    iconClass: 'market',
    icon: 'O',
    active: true,
    operatingPeriods: [
      { name: 'Dinner Service', start: '19:00', end: '23:00', maxPax: 50 }
    ]
  },
  {
    id: 'beach-grill',
    name: 'Beach Grill',
    short: 'Beach Grill',
    type: 'Grill & Seafood',
    iconClass: 'market',
    icon: 'G',
    active: true,
    operatingPeriods: [
      { name: 'Lunch Service', start: '12:00', end: '15:30', maxPax: 40 },
      { name: 'Dinner Service', start: '18:30', end: '22:30', maxPax: 60 }
    ]
  },
  {
    id: 'wine-cellar',
    name: 'The Wine Cellar',
    short: 'Wine Cellar',
    type: 'Tasting & Pairing',
    iconClass: 'market',
    icon: 'W',
    active: true,
    operatingPeriods: [
      { name: 'Tasting Experience', start: '18:00', end: '21:00', maxPax: 16 }
    ]
  },
  {
    id: 'zen-deck',
    name: 'Zen Deck',
    short: 'Zen Deck',
    type: 'Japanese & Teppanyaki',
    iconClass: 'market',
    icon: 'Z',
    active: true,
    operatingPeriods: [
      { name: 'First Seating', start: '18:00', end: '20:00', maxPax: 20 },
      { name: 'Second Seating', start: '20:30', end: '22:30', maxPax: 20 }
    ]
  }
];

export const mockOperaGuests = [
  {
    reservationId: 'RES-77101',
    confirmation: 'SSK-77102',
    room: '222',
    arrival: '2026-10-14',
    departure: '2026-10-24',
    adults: 2,
    children: 0,
    butler: 'Aisha Hassan',
    billing: 'Credit Card',
    notes: 'Guest is severely allergic to shellfish and peanuts. Prefers outdoor seating.',
    guests: [
      { id: 'g1', title: 'Mr', firstName: 'Alexander', lastName: 'Vance', room: '222', billing: 'Credit Card' },
      { id: 'g2', title: 'Mrs', firstName: 'Elena', lastName: 'Vance', room: '222', billing: 'Credit Card' }
    ]
  },
  {
    reservationId: 'RES-77102',
    confirmation: 'SSK-77105',
    room: '118',
    arrival: '2026-10-15',
    departure: '2026-10-22',
    adults: 2,
    children: 1,
    butler: 'Rashid Ali',
    billing: 'Room Account',
    notes: 'Celebrating 10th Wedding Anniversary on 18th Oct. Champagne setup requested.',
    guests: [
      { id: 'g3', title: 'Dr', firstName: 'Julian', lastName: 'Sloane', room: '118', billing: 'Room Account' },
      { id: 'g4', title: 'Dr', firstName: 'Clara', lastName: 'Sloane', room: '118', billing: 'Room Account' },
      { id: 'g5', title: 'Master', firstName: 'Leo', lastName: 'Sloane', room: '118', billing: 'Room Account' }
    ]
  },
  {
    reservationId: 'RES-77103',
    confirmation: 'SSK-77112',
    room: '305',
    arrival: '2026-10-16',
    departure: '2026-10-25',
    adults: 2,
    children: 0,
    butler: 'Aisha Hassan',
    billing: 'Complimentary',
    notes: 'VIP repeat guests. Prefer corner tables with sunset views.',
    guests: [
      { id: 'g6', title: 'Mr', firstName: 'Marcus', lastName: 'Aurelius', room: '305', billing: 'Complimentary' },
      { id: 'g7', title: 'Ms', firstName: 'Julia', lastName: 'Domna', room: '305', billing: 'Complimentary' }
    ]
  },
  {
    reservationId: 'RES-77104',
    confirmation: 'SSK-77120',
    room: '125',
    arrival: '2026-10-17',
    departure: '2026-10-26',
    adults: 1,
    children: 0,
    butler: 'Rashid Ali',
    billing: 'Credit Card',
    notes: 'Gluten intolerance (celiac). Strict dietary controls required.',
    guests: [
      { id: 'g8', title: 'Ms', firstName: 'Sophie', lastName: 'Laurent', room: '125', billing: 'Credit Card' }
    ]
  },
  {
    reservationId: 'RES-77105',
    confirmation: 'SSK-77134',
    room: '210',
    arrival: '2026-10-18',
    departure: '2026-10-28',
    adults: 2,
    children: 2,
    butler: 'Aisha Hassan',
    billing: 'Room Account',
    notes: 'Family with young children. High chair needed.',
    guests: [
      { id: 'g9', title: 'Mr', firstName: 'David', lastName: 'Beck', room: '210', billing: 'Room Account' },
      { id: 'g10', title: 'Mrs', firstName: 'Victoria', lastName: 'Beck', room: '210', billing: 'Room Account' },
      { id: 'g11', title: 'Miss', firstName: 'Harper', lastName: 'Beck', room: '210', billing: 'Room Account' },
      { id: 'g12', title: 'Master', firstName: 'Cruz', lastName: 'Beck', room: '210', billing: 'Room Account' }
    ]
  }
];

export const sampleAppointments = [
  {
    id: 'a101',
    outletId: 'bottega',
    date: '2026-10-18',
    time: '18:30',
    type: 'dinner',
    table: '04',
    reservationId: 'RES-77101',
    room: '222',
    guestIds: ['g1', 'g2'],
    pax: 2,
    comments: 'Severe shellfish & peanut allergy. Outdoor seating preferred.',
    createdBy: 'Aisha Hassan'
  },
  {
    id: 'a102',
    outletId: 'bottega',
    date: '2026-10-18',
    time: '18:30',
    type: 'dinner',
    table: '07',
    reservationId: 'RES-77102',
    room: '118',
    guestIds: ['g3', 'g4', 'g5'],
    pax: 3,
    comments: 'Anniversary celebration. Champagne setup requested.',
    createdBy: 'Rashid Ali'
  },
  {
    id: 'a103',
    outletId: 'bottega',
    date: '2026-10-18',
    time: '19:30',
    type: 'dinner',
    table: '12',
    reservationId: 'RES-77103',
    room: '305',
    guestIds: ['g6', 'g7'],
    pax: 2,
    comments: 'VIP guests. Sunset view table requested.',
    createdBy: 'Aisha Hassan'
  },
  {
    id: 'a104',
    outletId: 'over-water',
    date: '2026-10-18',
    time: '20:00',
    type: 'dinner',
    table: '02',
    reservationId: 'RES-77104',
    room: '125',
    guestIds: ['g8'],
    pax: 1,
    comments: 'Celiac / Strict Gluten-free.',
    createdBy: 'Rashid Ali'
  }
];

export function generateTimeSlots(start, end, intervalMin = 30) {
  const slots = [];
  let [sh, sm] = start.split(':').map(Number);
  let [eh, em] = end.split(':').map(Number);
  let current = sh * 60 + sm;
  const finish = eh * 60 + em;
  while (current <= finish) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += intervalMin;
  }
  return slots;
}

export function searchOpera(query) {
  if (!query || query.trim() === '') return [];
  const q = query.toLowerCase().trim();
  return mockOperaGuests.filter(res => 
    res.room.toLowerCase().includes(q) ||
    res.confirmation.toLowerCase().includes(q) ||
    res.guests.some(g => g.lastName.toLowerCase().includes(q) || g.firstName.toLowerCase().includes(q))
  );
}

export function getGuestById(id) {
  for (const res of mockOperaGuests) {
    const found = res.guests.find(g => g.id === id);
    if (found) return found;
  }
  return null;
}

export function getReservation(reservationId) {
  return mockOperaGuests.find(r => r.reservationId === reservationId) || null;
}
