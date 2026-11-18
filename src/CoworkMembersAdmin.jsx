import React, { useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import { deleteCoworkingMember } from './firebaseUtils';
import { companyKey, monthKeyOf, monthLabel, formatDate, statusMeta, needsApproval } from './coworkUtils';

const cols = ['#', 'Booking ID', 'Name', 'Designation', 'Contact', 'Alt Contact', 'Email', 'Gender', 'Aadhar', 'DOB', 'Marital', 'Blood', "Father's Name", 'Permanent Addr', 'Comm Addr', 'Office Addr', 'Del'];
const td = { padding: '0.5rem 0.75rem', color: '#6b7280' };

const idNum = (id) => {
  try { const p = (id || '').split('-'); const d = p[1] || '01012000000';
    return parseInt(d.slice(4, 8)) * 100000000 + parseInt(d.slice(2, 4)) * 1000000 + parseInt(d.slice(0, 2)) * 10000 + parseInt(p[2] || '0'); } catch { return 0; }
};

// Admin view: one card per company (same company merged), month-wise entries inside.
const CoworkMembersAdmin = ({ coworking, members, setMembers, styles, exportToExcel }) => {
  const { card, btn, inp } = styles;
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const bookings = [...coworking].filter((c) => c.company).sort((a, b) => idNum(b.id) - idNum(a.id));
  const groups = {};
  bookings.forEach((b) => { (groups[companyKey(b.company)] ||= []).push(b); });

  const list = Object.entries(groups).map(([key, bs]) => {
    // display name: the spelling used by the most recent booking
    const name = bs[0].company.trim().replace(/\s+/g, ' ');
    // approved bookings that are still running (not rejected, exited or waiting for approval)
    const live = bs.filter((b) => b.status !== 'rejected' && b.status !== 'exited' && !needsApproval(b));
    const unapproved = bs.filter(needsApproval);
    const state = live.length ? 'active' : unapproved.length ? 'unapproved' : bs.every((b) => b.status === 'rejected') ? 'rejected' : 'closed';
    const ids = new Set(bs.map((b) => b.id));
    const team = members.filter((m) => !m.removed && ids.has(m.bookingId));
    const seats = live.reduce((s, b) => s + parseInt(b.seats || 0), 0);
    const requestedSeats = unapproved.reduce((s, b) => s + parseInt(b.seats || 0), 0);
    const liveIds = new Set(live.map((b) => b.id));
    const liveTeam = team.filter((m) => liveIds.has(m.bookingId)).length;

    // month-wise entries: every booking's current cycle plus its past (renewed) cycles
    const entries = [];
    bs.forEach((b) => {
      entries.push({ key: monthKeyOf(b.startDate, b.id), kind: 'current', b, cycle: b.cycle || 1,
        startDate: b.startDate, endDate: b.endDate, seats: b.seats, payment: b.payment });
      (b.history || []).forEach((h) => entries.push({ key: monthKeyOf(h.startDate, b.id), kind: 'past', b, cycle: h.cycle,
        startDate: h.startDate, endDate: h.endDate, seats: h.seats, payment: h.payment }));
    });
    const months = {};
    entries.forEach((e) => { (months[e.key] ||= []).push(e); });
    const monthList = Object.keys(months).sort().reverse().map((k) => ({ key: k, entries: months[k].sort((a, b) => idNum(b.b.id) - idNum(a.b.id) || b.cycle - a.cycle) }));
    return { key, name, bs, team, seats, requestedSeats, unapproved, state, liveTeam, monthList };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Totals follow the current coworking details: only members of approved, running bookings are counted
  const activeCompanies = list.filter((g) => g.state === 'active').length;
  const activeMemberTotal = list.reduce((n, g) => n + g.liveTeam, 0);
  const awaitingCompanies = list.filter((g) => g.state === 'unapproved').length;
  const closedCompanies = list.filter((g) => g.state === 'closed' || g.state === 'rejected').length;
  const FILTERS = [
    { k: '', l: 'All', n: list.length, c: '#2B4C7E', bg: '#EFF6FF' },
    { k: 'active', l: 'Active', n: activeCompanies, c: '#059669', bg: '#D1FAE5' },
    { k: 'unapproved', l: 'Awaiting approval', n: awaitingCompanies, c: '#0f766e', bg: '#CCFBF1' },
    { k: 'closed', l: 'Exited / Rejected', n: closedCompanies, c: '#6b7280', bg: '#E5E7EB' }
  ];
  const matchesState = (g) => !stateFilter || (stateFilter === 'closed' ? (g.state === 'closed' || g.state === 'rejected') : g.state === stateFilter);
  const TONE = {
    active: { border: '#93c5fd', head: '#EFF6FF', accent: '#2B4C7E' },
    unapproved: { border: '#5eead4', head: '#F0FDFA', accent: '#0f766e' },
    closed: { border: '#d1d5db', head: '#F3F4F6', accent: '#9ca3af' },
    rejected: { border: '#d1d5db', head: '#F3F4F6', accent: '#9ca3af' }
  };
  const shown = list.filter((g) => matchesState(g) && (!search || g.name.toLowerCase().includes(search.toLowerCase()) || g.bs.some((b) => (b.id || '').toLowerCase().includes(search.toLowerCase()))));

  const memberTable = (rows) => (
    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ borderBottom: '2px solid #2B4C7E', background: '#f9fafb' }}>
          {cols.map((h) => <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#2B4C7E', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>{rows.map((m, i) => (
          <tr key={m.firebaseId} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
            <td style={td}>{i + 1}</td>
            <td style={{ ...td, color: '#2B4C7E', fontWeight: '600', whiteSpace: 'nowrap' }}>{m.bookingId}</td>
            <td style={{ ...td, color: '#1f2937', whiteSpace: 'nowrap' }}>{m.name}</td>
            <td style={td}>{m.designation}</td><td style={td}>{m.contactNumber}</td><td style={td}>{m.alternateContact || '—'}</td>
            <td style={td}>{m.email}</td><td style={td}>{m.gender}</td><td style={td}>{m.aadharNo}</td><td style={{ ...td, whiteSpace: 'nowrap' }}>{m.dob}</td>
            <td style={td}>{m.maritalStatus || '—'}</td><td style={td}>{m.bloodGroup || '—'}</td><td style={td}>{m.fatherName}</td>
            <td style={{ ...td, minWidth: '120px' }}>{m.permanentAddress}</td><td style={{ ...td, minWidth: '120px' }}>{m.communicationAddress || '—'}</td><td style={{ ...td, minWidth: '120px' }}>{m.officeAddress || '—'}</td>
            <td style={td}>
              <button onClick={async () => { if (confirm('Delete?')) { try { await deleteCoworkingMember(m.firebaseId); setMembers(members.filter((x) => x.firebaseId !== m.firebaseId)); } catch (e) { alert('Error!'); } } }}
                style={{ padding: '0.35rem 0.6rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={14} /></button>
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  );

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Coworking Members ({activeMemberTotal}) — {activeCompanies} active compan{activeCompanies === 1 ? 'y' : 'ies'}</h2>
          <p style={{ margin: '0.35rem 0 0', color: '#6b7280', fontSize: '0.8rem' }}>Counts follow the current coworking details: members of exited, rejected or not-yet-approved bookings are not included.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or ID" style={{ ...inp, paddingLeft: '2.25rem', minWidth: '240px' }} />
          </div>
          <button onClick={() => exportToExcel(members, 'StartupTN_CoworkingMembers')} style={{ ...btn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={18} /> Export Excel</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {FILTERS.map((f) => (
          <button key={f.k} onClick={() => setStateFilter(stateFilter === f.k ? '' : f.k)}
            style={{ padding: '0.35rem 0.9rem', borderRadius: '999px', border: `1px solid ${f.c}55`, background: f.bg, color: f.c, fontWeight: stateFilter === f.k ? '700' : '500', cursor: 'pointer', outline: stateFilter === f.k ? `2px solid ${f.c}` : 'none', fontSize: '0.85rem' }}>
            {f.l} ({f.n})
          </button>
        ))}
      </div>

      {shown.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No coworking bookings found.</p>}

      {shown.map((g) => {
        const isOpen = open === g.key;
        const full = g.seats > 0 && g.liveTeam >= g.seats;
        const tone = TONE[g.state];
        return (
          <div key={g.key} style={{ marginBottom: '1rem', border: `2px solid ${tone.border}`, borderRadius: '10px', overflow: 'hidden' }}>
            <div onClick={() => setOpen(isOpen ? null : g.key)} style={{ background: tone.head, borderLeft: `6px solid ${tone.accent}`, borderBottom: isOpen ? `3px solid ${tone.accent}` : 'none', padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: g.state === 'active' ? '#2B4C7E' : tone.accent === '#9ca3af' ? '#4b5563' : tone.accent }}>{g.name}</span>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{g.bs.length} booking(s) | {g.monthList.length} month(s) | {g.state === 'unapproved' ? `${g.requestedSeats} seats requested` : `${g.seats} seats`}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {g.state === 'active' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600', background: full ? 'rgba(5,150,105,0.15)' : 'rgba(245,166,35,0.15)', color: full ? '#059669' : '#b45309' }}>Members: {g.liveTeam} / {g.seats}</span>}
                {g.unapproved.length > 0 && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}>📝 {g.state === 'unapproved' ? 'Awaiting approval' : `${g.unapproved.length} awaiting approval`}</span>}
                {g.state === 'closed' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>Exited</span>}
                {g.state === 'rejected' && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(220,38,38,0.1)', color: '#b91c1c' }}>Rejected</span>}
                <span style={{ color: tone.accent, fontSize: '1.2rem', fontWeight: '700' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '1rem 1.5rem' }}>
                {g.monthList.map((mo) => {
                  const monthSeats = mo.entries.filter((e) => e.kind === 'current' && e.b.status !== 'rejected' && e.b.status !== 'exited').reduce((s, e) => s + parseInt(e.seats || 0), 0);
                  return (
                    <div key={mo.key} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #F5A623', paddingBottom: '0.35rem', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: '#2B4C7E', fontWeight: '700' }}>📅 {monthLabel(mo.key)}</h4>
                        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{mo.entries.length} entr{mo.entries.length === 1 ? 'y' : 'ies'}{monthSeats ? ` | ${monthSeats} seats` : ''}</span>
                      </div>
                      {mo.entries.map((e, idx) => {
                        const meta = statusMeta(e.b);
                        const team = e.kind === 'current' ? members.filter((m) => !m.removed && m.bookingId === e.b.id) : [];
                        return (
                          <div key={e.b.id + '-' + e.cycle + '-' + idx} style={{ background: e.kind === 'current' && needsApproval(e.b) ? '#F0FDFA' : e.kind === 'current' && (e.b.status === 'exited' || e.b.status === 'rejected') ? '#F3F4F6' : '#f9fafb', border: `1px solid ${e.kind === 'current' && needsApproval(e.b) ? '#99f6e4' : '#e5e7eb'}`, borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem', opacity: e.kind === 'past' ? 0.85 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <strong style={{ color: '#2B4C7E' }}>{e.b.id}</strong>
                                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}> · Cycle {e.cycle}{e.kind === 'past' ? ' (completed)' : ''}</span>
                              </div>
                              {e.kind === 'current' && <span style={{ padding: '0.2rem 0.7rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: meta.bg, color: meta.color }}>{meta.label}</span>}
                            </div>
                            <p style={{ margin: '0.35rem 0 0', color: '#1f2937', fontSize: '0.9rem' }}>
                              <strong>Period:</strong> {formatDate(e.startDate)} → {formatDate(e.endDate)} &nbsp;|&nbsp; <strong>Seats:</strong> {e.seats}
                              {e.kind === 'current' && <> &nbsp;|&nbsp; <strong>Members:</strong> {team.length}</>}
                              {e.payment && <> &nbsp;|&nbsp; <strong>Paid:</strong> ₹{e.payment.amount} ({e.payment.mode}, Ref {e.payment.reference})</>}
                            </p>
                            {e.kind === 'current' && e.b.status === 'exited' && (e.b.exitDate || e.b.exitedOn) && <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}><strong>Exit date:</strong> {e.b.exitDate ? formatDate(e.b.exitDate) : e.b.exitedOn}</p>}
                            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>{e.b.name} · {e.b.email} · {e.b.fullPhone || e.b.phone}</p>
                            {e.kind === 'current' && (team.length > 0 ? memberTable(team) : <p style={{ color: '#6b7280', fontStyle: 'italic', margin: '0.5rem 0 0', fontSize: '0.85rem' }}>No members registered yet.</p>)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CoworkMembersAdmin;
