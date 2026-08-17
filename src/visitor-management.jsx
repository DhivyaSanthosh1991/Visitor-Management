import React, { useState, useEffect } from 'react';
import { Users, Calendar, Download, Edit2, Trash2, CheckCircle, XCircle, Building, LogOut, MapPin, Mail, Phone, Briefcase, Plus, Minus, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import {
  getVisitors, addVisitor, updateVisitor, deleteVisitor,
  getEvents, addEvent, updateEvent, deleteEvent,
  getHalls, addHall, updateHall, deleteHall,
  getBookings, addBooking, updateBooking as updateBookingFirebase, deleteBooking,
  getCoworking, addCoworking, updateCoworking as updateCoworkingFirebase, deleteCoworking,
  addCoworkingMember, getCoworkingMembers, deleteCoworkingMember,
  archiveMonthData, getMonthlyArchives, deleteMonthRecords,
  addFeedback, getFeedback, deleteFeedback
} from './firebaseUtils';

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
  // Search/Filter states
const [visitorSearch, setVisitorSearch] = useState('');
const [visitorDateFrom, setVisitorDateFrom] = useState('');
const [visitorDateTo, setVisitorDateTo] = useState('');
const [selectedVisitors, setSelectedVisitors] = useState([]);
const [bookingSearch, setBookingSearch] = useState('');
const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
const [coworkingSearch, setCoworkingSearch] = useState('');
const [coworkingStatusFilter, setCoworkingStatusFilter] = useState('all');
  
  const [vForm, setVForm] = useState({ prefix: 'Mr', name: '', email: '', phone: '', countryCode: '+91', company: '', purpose: '', toMeet: '', accompanying: [] });
  const [eForm, setEForm] = useState({ eventName: '', organizer: '', partner: '', type: '', date: '', start: '', end: '', venue: '', desc: '', max: '' });
  const [hForm, setHForm] = useState({ name: '', capacity: '', avail: 'available' });
  const [bForm, setBForm] = useState({ 
    hallId: '', hallName: '', organizerName: '', email: '', 
    phone: '', countryCode: '+91', organization: '', purpose: '', 
    date: '', start: '', end: '', attendees: '', req: '',
    gstin: '', smartCard: ''
  });
  const [cForm, setCForm] = useState({ 
    name: '', email: '', phone: '', countryCode: '+91', alternatePhone: '',
    company: '', designation: '', gender: '', seats: '', duration: '', startDate: '', purpose: '',
    gstin: '', smartCard: ''
  });
  const [regForm, setRegForm] = useState({ 
    eventId: '', name: '', email: '', phone: '', countryCode: '+91', 
    company: '', designation: '', accompanying: [] 
  });
  
  const [editV, setEditV] = useState(null);
  const [editE, setEditE] = useState(null);
  const [editH, setEditH] = useState(null);
  const [editB, setEditB] = useState(null);
  const [editC, setEditC] = useState(null);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [coworkingMembers, setCoworkingMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({
    bookingId: '', name: '', designation: '',
    contactNumber: '', alternateContact: '', email: '',
    gender: '', aadharNo: '', dob: '', maritalStatus: '',
    bloodGroup: '', fatherName: '', permanentAddress: '',
    communicationAddress: '', officeAddress: ''
  });
  const [monthlyArchives, setMonthlyArchives] = useState([]);
  const [archiveMonth, setArchiveMonth] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [visitorSortDir, setVisitorSortDir] = useState('desc');
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackForm, setFeedbackForm] = useState({
    name: '', email: '', phone: '', category: '', rating: '', message: ''
  });
  const [feedbackFilter, setFeedbackFilter] = useState('all');

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

  // ✅ FIX: Filter functions MOVED OUTSIDE exportToExcel
  const getFilteredVisitors = () => {
    return visitors.filter(v => {
      const matchesSearch =
        v.id?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
        v.name?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
        v.company?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
        v.email?.toLowerCase().includes(visitorSearch.toLowerCase()) ||
        v.time?.toLowerCase().includes(visitorSearch.toLowerCase());

      // Date range filter using the time field (format: DD/MM/YYYY, HH:MM:SS)
      let matchesDate = true;
      if (visitorDateFrom || visitorDateTo) {
        // Parse DD/MM/YYYY from time string
        const timeParts = v.time ? v.time.split(',')[0].trim().split('/') : null;
        if (timeParts && timeParts.length === 3) {
          const vDate = new Date(`${timeParts[2]}-${timeParts[1]}-${timeParts[0]}`);
          if (visitorDateFrom) matchesDate = matchesDate && vDate >= new Date(visitorDateFrom);
          if (visitorDateTo) matchesDate = matchesDate && vDate <= new Date(visitorDateTo);
        }
      }

      return matchesSearch && matchesDate;
    });
  };

  const getFilteredBookings = () => {
    return bookings.filter(b => {
      const matchesSearch = b.id?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.organizerName?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.organization?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.date?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.hallName?.toLowerCase().includes(bookingSearch.toLowerCase());
      
      const matchesStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredCoworking = () => {
    return coworking.filter(c => {
      const matchesSearch = c.id?.toLowerCase().includes(coworkingSearch.toLowerCase()) ||
        c.name?.toLowerCase().includes(coworkingSearch.toLowerCase()) ||
        c.company?.toLowerCase().includes(coworkingSearch.toLowerCase()) ||
        c.startDate?.toLowerCase().includes(coworkingSearch.toLowerCase());
      
      const matchesStatus = coworkingStatusFilter === 'all' || c.status === coworkingStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

 // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        const [visitorsData, eventsData, hallsData, bookingsData, coworkingData, membersData, archivesData, feedbacksData] = await Promise.all([
          getVisitors(),
          getEvents(),
          getHalls(),
          getBookings(),
          getCoworking(),
          getCoworkingMembers(),
          getMonthlyArchives(),
          getFeedback()
        ]);
        
        setVisitors(visitorsData);
        setEvents(eventsData);
        setHalls(hallsData);
        setBookings(bookingsData);
        setCoworking(coworkingData);
        setCoworkingMembers(membersData);
        setMonthlyArchives(archivesData);
        setFeedbacks(feedbacksData || []);
      } catch (err) {
        console.error('Error loading from Firebase:', err);
      }
    };
    
    loadData();
  }, []);

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);  
   
 const login = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginData.user, loginData.pass);
      setIsAdmin(true);
      setTab('admin-v');
      setLoginData({ user: '', pass: '' });
    } catch (error) {
      console.error('Login error:', error);
      alert('Invalid credentials! Use: admin@startuptn.in');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
      setTab('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
 const submitV = async (e) => { 
    e.preventDefault(); 
    if (!validatePhone(vForm.phone, vForm.countryCode)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    
    try {
      const v = { 
        id: editV?.id || generateId('V', visitors), 
        ...vForm, 
        fullPhone: vForm.countryCode + vForm.phone,
        time: editV?.time || new Date().toLocaleString() 
      };
      
      if (editV && editV.firebaseId) {
        await updateVisitor(editV.firebaseId, v);
        setVisitors(visitors.map(x => x.firebaseId === editV.firebaseId ? { ...v, firebaseId: editV.firebaseId } : x));
      } else {
        const newVisitor = await addVisitor(v);
        setVisitors([...visitors, { ...v, firebaseId: newVisitor.id }]);
      }
      
      setVForm({ prefix: 'Mr', name: '', email: '', phone: '', countryCode: '+91', company: '', purpose: '', toMeet: '', accompanying: [] }); 
      setEditV(null); 
      
      if (!isAdmin) { 
        alert('Registered! Your Visitor ID: ' + v.id); 
        setTab('home'); 
      }
    } catch (error) {
      console.error('Error saving visitor:', error);
      alert('Error saving visitor!');
    }
  };
  
 const submitE = async (e) => { 
    e.preventDefault(); 
    const eventDate = new Date(eForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      alert('Event date cannot be in the past!');
      return;
    }
    
    try {
      const ev = { 
        id: editE?.id || generateId('E', events), 
        ...eForm, 
        regs: editE?.regs || [], 
        created: editE?.created || new Date().toLocaleString() 
      };
      
      if (editE && editE.firebaseId) {
        await updateEvent(editE.firebaseId, ev);
        setEvents(events.map(x => x.firebaseId === editE.firebaseId ? { ...ev, firebaseId: editE.firebaseId } : x));
      } else {
        const newEvent = await addEvent(ev);
        setEvents([...events, { ...ev, firebaseId: newEvent.id }]);
      }
      
      setEForm({ eventName: '', organizer: '', partner: '', type: '', date: '', start: '', end: '', venue: '', desc: '', max: '' }); 
      setEditE(null); 
      alert('Event saved! Event ID: ' + ev.id);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event!');
    }
  };
  
  const submitH = async (e) => { 
    e.preventDefault(); 
    
    try {
      const h = { 
        id: editH?.id || generateId('H', halls), 
        ...hForm, 
        created: editH?.created || new Date().toLocaleString() 
      };
      
      if (editH && editH.firebaseId) {
        await updateHall(editH.firebaseId, h);
        setHalls(halls.map(x => x.firebaseId === editH.firebaseId ? { ...h, firebaseId: editH.firebaseId } : x));
      } else {
        const newHall = await addHall(h);
        setHalls([...halls, { ...h, firebaseId: newHall.id }]);
      }
      
      setHForm({ name: '', capacity: '', avail: 'available' }); 
      setEditH(null); 
      alert('Hall saved! Hall ID: ' + h.id);
    } catch (error) {
      console.error('Error saving hall:', error);
      alert('Error saving hall!');
    }
  };
  
  const submitB = async (e) => { 
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
    
    try {
      const b = { 
        id: generateId('B', bookings), 
        ...bForm, 
        fullPhone: bForm.countryCode + bForm.phone,
        status: 'pending', 
        submitted: new Date().toLocaleString() 
      };
      
      const newBooking = await addBooking(b);
      setBookings([...bookings, newBooking]);
      
      setBForm({ hallId: '', hallName: '', organizerName: '', email: '', phone: '', countryCode: '+91', organization: '', purpose: '', date: '', start: '', end: '', attendees: '', req: '' }); 
      alert('Booking submitted! Booking ID: ' + b.id); 
      setTab('home');
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Error submitting booking!');
    }
  };

  const submitC = async (e) => { 
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
    
    try {
      const c = { 
        id: generateId('C', coworking), 
        ...cForm, 
        fullPhone: cForm.countryCode + cForm.phone,
        status: 'pending', 
        submitted: new Date().toLocaleString() 
      };
      
      const newCoworking = await addCoworking(c);
      setCoworking([...coworking, newCoworking]);
      
      setCForm({ name: '', email: '', phone: '', countryCode: '+91', company: '', seats: '', duration: '', startDate: '', purpose: '' }); 
      alert('Request submitted! Coworking ID: ' + c.id); 
      setTab('home');
    } catch (error) {
      console.error('Error submitting coworking:', error);
      alert('Error submitting coworking!');
    }
  };
  
 const submitReg = async (e) => { 
    e.preventDefault(); 
    if (!validatePhone(regForm.phone, regForm.countryCode)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    
    try {
      const r = { 
        id: Date.now().toString(), 
        ...regForm, 
        fullPhone: regForm.countryCode + regForm.phone,
        time: new Date().toLocaleString() 
      };
      
      const event = events.find(ev => ev.id === regForm.eventId);
      if (!event) {
        alert('Event not found!');
        return;
      }

      if (!event.firebaseId) {
        alert('Event data is incomplete. Please try again.');
        return;
      }
      
      const updatedEvent = {
        ...event,
        regs: [...(event.regs || []), r]
      };
      
      await updateEvent(event.firebaseId, updatedEvent);
      setEvents(events.map(ev => ev.firebaseId === event.firebaseId ? updatedEvent : ev));
      
      setRegForm({ eventId: '', name: '', email: '', phone: '', countryCode: '+91', company: '', designation: '', accompanying: [] }); 
      alert('Registered!'); 
      setTab('home');
    } catch (error) {
      console.error('Error registering for event:', error);
      alert('Error registering for event!');
    }
  };
  
  const sendEmail = (to, subject, body) => {
    setEmailModal({ to, subject, body });
  };
  

  const submitMember = async (e) => {
    e.preventDefault();
    if (!memberForm.bookingId.trim()) { alert('Please enter your Booking ID'); return; }
    const booking = coworking.find(c => c.id === memberForm.bookingId.trim());
    if (!booking) { alert('Booking ID not found. Please check and try again.'); return; }
    if (booking.status !== 'approved') { alert('Your coworking booking is not yet approved. Please wait for approval.'); return; }
    try {
      const member = { ...memberForm, bookingId: memberForm.bookingId.trim(), company: booking.company, submittedAt: new Date().toLocaleString() };
      const newMember = await addCoworkingMember(member);
      setCoworkingMembers([...coworkingMembers, newMember]);
      setMemberForm({ bookingId: '', name: '', designation: '', contactNumber: '', alternateContact: '', email: '', gender: '', aadharNo: '', dob: '', maritalStatus: '', bloodGroup: '', fatherName: '', permanentAddress: '', communicationAddress: '', officeAddress: '' });
      alert('Member registered successfully!'); setTab('home');
    } catch (error) { console.error('Error:', error); alert('Error registering member!'); }
  };

  const parseVisitorId = (id) => {
    try {
      const p = (id || '').split('-'); const d = p[1] || '01012000000';
      return parseInt(d.slice(4,8))*100000000 + parseInt(d.slice(2,4))*1000000 + parseInt(d.slice(0,2))*10000 + parseInt(p[2]||'0');
    } catch { return 0; }
  };

  const parseBookingId = (id) => {
    try {
      const p = (id || '').split('-'); const d = p[1] || '01012000000';
      return parseInt(d.slice(4,8))*100000000 + parseInt(d.slice(2,4))*1000000 + parseInt(d.slice(0,2))*10000 + parseInt(p[2]||'0');
    } catch { return 0; }
  };

  const handleArchiveAndClear = async () => {
    if (!archiveMonth) { alert('Please select a month to archive.'); return; }
    const [year, month] = archiveMonth.split('-');
    const label = new Date(parseInt(year), parseInt(month)-1).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!confirm(`Archive and clear all data for ${label}? This cannot be undone.`)) return;
    setArchiving(true);
    try {
      const mmyyyy = month + year;
      const monthVisitors = visitors.filter(v => v.id && v.id.includes('-' + String(parseInt(month)).padStart(2,'0') + year + '-') || (v.time && v.time.includes('/' + month + '/' + year)));
      const monthBookings = bookings.filter(b => b.id && b.id.split('-')[1]?.slice(2,4) === month && b.id.split('-')[1]?.slice(4,8) === year);
      const monthCoworking = coworking.filter(c => c.id && c.id.split('-')[1]?.slice(2,4) === month && c.id.split('-')[1]?.slice(4,8) === year);

      const hallBreakdown = {};
      monthBookings.filter(b => b.status === 'approved').forEach(b => {
        const hall = b.hallName || 'Unknown';
        if (!hallBreakdown[hall]) hallBreakdown[hall] = { bookings: 0, hours: 0 };
        hallBreakdown[hall].bookings++;
        if (b.start && b.end) {
          const [sh, sm] = b.start.split(':').map(Number);
          const [eh, em] = b.end.split(':').map(Number);
          hallBreakdown[hall].hours += Math.round(((eh*60+em) - (sh*60+sm)) / 60 * 10) / 10;
        }
      });

      const companyBreakdown = {};
      monthCoworking.filter(c => c.status === 'approved').forEach(c => {
        companyBreakdown[c.company || 'Unknown'] = (companyBreakdown[c.company || 'Unknown'] || 0) + parseInt(c.seats || 0);
      });

      const summary = {
        month: archiveMonth, label,
        visitors: { total: monthVisitors.length },
        bookings: {
          total: monthBookings.length,
          approved: monthBookings.filter(b => b.status === 'approved').length,
          pending: monthBookings.filter(b => b.status === 'pending').length,
          rejected: monthBookings.filter(b => b.status === 'rejected').length,
          byHall: hallBreakdown
        },
        coworking: {
          total: monthCoworking.length,
          approved: monthCoworking.filter(c => c.status === 'approved').length,
          rejected: monthCoworking.filter(c => c.status === 'rejected').length,
          byCompany: companyBreakdown
        },
        archivedAt: new Date().toLocaleString()
      };

      await archiveMonthData(archiveMonth, summary);

      for (const v of monthVisitors) { if (v.firebaseId) await deleteVisitor(v.firebaseId); }
      for (const b of monthBookings) { if (b.firebaseId) await deleteBooking(b.firebaseId); }
      for (const c of monthCoworking) { if (c.firebaseId) await deleteCoworking(c.firebaseId); }

      setVisitors(visitors.filter(v => !monthVisitors.find(mv => mv.firebaseId === v.firebaseId)));
      setBookings(bookings.filter(b => !monthBookings.find(mb => mb.firebaseId === b.firebaseId)));
      setCoworking(coworking.filter(c => !monthCoworking.find(mc => mc.firebaseId === c.firebaseId)));
      setMonthlyArchives([...monthlyArchives.filter(a => a.month !== archiveMonth), summary]);
      setArchiveMonth('');
      alert(`✅ ${label} archived successfully! ${monthVisitors.length} visitors, ${monthBookings.length} bookings, ${monthCoworking.length} coworking records archived.`);
    } catch (error) { console.error('Archive error:', error); alert('Error archiving data!'); }
    setArchiving(false);
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      const fb = { ...feedbackForm, submittedAt: new Date().toLocaleString() };
      const newFb = await addFeedback(fb);
      setFeedbacks([...feedbacks, newFb]);
      setFeedbackForm({ name: '', email: '', phone: '', category: '', rating: '', message: '' });
      alert('Thank you for your feedback!');
      setTab('home');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback!');
    }
  };

 const updateBooking = async (id, status, msg = '') => { 
    try {
      const booking = bookings.find(b => b.id === id);
      if (!booking) {
        alert('Booking not found!');
        return;
      }

      if (!booking.firebaseId) {
        alert('Booking data is incomplete. Please refresh the page.');
        return;
      }
      
      const updatedBooking = {
        ...booking,
        status,
        msg,
        reviewed: new Date().toLocaleString()
      };
      
      await updateBookingFirebase(booking.firebaseId, updatedBooking);
      setBookings(bookings.map(b => b.firebaseId === booking.firebaseId ? updatedBooking : b));
      
      if (status !== 'pending') {
        const subject = status === 'approved' 
          ? `Hall Booking Approved - ${booking.hallName}` 
          : `Hall Booking Update - ${booking.hallName}`;
        
        const body = status === 'approved'
          ? `Dear ${booking.organizerName},\n\nYour hall booking request has been APPROVED!\n\nBooking ID: ${booking.id}\n\nDetails:\n- Hall: ${booking.hallName}\n- Date: ${booking.date}\n- Time: ${booking.start} - ${booking.end}\n- Attendees: ${booking.attendees}\n${booking.req ? `\nSpecial Requirements:\n${booking.req}\n` : ''}\n${msg ? `\nAdmin Message: ${msg}\n` : ''}\nPlease contact us if you have any questions.\n\nBest regards,\nStartupTN Team`
          : `Dear ${booking.organizerName},\n\nYour hall booking request has been reviewed.\n\nBooking ID: ${booking.id}\nStatus: ${status.toUpperCase()}\n${booking.req ? `\nYour Requirements:\n${booking.req}\n` : ''}\n${msg ? `\nReason: ${msg}\n` : ''}\nBest regards,\nStartupTN Team`;
        
        sendEmail(booking.email, subject, body);
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Error updating booking!');
    }
  };
  
  const updateCowork = async (id, status, msg = '') => { 
    try {
      const request = coworking.find(c => c.id === id);
      if (!request) {
        alert('Coworking request not found!');
        return;
      }

      if (!request.firebaseId) {
        alert('Coworking data is incomplete. Please refresh the page.');
        return;
      }
      
      const updatedCoworking = {
        ...request,
        status,
        msg,
        reviewed: new Date().toLocaleString()
      };
      
      await updateCoworkingFirebase(request.firebaseId, updatedCoworking);
      setCoworking(coworking.map(c => c.firebaseId === request.firebaseId ? updatedCoworking : c));
      
      if (status !== 'pending') {
        const subject = status === 'approved' 
          ? `Coworking Space Approved - StartupTN` 
          : `Coworking Space Request Update - StartupTN`;
        
        const body = status === 'approved'
          ? `Dear ${request.name},\n\nYour coworking space request has been APPROVED!\n\nCoworking ID: ${request.id}\n\nDetails:\n- Seats: ${request.seats}\n- Duration: ${request.duration}\n- Start Date: ${request.startDate}\n- Company: ${request.company}\n\n${msg ? `Admin Message: ${msg}\n\n` : ''}We look forward to welcoming you to StartupTN!\n\nBest regards,\nStartupTN Team`
          : `Dear ${request.name},\n\nYour coworking space request has been reviewed.\n\nCoworking ID: ${request.id}\n\nDetails:\n- Status: ${status.toUpperCase()}\n- Seats Requested: ${request.seats}\n- Duration: ${request.duration}\n\n${msg ? `Reason: ${msg}\n\n` : ''}Please contact us if you have any questions.\n\nBest regards,\nStartupTN Team`;
        
        sendEmail(request.email, subject, body);
      }
    } catch (error) {
      console.error('Error updating coworking:', error);
      alert('Error updating coworking!');
    }
  };
  
 const exportToExcel = (data, fileName) => {
  if (!data?.length) { 
    alert('No data to export'); 
    return; 
  }
   
  // Clean data - remove unwanted fields and format properly
  const cleanedData = data.map(item => {
    const cleaned = { ...item };
    
    // Remove Firebase-specific fields
    delete cleaned.firebaseId;
    delete cleaned.createdAt;
    
    // Remove duplicate phone fields if fullPhone exists
    if (cleaned.fullPhone) {
      delete cleaned.phone;
      delete cleaned.countryCode;
    }
    
    // Format accompanying visitors properly
    if (cleaned.accompanying && Array.isArray(cleaned.accompanying)) {
      cleaned.accompanying = cleaned.accompanying.map(a => 
        `${a.name} (${a.countryCode || '+91'}${a.phone})${a.company ? ' - ' + a.company : ''}`
      ).join('; ');
    }
    
    return cleaned;
  });
  
  // Sort by ID ascending (DDMMYYYY parsed correctly as YYYYMMDD)
  const parseIdForExcel = (id) => {
    try {
      const p = (id || '').split('-');
      const d = p[1] || '01012000000';
      return parseInt(d.slice(4,8))*100000000 + parseInt(d.slice(2,4))*1000000 + parseInt(d.slice(0,2))*10000 + parseInt(p[2]||'0');
    } catch { return 0; }
  };
  cleanedData.sort((a, b) => parseIdForExcel(a.id) - parseIdForExcel(b.id));
   
  // Remove updatedAt from all rows
  cleanedData.forEach(item => { delete item.updatedAt; });

  // Collect all keys across all rows
  const allKeys = new Set();
  cleanedData.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));

  // Fields that should always appear LAST
  const trailingFields = ['accompanying', 'company', 'email', 'fullPhone'];
  // Fields that should appear FIRST in this order
  const leadingFields = ['id', 'prefix', 'name'];

  const allKeysArr = Array.from(allKeys);
  const orderedKeys = [
    ...leadingFields.filter(k => allKeysArr.includes(k)),
    ...allKeysArr.filter(k => !leadingFields.includes(k) && !trailingFields.includes(k)).sort(),
    ...trailingFields.filter(k => allKeysArr.includes(k))
  ];

  // Format header labels
  const headers = orderedKeys.map(key =>
    key === 'fullPhone' ? 'Full Phone' :
    key === 'toMeet' ? 'To Meet' :
    key === 'id' ? 'ID' :
    key === 'prefix' ? 'Prefix' :
    key.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );

  // Create data rows in the same strict order
  const ws_data = [headers];
  cleanedData.forEach(item => {
    const row = orderedKeys.map(key => item[key] !== undefined && item[key] !== null ? item[key] : '');
    ws_data.push(row);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const colWidths = headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...ws_data.slice(1).map(row => String(row[i] || '').length)
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
         {isAdmin && <button onClick={logout} style={{ padding: '0.5rem 1rem', background: '#ffffff', color: '#2B4C7E', fontWeight: '600', border: '2px solid #F5A623', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LogOut size={18} /> Logout</button>}
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
            <button onClick={() => setTab('feedback')} style={{ padding: '0.75rem 1.5rem', background: tab === 'feedback' ? '#2B4C7E' : 'transparent', color: tab === 'feedback' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'feedback' ? '600' : '500', borderBottom: tab === 'feedback' ? '3px solid #F5A623' : 'none' }}>Feedback</button>
            <button onClick={() => setTab('login')} style={{ padding: '0.75rem 1.5rem', background: tab === 'login' ? '#2B4C7E' : 'transparent', color: tab === 'login' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'login' ? '600' : '500', borderBottom: tab === 'login' ? '3px solid #F5A623' : 'none' }}>Admin</button>
          </>
        ) : (
          <>
            <button onClick={() => setTab('admin-v')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-v' ? '#2B4C7E' : 'transparent', color: tab === 'admin-v' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-v' ? '600' : '500', borderBottom: tab === 'admin-v' ? '3px solid #F5A623' : 'none' }}>Visitors</button>
            <button onClick={() => setTab('admin-e')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-e' ? '#2B4C7E' : 'transparent', color: tab === 'admin-e' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-e' ? '600' : '500', borderBottom: tab === 'admin-e' ? '3px solid #F5A623' : 'none' }}>Events</button>
            <button onClick={() => setTab('admin-h')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-h' ? '#2B4C7E' : 'transparent', color: tab === 'admin-h' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-h' ? '600' : '500', borderBottom: tab === 'admin-h' ? '3px solid #F5A623' : 'none' }}>Halls</button>
            <button onClick={() => setTab('admin-b')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-b' ? '#2B4C7E' : 'transparent', color: tab === 'admin-b' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-b' ? '600' : '500', borderBottom: tab === 'admin-b' ? '3px solid #F5A623' : 'none' }}>Bookings</button>
            <button onClick={() => setTab('admin-c')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-c' ? '#2B4C7E' : 'transparent', color: tab === 'admin-c' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-c' ? '600' : '500', borderBottom: tab === 'admin-c' ? '3px solid #F5A623' : 'none' }}>Coworking</button>
            <button onClick={() => setTab('admin-cm')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-cm' ? '#2B4C7E' : 'transparent', color: tab === 'admin-cm' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-cm' ? '600' : '500', borderBottom: tab === 'admin-cm' ? '3px solid #F5A623' : 'none' }}>Members</button>
            <button onClick={() => setTab('admin-r')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-r' ? '#2B4C7E' : 'transparent', color: tab === 'admin-r' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-r' ? '600' : '500', borderBottom: tab === 'admin-r' ? '3px solid #F5A623' : 'none' }}>Reports</button>
            <button onClick={() => setTab('admin-fb')} style={{ padding: '0.75rem 1.5rem', background: tab === 'admin-fb' ? '#2B4C7E' : 'transparent', color: tab === 'admin-fb' ? '#ffffff' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: tab === 'admin-fb' ? '600' : '500', borderBottom: tab === 'admin-fb' ? '3px solid #F5A623' : 'none', position: 'relative' }}>
              Feedback {feedbacks.length > 0 && <span style={{ position: 'absolute', top: '6px', right: '6px', background: '#dc2626', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{feedbacks.length}</span>}
            </button>
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
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
          <select value={vForm.prefix} onChange={(e) => setVForm({ ...vForm, prefix: e.target.value })} style={inp}>
            {['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'].map(p => <option key={p} value={p}>{p}.</option>)}
          </select>
          <input type="text" value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} required style={inp} placeholder="Full Name" />
        </div>
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
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>To Meet *</label>
        <input type="text" value={vForm.toMeet} onChange={(e) => setVForm({ ...vForm, toMeet: e.target.value })} required style={inp} />
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
    <div style={{ marginBottom: '1.5rem' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Visitor Management</h2>
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {selectedVisitors.length > 0 && (
        <button onClick={async () => {
          if (confirm(`Delete ${selectedVisitors.length} selected visitor(s)?`)) {
            try {
              for (const fid of selectedVisitors) {
                await deleteVisitor(fid);
              }
              setVisitors(visitors.filter(v => !selectedVisitors.includes(v.firebaseId)));
              setSelectedVisitors([]);
            } catch(e) { alert('Error deleting!'); }
          }
        }} style={{ ...btn, background: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 size={16} /> Delete Selected ({selectedVisitors.length})
        </button>
      )}
      <button onClick={() => exportToExcel(getFilteredVisitors(), 'StartupTN_Visitors')} style={{ ...btn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Download size={18} /> Export to Excel
      </button>
    </div>
  </div>
  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
    <div style={{ position: 'relative', flex: '2', minWidth: '220px' }}>
      <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
      <input type="text" placeholder="Search by ID, Name, Company, Email..." value={visitorSearch} onChange={(e) => setVisitorSearch(e.target.value)} style={{ ...inp, paddingLeft: '2.5rem' }} />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label style={{ color: '#6b7280', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>From:</label>
      <input type="date" value={visitorDateFrom} onChange={(e) => setVisitorDateFrom(e.target.value)} style={{ ...inp, minWidth: '150px' }} />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label style={{ color: '#6b7280', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>To:</label>
      <input type="date" value={visitorDateTo} onChange={(e) => setVisitorDateTo(e.target.value)} style={{ ...inp, minWidth: '150px' }} />
    </div>
    {(visitorDateFrom || visitorDateTo) && (
      <button onClick={() => { setVisitorDateFrom(''); setVisitorDateTo(''); }} style={{ ...btn, background: '#e5e7eb', color: '#1f2937', padding: '0.75rem 1rem' }}>Clear</button>
    )}
  </div>
</div>    <h3 style={{ color: '#2B4C7E', fontWeight: '600', marginTop: '2rem' }}>{editV ? 'Edit' : 'Add'} Visitor</h3>
    <form onSubmit={submitV} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.5rem' }}>
        <select value={vForm.prefix} onChange={(e) => setVForm({ ...vForm, prefix: e.target.value })} style={inp}>
          {['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'].map(p => <option key={p} value={p}>{p}.</option>)}
        </select>
        <input type="text" placeholder="Name" value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} required style={inp} />
      </div>
      {['email', 'company', 'purpose', 'toMeet'].map(f => (
        <input key={f} type={f === 'email' ? 'email' : 'text'} placeholder={f === 'toMeet' ? 'To Meet' : f.charAt(0).toUpperCase() + f.slice(1)} value={vForm[f]} onChange={(e) => setVForm({ ...vForm, [f]: e.target.value })} required style={inp} />
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
      {editV && <button type="button" onClick={() => { setEditV(null); setVForm({ prefix: 'Mr', name: '', email: '', phone: '', countryCode: '+91', company: '', purpose: '', toMeet: '', accompanying: [] }); }} style={{ ...btn, gridColumn: '1 / -1', background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>}
    </form>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>All Visitors ({getFilteredVisitors().length})</h3>
    {getFilteredVisitors().length > 0 ? (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #2B4C7E' }}>
              <th style={{ padding: '0.75rem' }}>
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelectedVisitors(getFilteredVisitors().map(v => v.firebaseId));
                  else setSelectedVisitors([]);
                }} checked={selectedVisitors.length === getFilteredVisitors().length && getFilteredVisitors().length > 0} />
              </th>
              {['ID', 'Name', 'Email', 'Phone', 'Company', 'Purpose', 'To Meet', 'Date/Time', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#2B4C7E', fontWeight: '600' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...getFilteredVisitors()].sort((a, b) => parseVisitorId(b.id) - parseVisitorId(a.id)).map((v, i) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #e5e7eb', background: selectedVisitors.includes(v.firebaseId) ? 'rgba(45,74,126,0.07)' : i % 2 === 0 ? '#f9fafb' : 'transparent' }}>
                <td style={{ padding: '0.75rem' }}>
                  <input type="checkbox" checked={selectedVisitors.includes(v.firebaseId)} onChange={(e) => {
                    if (e.target.checked) setSelectedVisitors([...selectedVisitors, v.firebaseId]);
                    else setSelectedVisitors(selectedVisitors.filter(id => id !== v.firebaseId));
                  }} />
                </td>
                <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>{v.id}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{v.prefix ? `${v.prefix}. ${v.name}` : v.name}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>{v.email}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>{v.fullPhone || v.phone}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{v.company}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{v.purpose}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{v.toMeet}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>{v.time}</td>
                <td style={{ padding: '0.75rem' }}>
                  <button onClick={() => { setEditV(v); setVForm({ prefix: v.prefix || 'Mr', name: v.name, email: v.email, phone: v.phone, countryCode: v.countryCode || '+91', company: v.company, purpose: v.purpose, toMeet: v.toMeet, accompanying: v.accompanying || [] }); }} style={{ padding: '0.5rem', marginRight: '0.5rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                  <button onClick={async () => { 
  if (confirm('Delete?')) {
    try {
      await deleteVisitor(v.firebaseId);
      setVisitors(visitors.filter(x => x.firebaseId !== v.firebaseId));
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting!');
    }
  }
}} style={{ padding: '0.5rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
            <button onClick={async () => { 
  if (confirm('Delete?')) {
    try {
      await deleteEvent(e.firebaseId);
      setEvents(events.filter(x => x.firebaseId !== e.firebaseId));
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting!');
    }
  }
}} style={{ padding: '0.5rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={18} /></button>
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
      <select value={hForm.avail} onChange={(e) => setHForm({ ...hForm, avail: e.target.value })} required style={inp}>
        <option value="available">Available</option>
        <option value="unavailable">Unavailable</option>
      </select>
      <button type="submit" style={{ ...btn, gridColumn: '1 / -1' }}>{editH ? 'Update' : 'Add'} Hall</button>
      {editH && <button type="button" onClick={() => { setEditH(null); setHForm({ name: '', capacity: '', avail: 'available' }); }} style={{ ...btn, gridColumn: '1 / -1', background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>}
    </form>
    <h3 style={{ color: '#2B4C7E', fontWeight: '600' }}>All Halls ({halls.length})</h3>
    {halls.length > 0 ? (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #2B4C7E' }}>
              {['ID', 'Name', 'Capacity', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#2B4C7E', fontWeight: '600' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {halls.map((h, i) => (
              <tr key={h.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f9fafb' : 'transparent' }}>
                <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>{h.id}</td>
                <td style={{ padding: '0.75rem', color: '#1f2937' }}>{h.name}</td>
                <td style={{ padding: '0.75rem', color: '#6b7280' }}>{h.capacity}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', background: h.avail === 'available' ? 'rgba(45, 74, 124, 0.1)' : 'rgba(220, 38, 38, 0.1)', color: h.avail === 'available' ? '#2B4C7E' : '#dc2626' }}>
                    {h.avail}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <button onClick={() => { setEditH(h); setHForm({ name: h.name, capacity: h.capacity, avail: h.avail }); }} style={{ padding: '0.5rem', marginRight: '0.5rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                  <button onClick={async () => { 
  if (confirm('Delete?')) {
    try {
      await deleteHall(h.firebaseId);
      setHalls(halls.filter(x => x.firebaseId !== h.firebaseId));
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting!');
    }
  }
}} style={{ padding: '0.5rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
  <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Hall Bookings</h2>
  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
    <div style={{ position: 'relative', minWidth: '250px' }}>
      <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
      <input 
        type="text"
        placeholder="Search by ID, Name, Date, Hall..."
        value={bookingSearch}
        onChange={(e) => setBookingSearch(e.target.value)}
        style={{ ...inp, paddingLeft: '2.5rem', minWidth: '300px' }}
      />
    </div>
    <select value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)} style={inp}>
      <option value="all">All Status</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
    <button onClick={() => exportToExcel(getFilteredBookings(), 'StartupTN_Bookings')} style={btn}><Download size={18} /> Export Excel</button>
  </div>
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
    {bookings.length > 0 ? [...getFilteredBookings()].sort((a, b) => parseBookingId(b.id) - parseBookingId(a.id)).map(b => (
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
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {b.status === 'pending' && <>
            <button onClick={() => { const m = prompt('Approval message (optional):'); if (m !== null) updateBooking(b.id, 'approved', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(13, 140, 79, 0.1)', color: '#059669', border: '2px solid #059669', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><CheckCircle size={18} style={{ verticalAlign: 'middle' }} /> Approve</button>
            <button onClick={() => { const m = prompt('Rejection reason:'); if (m) updateBooking(b.id, 'rejected', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: '2px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><XCircle size={18} style={{ verticalAlign: 'middle' }} /> Reject</button>
          </>}
          <button onClick={() => { setEditB(b); setTab('edit-b'); }} style={{ padding: '0.75rem 1rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={18} /></button>
          <button onClick={async () => { 
  if (confirm('Delete this booking?')) {
    try {
      await deleteBooking(b.firebaseId);
      setBookings(bookings.filter(x => x.firebaseId !== b.firebaseId));
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting!');
    }
  }
}} style={{ padding: '0.75rem 1rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={18} /></button>
        </div>
      </div>
    )) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No bookings yet</p>}
  </div>
)}

{tab === 'admin-c' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
  <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Coworking Requests</h2>
  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
    <div style={{ position: 'relative', minWidth: '250px' }}>
      <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
      <input 
        type="text"
        placeholder="Search by ID, Name, Company, Date..."
        value={coworkingSearch}
        onChange={(e) => setCoworkingSearch(e.target.value)}
        style={{ ...inp, paddingLeft: '2.5rem', minWidth: '300px' }}
      />
    </div>
    <select value={coworkingStatusFilter} onChange={(e) => setCoworkingStatusFilter(e.target.value)} style={inp}>
      <option value="all">All Status</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
    <button onClick={() => exportToExcel(getFilteredCoworking(), 'StartupTN_Coworking')} style={btn}><Download size={18} /> Export Excel</button>
  </div>
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
    {coworking.length > 0 ? [...getFilteredCoworking()].sort((a, b) => parseBookingId(b.id) - parseBookingId(a.id)).map(c => (
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
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {c.status === 'pending' && <>
            <button onClick={() => { const m = prompt('Approval message (optional):'); if (m !== null) updateCowork(c.id, 'approved', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(13, 140, 79, 0.1)', color: '#059669', border: '2px solid #059669', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><CheckCircle size={18} style={{ verticalAlign: 'middle' }} /> Approve</button>
            <button onClick={() => { const m = prompt('Rejection reason:'); if (m) updateCowork(c.id, 'rejected', m); }} style={{ flex: 1, padding: '0.75rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: '2px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><XCircle size={18} style={{ verticalAlign: 'middle' }} /> Reject</button>
          </>}
          <button onClick={() => { setEditC(c); setTab('edit-c'); }} style={{ padding: '0.75rem 1rem', background: 'rgba(45, 74, 124, 0.1)', color: '#2B4C7E', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={18} /></button>
          <button onClick={async () => { 
  if (confirm('Delete this request?')) {
    try {
      await deleteCoworking(c.firebaseId);
      setCoworking(coworking.filter(x => x.firebaseId !== c.firebaseId));
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting!');
    }
  }
}} style={{ padding: '0.75rem 1rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={18} /></button>
        </div>
      </div>
    )) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No requests yet</p>}
  </div>
)}

{tab === 'edit-b' && isAdmin && editB && (
  <div style={card}>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '1.5rem' }}>Edit Booking — {editB.id}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Organizer Name</label>
        <input type="text" value={editB.organizerName} onChange={e => setEditB({...editB, organizerName: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Organization</label>
        <input type="text" value={editB.organization} onChange={e => setEditB({...editB, organization: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Email</label>
        <input type="email" value={editB.email} onChange={e => setEditB({...editB, email: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Phone</label>
        <input type="tel" value={editB.fullPhone || editB.phone} onChange={e => setEditB({...editB, fullPhone: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Date</label>
        <input type="date" value={editB.date} onChange={e => setEditB({...editB, date: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Start Time</label>
        <input type="time" value={editB.start} onChange={e => setEditB({...editB, start: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>End Time</label>
        <input type="time" value={editB.end} onChange={e => setEditB({...editB, end: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Attendees</label>
        <input type="number" value={editB.attendees} onChange={e => setEditB({...editB, attendees: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Purpose</label>
        <input type="text" value={editB.purpose} onChange={e => setEditB({...editB, purpose: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Status</label>
        <select value={editB.status} onChange={e => setEditB({...editB, status: e.target.value})} style={inp}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select></div>
      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Special Requirements</label>
        <textarea value={editB.req || ''} onChange={e => setEditB({...editB, req: e.target.value})} style={{ ...inp, minHeight: '80px' }} /></div>
    </div>
    <div style={{ display: 'flex', gap: '1rem' }}>
      <button onClick={async () => { try { await updateBookingFirebase(editB.firebaseId, editB); setBookings(bookings.map(x => x.firebaseId === editB.firebaseId ? editB : x)); setEditB(null); setTab('admin-b'); alert('Booking updated!'); } catch(e) { alert('Error updating booking!'); } }} style={{ ...btn, flex: 1 }}>Save Changes</button>
      <button onClick={() => { setEditB(null); setTab('admin-b'); }} style={{ ...btn, flex: 1, background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>
    </div>
  </div>
)}

{tab === 'edit-c' && isAdmin && editC && (
  <div style={card}>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '1.5rem' }}>Edit Coworking Request — {editC.id}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Name</label>
        <input type="text" value={editC.name} onChange={e => setEditC({...editC, name: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Company</label>
        <input type="text" value={editC.company} onChange={e => setEditC({...editC, company: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Email</label>
        <input type="email" value={editC.email} onChange={e => setEditC({...editC, email: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Phone</label>
        <input type="tel" value={editC.fullPhone || editC.phone} onChange={e => setEditC({...editC, fullPhone: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Seats</label>
        <input type="number" value={editC.seats} onChange={e => setEditC({...editC, seats: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Start Date</label>
        <input type="date" value={editC.startDate} onChange={e => setEditC({...editC, startDate: e.target.value})} style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Duration</label>
        <select value={editC.duration} onChange={e => setEditC({...editC, duration: e.target.value})} style={inp}>
          {['daily','weekly','monthly','quarterly'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
        </select></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Status</label>
        <select value={editC.status} onChange={e => setEditC({...editC, status: e.target.value})} style={inp}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select></div>
      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Purpose</label>
        <textarea value={editC.purpose} onChange={e => setEditC({...editC, purpose: e.target.value})} style={{ ...inp, minHeight: '80px' }} /></div>
    </div>
    <div style={{ display: 'flex', gap: '1rem' }}>
      <button onClick={async () => { try { await updateCoworkingFirebase(editC.firebaseId, editC); setCoworking(coworking.map(x => x.firebaseId === editC.firebaseId ? editC : x)); setEditC(null); setTab('admin-c'); alert('Coworking request updated!'); } catch(e) { alert('Error updating!'); } }} style={{ ...btn, flex: 1 }}>Save Changes</button>
      <button onClick={() => { setEditC(null); setTab('admin-c'); }} style={{ ...btn, flex: 1, background: '#e5e7eb', color: '#1f2937' }}>Cancel</button>
    </div>
  </div>
)}

      
{tab === 'cowork-member' && (
  <div style={card}>
    <button onClick={() => setTab('home')} style={{ ...btn, marginBottom: '1rem' }}>← Back</button>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '0.5rem' }}>Coworking Member Registration</h2>
    <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Enter the Booking ID shared by your incharge to register your details.</p>
    <form onSubmit={submitMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
      <div style={{ gridColumn: '1 / -1', background: '#EFF6FF', border: '2px solid #2B4C7E', borderRadius: '8px', padding: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '700' }}>Booking ID * <span style={{ fontWeight: '400', fontSize: '0.85rem' }}>(e.g. C-01072026-001)</span></label>
        <input type="text" value={memberForm.bookingId} onChange={(e) => setMemberForm({ ...memberForm, bookingId: e.target.value })} required style={inp} placeholder="Enter your Booking ID" />
      </div>
      {[['Full Name *','name','text',true],['Designation *','designation','text',true],['Email ID *','email','email',true],["Father's Name *",'fatherName','text',true]].map(([label,field,type,req]) => (
        <div key={field}><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>{label}</label>
          <input type={type} value={memberForm[field]} onChange={(e) => setMemberForm({...memberForm,[field]:e.target.value})} required={req} style={inp} /></div>
      ))}
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Contact Number *</label>
        <input type="tel" value={memberForm.contactNumber} onChange={(e) => setMemberForm({...memberForm,contactNumber:e.target.value.replace(/\D/g,'')})} maxLength="10" required style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Alternate Contact</label>
        <input type="tel" value={memberForm.alternateContact} onChange={(e) => setMemberForm({...memberForm,alternateContact:e.target.value.replace(/\D/g,'')})} maxLength="10" style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Gender *</label>
        <select value={memberForm.gender} onChange={(e) => setMemberForm({...memberForm,gender:e.target.value})} required style={inp}>
          <option value="">Select</option>{['Male','Female','Other'].map(g=><option key={g} value={g}>{g}</option>)}</select></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Aadhar Number *</label>
        <input type="text" value={memberForm.aadharNo} onChange={(e) => setMemberForm({...memberForm,aadharNo:e.target.value.replace(/\D/g,'')})} maxLength="12" required style={inp} placeholder="12-digit" /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Date of Birth *</label>
        <input type="date" value={memberForm.dob} onChange={(e) => setMemberForm({...memberForm,dob:e.target.value})} required style={inp} /></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Marital Status</label>
        <select value={memberForm.maritalStatus} onChange={(e) => setMemberForm({...memberForm,maritalStatus:e.target.value})} style={inp}>
          <option value="">Select</option>{['Single','Married','Divorced','Widowed'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      <div><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Blood Group</label>
        <select value={memberForm.bloodGroup} onChange={(e) => setMemberForm({...memberForm,bloodGroup:e.target.value})} style={inp}>
          <option value="">Select</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b} value={b}>{b}</option>)}</select></div>
      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Permanent Address *</label>
        <textarea value={memberForm.permanentAddress} onChange={(e) => setMemberForm({...memberForm,permanentAddress:e.target.value})} required style={{ ...inp, minHeight: '80px' }} /></div>
      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Communication Address</label>
        <textarea value={memberForm.communicationAddress} onChange={(e) => setMemberForm({...memberForm,communicationAddress:e.target.value})} style={{ ...inp, minHeight: '80px' }} placeholder="If different from permanent address" /></div>
      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Office Address</label>
        <textarea value={memberForm.officeAddress} onChange={(e) => setMemberForm({...memberForm,officeAddress:e.target.value})} style={{ ...inp, minHeight: '80px' }} /></div>
      <div style={{ gridColumn: '1 / -1' }}><button type="submit" style={{ ...btn, width: '100%' }}>Submit Member Details</button></div>
    </form>
  </div>
)}

{tab === 'admin-cm' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Coworking Members ({coworkingMembers.length})</h2>
      <button onClick={() => exportToExcel(coworkingMembers, 'StartupTN_CoworkingMembers')} style={{ ...btn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={18} /> Export Excel</button>
    </div>
    {(() => {
      const parseId = (id) => { try { const p=(id||'').split('-'); const d=p[1]||'01012000000'; return parseInt(d.slice(4,8))*100000000+parseInt(d.slice(2,4))*1000000+parseInt(d.slice(0,2))*10000+parseInt(p[2]||'0'); } catch{return 0;} };
      const sortedBookings = [...coworking].sort((a,b) => parseId(b.id)-parseId(a.id));
      const companies = [...new Set(sortedBookings.map(cw=>cw.company).filter(Boolean))].sort();
      if (companies.length === 0) return <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No coworking bookings yet.</p>;
      return companies.map(company => {
        const companyBookings = sortedBookings.filter(cw=>cw.company===company);
        const companyMembers = coworkingMembers.filter(m=>companyBookings.some(cw=>cw.id===m.bookingId));
        const totalSeats = companyBookings.reduce((sum,cw)=>sum+parseInt(cw.seats||0),0);
        const isExpanded = expandedCompany === company;
        return (
          <div key={company} style={{ marginBottom: '1rem', border: '2px solid #2B4C7E', borderRadius: '10px', overflow: 'hidden' }}>
            <div onClick={() => setExpandedCompany(isExpanded ? null : company)}
              style={{ background: isExpanded ? '#2B4C7E' : '#EFF6FF', padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: isExpanded ? '#ffffff' : '#2B4C7E' }}>{company}</span>
                <span style={{ fontSize: '0.85rem', color: isExpanded ? '#F5A623' : '#6b7280' }}>{companyBookings.length} booking(s) | {totalSeats} total seats</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600', background: companyMembers.length>0?'rgba(5,150,105,0.15)':'rgba(245,166,35,0.15)', color: companyMembers.length>0?'#059669':'#F5A623' }}>Members: {companyMembers.length} / {totalSeats}</span>
                <span style={{ color: isExpanded ? '#ffffff' : '#2B4C7E', fontSize: '1.2rem', fontWeight: '700' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>
            {isExpanded && (
              <div style={{ padding: '1rem 1.5rem' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {companyBookings.map(cw=>(
                    <span key={cw.id} style={{ padding: '0.35rem 0.75rem', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #e5e7eb' }}>
                      <strong style={{ color: '#2B4C7E' }}>{cw.id}</strong> — {cw.seats} seat(s) | {cw.startDate} | <span style={{ color: cw.status==='approved'?'#059669':'#F5A623', fontWeight: '600' }}>{cw.status.toUpperCase()}</span>
                    </span>
                  ))}
                </div>
                <h4 style={{ color: '#2B4C7E', fontWeight: '600', marginBottom: '0.75rem' }}>Team Members ({companyMembers.length})</h4>
                {companyMembers.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead><tr style={{ borderBottom: '2px solid #2B4C7E', background: '#f9fafb' }}>
                        {['#','Booking ID','Name','Designation','Contact','Alt Contact','Email','Gender','Aadhar','DOB','Marital','Blood',"Father's Name",'Permanent Addr','Comm Addr','Office Addr','Del'].map(h=>(
                          <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#2B4C7E', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}</tr></thead>
                      <tbody>{companyMembers.map((m,idx)=>(
                        <tr key={m.firebaseId} style={{ borderBottom: '1px solid #e5e7eb', background: idx%2===0?'#ffffff':'#f9fafb' }}>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{idx+1}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#2B4C7E', fontWeight: '600', whiteSpace: 'nowrap' }}>{m.bookingId}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#1f2937', whiteSpace: 'nowrap' }}>{m.name}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{m.designation}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{m.contactNumber}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{m.alternateContact||'—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{m.email}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{m.gender}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{m.aadharNo}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{m.dob}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{m.maritalStatus||'—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{m.bloodGroup||'—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{m.fatherName}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', minWidth: '120px' }}>{m.permanentAddress}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', minWidth: '120px' }}>{m.communicationAddress||'—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', minWidth: '120px' }}>{m.officeAddress||'—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <button onClick={async()=>{ if(confirm('Delete?')){ try{ await deleteCoworkingMember(m.firebaseId); setCoworkingMembers(coworkingMembers.filter(x=>x.firebaseId!==m.firebaseId)); }catch(e){alert('Error!');} }}} style={{ padding: '0.35rem 0.6rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No members registered yet.</p>}
              </div>
            )}
          </div>
        );
      });
    })()}
  </div>
)}

{tab === 'admin-r' && isAdmin && (() => {
  const TOTAL_SEATS = 21;
  const WORK_HOURS = 8;

  const parseId = (id) => {
    try {
      const p=(id||'').split('-'); const d=p[1]||'01012000000';
      return parseInt(d.slice(4,8))*100000000+parseInt(d.slice(2,4))*1000000+parseInt(d.slice(0,2))*10000+parseInt(p[2]||'0');
    } catch { return 0; }
  };

  const toYYYYMM = (id) => {
    try { const d=id.split('-')[1]; return d.slice(4,8)+'-'+d.slice(2,4); } catch { return ''; }
  };

  const approvedBookings = bookings.filter(b=>b.status==='approved');
  const pendingBookings  = bookings.filter(b=>b.status==='pending');
  const rejectedBookings = bookings.filter(b=>b.status==='rejected');
  const approvedCowork   = coworking.filter(c=>c.status==='approved');

  const totalHoursBooked = approvedBookings.reduce((sum,b)=>{
    if(b.start&&b.end){
      const[sh,sm]=b.start.split(':').map(Number);
      const[eh,em]=b.end.split(':').map(Number);
      return sum+((eh*60+em)-(sh*60+sm))/60;
    }
    return sum;
  },0);

  const seatsOccupied  = approvedCowork.reduce((s,c)=>s+parseInt(c.seats||0),0);
  const cwOccPct       = Math.min(100,Math.round((seatsOccupied/TOTAL_SEATS)*100));
  const hallApprovalPct= bookings.length>0?Math.round((approvedBookings.length/bookings.length)*100):0;
  const cwApprovalPct  = coworking.length>0?Math.round((approvedCowork.length/coworking.length)*100):0;

  // Per-hall
  const hallMap = {};
  approvedBookings.forEach(b=>{
    const h=b.hallName||'Unknown';
    if(!hallMap[h]) hallMap[h]={name:h,count:0,hours:0};
    hallMap[h].count++;
    if(b.start&&b.end){
      const[sh,sm]=b.start.split(':').map(Number);
      const[eh,em]=b.end.split(':').map(Number);
      hallMap[h].hours+=((eh*60+em)-(sh*60+sm))/60;
    }
  });
  const hallStats = Object.values(hallMap).sort((a,b)=>b.count-a.count);
  const maxHours  = Math.max(...hallStats.map(h=>h.hours),1);

  // Per-company coworking
  const cwMap = {};
  approvedCowork.forEach(c=>{
    const co=c.company||'Unknown';
    if(!cwMap[co]) cwMap[co]={name:co,seats:0,bookings:0};
    cwMap[co].seats+=parseInt(c.seats||0);
    cwMap[co].bookings++;
  });
  const cwStats = Object.values(cwMap).sort((a,b)=>b.seats-a.seats);

  // Monthly breakdown
  const mMap = {};
  visitors.forEach(v=>{
    const ym=toYYYYMM(v.id||'');
    if(!ym) return;
    if(!mMap[ym]) mMap[ym]={ym,v:0,b:0,ba:0,c:0,ca:0};
    mMap[ym].v++;
  });
  bookings.forEach(b=>{
    const ym=toYYYYMM(b.id||'');
    if(!ym) return;
    if(!mMap[ym]) mMap[ym]={ym,v:0,b:0,ba:0,c:0,ca:0};
    mMap[ym].b++;
    if(b.status==='approved') mMap[ym].ba++;
  });
  coworking.forEach(c=>{
    const ym=toYYYYMM(c.id||'');
    if(!ym) return;
    if(!mMap[ym]) mMap[ym]={ym,v:0,b:0,ba:0,c:0,ca:0};
    mMap[ym].c++;
    if(c.status==='approved') mMap[ym].ca++;
  });
  const months = Object.values(mMap).sort((a,b)=>b.ym.localeCompare(a.ym));

  // Feedback
  const avgRating = feedbacks.length>0
    ? (feedbacks.reduce((s,f)=>s+parseInt(f.rating?.match(/\d/)?.[0]||0),0)/feedbacks.length).toFixed(1)
    : null;

  // All-time (live + archived)
  const arcV = monthlyArchives.reduce((s,a)=>s+(a.visitors?.total||0),0);
  const arcB = monthlyArchives.reduce((s,a)=>s+(a.bookings?.total||0),0);
  const arcC = monthlyArchives.reduce((s,a)=>s+(a.coworking?.total||0),0);

  // Styles
  const pctColor = p => p>=80?'#dc2626':p>=50?'#F5A623':'#059669';
  const statCard = { background:'#ffffff', borderRadius:'10px', padding:'1.25rem 1.5rem', border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
  const barBg    = { height:'10px', background:'#e5e7eb', borderRadius:'5px', overflow:'hidden', marginTop:'6px' };
  const barFill  = (p,c) => ({ height:'100%', width:`${Math.min(100,p)}%`, background:c, borderRadius:'5px' });
  const secHead  = { color:'#2B4C7E', fontWeight:'700', fontSize:'1rem', margin:'0 0 1rem', paddingBottom:'0.5rem', borderBottom:'2px solid #e5e7eb' };

  return (
    <div style={card}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <h2 style={{ color:'#2B4C7E', fontWeight:'700', margin:0 }}>📊 Reports & Analytics</h2>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
          <input type="month" value={archiveMonth} onChange={e=>setArchiveMonth(e.target.value)} style={{ ...inp, maxWidth:'180px' }} max={new Date().toISOString().slice(0,7)} />
          <button onClick={handleArchiveAndClear} disabled={archiving||!archiveMonth} style={{ ...btn, background:archiving?'#9ca3af':'#F5A623' }}>
            {archiving?'Archiving...':'📦 Archive & Clear'}
          </button>
        </div>
      </div>

      {/* ── ALL-TIME KPI CARDS ── */}
      <h3 style={secHead}>📈 All-Time Overview</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'1rem', marginBottom:'2rem' }}>
        {[
          { icon:'👥', label:'Total Visitors',    value:visitors.length+arcV,   sub:`Live: ${visitors.length} | Archived: ${arcV}`,   color:'#2B4C7E' },
          { icon:'🏢', label:'Hall Bookings',      value:bookings.length+arcB,   sub:`Approved: ${approvedBookings.length}`,             color:'#059669' },
          { icon:'🪑', label:'Coworking',          value:coworking.length+arcC,  sub:`Approved: ${approvedCowork.length}`,              color:'#7c3aed' },
          { icon:'📅', label:'Events',             value:events.length,          sub:`Registrations: ${events.reduce((s,e)=>s+(e.regs?.length||0),0)}`, color:'#F5A623' },
          { icon:'👤', label:'Members Registered', value:coworkingMembers.length, sub:'coworking members',                              color:'#0891b2' },
          { icon:'💬', label:'Feedback',           value:feedbacks.length,       sub:avgRating?`Avg: ${avgRating} ⭐`:'No ratings yet', color:'#dc2626' },
        ].map(item=>(
          <div key={item.label} style={statCard}>
            <div style={{ fontSize:'1.4rem' }}>{item.icon}</div>
            <div style={{ color:'#6b7280', fontSize:'0.75rem', margin:'0.25rem 0' }}>{item.label}</div>
            <div style={{ color:item.color, fontSize:'2rem', fontWeight:'700', lineHeight:1 }}>{item.value}</div>
            <div style={{ color:'#9ca3af', fontSize:'0.72rem', marginTop:'0.35rem' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* ── OCCUPANCY RATES ── */}
      <h3 style={secHead}>🎯 Occupancy & Approval Rates</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'1rem', marginBottom:'2rem' }}>

        {/* Coworking occupancy */}
        <div style={statCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
            <span style={{ color:'#1f2937', fontWeight:'600' }}>🪑 Coworking Occupancy</span>
            <span style={{ color:pctColor(cwOccPct), fontSize:'1.8rem', fontWeight:'700' }}>{cwOccPct}%</span>
          </div>
          <div style={barBg}><div style={barFill(cwOccPct, pctColor(cwOccPct))} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginTop:'0.75rem', fontSize:'0.8rem' }}>
            <span style={{ color:'#6b7280' }}>Occupied: <strong style={{ color:'#1f2937' }}>{seatsOccupied}</strong></span>
            <span style={{ color:'#6b7280' }}>Available: <strong style={{ color:'#059669' }}>{TOTAL_SEATS-seatsOccupied}</strong></span>
            <span style={{ color:'#6b7280' }}>Capacity: <strong style={{ color:'#1f2937' }}>{TOTAL_SEATS} seats</strong></span>
            <span style={{ color:'#6b7280' }}>Companies: <strong style={{ color:'#1f2937' }}>{cwStats.length}</strong></span>
          </div>
          {/* Seat map */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginTop:'1rem' }}>
            {Array.from({length:TOTAL_SEATS},(_,i)=>(
              <div key={i} style={{ aspectRatio:'1', borderRadius:'4px', background:i<seatsOccupied?'#2B4C7E':'#e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:i<seatsOccupied?'#fff':'#9ca3af', fontWeight:'600' }}>{i+1}</div>
            ))}
          </div>
          <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem', fontSize:'0.72rem', color:'#6b7280' }}>
            <span><span style={{ display:'inline-block', width:'10px', height:'10px', background:'#2B4C7E', borderRadius:'2px', marginRight:'3px' }} />Occupied</span>
            <span><span style={{ display:'inline-block', width:'10px', height:'10px', background:'#e5e7eb', borderRadius:'2px', marginRight:'3px' }} />Available</span>
          </div>
        </div>

        {/* Hall utilization */}
        <div style={statCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
            <span style={{ color:'#1f2937', fontWeight:'600' }}>🏢 Hall Booking Approval</span>
            <span style={{ color:pctColor(hallApprovalPct), fontSize:'1.8rem', fontWeight:'700' }}>{hallApprovalPct}%</span>
          </div>
          <div style={barBg}><div style={barFill(hallApprovalPct, pctColor(hallApprovalPct))} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginTop:'0.75rem', fontSize:'0.8rem' }}>
            <span style={{ color:'#6b7280' }}>Approved: <strong style={{ color:'#059669' }}>{approvedBookings.length}</strong></span>
            <span style={{ color:'#6b7280' }}>Pending: <strong style={{ color:'#F5A623' }}>{pendingBookings.length}</strong></span>
            <span style={{ color:'#6b7280' }}>Rejected: <strong style={{ color:'#dc2626' }}>{rejectedBookings.length}</strong></span>
            <span style={{ color:'#6b7280' }}>Total: <strong style={{ color:'#1f2937' }}>{bookings.length}</strong></span>
          </div>
          <div style={{ marginTop:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:'4px' }}>
              <span style={{ color:'#6b7280' }}>Coworking approval</span>
              <span style={{ color:pctColor(cwApprovalPct), fontWeight:'600' }}>{cwApprovalPct}%</span>
            </div>
            <div style={barBg}><div style={barFill(cwApprovalPct, '#7c3aed')} /></div>
          </div>
          <div style={{ marginTop:'1rem', padding:'0.75rem', background:'#f9fafb', borderRadius:'6px', fontSize:'0.8rem' }}>
            <div style={{ color:'#6b7280', marginBottom:'4px' }}>Total hours booked (approved):</div>
            <div style={{ color:'#2B4C7E', fontSize:'1.4rem', fontWeight:'700' }}>{Math.round(totalHoursBooked)}h</div>
          </div>
        </div>

        {/* Feedback rating */}
        {feedbacks.length > 0 && (
          <div style={statCard}>
            <div style={{ color:'#1f2937', fontWeight:'600', marginBottom:'0.75rem' }}>⭐ Feedback Ratings</div>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem' }}>
              <div style={{ color:'#F5A623', fontSize:'2.5rem', fontWeight:'700' }}>{avgRating}</div>
              <div style={{ color:'#6b7280', fontSize:'0.8rem' }}>avg rating<br/>from {feedbacks.length} responses</div>
            </div>
            {[5,4,3,2,1].map(r=>{
              const count=feedbacks.filter(f=>parseInt(f.rating?.match(/\d/)?.[0]||0)===r).length;
              const pct=Math.round((count/feedbacks.length)*100);
              return (
                <div key={r} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', fontSize:'0.8rem' }}>
                  <span style={{ minWidth:'18px', color:'#6b7280' }}>{r}⭐</span>
                  <div style={{ ...barBg, flex:1, margin:0 }}><div style={barFill(pct,'#F5A623')} /></div>
                  <span style={{ minWidth:'30px', color:'#6b7280', textAlign:'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PER-HALL BREAKDOWN ── */}
      {hallStats.length > 0 && (
        <div style={{ marginBottom:'2rem' }}>
          <h3 style={secHead}>🏢 Hall-wise Utilization</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
            {hallStats.map(h=>{
              const pct=Math.round((h.hours/maxHours)*100);
              const col=pctColor(pct);
              return (
                <div key={h.name} style={statCard}>
                  <div style={{ color:'#2B4C7E', fontWeight:'600', marginBottom:'0.5rem' }}>{h.name}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'#6b7280', marginBottom:'4px' }}>
                    <span>{h.count} bookings</span><span>{Math.round(h.hours)}h used</span>
                  </div>
                  <div style={barBg}><div style={barFill(pct,col)} /></div>
                  <div style={{ fontSize:'0.72rem', color:'#9ca3af', marginTop:'4px' }}>{pct}% of busiest hall</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COWORKING BY COMPANY ── */}
      {cwStats.length > 0 && (
        <div style={{ marginBottom:'2rem' }}>
          <h3 style={secHead}>🪑 Coworking by Company</h3>
          <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid #e5e7eb' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
              <thead>
                <tr style={{ background:'#2B4C7E', color:'#fff' }}>
                  {['Company','Seats Occupied','Bookings','% of Capacity'].map(h=>(
                    <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontWeight:'600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cwStats.map((c,i)=>{
                  const pct=Math.round((c.seats/TOTAL_SEATS)*100);
                  return (
                    <tr key={c.name} style={{ borderBottom:'1px solid #e5e7eb', background:i%2===0?'#fff':'#f9fafb' }}>
                      <td style={{ padding:'0.75rem 1rem', color:'#1f2937', fontWeight:'500' }}>{c.name}</td>
                      <td style={{ padding:'0.75rem 1rem', color:'#2B4C7E', fontWeight:'600' }}>{c.seats}</td>
                      <td style={{ padding:'0.75rem 1rem', color:'#6b7280' }}>{c.bookings}</td>
                      <td style={{ padding:'0.75rem 1rem', minWidth:'140px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ ...barBg, flex:1, margin:0 }}><div style={barFill(pct,'#7c3aed')} /></div>
                          <span style={{ color:'#7c3aed', fontWeight:'600', minWidth:'35px' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MONTHLY BREAKDOWN ── */}
      {months.length > 0 && (
        <div style={{ marginBottom:'2rem' }}>
          <h3 style={secHead}>📅 Monthly Breakdown</h3>
          <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid #e5e7eb' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
              <thead>
                <tr style={{ background:'#2B4C7E', color:'#fff' }}>
                  {['Month','Visitors','Bookings','Approved','Rejected','Coworking','CW Approved'].map(h=>(
                    <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontWeight:'600', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m,i)=>(
                  <tr key={m.ym} style={{ borderBottom:'1px solid #e5e7eb', background:i%2===0?'#fff':'#f9fafb' }}>
                    <td style={{ padding:'0.75rem 1rem', color:'#2B4C7E', fontWeight:'600' }}>{m.ym}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#1f2937', fontWeight:'600' }}>{m.v}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#1f2937' }}>{m.b}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#059669', fontWeight:'600' }}>{m.ba}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#dc2626', fontWeight:'600' }}>{m.b-m.ba}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#1f2937' }}>{m.c}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#7c3aed', fontWeight:'600' }}>{m.ca}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ARCHIVE HISTORY ── */}
      <div style={{ marginBottom:'2rem' }}>
        <h3 style={secHead}>📦 Archive History ({monthlyArchives.length} months)</h3>
        {monthlyArchives.length === 0 ? (
          <p style={{ color:'#6b7280', fontStyle:'italic', fontSize:'0.9rem' }}>No archived months yet. Use the Archive & Clear tool above to save monthly summaries.</p>
        ) : (
          <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid #e5e7eb' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
              <thead>
                <tr style={{ background:'#2B4C7E', color:'#fff' }}>
                  {['Month','Visitors','Bookings','Approved','Coworking','CW Approved','Archived On'].map(h=>(
                    <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontWeight:'600', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...monthlyArchives].sort((a,b)=>b.month.localeCompare(a.month)).map((a,i)=>(
                  <tr key={a.month} style={{ borderBottom:'1px solid #e5e7eb', background:i%2===0?'#fff':'#f9fafb' }}>
                    <td style={{ padding:'0.75rem 1rem', color:'#2B4C7E', fontWeight:'600' }}>{a.label}</td>
                    <td style={{ padding:'0.75rem 1rem', fontWeight:'600' }}>{a.visitors?.total||0}</td>
                    <td style={{ padding:'0.75rem 1rem' }}>{a.bookings?.total||0}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#059669', fontWeight:'600' }}>{a.bookings?.approved||0}</td>
                    <td style={{ padding:'0.75rem 1rem' }}>{a.coworking?.total||0}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#7c3aed', fontWeight:'600' }}>{a.coworking?.approved||0}</td>
                    <td style={{ padding:'0.75rem 1rem', color:'#6b7280', fontSize:'0.78rem' }}>{a.archivedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
})()}

{tab === 'feedback' && (
  <div style={card}>
    <button onClick={() => setTab('home')} style={{ ...btn, marginBottom: '1rem' }}>← Back</button>
    <h2 style={{ color: '#2B4C7E', fontWeight: '700', marginBottom: '0.5rem' }}>General Feedback</h2>
    <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>We value your feedback. Please share your experience with us.</p>
    <form onSubmit={submitFeedback} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Name *</label>
        <input type="text" value={feedbackForm.name} onChange={(e) => setFeedbackForm({...feedbackForm, name: e.target.value})} required style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Email</label>
        <input type="email" value={feedbackForm.email} onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})} style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Phone</label>
        <input type="tel" value={feedbackForm.phone} onChange={(e) => setFeedbackForm({...feedbackForm, phone: e.target.value.replace(/\D/g, '')})} maxLength="10" style={inp} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Category *</label>
        <select value={feedbackForm.category} onChange={(e) => setFeedbackForm({...feedbackForm, category: e.target.value})} required style={inp}>
          <option value="">Select category</option>
          {['Visitor Experience','Hall Booking','Coworking Space','Events','Staff & Service','Facilities & Amenities','General'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Rating *</label>
        <select value={feedbackForm.rating} onChange={(e) => setFeedbackForm({...feedbackForm, rating: e.target.value})} required style={inp}>
          <option value="">Select rating</option>
          {['⭐ 1 - Poor','⭐⭐ 2 - Below Average','⭐⭐⭐ 3 - Average','⭐⭐⭐⭐ 4 - Good','⭐⭐⭐⭐⭐ 5 - Excellent'].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2B4C7E', fontWeight: '600' }}>Your Feedback *</label>
        <textarea value={feedbackForm.message} onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})} required style={{ ...inp, minHeight: '120px' }} placeholder="Please share your experience, suggestions, or concerns..." />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button type="submit" style={{ ...btn, width: '100%' }}>Submit Feedback</button>
      </div>
    </form>
  </div>
)}

{tab === 'admin-fb' && isAdmin && (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <h2 style={{ color: '#2B4C7E', fontWeight: '700', margin: 0 }}>Feedback ({feedbacks.length})</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={feedbackFilter} onChange={(e) => setFeedbackFilter(e.target.value)} style={{ ...inp, minWidth: '180px' }}>
          <option value="all">All Categories</option>
          {['Visitor Experience','Hall Booking','Coworking Space','Events','Staff & Service','Facilities & Amenities','General'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={() => exportToExcel(feedbacks, 'StartupTN_Feedback')} style={{ ...btn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={18} /> Export Excel
        </button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      {[
        { label: 'Total Feedback', value: feedbacks.length, color: '#2B4C7E' },
        { label: 'Avg Rating', value: feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + parseInt(f.rating?.charAt(1) || 0), 0) / feedbacks.length).toFixed(1) + ' ⭐' : '—', color: '#F5A623' },
        { label: '5 Star', value: feedbacks.filter(f => f.rating?.startsWith('⭐⭐⭐⭐⭐')).length, color: '#059669' },
        { label: '1-2 Star', value: feedbacks.filter(f => f.rating?.startsWith('⭐ 1') || f.rating?.startsWith('⭐⭐ 2')).length, color: '#dc2626' },
      ].map(item => (
        <div key={item.label} style={{ background: '#f9fafb', borderRadius: '10px', padding: '1rem', border: `2px solid ${item.color}20`, textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{item.label}</p>
          <p style={{ color: item.color, fontSize: '1.6rem', fontWeight: '700', margin: 0 }}>{item.value}</p>
        </div>
      ))}
    </div>

    {feedbacks.filter(f => feedbackFilter === 'all' || f.category === feedbackFilter).length === 0 ? (
      <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No feedback yet.</p>
    ) : (
      <div>
        {feedbacks
          .filter(f => feedbackFilter === 'all' || f.category === feedbackFilter)
          .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
          .map(f => (
            <div key={f.firebaseId} style={{ background: '#f9fafb', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontWeight: '700', color: '#1f2937', fontSize: '1rem' }}>{f.name}</span>
                  {f.email && <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '0.75rem' }}>{f.email}</span>}
                  {f.phone && <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '0.75rem' }}>📞 {f.phone}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(43,76,126,0.1)', color: '#2B4C7E', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>{f.category}</span>
                  <span style={{ fontSize: '0.9rem' }}>{f.rating}</span>
                  <button onClick={async () => {
                    if (confirm('Delete this feedback?')) {
                      try {
                        await deleteFeedback(f.firebaseId);
                        setFeedbacks(feedbacks.filter(x => x.firebaseId !== f.firebaseId));
                      } catch(e) { alert('Error deleting!'); }
                    }
                  }} style={{ padding: '0.35rem 0.6rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p style={{ color: '#1f2937', margin: '0 0 0.5rem', lineHeight: '1.6' }}>{f.message}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: 0 }}>{f.submittedAt}</p>
            </div>
          ))
        }
      </div>
    )}
  </div>
)}

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
  </div>
  );
};

export default VisitorManagementSystem;
