import React, { useState, useEffect } from 'react';
import { Users, Calendar, Download, Edit2, Trash2, CheckCircle, XCircle, Building, LogOut, MapPin, Mail, Phone, Briefcase, Plus, Minus } from 'lucide-react';
import * as XLSX from 'xlsx';

const VisitorManagementSystem = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('home');
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [emailModal, setEmailModal] = useState(null);
  
  const [visitors, setVisitors] = useState([]);
  const [events, setEvents] = useState([]);
  const [halls, setHalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [coworking, setCoworking] = useState([]);
  
  const [vForm, setVForm] = useState({ name: '', email: '', phone: '', countryCode: '+91', company: '', purpose: '', host: '', accompanying: [] });
  const [eForm, setEForm] = useState({ eventName: '', organizer: '', partner: '', type: '', date: '', start: '', end: '', venue: '', desc: '', max: '' });
  const [hForm, setHForm] = useState({ name: '', capacity: '', facilities: '', rate: '', location: '', avail: 'available' });
  const [bForm, setBForm] = useState({ 
    hallId: '', hallName: '', organizerName: '', email: '', 
    phone: '', countryCode: '+91', organization: '', purpose: '', 
    date: '', start: '', end: '', attendees: '', req: '' 
  });
  const [cForm, setCForm] = useState({ 
    name: '', email: '', phone: '', countryCode: '+91', 
    company: '', seats: '', duration: '', startDate: '', purpose: '' 
  });
  const [regForm, setRegForm] = useState({ 
    eventId: '', name: '', email: '', phone: '', countryCode: '+91', 
    company: '', designation: '', accompanying: [] 
  });
  
  const [editV, setEditV] = useState(null);
  const [editE, setEditE] = useState(null);
  const [editH, setEditH] = useState(null);
  
  // Generate auto ID
  const generateId = (prefix, existingItems) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB').split('/').join('');
    const todayItems = existingItems.filter(item => item.id?.startsWith(`${prefix}-${dateStr}`));
    const seq = (todayItems.length + 1).toString().padStart(3, '0');
    return `${prefix}-${dateStr}-${seq}`;
  };
  
  // Get today's date
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Validate phone
  const validatePhone = (phone, countryCode) => {
    if (countryCode === '+91') {
      return /^[6-9]\d{9}$/.test(phone);
    }
    return phone.length >= 10;
  };
  
  // Get upcoming events
  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= today;
    });
  };
  
  // Check hall availability
  const isHallAvailable = (hallId, date) => {
    const approvedBookings = bookings.filter(b => 
      b.hallId === hallId && 
      b.date === date && 
      b.status === 'approved'
    );
    return approvedBookings.length;
  };
  
  useEffect(() => {
    try {
      const v = localStorage.getItem('visitors');
      const e = localStorage.getItem('events');
      const h = localStorage.getItem('halls');
      const b = localStorage.getItem('bookings');
      const c = localStorage.getItem('coworking');
      
      if (v) setVisitors(JSON.parse(v));
      if (e) setEvents(JSON.parse(e));
      if (h) setHalls(JSON.parse(h));
      if (b) setBookings(JSON.parse(b));
      if (c) setCoworking(JSON.parse(c));
    } catch (err) {
      console.error('Error loading:', err);
    }
  }, []);
  
  const saveV = (d) => { try { localStorage.setItem('visitors', JSON.stringify(d)); setVisitors(d); } catch (err) { console.error('Error:', err); alert('Error saving!'); } };
  const saveE = (d) => { try { localStorage.setItem('events', JSON.stringify(d)); setEvents(d); } catch (err) { console.error('Error:', err); alert('Error saving!'); } };
  const saveH = (d) => { try { localStorage.setItem('halls', JSON.stringify(d)); setHalls(d); } catch (err) { console.error('Error:', err); alert('Error saving!'); } };
  const saveB = (d) => { try { localStorage.setItem('bookings', JSON.stringify(d)); setBookings(d); } catch (err) { console.error('Error:', err); alert('Error saving!'); } };
  const saveC = (d) => { try { localStorage.setItem('coworking', JSON.stringify(d)); setCoworking(d); } catch (err) { console.error('Error:', err); alert('Error saving!'); } };
  
  const login = (e) => { e.preventDefault(); if (loginData.user === 'admin' && loginData.pass === 'startuptn@2026') { setIsAdmin(true); setTab('admin-v'); setLoginData({ user: '', pass: '' }); } else { alert('Invalid!'); } };
  
  const submitV = (e) => { 
    e.preventDefault(); 
    if (!validatePhone(vForm.phone, vForm.countryCode)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    const v = { 
      id: editV?.id || generateId('V', visitors), 
      ...vForm, 
      fullPhone: vForm.countryCode + vForm.phone,
      time: editV?.time || new Date().toLocaleString() 
    }; 
    const up = editV ? visitors.map(x => x.id === editV.id ? v : x) : [...visitors, v]; 
    saveV(up); 
    setVForm({ name: '', email: '', phone: '', countryCode: '+91', company: '', purpose: '', host: '', accompanying: [] }); 
    setEditV(null); 
    if (!isAdmin) { 
      alert('Registered! Your Visitor ID: ' + v.id); 
      setTab('home'); 
    } 
  };
  
  const submitE = (e) => { 
    e.preventDefault(); 
    const eventDate = new Date(eForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      alert('Event date cannot be in the past!');
      return;
    }
    
    const ev = { 
      id: editE?.id || generateId('E', events), 
      ...eForm, 
      regs: editE?.regs || [], 
      created: editE?.created || new Date().toLocaleString() 
    }; 
    const up = editE ? events.map(x => x.id === editE.id ? ev : x) : [...events, ev]; 
    saveE(up); 
    setEForm({ eventName: '', organizer: '', partner: '', type: '', date: '', start: '', end: '', venue: '', desc: '', max: '' }); 
    setEditE(null); 
    alert('Event saved! Event ID: ' + ev.id); 
  };
  
  const submitH = (e) => { 
    e.preventDefault(); 
    const h = { 
      id: editH?.id || generateId('H', halls), 
      ...hForm, 
      created: editH?.created || new Date().toLocaleString() 
    }; 
    const up = editH ? halls.map(x => x.id === editH.id ? h : x) : [...halls, h]; 
    saveH(up); 
    setHForm({ name: '', capacity: '', facilities: '', rate: '', location: '', avail: 'available' }); 
    setEditH(null); 
    alert('Hall saved! Hall ID: ' + h.id); 
  };
  
  const submitB = (e) => { 
    e.preventDefault(); 
    const bookingDate = new Date(bForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
      alert('Booking date cannot be in the past!');
      return;
    }
    
    if (!validatePhone(bForm.phone, bForm.countryCode)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    
    const b = { 
      id: generateId('B', bookings), 
      ...bForm, 
      fullPhone: bForm.countryCode + bForm.phone,
      status: 'pending', 
      submitted: new Date().toLocaleString() 
    }; 
    saveB([...bookings, b]); 
    setBForm({ hallId: '', hallName: '', organizerName: '', email: '', phone: '', countryCode: '+91', organization: '', purpose: '', date: '', start: '', end: '', attendees: '', req: '' }); 
    alert('Booking submitted! Booking ID: ' + b.id); 
    setTab('home'); 
  };
  
  const submitC = (e) => { 
    e.preventDefault(); 
    const startDate = new Date(cForm.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      alert('Start date cannot be in the past!');
      return;
    }
    
    if (!validatePhone(cForm.phone, cForm.countryCode)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    
    const c = { 
      id: generateId('C', coworking), 
      ...cForm, 
      fullPhone: cForm.countryCode + cForm.phone,
      status: 'pending', 
      submitted: new Date().toLocaleString() 
    }; 
    saveC([...coworking, c]); 
    setCForm({ name: '', email: '', phone: '', countryCode: '+91', company: '', seats: '', duration: '', startDate: '', purpose: '' }); 
    alert('Request submitted! Coworking ID: ' + c.id); 
    setTab('home'); 
  };
  
  const submitReg = (e) => { 
    e.preventDefault(); 
    if (!validatePhone(regForm.phone, regForm.countryCode)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    const r = { 
      id: Date.now().toString(), 
      ...regForm, 
      fullPhone: regForm.countryCode + regForm.phone,
      time: new Date().toLocaleString() 
    }; 
    const up = events.map(ev => ev.id === regForm.eventId ? { ...ev, regs: [...(ev.regs || []), r] } : ev); 
    saveE(up); 
    setRegForm({ eventId: '', name: '', email: '', phone: '', countryCode: '+91', company: '', designation: '', accompanying: [] }); 
    alert('Registered!'); 
    setTab('home'); 
  };
  
  const sendEmail = (to, subject, body) => {
    setEmailModal({ to, subject, body });
  };
  
  const updateBooking = (id, status, msg = '') => { 
    const booking = bookings.find(b => b.id === id);
    const up = bookings.map(b => b.id === id ? { ...b, status, msg, reviewed: new Date().toLocaleString() } : b); 
    saveB(up); 
    
    if (booking && status !== 'pending') {
      const subject = status === 'approved' 
        ? `Hall Booking Approved - ${booking.hallName}` 
        : `Hall Booking Update - ${booking.hallName}`;
      
      const body = status === 'approved'
        ? `Dear ${booking.organizerName},\n\nYour hall booking request has been APPROVED!\n\nBooking ID: ${booking.id}\n\nDetails:\n- Hall: ${booking.hallName}\n- Date: ${booking.date}\n- Time: ${booking.start} - ${booking.end}\n- Attendees: ${booking.attendees}\n${booking.req ? `\nSpecial Requirements:\n${booking.req}\n` : ''}\n${msg ? `\nAdmin Message: ${msg}\n` : ''}\nPlease contact us if you have any questions.\n\nBest regards,\nStartupTN Team`
        : `Dear ${booking.organizerName},\n\nYour hall booking request has been reviewed.\n\nBooking ID: ${booking.id}\nStatus: ${status.toUpperCase()}\n${booking.req ? `\nYour Requirements:\n${booking.req}\n` : ''}\n${msg ? `\nReason: ${msg}\n` : ''}\nBest regards,\nStartupTN Team`;
      
      sendEmail(booking.email, subject, body);
    }
  };
  
  const updateCowork = (id, status, msg = '') => { 
    const request = coworking.find(c => c.id === id);
    const up = coworking.map(c => c.id === id ? { ...c, status, msg, reviewed: new Date().toLocaleString() } : c); 
    saveC(up); 
    
    if (request && status !== 'pending') {
      const subject = status === 'approved' 
        ? `Coworking Space Approved - StartupTN` 
        : `Coworking Space Request Update - StartupTN`;
      
      const body = status === 'approved'
        ? `Dear ${request.name},\n\nYour coworking space request has been APPROVED!\n\nCoworking ID: ${request.id}\n\nDetails:\n- Seats: ${request.seats}\n- Duration: ${request.duration}\n- Start Date: ${request.startDate}\n- Company: ${request.company}\n\n${msg ? `Admin Message: ${msg}\n\n` : ''}We look forward to welcoming you to StartupTN!\n\nBest regards,\nStartupTN Team`
        : `Dear ${request.name},\n\nYour coworking space request has been reviewed.\n\nCoworking ID: ${request.id}\n\nDetails:\n- Status: ${status.toUpperCase()}\n- Seats Requested: ${request.seats}\n- Duration: ${request.duration}\n\n${msg ? `Reason: ${msg}\n\n` : ''}Please contact us if you have any questions.\n\nBest regards,\nStartupTN Team`;
      
      sendEmail(request.email, subject, body);
    }
  };
  
  const exportToExcel = (data, fileName) => {
    if (!data?.length) { 
      alert('No data to export'); 
      return; 
    }
    
    const ws_data = [];
    const headers = Object.keys(data[0]).map(key => 
      key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    );
    ws_data.push(headers);
    data.forEach(item => ws_data.push(Object.values(item)));
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const colWidths = headers.map((header, i) => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(Object.values(row)[i] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const today = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}_${today}.xlsx`;
    XLSX.writeFile(wb, fullFileName);
    alert(`Excel file exported: ${fullFileName}`);
  };
  
  const inp = { width: '100%', padding: '0.75rem', background: '#ffffff', border: '2px solid #d1d5db', borderRadius: '6px', color: '#1f2937', fontSize: '0.95rem' };
  const btn = { padding: '0.75rem 1.5rem', background: '#2B4C7E', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' };
  const btnAccent = { padding: '0.75rem 1.5rem', background: '#F5A623', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' };
  const card = { background: '#ffffff', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' };
  
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Inter, sans-serif', color: '#1f2937' }}>
      <div style={{ background: '#2B4C7E', padding: '1.5rem 2rem', borderBottom: '4px solid #F5A623', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/StartupTN_logo.png" alt="StartupTN Logo" style={{ height: '50px', width: 'auto' }} />
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: '#ffffff' }}>Visitor Management</h1>
          </div>
          {isAdmin && <button onClick={() => { setIsAdmin(false); setTab('home'); }} style={{ padding: '0.5rem 1rem', background: '#ffffff', color: '#2B4C7E', fontWeight: '600', border: '2px solid #F5A623', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LogOut size={18} /> Logout</button>}
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap', background: '#ffffff' }}>
        <button onClick={() => setTab('home')} style={{ padding: '0.75rem 1.5rem', background: tab === 'home' ? '#2B4C7E' : 'transparent', color: tab === 'home' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0', fontWeight: tab === 'home' ? '600' : '500', borderBottom: tab === 'home' ? '3px solid #F5A623' : 'none' }}>Home</button>
        {!isAdmin ? (
          <>
            <button onClick={() => setTab('v-entry')} style={{ padding: '0.75rem 1.5rem', background: tab === 'v-entry' ? '#2B4C7E' : 'transparent', color: tab === 'v-entry' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'v-entry' ? '600' : '500', borderBottom: tab === 'v-entry' ? '3px solid #F5A623' : 'none' }}>Visitor Entry</button>
            <button onClick={() => setTab('e-reg')} style={{ padding: '0.75rem 1.5rem', background: tab === 'e-reg' ? '#2B4C7E' : 'transparent', color: tab === 'e-reg' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'e-reg' ? '600' : '500', borderBottom: tab === 'e-reg' ? '3px solid #F5A623' : 'none' }}>Event Registration</button>
            <button onClick={() => setTab('h-book')} style={{ padding: '0.75rem 1.5rem', background: tab === 'h-book' ? '#2B4C7E' : 'transparent', color: tab === 'h-book' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'h-book' ? '600' : '500', borderBottom: tab === 'h-book' ? '3px solid #F5A623' : 'none' }}>Hall Booking</button>
            <button onClick={() => setTab('cowork')} style={{ padding: '0.75rem 1.5rem', background: tab === 'cowork' ? '#2B4C7E' : 'transparent', color: tab === 'cowork' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'cowork' ? '600' : '500', borderBottom: tab === 'cowork' ? '3px solid #F5A623' : 'none' }}>Coworking</button>
            <button onClick={() => setTab('login')} style={{ padding: '0.75rem 1.5rem', background: tab === 'login' ? '#2B4C7E' : 'transparent', color: tab === 'login' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'login' ? '600' : '500', borderBottom: tab === 'login' ? '3px solid #F5A623' : 'none' }}>Admin</button>
          </>
        ) : (
          <>
            <button onClick={() => setTab('admin-v')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-v' ? '#2B4C7E' : 'transparent', color: tab === 'admin-v' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-v' ? '600' : '500', borderBottom: tab === 'admin-v' ? '3px solid #F5A623' : 'none' }}>Visitors</button>
            <button onClick={() => setTab('admin-e')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-e' ? '#2B4C7E' : 'transparent', color: tab === 'admin-e' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-e' ? '600' : '500', borderBottom: tab === 'admin-e' ? '3px solid #F5A623' : 'none' }}>Events</button>
            <button onClick={() => setTab('admin-h')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-h' ? '#2B4C7E' : 'transparent', color: tab === 'admin-h' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-h' ? '600' : '500', borderBottom: tab === 'admin-h' ? '3px solid #F5A623' : 'none' }}>Halls</button>
            <button onClick={() => setTab('admin-b')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-b' ? '#2B4C7E' : 'transparent', color: tab === 'admin-b' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-b' ? '600' : '500', borderBottom: tab === 'admin-b' ? '3px solid #F5A623' : 'none' }}>Bookings</button>
            <button onClick={() => setTab('admin-c')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-c' ? '#2B4C7E' : 'transparent', color: tab === 'admin-c' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-c' ? '600' : '500', borderBottom: tab === 'admin-c' ? '3px solid #F5A623' : 'none' }}>Coworking</button>
          </>
        )}
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {tab === 'home' && (
          <div>
            <div style={{ ...card, textAlign: 'center', background: 'linear-gradient(135deg, #2B4C7E 0%, #1e3a5f 100%)', color: '#ffffff', border: '3px solid #F5A623' }}>
              <h1 style={{ color: '#F5A623', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome to StartupTN</h1>
              <p style={{ color: '#ffffff', fontSize: '1.1rem', opacity: 0.9 }}>Tamil Nadu's Premier Startup Ecosystem Hub</p>
            </div>
            {!isAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {[
                  { t: 'Visitor Entry', i: Users, tab: 'v-entry' },
                  { t: 'Event Registration', i: Calendar, tab: 'e-reg' },
                  { t: 'Hall Booking', i: Building, tab: 'h-book' },
                  { t: 'Coworking Space', i: Briefcase, tab: 'cowork' }
                ].map(x => (
                  <div key={x.tab} onClick={() => setTab(x.tab)} style={{ ...card, cursor: 'pointer', border: '3px solid #2B4C7E', textAlign: 'center', transition: 'all 0.3s' }}>
                    <x.i size={48} color="#F5A623" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>{x.t}</h3>
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <div>
                <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '1.5rem' }}>Dashboard</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {[
                    { t: 'Visitors', v: visitors.length, i: Users },
                    { t: 'Events', v: events.length, i: Calendar },
                    { t: 'Pending Bookings', v: bookings.filter(b => b.status === 'pending').length, i: Building },
                    { t: 'Coworking Requests', v: coworking.filter(c => c.status === 'pending').length, i: Briefcase }
                  ].map(x => (
                    <div key={x.t} style={{ ...card, textAlign: 'center', background: 'linear-gradient(135deg, #2B4C7E 0%, #1e3a5f 100%)', border: '2px solid #F5A623' }}>
                      <x.i size={32} color="#F5A623" />
                      <h3 style={{ color: '#ffffff', marginTop: '0.5rem', fontSize: '2rem' }}>{x.v}</h3>
                      <p style={{ color: '#ffffff', opacity: 0.9 }}>{x.t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

{tab === 'v-entry' && (
  <div style={card}>
    <button onClick={() => setTab('home')} style={{ ...btn, marginBottom: '1rem' }}>← Back</button>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '1.5rem' }}>Visitor Registration</h2>
    <form onSubmit={submitV} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Name *</label>
        <input type="text" value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Email *</label>
        <input type="email" value={vForm.email} onChange={(e) => setVForm({ ...vForm, email: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Phone Number *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={vForm.countryCode} 
            onChange={(e) => setVForm({...vForm, countryCode: e.target.value})}
            style={inp}
            placeholder="+91"
          />
          <input 
            type="tel" 
            value={vForm.phone} 
            onChange={(e) => setVForm({...vForm, phone: e.target.value.replace(/\D/g, '')})}
            pattern="[0-9]{10}"
            maxLength="10"
            required
            style={inp}
            placeholder="10-digit mobile"
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Company *</label>
        <input type="text" value={vForm.company} onChange={(e) => setVForm({ ...vForm, company: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Purpose *</label>
        <input type="text" value={vForm.purpose} onChange={(e) => setVForm({ ...vForm, purpose: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Host *</label>
        <input type="text" value={vForm.host} onChange={(e) => setVForm({ ...vForm, host: e.target.value })} required style={inp} />
      </div>
      
      <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <label style={{ color: '#2B4C7E', fontWeight: '600' }}>Accompanying Visitors (Optional)</label>
          <button 
            type="button"
            onClick={() => setVForm({
              ...vForm, 
              accompanying: [...vForm.accompanying, {name:'', phone:'', countryCode:'+91', company:''}]
            })}
            style={{ ...btn, padding: '0.5rem 1rem', background: '#0d8c4f' }}
          >
            <Plus size={16} /> Add Companion
          </button>
        </div>
        
        {vForm.accompanying.map((comp, idx) => (
          <div key={idx} style={{ background: '#ffffff', padding: '1rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <input 
                type="text"
                placeholder="Name *"
                value={comp.name}
                onChange={(e) => {
                  const newAcc = [...vForm.accompanying];
                  newAcc[idx].name = e.target.value;
                  setVForm({...vForm, accompanying: newAcc});
                }}
                style={inp}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                <input 
                  type="text"
                  value={comp.countryCode}
                  onChange={(e) => {
                    const newAcc = [...vForm.accompanying];
                    newAcc[idx].countryCode = e.target.value;
                    setVForm({...vForm, accompanying: newAcc});
                  }}
                  style={inp}
                  placeholder="+91"
                />
                <input 
                  type="tel"
                  placeholder="Phone *"
                  value={comp.phone}
                  onChange={(e) => {
                    const newAcc = [...vForm.accompanying];
                    newAcc[idx].phone = e.target.value.replace(/\D/g, '');
                    setVForm({...vForm, accompanying: newAcc});
                  }}
                  pattern="[0-9]{10}"
                  maxLength="10"
                  style={inp}
                />
              </div>
              <input 
                type="text"
                placeholder="Company"
                value={comp.company}
                onChange={(e) => {
                  const newAcc = [...vForm.accompanying];
                  newAcc[idx].company = e.target.value;
                  setVForm({...vForm, accompanying: newAcc});
                }}
                style={inp}
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                const newAcc = vForm.accompanying.filter((_, i) => i !== idx);
                setVForm({...vForm, accompanying: newAcc});
              }}
              style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <Minus size={16} /> Remove
            </button>
          </div>
        ))}
      </div>
      
      <div style={{ gridColumn: '1 / -1' }}>
        <button type="submit" style={{ ...btn, width: '100%' }}>Submit Registration</button>
      </div>
    </form>
  </div>
)}

{tab === 'e-reg' && (
  <div style={card}>
    <button onClick={() => setTab('home')} style={{ ...btn, marginBottom: '1rem' }}>← Back</button>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '1.5rem' }}>Event Registration</h2>
    {getUpcomingEvents().length === 0 ? (
      <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No upcoming events available</p>
    ) : (
      <form onSubmit={submitReg} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Select Event *</label>
          <select value={regForm.eventId} onChange={(e) => setRegForm({ ...regForm, eventId: e.target.value })} required style={inp}>
            <option value="">Choose event</option>
            {getUpcomingEvents().map(e => <option key={e.id} value={e.id}>{e.eventName} - {e.date}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Name *</label>
            <input type="text" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Email *</label>
            <input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Phone Number *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={regForm.countryCode} 
                onChange={(e) => setRegForm({...regForm, countryCode: e.target.value})}
                style={inp}
                placeholder="+91"
              />
              <input 
                type="tel" 
                value={regForm.phone} 
                onChange={(e) => setRegForm({...regForm, phone: e.target.value.replace(/\D/g, '')})}
                pattern="[0-9]{10}"
                maxLength="10"
                required
                style={inp}
                placeholder="10-digit mobile"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Company</label>
            <input type="text" value={regForm.company} onChange={(e) => setRegForm({ ...regForm, company: e.target.value })} style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Designation</label>
            <input type="text" value={regForm.designation} onChange={(e) => setRegForm({ ...regForm, designation: e.target.value })} style={inp} />
          </div>
        </div>
        
        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ color: '#2B4C7E', fontWeight: '600' }}>Accompanying Visitors (Optional)</label>
            <button 
              type="button"
              onClick={() => setRegForm({
                ...regForm, 
                accompanying: [...regForm.accompanying, {name:'', phone:'', countryCode:'+91', company:''}]
              })}
              style={{ ...btn, padding: '0.5rem 1rem', background: '#0d8c4f' }}
            >
              <Plus size={16} /> Add Companion
            </button>
          </div>
          
          {regForm.accompanying.map((comp, idx) => (
            <div key={idx} style={{ background: '#ffffff', padding: '1rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <input 
                  type="text"
                  placeholder="Name *"
                  value={comp.name}
                  onChange={(e) => {
                    const newAcc = [...regForm.accompanying];
                    newAcc[idx].name = e.target.value;
                    setRegForm({...regForm, accompanying: newAcc});
                  }}
                  style={inp}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                  <input 
                    type="text"
                    value={comp.countryCode}
                    onChange={(e) => {
                      const newAcc = [...regForm.accompanying];
                      newAcc[idx].countryCode = e.target.value;
                      setRegForm({...regForm, accompanying: newAcc});
                    }}
                    style={inp}
                    placeholder="+91"
                  />
                  <input 
                    type="tel"
                    placeholder="Phone *"
                    value={comp.phone}
                    onChange={(e) => {
                      const newAcc = [...regForm.accompanying];
                      newAcc[idx].phone = e.target.value.replace(/\D/g, '');
                      setRegForm({...regForm, accompanying: newAcc});
                    }}
                    pattern="[0-9]{10}"
                    maxLength="10"
                    style={inp}
                  />
                </div>
                <input 
                  type="text"
                  placeholder="Company"
                  value={comp.company}
                  onChange={(e) => {
                    const newAcc = [...regForm.accompanying];
                    newAcc[idx].company = e.target.value;
                    setRegForm({...regForm, accompanying: newAcc});
                  }}
                  style={inp}
                />
              </div>
              <button 
                type="button"
                onClick={() => {
                  const newAcc = regForm.accompanying.filter((_, i) => i !== idx);
                  setRegForm({...regForm, accompanying: newAcc});
                }}
                style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Minus size={16} /> Remove
              </button>
            </div>
          ))}
        </div>
        
        <button type="submit" style={{ ...btn, width: '100%' }}>Register for Event</button>
      </form>
    )}
  </div>
)}

{tab === 'h-book' && (
  <div style={card}>
    <button onClick={() => setTab('home')} style={{ ...btn, marginBottom: '1rem' }}>← Back</button>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '1.5rem' }}>Hall Booking Request</h2>
    {halls.length > 0 && (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#2B4C7E', fontWeight: '600', marginBottom: '1rem' }}>Available Halls</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {halls.filter(h => h.avail === 'available').map(h => {
            const bookingCount = isHallAvailable(h.id, bForm.date);
            return (
              <div key={h.id} style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', border: '2px solid #2B4C7E' }}>
                <h4 style={{ color: '#2B4C7E' }}>{h.name}</h4>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Capacity: {h.capacity}</p>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>₹{h.rate}/hour</p>
                {bookingCount > 0 && (
                  <p style={{ color: '#F5A623', fontSize: '0.85rem', fontWeight: '600' }}>
                    {bookingCount} approved booking(s) for selected date
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
    
    <form onSubmit={submitB} style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Select Hall *</label>
          <select value={bForm.hallId} onChange={(e) => { const h = halls.find(x => x.id === e.target.value); setBForm({ ...bForm, hallId: e.target.value, hallName: h?.name || '' }); }} required style={inp}>
            <option value="">Choose hall</option>
            {halls.filter(h => h.avail === 'available').map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Organizer Name *</label>
          <input 
            type="text" 
            value={bForm.organizerName} 
            onChange={(e) => setBForm({...bForm, organizerName: e.target.value})}
            required
            style={inp}
            placeholder="Name of person booking"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Email *</label>
          <input type="email" value={bForm.email} onChange={(e) => setBForm({ ...bForm, email: e.target.value })} required style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Phone Number *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={bForm.countryCode} 
              onChange={(e) => setBForm({...bForm, countryCode: e.target.value})}
              style={inp}
              placeholder="+91"
            />
            <input 
              type="tel" 
              value={bForm.phone} 
              onChange={(e) => setBForm({...bForm, phone: e.target.value.replace(/\D/g, '')})}
              pattern="[0-9]{10}"
              maxLength="10"
              required
              style={inp}
              placeholder="10-digit mobile"
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Organization *</label>
          <input 
            type="text" 
            value={bForm.organization} 
            onChange={(e) => setBForm({...bForm, organization: e.target.value})}
            required
            style={inp}
            placeholder="Company/Group name"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Purpose *</label>
          <input type="text" value={bForm.purpose} onChange={(e) => setBForm({ ...bForm, purpose: e.target.value })} required style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Date *</label>
          <input 
            type="date" 
            value={bForm.date}
            min={getTodayDate()}
            onChange={(e) => setBForm({...bForm, date: e.target.value})}
            required
            style={inp}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Start Time *</label>
          <input type="time" value={bForm.start} onChange={(e) => setBForm({ ...bForm, start: e.target.value })} required style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>End Time *</label>
          <input type="time" value={bForm.end} onChange={(e) => setBForm({ ...bForm, end: e.target.value })} required style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Attendees *</label>
          <input type="number" value={bForm.attendees} onChange={(e) => setBForm({ ...bForm, attendees: e.target.value })} required style={inp} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Special Requirements</label>
        <textarea value={bForm.req} onChange={(e) => setBForm({ ...bForm, req: e.target.value })} style={{ ...inp, minHeight: '100px' }} />
      </div>
      <button type="submit" style={{ ...btn, width: '100%' }}>Submit Booking Request</button>
    </form>
  </div>
)}

{tab === 'cowork' && (
  <div style={card}>
    <button onClick={() => setTab('home')} style={{ ...btn, marginBottom: '1rem' }}>← Back</button>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '1.5rem' }}>Coworking Space Request</h2>
    <form onSubmit={submitC} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Name *</label>
        <input type="text" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Email *</label>
        <input type="email" value={cForm.email} onChange={(e) => setCForm({ ...cForm, email: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Phone Number *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={cForm.countryCode} 
            onChange={(e) => setCForm({...cForm, countryCode: e.target.value})}
            style={inp}
            placeholder="+91"
          />
          <input 
            type="tel" 
            value={cForm.phone} 
            onChange={(e) => setCForm({...cForm, phone: e.target.value.replace(/\D/g, '')})}
            pattern="[0-9]{10}"
            maxLength="10"
            required
            style={inp}
            placeholder="10-digit mobile"
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Company *</label>
        <input type="text" value={cForm.company} onChange={(e) => setCForm({ ...cForm, company: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Seats *</label>
        <input type="number" value={cForm.seats} onChange={(e) => setCForm({ ...cForm, seats: e.target.value })} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Start Date *</label>
        <input 
          type="date" 
          value={cForm.startDate}
          min={getTodayDate()}
          onChange={(e) => setCForm({...cForm, startDate: e.target.value})}
          required
          style={inp}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Duration *</label>
        <select value={cForm.duration} onChange={(e) => setCForm({ ...cForm, duration: e.target.value })} required style={inp}>
          <option value="">Select</option>
          {['daily', 'weekly', 'monthly', 'quarterly'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Purpose *</label>
        <textarea value={cForm.purpose} onChange={(e) => setCForm({ ...cForm, purpose: e.target.value })} required style={{ ...inp, minHeight: '100px' }} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button type="submit" style={{ ...btn, width: '100%' }}>Submit Request</button>
      </div>
    </form>
  </div>
)}

{tab === 'login' && !isAdmin && (
  <div style={{ maxWidth: '500px', margin: '0 auto' }}>
    <div style={card}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>
      <form onSubmit={login}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Username</label>
          <input type="text" value={loginData.user} onChange={(e) => setLoginData({ ...loginData, user: e.target.value })} required style={inp} placeholder=" " />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Password</label>
          <input type="password" value={loginData.pass} onChange={(e) => setLoginData({ ...loginData, pass: e.target.value })} required style={inp} placeholder=" " />
        </div>
        <button type="submit" style={{ ...btn, width: '100%' }}>Login</button>
      </form>
    </div>
  </div>
)}

{tab === 'admin-v' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Visitor Management</h2>
      <button onClick={() => exportToExcel(visitors, 'StartupTN_Visitors')} style={btn}>
        <Download size={18} style={{ marginRight: '0.5rem' }} /> Export to Excel
      </button>
    </div>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600', marginTop: '2rem' }}>{editV ? 'Edit' : 'Add'} Visitor</h3>
    <form onSubmit={submitV} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      {['name', 'email', 'company', 'purpose', 'host'].map(f => (
        <input key={f} type={f === 'email' ? 'email' : 'text'} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={vForm[f]} onChange={(e) => setVForm({ ...vForm, [f]: e.target.value })} required style={inp} />
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
        <input 
          type="text" 
          value={vForm.countryCode} 
          onChange={(e) => setVForm({...vForm, countryCode: e.target.value})}
          style={inp}
          placeholder="+91"
        />
        <input 
          type="tel" 
          placeholder="Phone"
          value={vForm.phone} 
          onChange={(e) => setVForm({...vForm, phone: e.target.value.replace(/\D/g, '')})}
          pattern="[0-9]{10}"
          maxLength="10"
          required
          style={inp}
        />
      </div>
      <button type="submit" style={{ ...btn, gridColumn: '1 / -1' }}>{editV ? 'Update' : 'Add'} Visitor</button>
      {editV && <button type="button" onClick={() => { setEditV(null); setVForm({ name: '', email: '', phone: '', countryCode: '+91', company: '', purpose: '', host: '', accompanying: [] }); }} style={{ ...btn, gridColumn: '1 / -1', background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>}
    </form>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>All Visitors ({visitors.length})</h3>
    {visitors.length > 0 ? (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #2B4C7E' }}>
              {['ID', 'Name', 'Email', 'Phone', 'Company', 'Purpose', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#2B4C7E', fontWeight: '600' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visitors.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f9fafb' : 'transparent' }}>
                <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>{v.id}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{v.name}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>{v.email}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>{v.fullPhone || v.phone}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{v.company}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{v.purpose}</td>
                <td style={{ padding: '0.75rem' }}>
                  <button onClick={() => { setEditV(v); setVForm({ name: v.name, email: v.email, phone: v.phone, countryCode: v.countryCode || '+91', company: v.company, purpose: v.purpose, host: v.host, accompanying: v.accompanying || [] }); }} style={{ padding: '0.5rem', marginRight: '0.5rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                  <button onClick={() => { if (confirm('Delete?')) saveV(visitors.filter(x => x.id !== v.id)); }} style={{ padding: '0.5rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No visitors yet</p>}
  </div>
)}

{tab === 'admin-e' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Event Management</h2>
      <button onClick={() => exportToExcel(events, 'StartupTN_Events')} style={btn}><Download size={18} /> Export Excel</button>
    </div>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>{editE ? 'Edit' : 'Create'} Event</h3>
    <form onSubmit={submitE} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <input type="text" placeholder="Event Name *" value={eForm.eventName} onChange={(e) => setEForm({ ...eForm, eventName: e.target.value })} required style={inp} />
      <input type="text" placeholder="Organizer *" value={eForm.organizer} onChange={(e) => setEForm({ ...eForm, organizer: e.target.value })} required style={inp} />
      <input type="text" placeholder="Partner" value={eForm.partner} onChange={(e) => setEForm({ ...eForm, partner: e.target.value })} style={inp} />
      <select value={eForm.type} onChange={(e) => setEForm({ ...eForm, type: e.target.value })} required style={inp}>
        <option value="">Event Type *</option>
        {['workshop', 'seminar', 'networking', 'conference', 'meetup'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
      </select>
      <input type="date" value={eForm.date} min={getTodayDate()} onChange={(e) => setEForm({ ...eForm, date: e.target.value })} required style={inp} />
      <input type="time" placeholder="Start Time" value={eForm.start} onChange={(e) => setEForm({ ...eForm, start: e.target.value })} required style={inp} />
      <input type="time" placeholder="End Time" value={eForm.end} onChange={(e) => setEForm({ ...eForm, end: e.target.value })} required style={inp} />
      <input type="text" placeholder="Venue *" value={eForm.venue} onChange={(e) => setEForm({ ...eForm, venue: e.target.value })} required style={inp} />
      <input type="number" placeholder="Max Attendees" value={eForm.max} onChange={(e) => setEForm({ ...eForm, max: e.target.value })} style={inp} />
      <div style={{ gridColumn: '1 / -1' }}>
        <textarea placeholder="Description *" value={eForm.desc} onChange={(e) => setEForm({ ...eForm, desc: e.target.value })} required style={{ ...inp, minHeight: '100px' }} />
      </div>
      <button type="submit" style={{ ...btn, gridColumn: '1 / -1' }}>{editE ? 'Update' : 'Create'} Event</button>
      {editE && <button type="button" onClick={() => { setEditE(null); setEForm({ eventName: '', organizer: '', partner: '', type: '', date: '', start: '', end: '', venue: '', desc: '', max: '' }); }} style={{ ...btn, gridColumn: '1 / -1', background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>}
    </form>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>All Events ({events.length})</h3>
    {events.length > 0 ? events.map(e => (
      <div key={e.id} style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', border: '2px solid #2B4C7E' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#2B4C7E', fontWeight: '600', margin: '0 0 0.5rem' }}>{e.eventName} <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>({e.id})</span></h3>
            <p style={{ color: '#6b7280', margin: '0.25rem 0' }}><Calendar size={16} style={{ verticalAlign: 'middle' }} /> {e.date} | {e.start} - {e.end}</p>
            <p style={{ color: '#6b7280', margin: '0.25rem 0' }}><MapPin size={16} style={{ verticalAlign: 'middle' }} /> {e.venue}</p>
            <p style={{ color: '#1f2937', margin: '0.5rem 0' }}>{e.desc}</p>
            <p style={{ color: '#2B4C7E', fontWeight: '600' }}>Registrations: {e.regs?.length || 0}{e.max && ` / ${e.max}`}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', height: 'fit-content' }}>
            <button onClick={() => { setEditE(e); setEForm({ eventName: e.eventName, organizer: e.organizer, partner: e.partner, type: e.type, date: e.date, start: e.start, end: e.end, venue: e.venue, desc: e.desc, max: e.max }); }} style={{ padding: '0.5rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={18} /></button>
            <button onClick={() => { if (confirm('Delete?')) saveE(events.filter(x => x.id !== e.id)); }} style={{ padding: '0.5rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={18} /></button>
            {e.regs?.length > 0 && <button onClick={() => exportToExcel(e.regs.map(r => ({ ...r, event: e.eventName })), `${e.eventName}_registrations`)} style={{ padding: '0.5rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Download size={18} /></button>}
          </div>
        </div>
        {e.regs?.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#ffffff', borderRadius: '6px' }}>
            <h4 style={{ color: '#2B4C7E', fontWeight: '600', marginBottom: '0.5rem' }}>Registrations</h4>
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Company'].map(h => <th key={h} style={{ padding: '0.5rem', textAlign: 'left', color: '#2B4C7E', fontWeight: '600' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {e.regs.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '0.5rem', color: '#1f2937' }}>{r.name}</td>
                    <td style={{ padding: '0.5rem', color: '#6b7280' }}>{r.email}</td>
                    <td style={{ padding: '0.5rem', color: '#6b7280' }}>{r.fullPhone || r.phone}</td>
                    <td style={{ padding: '0.5rem', color: '#1f2937' }}>{r.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No events yet</p>}
  </div>
)}

{tab === 'admin-h' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Hall Inventory</h2>
      <button onClick={() => exportToExcel(halls, 'StartupTN_Halls')} style={btn}><Download size={18} /> Export Excel</button>
    </div>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>{editH ? 'Edit' : 'Add'} Hall</h3>
    <form onSubmit={submitH} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <input type="text" placeholder="Hall Name *" value={hForm.name} onChange={(e) => setHForm({ ...hForm, name: e.target.value })} required style={inp} />
      <input type="number" placeholder="Capacity *" value={hForm.capacity} onChange={(e) => setHForm({ ...hForm, capacity: e.target.value })} required style={inp} />
      <input type="text" placeholder="Facilities *" value={hForm.facilities} onChange={(e) => setHForm({ ...hForm, facilities: e.target.value })} required style={inp} />
      <input type="number" placeholder="Hourly Rate (₹) *" value={hForm.rate} onChange={(e) => setHForm({ ...hForm, rate: e.target.value })} required style={inp} />
      <input type="text" placeholder="Location *" value={hForm.location} onChange={(e) => setHForm({ ...hForm, location: e.target.value })} required style={inp} />
      <select value={hForm.avail} onChange={(e) => setHForm({ ...hForm, avail: e.target.value })} required style={inp}>
        <option value="available">Available</option>
        <option value="unavailable">Unavailable</option>
      </select>
      <button type="submit" style={{ ...btn, gridColumn: '1 / -1' }}>{editH ? 'Update' : 'Add'} Hall</button>
      {editH && <button type="button" onClick={() => { setEditH(null); setHForm({ name: '', capacity: '', facilities: '', rate: '', location: '', avail: 'available' }); }} style={{ ...btn, gridColumn: '1 / -1', background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>}
    </form>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>All Halls ({halls.length})</h3>
    {halls.length > 0 ? (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #2B4C7E' }}>
              {['ID', 'Name', 'Capacity', 'Facilities', 'Rate/Hour', 'Location', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#2B4C7E', fontWeight: '600' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {halls.map((h, i) => (
              <tr key={h.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f9fafb' : 'transparent' }}>
                <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>{h.id}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{h.name}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>{h.capacity}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{h.facilities}</td>
                <td style={{ padding: '0.75rem', color: '#2B4C7E', fontWeight: '600' }}>₹{h.rate}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>{h.location}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', background: h.avail === 'available' ? 'rgba(45, 74, 124, 0.1)' : 'rgba(220, 38, 38, 0.1)', color: h.avail === 'available' ? '#2B4C7E' : '#dc2626' }}>
                    {h.avail}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <button onClick={() => { setEditH(h); setHForm({ name: h.name, capacity: h.capacity, facilities: h.facilities, rate: h.rate, location: h.location, avail: h.avail }); }} style={{ padding: '0.5rem', marginRight: '0.5rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                  <button onClick={() => { if (confirm('Delete?')) saveH(halls.filter(x => x.id !== h.id)); }} style={{ padding: '0.5rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No halls yet</p>}
  </div>
)}

{tab === 'admin-b' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Hall Bookings</h2>
      <button onClick={() => exportToExcel(bookings, 'StartupTN_Bookings')} style={btn}><Download size={18} /> Export Excel</button>
    </div>
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
      {[
        { l: 'Pending', v: bookings.filter(b => b.status === 'pending').length, c: '#F5A623' },
        { l: 'Approved', v: bookings.filter(b => b.status === 'approved').length, c: '#059669' },
        { l: 'Rejected', v: bookings.filter(b => b.status === 'rejected').length, c: '#dc2626' }
      ].map(x => (
        <div key={x.l} style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
          <p style={{ color: x.c, fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>{x.v}</p>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{x.l}</p>
        </div>
      ))}
    </div>
    {bookings.length > 0 ? bookings.map(b => (
      <div key={b.id} style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', border: `2px solid ${b.status === 'approved' ? '#059669' : b.status === 'rejected' ? '#dc2626' : '#F5A623'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ color: '#2B4C7E', fontWeight: '600', margin: '0 0 0.5rem' }}>{b.hallName} <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>({b.id})</span></h3>
            <p style={{ color: '#1f2937', margin: '0.25rem 0' }}><strong>Organizer:</strong> {b.organizerName} ({b.organization})</p>
            <p style={{ color: '#6b7280', margin: '0.25rem 0' }}><Mail size={16} style={{ verticalAlign: 'middle' }} /> {b.email} | <Phone size={16} style={{ verticalAlign: 'middle' }} /> {b.fullPhone || b.phone}</p>
            <p style={{ color: '#6b7280', margin: '0.25rem 0' }}><Calendar size={16} style={{ verticalAlign: 'middle' }} /> {b.date} | {b.start} - {b.end}</p>
            <p style={{ color: '#1f2937', margin: '0.5rem 0' }}><strong>Purpose:</strong> {b.purpose}</p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Attendees: {b.attendees}{b.req && ` | Requirements: ${b.req}`}</p>
            {b.msg && <p style={{ color: '#2B4C7E', fontWeight: '600', marginTop: '0.5rem', padding: '0.5rem', background: '#ffffff', borderRadius: '4px' }}><strong>Admin:</strong> {b.msg}</p>}
          </div>
          <span style={{ padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', height: 'fit-content', background: b.status === 'approved' ? 'rgba(13, 140, 79, 0.1)' : b.status === 'rejected' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(245, 166, 35, 0.1)', color: b.status === 'approved' ? '#059669' : b.status === 'rejected' ? '#dc2626' : '#F5A623' }}>
            {b.status.toUpperCase()}
          </span>
        </div>
        {b.status === 'pending' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { const m = prompt('Approval message (optional):'); if (m !== null) updateBooking(b.id, 'approved', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(13, 140, 79, 0.1)', color: '#059669', border: '2px solid #059669', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><CheckCircle size={18} style={{ verticalAlign: 'middle' }} /> Approve</button>
            <button onClick={() => { const m = prompt('Rejection reason:'); if (m) updateBooking(b.id, 'rejected', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: '2px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><XCircle size={18} style={{ verticalAlign: 'middle' }} /> Reject</button>
            <button onClick={() => { if (confirm('Delete?')) saveB(bookings.filter(x => x.id !== b.id)); }} style={{ padding: '0.75rem 1rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={18} /></button>
          </div>
        )}
      </div>
    )) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No bookings yet</p>}
  </div>
)}

{tab === 'admin-c' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Coworking Requests</h2>
      <button onClick={() => exportToExcel(coworking, 'StartupTN_Coworking')} style={btn}><Download size={18} /> Export Excel</button>
    </div>
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
      {[
        { l: 'Pending', v: coworking.filter(c => c.status === 'pending').length, c: '#F5A623' },
        { l: 'Approved', v: coworking.filter(c => c.status === 'approved').length, c: '#059669' },
        { l: 'Rejected', v: coworking.filter(c => c.status === 'rejected').length, c: '#dc2626' }
      ].map(x => (
        <div key={x.l} style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
          <p style={{ color: x.c, fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>{x.v}</p>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{x.l}</p>
        </div>
      ))}
    </div>
    {coworking.length > 0 ? coworking.map(c => (
      <div key={c.id} style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', border: `2px solid ${c.status === 'approved' ? '#059669' : c.status === 'rejected' ? '#dc2626' : '#F5A623'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ color: '#2B4C7E', fontWeight: '600', margin: '0 0 0.5rem' }}>{c.name} <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>({c.id})</span></h3>
            <p style={{ color: '#1f2937', margin: '0.25rem 0' }}><Briefcase size={16} style={{ verticalAlign: 'middle' }} /> {c.company}</p>
            <p style={{ color: '#6b7280', margin: '0.25rem 0' }}><Mail size={16} style={{ verticalAlign: 'middle' }} /> {c.email} | <Phone size={16} style={{ verticalAlign: 'middle' }} /> {c.fullPhone || c.phone}</p>
            <p style={{ color: '#6b7280', margin: '0.25rem 0' }}><strong>Seats:</strong> {c.seats} | <strong>Duration:</strong> {c.duration}</p>
            <p style={{ color: '#6b7280', margin: '0.25rem 0' }}><strong>Start:</strong> {c.startDate}</p>
            <p style={{ color: '#1f2937', margin: '0.5rem 0' }}><strong>Purpose:</strong> {c.purpose}</p>
            {c.msg && <p style={{ color: '#2B4C7E', fontWeight: '600', marginTop: '0.5rem', padding: '0.5rem', background: '#ffffff', borderRadius: '4px' }}><strong>Admin:</strong> {c.msg}</p>}
          </div>
          <span style={{ padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', height: 'fit-content', background: c.status === 'approved' ? 'rgba(13, 140, 79, 0.1)' : c.status === 'rejected' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(245, 166, 35, 0.1)', color: c.status === 'approved' ? '#059669' : c.status === 'rejected' ? '#dc2626' : '#F5A623' }}>
            {c.status.toUpperCase()}
          </span>
        </div>
        {c.status === 'pending' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { const m = prompt('Approval message (optional):'); if (m !== null) updateCowork(c.id, 'approved', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(13, 140, 79, 0.1)', color: '#059669', border: '2px solid #059669', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><CheckCircle size={18} style={{ verticalAlign: 'middle' }} /> Approve</button>
            <button onClick={() => { const m = prompt('Rejection reason:'); if (m) updateCowork(c.id, 'rejected', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: '2px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><XCircle size={18} style={{ verticalAlign: 'middle' }} /> Reject</button>
            <button onClick={() => { if (confirm('Delete?')) saveC(coworking.filter(x => x.id !== c.id)); }} style={{ padding: '0.75rem 1rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={18} /></button>
          </div>
        )}
      </div>
    )) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No requests yet</p>}
  </div>
)}
      </div>

      {emailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto', border: '2px solid #2B4C7E' }}>
            <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginTop: 0 }}>📧 Email Notification</h2>
            
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#6b7280' }}><strong style={{ color: '#2B4C7E', fontWeight: '600' }}>To:</strong> {emailModal.to}</p>
              <p style={{ margin: '0 0 1rem', color: '#6b7280' }}><strong style={{ color: '#2B4C7E', fontWeight: '600' }}>Subject:</strong> {emailModal.subject}</p>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <p style={{ color: '#1f2937', whiteSpace: 'pre-wrap', margin: 0 }}>{emailModal.body}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  const emailContent = `To: ${emailModal.to}\nSubject: ${emailModal.subject}\n\n${emailModal.body}`;
                  navigator.clipboard.writeText(emailContent).then(() => {
                    alert('✅ Email content copied to clipboard!');
                  });
                }}
                style={{ ...btn, flex: 1, minWidth: '150px' }}
              >
                📋 Copy to Clipboard
              </button>
              
              <button 
                onClick={() => {
                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailModal.to)}&su=${encodeURIComponent(emailModal.subject)}&body=${encodeURIComponent(emailModal.body)}`;
                  window.open(gmailUrl, '_blank');
                }}
                style={{ ...btn, flex: 1, minWidth: '150px', background: 'linear-gradient(135deg, #0d8c4f 0%, #0a6b3d 100%)' }}
              >
                📧 Open in Gmail
              </button>
              
              <button 
                onClick={() => setEmailModal(null)}
                style={{ ...btn, flex: 1, minWidth: '150px', background: '#e5e7eb', color: '#1f2937' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorManagementSystem;
