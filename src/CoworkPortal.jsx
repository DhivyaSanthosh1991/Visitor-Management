import React, { useState, useEffect } from 'react';
import {
  updateCoworking as updateCoworkingFirebase,
  addCoworkingMember, updateCoworkingMember
} from './firebaseUtils';
import {
  PAYMENT_INSTRUCTIONS, PAYMENT_MODES,
  addDays, daysUntil, formatDate, isActive, isPaid, isExited,
  activeMembers, canAddMembers, seatsFree, canRenew, statusMeta, needsApproval
} from './coworkUtils';

const EMPTY_MEMBER = {
  name: '', designation: '', contactNumber: '', alternateContact: '', email: '',
  gender: '', aadharNo: '', dob: '', maritalStatus: '', bloodGroup: '', fatherName: '',
  permanentAddress: '', communicationAddress: '', officeAddress: ''
};

const label = { display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' };

// One place for everything a coworking client does with their Coworking ID:
// pay -> add/edit/remove members -> renew (or exit) -> pay again -> repeat.
const CoworkPortal = ({ coworking, setCoworking, members, setMembers, styles, initialId = '', onBack }) => {
  const { card, btn, inp } = styles;
  const [idInput, setIdInput] = useState(initialId);
  const [lookupId, setLookupId] = useState(initialId.trim());
  const [view, setView] = useState('main'); // main | member | renew
  const [busy, setBusy] = useState(false);

  const [payForm, setPayForm] = useState({ amount: '', mode: 'UPI', reference: '' });
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER);
  const [editingMember, setEditingMember] = useState(null);
  const [renewForm, setRenewForm] = useState(null);

  useEffect(() => {
    if (initialId) { setIdInput(initialId); setLookupId(initialId.trim()); }
  }, [initialId]);

  const rec = coworking.find(c => c.id === lookupId);
  const team = rec ? activeMembers(members, rec.id) : [];

  const save = async (updated) => {
    await updateCoworkingFirebase(updated.firebaseId, updated);
    setCoworking(coworking.map(c => c.firebaseId === updated.firebaseId ? updated : c));
  };

  const doLookup = (e) => {
    e.preventDefault();
    setLookupId(idInput.trim().toUpperCase());
    setView('main');
  };

  // ---------- payment ----------
  const renewalPaymentPending = rec?.renewal && rec.renewal.paymentStatus === 'unpaid';
  const awaitingApproval = rec && needsApproval(rec);
  const needsInitialPayment = rec && !isExited(rec) && rec.status !== 'rejected' && !awaitingApproval && !isPaid(rec) && rec.paymentStatus !== 'submitted';
  const initialSubmitted = rec && !isPaid(rec) && rec.paymentStatus === 'submitted';

  const submitPayment = async (target) => {
    if (!(parseFloat(payForm.amount) > 0)) { alert('Enter the amount paid.'); return; }
    if (!payForm.reference.trim()) { alert('Enter the transaction / reference number.'); return; }
    setBusy(true);
    try {
      const payment = {
        amount: parseFloat(payForm.amount), mode: payForm.mode,
        reference: payForm.reference.trim(), submittedOn: new Date().toISOString()
      };
      const updated = target === 'renewal'
        ? { ...rec, renewal: { ...rec.renewal, paymentStatus: 'submitted', payment } }
        : { ...rec, paymentStatus: 'submitted', payment };
      await save(updated);
      setPayForm({ amount: '', mode: 'UPI', reference: '' });
      alert('Payment details submitted. StartupTN will verify and confirm shortly.');
    } catch (err) { console.error(err); alert('Error submitting payment!'); }
    setBusy(false);
  };

  const renderPayment = (target, title) => (
    <div style={{ background: '#FFFBEB', border: '2px solid #F5A623', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h3 style={{ color: '#2B4C7E', margin: '0 0 0.5rem', fontWeight: '700' }}>💳 {title}</h3>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1rem' }}>{PAYMENT_INSTRUCTIONS}</p>
      <p style={{ color: '#1f2937', fontSize: '0.9rem', margin: '0 0 1rem' }}>
        <strong>Coworking ID:</strong> {rec.id} (quote this ID with your payment)
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div><label style={label}>Amount paid (₹) *</label>
          <input type="number" min="1" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} style={inp} /></div>
        <div><label style={label}>Payment mode *</label>
          <select value={payForm.mode} onChange={e => setPayForm({ ...payForm, mode: e.target.value })} style={inp}>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        <div><label style={label}>Transaction / Reference No. *</label>
          <input type="text" value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} style={inp} /></div>
      </div>
      <button disabled={busy} onClick={() => submitPayment(target)} style={{ ...btn, marginTop: '1rem', background: '#F5A623' }}>Submit Payment Details</button>
    </div>
  );

  const WaitingBox = ({ text }) => (
    <div style={{ background: '#EFF6FF', border: '2px solid #2B4C7E', borderRadius: '10px', padding: '1rem 1.5rem', marginBottom: '1.5rem', color: '#2B4C7E' }}>
      ⏳ {text}
    </div>
  );

  // ---------- members ----------
  const openAddMember = () => { setEditingMember(null); setMemberForm(EMPTY_MEMBER); setView('member'); };
  const openEditMember = (m) => { setEditingMember(m); setMemberForm({ ...EMPTY_MEMBER, ...m }); setView('member'); };

  const submitMember = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(memberForm.contactNumber)) { alert('Enter a valid 10-digit contact number.'); return; }
    if (!/^\d{12}$/.test(memberForm.aadharNo)) { alert('Aadhar number must be 12 digits.'); return; }
    const dup = team.find(m => m.aadharNo === memberForm.aadharNo && m.firebaseId !== editingMember?.firebaseId);
    if (dup) { alert(`A member with this Aadhar number (${dup.name}) is already registered under this ID.`); return; }
    setBusy(true);
    try {
      if (editingMember) {
        const { firebaseId, ...data } = memberForm;
        await updateCoworkingMember(editingMember.firebaseId, data);
        setMembers(members.map(m => m.firebaseId === editingMember.firebaseId ? { ...m, ...data } : m));
        alert('Member details updated.');
      } else {
        if (!canAddMembers(rec, members)) { alert('All seats are filled. Renew with additional seats to add more members.'); setBusy(false); return; }
        const member = { ...memberForm, bookingId: rec.id, company: rec.company, cycleAdded: rec.cycle || 1, submittedAt: new Date().toLocaleString() };
        const created = await addCoworkingMember(member);
        setMembers([...members, created]);
        alert('Member registered successfully!');
      }
      setView('main');
    } catch (err) { console.error(err); alert('Error saving member!'); }
    setBusy(false);
  };

  const removeMember = async (m) => {
    if (!confirm(`Remove ${m.name} from this workspace? Their seat becomes free for another member.`)) return;
    try {
      const data = { removed: true, removedOn: new Date().toLocaleString() };
      await updateCoworkingMember(m.firebaseId, data);
      setMembers(members.map(x => x.firebaseId === m.firebaseId ? { ...x, ...data } : x));
    } catch (err) { console.error(err); alert('Error removing member!'); }
  };

  // ---------- renewal / exit ----------
  const openRenew = () => {
    setRenewForm({
      decision: 'continue',
      startDate: addDays(rec.endDate, 1), endDate: '',
      removeIds: [], addCount: 0, release: 0
    });
    setView('renew');
  };

  const renewSeats = renewForm && rec
    ? parseInt(rec.seats || 0) - renewForm.removeIds.length - (parseInt(renewForm.release) || 0) + (parseInt(renewForm.addCount) || 0)
    : 0;

  const submitRenewal = async (e) => {
    e.preventDefault();
    if (renewForm.decision === 'exit') {
      if (!confirm('Confirm you are EXITING the coworking space? This ends your membership and cannot be reversed here.')) return;
      setBusy(true);
      try {
        await save({ ...rec, status: 'exited', exitedOn: new Date().toLocaleString(), renewal: null });
        alert('Your exit has been recorded. Thank you for being part of StartupTN.');
        setView('main');
      } catch (err) { console.error(err); alert('Error recording exit!'); }
      setBusy(false);
      return;
    }
    const minStart = addDays(rec.endDate, 1);
    if (renewForm.startDate < minStart) { alert(`New start date must be on or after ${formatDate(minStart)}.`); return; }
    if (!renewForm.endDate || renewForm.endDate < renewForm.startDate) { alert('End date must be on or after the start date.'); return; }
    if (renewSeats < 1) { alert('You need at least 1 seat to continue. Choose Exit instead.'); return; }
    if ((parseInt(renewForm.release) || 0) > seatsFree(rec, members)) { alert('You can only release seats that have no member.'); return; }
    const summary = `Renewal summary\n\nPeriod: ${formatDate(renewForm.startDate)} → ${formatDate(renewForm.endDate)}\nCurrent seats: ${rec.seats}\nMembers leaving: ${renewForm.removeIds.length}\nUnused seats released: ${parseInt(renewForm.release) || 0}\nNew additions: ${parseInt(renewForm.addCount) || 0}\nTotal seats after renewal: ${renewSeats}\n\nContinue to payment?`;
    if (!confirm(summary)) return;
    setBusy(true);
    try {
      await save({
        ...rec,
        renewal: {
          requestedOn: new Date().toLocaleString(),
          startDate: renewForm.startDate, endDate: renewForm.endDate,
          removeIds: renewForm.removeIds,
          release: parseInt(renewForm.release) || 0,
          addCount: parseInt(renewForm.addCount) || 0,
          newSeats: renewSeats,
          paymentStatus: 'unpaid', payment: null
        }
      });
      setView('main');
    } catch (err) { console.error(err); alert('Error submitting renewal!'); }
    setBusy(false);
  };

  const cancelRenewal = async () => {
    if (!confirm('Cancel this pending renewal?')) return;
    try { await save({ ...rec, renewal: null }); } catch (err) { console.error(err); alert('Error cancelling renewal!'); }
  };

  // ---------- render ----------
  const left = rec ? daysUntil(rec.endDate) : null;
  const meta = rec ? statusMeta(rec) : null;
  const r = rec?.renewal;

  const Step = ({ n, text, done, active }) => (
    <div style={{ flex: 1, minWidth: '120px', textAlign: 'center', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600',
      background: done ? 'rgba(5,150,105,0.12)' : active ? 'rgba(245,166,35,0.18)' : '#f3f4f6',
      color: done ? '#059669' : active ? '#b7791f' : '#9ca3af' }}>
      {done ? '✔' : n}. {text}
    </div>
  );

  return (
    <div style={card}>
      <button onClick={() => (view !== 'main' ? setView('main') : onBack())} style={{ ...btn, marginBottom: '1rem' }}>← Back</button>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '0.5rem' }}>Coworking — Manage with your ID</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Enter the Coworking ID you received at registration to pay, register team members, or renew.
      </p>

      <form onSubmit={doLookup} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <input type="text" value={idInput} onChange={e => setIdInput(e.target.value)} required placeholder="e.g. C-01072026-001" style={{ ...inp, flex: 1, minWidth: '220px' }} />
        <button type="submit" style={btn}>Find</button>
      </form>

      {lookupId && !rec && <p style={{ color: '#dc2626' }}>Coworking ID not found. Please check and try again.</p>}

      {rec && view === 'main' && (
        <div>
          {/* Summary */}
          <div style={{ background: '#f3f4f6', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, color: '#2B4C7E' }}>{rec.company} <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>({rec.id})</span></h3>
              <span style={{ padding: '0.35rem 0.9rem', borderRadius: '12px', fontWeight: '600', fontSize: '0.85rem', background: meta.bg, color: meta.color }}>{meta.label}</span>
            </div>
            <p style={{ margin: '0.5rem 0 0', color: '#1f2937' }}>
              <strong>Period:</strong> {formatDate(rec.startDate)} → {formatDate(rec.endDate)}
              {isActive(rec) && left !== null && (
                <span style={{ marginLeft: '0.5rem', color: left < 0 ? '#dc2626' : left <= 2 ? '#b7791f' : '#6b7280' }}>
                  ({left < 0 ? `ended ${-left} day(s) ago` : left === 0 ? 'ends today' : `${left} day(s) left`})
                </span>
              )}
            </p>
            <p style={{ margin: '0.25rem 0 0', color: '#1f2937' }}>
              <strong>Seats:</strong> {rec.seats} &nbsp;|&nbsp; <strong>Members registered:</strong> {team.length} &nbsp;|&nbsp; <strong>Cycle:</strong> {rec.cycle || 1}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <Step n={1} text="Registered" done />
            <Step n={2} text="Approval" done={!awaitingApproval && rec.status !== 'rejected'} active={awaitingApproval} />
            <Step n={3} text="Payment" done={isPaid(rec)} active={!awaitingApproval && !isPaid(rec)} />
            <Step n={4} text="Members" done={isActive(rec) && team.length > 0} active={isActive(rec)} />
            <Step n={5} text="Renewal" done={false} active={canRenew(rec) || !!r} />
          </div>

          {isExited(rec) && <WaitingBox text={`This membership was exited on ${rec.exitedOn || '—'}. Register a new coworking request to start again.`} />}
          {rec.status === 'rejected' && <WaitingBox text={`This request was rejected.${rec.msg ? ' Reason: ' + rec.msg : ''}`} />}

          {awaitingApproval && <WaitingBox text="Your request has been received and is awaiting StartupTN approval. You will get an email once it is approved; then come back here with this ID to complete the payment." />}

          {/* Initial payment */}
          {needsInitialPayment && renderPayment("initial", "Step 3 — Complete your payment")}
          {initialSubmitted && <WaitingBox text={`Payment reference ${rec.payment?.reference} (₹${rec.payment?.amount}) submitted. Waiting for StartupTN to verify — member registration unlocks right after.`} />}
          {!isPaid(rec) && !isExited(rec) && rec.status !== 'rejected' && (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>🔒 Member registration is locked until your request is approved and the payment is verified.</p>
          )}

          {/* Pending renewal */}
          {r && !isExited(rec) && (
            <div style={{ border: '2px solid #7c3aed', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', color: '#7c3aed' }}>🔁 Renewal in progress</h3>
              <p style={{ margin: '0 0 0.25rem', color: '#1f2937' }}>
                New period: <strong>{formatDate(r.startDate)} → {formatDate(r.endDate)}</strong> | Total seats: <strong>{r.newSeats}</strong>
              </p>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                Leaving: {r.removeIds.length} | Unused seats released: {r.release || 0} | New additions: {r.addCount}. Changes apply once your payment is verified.
              </p>
              {renewalPaymentPending && <div style={{ marginTop: '1rem' }}>{renderPayment('renewal', 'Pay for renewal')}</div>}
              {r.paymentStatus === 'submitted' && <div style={{ marginTop: '1rem' }}><WaitingBox text={`Renewal payment ${r.payment?.reference} (₹${r.payment?.amount}) submitted. Waiting for verification.`} /></div>}
              {r.paymentStatus === 'unpaid' && <button onClick={cancelRenewal} style={{ ...btn, background: '#e5e7eb', color: '#1f2937' }}>Cancel renewal</button>}
            </div>
          )}

          {/* Members */}
          {isActive(rec) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, color: '#2B4C7E' }}>👥 Team Members ({team.length} / {rec.seats})</h3>
                {canAddMembers(rec, members)
                  ? <button onClick={openAddMember} style={{ ...btn, background: '#F5A623' }}>+ Add Member</button>
                  : <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>All seats filled</span>}
              </div>
              {team.length === 0 && <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No members registered yet.</p>}
              {team.map(m => (
                <div key={m.firebaseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#1f2937' }}>{m.name}</strong>
                    <span style={{ color: '#6b7280', fontSize: '0.9rem' }}> — {m.designation} · {m.email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEditMember(m)} style={{ padding: '0.4rem 0.9rem', background: 'rgba(45,74,124,0.1)', color: '#2B4C7E', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Edit</button>
                    <button onClick={() => removeMember(m)} style={{ padding: '0.4rem 0.9rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Renewal call-to-action */}
          {canRenew(rec) && (
            <div style={{ background: '#F5F3FF', border: '2px solid #7c3aed', borderRadius: '10px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', color: '#7c3aed' }}>Your period {left < 0 ? 'has ended' : 'is ending soon'}</h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Continue the space (reconfirm members, add or remove seats, pay) or exit.</p>
              </div>
              <button onClick={openRenew} style={{ ...btn, background: '#7c3aed' }}>Renew / Exit</button>
            </div>
          )}
        </div>
      )}

      {/* Member add/edit form */}
      {rec && view === 'member' && (
        <form onSubmit={submitMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <h3 style={{ gridColumn: '1 / -1', margin: 0, color: '#2B4C7E' }}>{editingMember ? `Edit member — ${editingMember.name}` : `Add member to ${rec.id}`}</h3>
          {[['Full Name *', 'name', 'text'], ['Designation *', 'designation', 'text'], ['Email ID *', 'email', 'email'], ["Father's Name *", 'fatherName', 'text']].map(([l, f, t]) => (
            <div key={f}><label style={label}>{l}</label>
              <input type={t} value={memberForm[f]} onChange={e => setMemberForm({ ...memberForm, [f]: e.target.value })} required style={inp} /></div>
          ))}
          <div><label style={label}>Contact Number *</label>
            <input type="tel" value={memberForm.contactNumber} onChange={e => setMemberForm({ ...memberForm, contactNumber: e.target.value.replace(/\D/g, '') })} maxLength="10" required style={inp} /></div>
          <div><label style={label}>Alternate Contact</label>
            <input type="tel" value={memberForm.alternateContact} onChange={e => setMemberForm({ ...memberForm, alternateContact: e.target.value.replace(/\D/g, '') })} maxLength="10" style={inp} /></div>
          <div><label style={label}>Gender *</label>
            <select value={memberForm.gender} onChange={e => setMemberForm({ ...memberForm, gender: e.target.value })} required style={inp}>
              <option value="">Select</option>{['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label style={label}>Aadhar Number *</label>
            <input type="text" value={memberForm.aadharNo} onChange={e => setMemberForm({ ...memberForm, aadharNo: e.target.value.replace(/\D/g, '') })} maxLength="12" required style={inp} placeholder="12-digit" /></div>
          <div><label style={label}>Date of Birth *</label>
            <input type="date" value={memberForm.dob} onChange={e => setMemberForm({ ...memberForm, dob: e.target.value })} required style={inp} /></div>
          <div><label style={label}>Marital Status</label>
            <select value={memberForm.maritalStatus} onChange={e => setMemberForm({ ...memberForm, maritalStatus: e.target.value })} style={inp}>
              <option value="">Select</option>{['Single', 'Married', 'Divorced', 'Widowed'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label style={label}>Blood Group</label>
            <select value={memberForm.bloodGroup} onChange={e => setMemberForm({ ...memberForm, bloodGroup: e.target.value })} style={inp}>
              <option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          {[['Permanent Address *', 'permanentAddress', true], ['Communication Address', 'communicationAddress', false], ['Office Address', 'officeAddress', false]].map(([l, f, req]) => (
            <div key={f} style={{ gridColumn: '1 / -1' }}><label style={label}>{l}</label>
              <textarea value={memberForm[f]} onChange={e => setMemberForm({ ...memberForm, [f]: e.target.value })} required={req} style={{ ...inp, minHeight: '80px' }} /></div>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
            <button type="submit" disabled={busy} style={{ ...btn, flex: 1 }}>{editingMember ? 'Save Changes' : 'Submit Member Details'}</button>
            <button type="button" onClick={() => setView('main')} style={{ ...btn, flex: 1, background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Renewal form */}
      {rec && view === 'renew' && renewForm && (
        <form onSubmit={submitRenewal}>
          <h3 style={{ color: '#2B4C7E', marginTop: 0 }}>Renew or exit — {rec.id}</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {[['continue', '✅ Yes, continue the space'], ['exit', '🚪 No, I want to exit']].map(([v, t]) => (
              <label key={v} style={{ flex: 1, minWidth: '220px', padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#1f2937',
                border: `2px solid ${renewForm.decision === v ? '#7c3aed' : '#d1d5db'}`, background: renewForm.decision === v ? '#F5F3FF' : '#fff' }}>
                <input type="radio" name="decision" checked={renewForm.decision === v} onChange={() => setRenewForm({ ...renewForm, decision: v })} style={{ marginRight: '0.5rem' }} />{t}
              </label>
            ))}
          </div>

          {renewForm.decision === 'continue' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div><label style={label}>New Start Date *</label>
                  <input type="date" min={addDays(rec.endDate, 1)} value={renewForm.startDate} onChange={e => setRenewForm({ ...renewForm, startDate: e.target.value })} required style={inp} /></div>
                <div><label style={label}>New End Date *</label>
                  <input type="date" min={renewForm.startDate} value={renewForm.endDate} onChange={e => setRenewForm({ ...renewForm, endDate: e.target.value })} required style={inp} /></div>
                <div><label style={label}>Additional members joining *</label>
                  <input type="number" min="0" value={renewForm.addCount} onChange={e => setRenewForm({ ...renewForm, addCount: e.target.value })} required style={inp} /></div>
                {seatsFree(rec, members) > 0 && (
                  <div><label style={label}>Release unused seats (max {seatsFree(rec, members)})</label>
                    <input type="number" min="0" max={seatsFree(rec, members)} value={renewForm.release} onChange={e => setRenewForm({ ...renewForm, release: e.target.value })} style={inp} /></div>
                )}
              </div>

              <h4 style={{ color: '#2B4C7E', marginBottom: '0.5rem' }}>Confirm existing members — untick anyone who is leaving</h4>
              {team.length === 0 && <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No registered members.</p>}
              {team.map(m => {
                const leaving = renewForm.removeIds.includes(m.firebaseId);
                return (
                  <label key={m.firebaseId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'pointer', background: leaving ? '#FEF2F2' : '#fff', color: '#1f2937' }}>
                    <input type="checkbox" checked={!leaving} onChange={() => setRenewForm({ ...renewForm, removeIds: leaving ? renewForm.removeIds.filter(i => i !== m.firebaseId) : [...renewForm.removeIds, m.firebaseId] })} />
                    <span style={{ textDecoration: leaving ? 'line-through' : 'none' }}><strong>{m.name}</strong> — {m.designation}</span>
                    {leaving && <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>leaving</span>}
                  </label>
                );
              })}
              <div style={{ margin: '1rem 0 1.5rem', padding: '1rem', background: '#F5F3FF', borderRadius: '8px', color: '#1f2937' }}>
                <strong>Total seats after renewal: {renewSeats}</strong>
                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}> = {rec.seats} current − {renewForm.removeIds.length} leaving − {parseInt(renewForm.release) || 0} released + {parseInt(renewForm.addCount) || 0} new</span>
                <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
                  After you pay and StartupTN verifies, you can add the new members' details and edit existing ones here.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" disabled={busy} style={{ ...btn, flex: 1, background: renewForm.decision === 'exit' ? '#dc2626' : '#7c3aed' }}>
              {renewForm.decision === 'exit' ? 'Confirm Exit' : 'Confirm & Continue to Payment'}
            </button>
            <button type="button" onClick={() => setView('main')} style={{ ...btn, flex: 1, background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CoworkPortal;
