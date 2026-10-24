export function detectAllergies(comments) {
  if (!comments) return [];
  const text = comments.toLowerCase();
  const keywords = ['allergy', 'allergic', 'shellfish', 'peanut', 'gluten', 'celiac', 'dairy', 'lactose', 'vegan', 'vegetarian', 'nut', 'seafood', 'soy', 'egg'];
  const detected = [];
  keywords.forEach(kw => {
    if (text.includes(kw)) {
      detected.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  });
  return [...new Set(detected)];
}

export function suggestTimeSlot(slots, slotCovers, perSlot, partySize) {
  const suggestions = [];
  slots.forEach(time => {
    const currentCovers = slotCovers[time] || 0;
    const remaining = perSlot - currentCovers;
    if (remaining >= partySize) {
      suggestions.push({ time, remaining });
    }
  });
  return suggestions.slice(0, 3);
}

export function forecastDemand(outletName, covers, maxPax) {
  const ratio = covers / maxPax;
  if (ratio >= 0.85) {
    return { level: 'high', message: `${outletName} is nearing peak capacity (${covers}/${maxPax} covers). Consider staggering later seatings.` };
  } else if (ratio >= 0.5) {
    return { level: 'medium', message: `${outletName} has moderate utilization (${covers}/${maxPax} covers). Flow is optimal.` };
  } else {
    return { level: 'low', message: `${outletName} has light utilization (${covers}/${maxPax} covers). Ample availability for walk-ins.` };
  }
}

export function detectConflicts(appointments, reservationId, date, excludeApptId = null) {
  return appointments.filter(a => 
    a.reservationId === reservationId && 
    a.date === date && 
    a.id !== excludeApptId
  );
}

export function daySummary(outletName, appts, getReservationFn) {
  if (!appts.length) return `No reservations currently logged for ${outletName}.`;
  let totalPax = 0;
  let allergyCount = 0;
  appts.forEach(a => {
    totalPax += a.pax;
    if (detectAllergies(a.comments).length > 0) allergyCount++;
  });
  return `${outletName} has ${appts.length} bookings totaling ${totalPax} guests. ${allergyCount} booking(s) note specific dietary requirements or allergies requiring kitchen briefing.`;
}
