// Pure helpers for the coworking lifecycle (registration -> payment -> members -> renewal/exit)

// Renewal opens this many days before the end date (reminder email goes out at 2 days).
export const REMINDER_DAYS_BEFORE_END = 2;
export const RENEWAL_WINDOW_DAYS = 7;

// Shown to users on the payment screen. Edit to match your actual payment details.
export const PAYMENT_INSTRUCTIONS =
  'Pay the coworking fee as communicated by the StartupTN team (UPI / bank transfer), then enter the amount and transaction reference below. Access to member registration opens once StartupTN verifies your payment.';

export const PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cheque', 'Cash', 'Other'];

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const todayStr = () => toDateStr(new Date());

export const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

// Whole days from today to dateStr (negative = already past). null if no/invalid date.
export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return null;
  return Math.round((d - startOfToday()) / 86400000);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Records created before payments existed: approved == already paid, so they keep working.
export const isPaid = (c) =>
  !!c && (c.paymentStatus === 'paid' || (c.paymentStatus === undefined && c.status === 'approved'));

// New requests wait for admin approval before the client can pay.
// Records created before this step (pending, no approvalStatus) also wait for approval.
export const needsApproval = (c) => !!c && c.status === 'pending' && c.approvalStatus !== 'approved';

export const isActive = (c) => !!c && c.status === 'approved' && isPaid(c);
export const isExited = (c) => !!c && c.status === 'exited';

export const activeMembers = (members, id) =>
  (members || []).filter((m) => m.bookingId === id && !m.removed);

// Members can be added only after payment is verified and while seats are free.
export const canAddMembers = (c, members) =>
  isActive(c) && activeMembers(members, c.id).length < parseInt(c.seats || 0);

export const seatsFree = (c, members) =>
  Math.max(0, parseInt(c.seats || 0) - activeMembers(members, c.id).length);

// Renewal can be requested when the end date is near/past and nothing is already pending.
export const canRenew = (c) => {
  if (!isActive(c) || c.renewal) return false;
  const left = daysUntil(c.endDate);
  return left !== null && left <= RENEWAL_WINDOW_DAYS;
};

// Workspaces whose end date is within the reminder window and not yet reminded for that end date.
export const needsReminder = (c) => {
  if (!isActive(c) || c.renewal) return false;
  const left = daysUntil(c.endDate);
  if (left === null || left > REMINDER_DAYS_BEFORE_END) return false;
  return c.reminderSentFor !== c.endDate;
};

export const statusMeta = (c) => {
  if (c.status === 'exited') return { label: 'EXITED', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
  if (c.status === 'rejected') return { label: 'REJECTED', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
  if (c.status === 'approved') return { label: 'ACTIVE', color: '#059669', bg: 'rgba(13,140,79,0.1)' };
  if (needsApproval(c)) return { label: 'AWAITING APPROVAL', color: '#0f766e', bg: 'rgba(15,118,110,0.12)' };
  if (c.paymentStatus === 'submitted') return { label: 'PAYMENT TO VERIFY', color: '#1d4ed8', bg: 'rgba(29,78,216,0.1)' };
  return { label: 'AWAITING PAYMENT', color: '#b45309', bg: 'rgba(245,166,35,0.15)' };
};

// Applies a verified renewal to the record. Returns the updated coworking record.
export const applyRenewal = (c, verifiedOn) => {
  const r = c.renewal;
  const prev = {
    cycle: c.cycle || 1,
    startDate: c.startDate,
    endDate: c.endDate,
    seats: c.seats,
    payment: c.payment || null,
  };
  return {
    ...c,
    history: [...(c.history || []), prev],
    cycle: (c.cycle || 1) + 1,
    startDate: r.startDate,
    endDate: r.endDate,
    seats: String(r.newSeats),
    status: 'approved',
    paymentStatus: 'paid',
    payment: { ...r.payment, verifiedOn },
    renewal: null,
    reminderSentFor: null,
  };
};

// ---- Company grouping (admin Members screen) ----
const COMPANY_NOISE = new Set(['pvt', 'private', 'ltd', 'limited', 'llp', 'inc', 'co']);

// "Peachpath Services LLP" and "Peachpath services LLP " -> same key; "Oneyes Infotech solutions Pvt Ltd" and "Oneyes infotech Solutions" -> same key
export const companyKey = (name) =>
  (name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w && !COMPANY_NOISE.has(w)).join(' ');

// YYYY-MM for a coworking cycle: from its start date, else from the DDMMYYYY inside the ID (C-DDMMYYYY-001)
export const monthKeyOf = (startDate, id) => {
  if (startDate && /^\d{4}-\d{2}/.test(startDate)) return startDate.slice(0, 7);
  const d = ((id || '').split('-')[1]) || '';
  return d.length >= 8 ? `${d.slice(4, 8)}-${d.slice(2, 4)}` : 'unknown';
};

export const monthLabel = (key) => {
  if (key === 'unknown') return 'Date not recorded';
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
};

// ---- "unread" tracking for the admin badges ----
// Latest thing a client did on a coworking record: registered, or submitted a payment (first cycle or renewal).
export const latestActivity = (c) =>
  [c.createdAt, c.payment?.submittedOn, c.renewal?.payment?.submittedOn].filter(Boolean).sort().pop() || '';

// ---- Hall bookings: is the requested (event) date still ahead? ----
// kind: 'today' | 'upcoming' | 'past'; confirmed = approved (the hall is occupied on that date)
export const hallDateInfo = (b) => {
  if (!b || b.status === 'rejected') return null;
  const d = daysUntil(b.date);
  if (d === null) return null;
  return { kind: d < 0 ? 'past' : d === 0 ? 'today' : 'upcoming', days: d, confirmed: b.status === 'approved' };
};
