import React, { useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import { deleteCoworkingMember } from './firebaseUtils';
import { companyKey, monthKeyOf, monthLabel, formatDate, statusMeta } from './coworkUtils';

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

  const bookings = [...coworking].filter((c) => c.company).sort((a, b) => idNum(b.id) - idNum(a.id));
  const groups = {};
  bookings.forEach((b) => { (groups[companyKey(b.company)] ||= []).push(b); });

  const list = Object.entries(groups).map(([key, bs]) => {
    // display name: the spelling used by the most recent booking
    const name = bs[0].company.trim().replace(/\s+/g, ' ');
    const live = bs.filter((b) => b.status !== 'rejected' && b.status !== 'exited');
    const ids = new Set(bs.map((b) => b.id));
    const team = members.filter((m) => !m.removed && ids.has(m.bookingId));
    const seats = live.reduce((s, b) => s + parseInt(b.seats || 0), 0);
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
    return { key, name, bs, team, seats, liveTeam, monthList };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const shown = list.filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.bs.some((b) => (b.id || '').toLowerCase().includes(search.toLowerCase())));

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
        <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Coworking Members ({members.filter((m) => !m.removed).length}) — {list.length} companies</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or ID" style={{ ...inp, paddingLeft: '2.25rem', minWidth: '240px' }} />
          </div>
          <button onClick={() => exportToExcel(members, 'StartupTN_CoworkingMembers')} style={{ ...btn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={18} /> Export Excel</button>
        </div>
      </div>

      {shown.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No coworking bookings found.</p>}

      {shown.map((g) => {
        const isOpen = open === g.key;
        const full = g.seats > 0 && g.liveTeam >= g.seats;
        return (
          <div key={g.key} style={{ marginBottom: '1rem', border: '2px solid #2B4C7E', borderRadius: '10px', overflow: 'hidden' }}>
            <div onClick={() => setOpen(isOpen ? null : g.key)} style={{ background: isOpen ? '#2B4C7E' : '#EFF6FF', padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: isOpen ? '#fff' : '#2B4C7E' }}>{g.name}</span>
                <span style={{ fontSize: '0.85rem', color: isOpen ? '#F5A623' : '#6b7280' }}>{g.bs.length} booking(s) | {g.monthList.length} month(s) | {g.seats} seats</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600', background: full ? 'rgba(5,150,105,0.15)' : 'rgba(245,166,35,0.15)', color: full ? '#059669' : '#F5A623' }}>Members: {g.liveTeam} / {g.seats}</span>
                <span style={{ color: isOpen ? '#fff' : '#2B4C7E', fontSize: '1.2rem', fontWeight: '700' }}>{isOpen ? '▲' : '▼'}</span>
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
                          <div key={e.b.id + '-' + e.cycle + '-' + idx} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem', opacity: e.kind === 'past' ? 0.85 : 1 }}>
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
