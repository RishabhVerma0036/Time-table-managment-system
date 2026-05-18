import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6Sr5OszsxIx5cc0lB9P-nhutzeJOfR-k",
  authDomain: "timetable-system-new.firebaseapp.com",
  projectId: "timetable-system-new",
  storageBucket: "timetable-system-new.firebasestorage.app",
  messagingSenderId: "756562220681",
  appId: "1:756562220681:web:22018ee8729fa0d858",
  measurementId: "G-C0LL9BFQ53"
};

let app, db, auth;
let useFirestore = true;
let eventsCol = null;
let firestoreUnsub = null;
try {
  app = initializeApp(firebaseConfig);
  try { getAnalytics(app); } catch (e) {  }
  db = getFirestore(app);
  auth = getAuth(app);
  eventsCol = collection(db, 'events');
  console.log('Firebase app / Firestore / Auth initialized.');
} catch (e) {
  console.warn('Firebase init failed — falling back to localStorage only.', e);
  useFirestore = false;
  db = null;
  auth = null;
}

async function cloudAddEvent(evt) {
  if (!useFirestore) return { ok: false, error: 'no-firestore' };
  try {

    const stored = {
      subject: evt.subject || '',
      teacher: evt.teacher || '',
      room: evt.room || '',
      start: evt.start,
      end: evt.end,
      metaType: evt.metaType || 'user',
      createdAt: (new Date()).toISOString()
    };
    const ref = await addDoc(eventsCol, stored);
    return { ok: true, id: ref.id };
  } catch (e) { return { ok: false, error: e }; }
}

async function cloudSetEvent(id, evt) {
  if (!useFirestore) return { ok: false, error: 'no-firestore' };
  try {
    const d = doc(eventsCol, id);
    const stored = {
      subject: evt.subject || '',
      teacher: evt.teacher || '',
      room: evt.room || '',
      start: evt.start,
      end: evt.end,
      metaType: evt.metaType || 'user',
      updatedAt: (new Date()).toISOString()
    };
    await setDoc(d, stored, { merge: true });
    return { ok: true };
  } catch (e) { return { ok: false, error: e }; }
}

async function cloudDeleteEvent(id) {
  if (!useFirestore) return { ok: false, error: 'no-firestore' };
  try {
    await deleteDoc(doc(eventsCol, id));
    return { ok: true };
  } catch (e) { return { ok: false, error: e }; }
}

function startFirestoreListener(applyCallback) {
  if (!useFirestore) return () => { };
  if (firestoreUnsub) firestoreUnsub();

  const q = query(eventsCol, orderBy('createdAt', 'desc'));
  firestoreUnsub = onSnapshot(q, snapshot => {
    const items = [];
    snapshot.forEach(docSnap => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    applyCallback(items);
  }, err => {
    console.error('Firestore events listener error', err);
  });

  return () => { if (firestoreUnsub) firestoreUnsub(); firestoreUnsub = null; };
}

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const get = k => JSON.parse(localStorage.getItem(k) || '[]');
const setLocal = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const K_SUB = 'subjects';
const K_TCHR = 'teachers';
const K_ROOM = 'rooms';
const K_EVENTS = 'events';

function applyTheme() {
  const t = localStorage.getItem('theme') || 'light';
  if (t === 'dark') document.body.classList.add('dark'); else document.body.classList.remove('dark');
  const btn = $('#themeToggle'); if (btn) btn.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
}
function toggleTheme() { document.body.classList.toggle('dark'); localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light'); applyTheme(); }
document.addEventListener('DOMContentLoaded', applyTheme);
document.addEventListener('click', e => { if (e.target && e.target.id === 'themeToggle') toggleTheme(); });

function setupInit() {
  const lists = $('#listsContainer'); if (!lists) return;

  const sIn = $('#subjectInput'), tIn = $('#teacherInput'), rIn = $('#roomInput');
  const addS = $('#addSubjectBtn'), addT = $('#addTeacherBtn'), addR = $('#addRoomBtn');
  const go = $('#goToTimetable'), clearBtn = $('#clearSetup'), exportBtn = $('#exportSetup');

  function render() {
    const subs = get(K_SUB), teachers = get(K_TCHR), rooms = get(K_ROOM);
    lists.innerHTML = `
      <div><strong>Subjects:</strong> ${subs.length ? subs.join(', ') : '<em>None</em>'}</div>
      <div><strong>Teachers:</strong> ${teachers.length ? teachers.join(', ') : '<em>None</em>'}</div>
      <div><strong>Rooms:</strong> ${rooms.length ? rooms.join(', ') : '<em>None</em>'}</div>
    `;
  }

  function addItem(key, input) {
    const v = (input.value || '').trim(); if (!v) { alert('Enter value'); return; }
    const arr = get(key); if (arr.includes(v)) { alert('Already exists'); input.value = ''; return; }
    arr.push(v); setLocal(key, arr); input.value = ''; render();
  }

  addS && addS.addEventListener('click', () => addItem(K_SUB, sIn));
  addT && addT.addEventListener('click', () => addItem(K_TCHR, tIn));
  addR && addR.addEventListener('click', () => addItem(K_ROOM, rIn));

  go && go.addEventListener('click', () => window.location.href = 'timetable.html');

  clearBtn && clearBtn.addEventListener('click', () => {
    if (!confirm('Clear subjects, teachers and rooms?')) return;
    localStorage.removeItem(K_SUB); localStorage.removeItem(K_TCHR); localStorage.removeItem(K_ROOM);
    render();
  });

  exportBtn && exportBtn.addEventListener('click', () => {
    const subs = get(K_SUB), teachers = get(K_TCHR), rooms = get(K_ROOM);
    const max = Math.max(subs.length, teachers.length, rooms.length);
    const rows = [];
    for (let i = 0; i < max; i++) rows.push({ Subject: subs[i] || '', Teacher: teachers[i] || '', Room: rooms[i] || '' });
    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Setup");
      XLSX.writeFile(wb, "setup.xlsx");
    } else {
      const csv = 'Subject,Teacher,Room\n' + rows.map(r => `"${r.Subject}","${r.Teacher}","${r.Room}"`).join('\n');
      const b = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'setup.csv'; a.click(); URL.revokeObjectURL(a.href);
    }
  });

  render();
}

let calendar = null;

function populateModalSelects() {
  const s = $('#evtSubject'), t = $('#evtTeacher'), r = $('#evtRoom');
  if (!s) return;
  function fill(sel, arr) {
    while (sel.options.length > 1) sel.remove(1);
    arr.forEach(x => { const o = document.createElement('option'); o.value = x; o.textContent = x; sel.appendChild(o); });
  }
  fill(s, get(K_SUB)); fill(t, get(K_TCHR)); fill(r, get(K_ROOM));
}

function dateOnlyISO(isoOrDate) { const d = (typeof isoOrDate === 'string') ? new Date(isoOrDate) : isoOrDate; return d.toISOString().slice(0, 10); }
function parseISO(iso) { return (typeof iso === 'string') ? new Date(iso) : iso; }
function timesOverlap(aStart, aEnd, bStart, bEnd) { return (aStart < bEnd) && (bStart < aEnd); }

function loadEventsUnified() {
  return JSON.parse(localStorage.getItem(K_EVENTS) || '[]');
}

async function saveEventUnified(evt, editingId = null) {
  if (useFirestore && auth) {
    try {

      if (editingId && !editingId.startsWith('evt-')) {
        const r = await cloudSetEvent(editingId, evt);
        if (!r.ok) throw r.error;
        return { ok: true };
      } else {
        const r = await cloudAddEvent(evt);
        if (!r.ok) throw r.error;
        return { ok: true, id: r.id };
      }
    } catch (e) {
      console.error('Cloud save error', e);
      return { ok: false, error: e };
    }
  } else {
    let arr = loadEventsUnified();
    if (editingId) arr = arr.map(a => a.id === editingId ? { ...evt, id: editingId } : a);
    else arr.push({ ...evt, id: ('evt-' + Date.now()) });
    setLocal(K_EVENTS, arr);
    return { ok: true };
  }
}

async function deleteEventUnified(id) {
  if (useFirestore && auth && !id.startsWith('evt-')) {
    const r = await cloudDeleteEvent(id);
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true };
  } else {
    let arr = loadEventsUnified();
    arr = arr.filter(a => a.id !== id);
    setLocal(K_EVENTS, arr);
    return { ok: true };
  }
}

function evToFc(ev) { return { id: ev.id, title: (ev.subject || '') + (ev.teacher ? ' — ' + ev.teacher : ''), start: ev.start, end: ev.end, extendedProps: { subject: ev.subject, teacher: ev.teacher, room: ev.room } }; }

function timetableInit() {
  const calEl = $('#calendar'); if (!calEl) return;

  const modal = $('#modal'), form = $('#eventForm');
  const dateEl = $('#evtDate'), startEl = $('#evtStart'), endEl = $('#evtEnd');
  const subjEl = $('#evtSubject'), teachEl = $('#evtTeacher'), roomEl = $('#evtRoom');
  const deleteBtn = $('#deleteBtn'), cancelBtn = $('#cancelBtn');
  const exportXLSXBtn = $('#exportXLSX'), exportICSBtn = $('#exportICS'), backBtn = $('#backSetup');

  function loadEvents() { return loadEventsUnified(); }
  function saveEvents(arr) { setLocal(K_EVENTS, arr); }

  calendar = new FullCalendar.Calendar(calEl, {
    initialView: 'dayGridMonth',
    height: 650,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
    dateClick: info => openAdd(info.dateStr),
    eventClick: info => { if (info.jsEvent) { info.jsEvent.preventDefault(); info.jsEvent.stopPropagation(); } openEdit(info.event); },
    events: loadEvents().map(evToFc)
  });

  calendar.render();
  addHolidayBackgroundsToCalendar(calendar);

  let editingId = null;
  function showModal() { modal.classList.remove('hidden'); }
  function hideModal() { modal.classList.add('hidden'); editingId = null; }

  function openAdd(dateStr) {
    editingId = null;
    populateModalSelects();
    dateEl.value = dateStr; startEl.value = '09:00'; endEl.value = '10:00';
    subjEl && (subjEl.value = ''); teachEl && (teachEl.value = ''); roomEl && (roomEl.value = '');
    deleteBtn.style.display = 'none';
    showModal();
  }

  function openEdit(fcEvent) {
    editingId = fcEvent.id;
    populateModalSelects();
    const s = (typeof fcEvent.start === 'string') ? new Date(fcEvent.start) : fcEvent.start;
    const e = (typeof fcEvent.end === 'string') ? new Date(fcEvent.end) : (fcEvent.end || fcEvent.start);
    dateEl.value = s.toISOString().slice(0, 10);
    startEl.value = s.toTimeString().slice(0, 5);
    endEl.value = e.toTimeString().slice(0, 5);
    subjEl && (subjEl.value = (fcEvent.extendedProps && fcEvent.extendedProps.subject) ? fcEvent.extendedProps.subject : (fcEvent.title || ''));
    teachEl && (teachEl.value = (fcEvent.extendedProps && fcEvent.extendedProps.teacher) ? fcEvent.extendedProps.teacher : '');
    roomEl && (roomEl.value = (fcEvent.extendedProps && fcEvent.extendedProps.room) ? fcEvent.extendedProps.room : '');
    deleteBtn.style.display = 'inline-block';
    showModal();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!dateEl.value || !startEl.value || !endEl.value || !subjEl.value) { alert('Fill date, start time, end time and subject'); return; }

    const blocked = JSON.parse(localStorage.getItem('blockedDates') || '[]');
    const chosenDate = dateEl.value;
    if (blocked.includes(chosenDate)) { alert('Cannot schedule on academic holiday: ' + chosenDate); return; }

    const newStart = new Date(dateEl.value + 'T' + startEl.value + ':00');
    const newEnd = new Date(dateEl.value + 'T' + endEl.value + ':00');
    if (!(newStart < newEnd)) { alert('End must be after start'); return; }

    let arr = loadEvents();
    const newTeacher = (teachEl && teachEl.value) ? teachEl.value.trim() : '';
    const newRoom = (roomEl && roomEl.value) ? roomEl.value.trim() : '';

    for (let ex of arr) {
      if (editingId && ex.id === editingId) continue;
      if (dateOnlyISO(ex.start) !== chosenDate) continue;
      const exStart = parseISO(ex.start), exEnd = parseISO(ex.end);
      if (timesOverlap(newStart, newEnd, exStart, exEnd)) {
        if (newRoom && ex.room && newRoom === ex.room) {
          alert(`Conflict: Room "${newRoom}" already has "${ex.subject}" at ${exStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${exEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
          return;
        }
        if (newTeacher && ex.teacher && newTeacher === ex.teacher) {
          alert(`Conflict: Teacher "${newTeacher}" has "${ex.subject}" at ${exStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${exEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
          return;
        }
      }
    }

    const newEvt = { subject: subjEl.value, teacher: (teachEl.value || ''), room: (roomEl.value || ''), start: newStart.toISOString(), end: newEnd.toISOString() };

    const r = await saveEventUnified(newEvt, editingId);
    if (!r.ok) {
      alert('Failed to save event: ' + (r.error?.message || r.error || 'unknown'));
      return;
    }

    if (!(useFirestore && auth)) {
      refresh();
    }
    hideModal();
  });

  deleteBtn.addEventListener('click', async () => {
    if (!editingId) return;
    if (!confirm('Delete this event?')) return;
    const r = await deleteEventUnified(editingId);
    if (!r.ok) {
      alert('Failed to delete: ' + (r.error?.message || r.error || 'unknown'));
      return;
    }
    if (!(useFirestore && auth)) refresh();
    hideModal();
  });

  cancelBtn.addEventListener('click', () => hideModal());

  function refresh() {
    const arr = loadEvents();
    calendar.removeAllEvents();
    arr.forEach(e => calendar.addEvent(evToFc(e)));
    addHolidayBackgroundsToCalendar(calendar);
    renderList();
  }

  function renderList() {
    const container = $('#listContainer'); if (!container) return;
    const arr = loadEvents();
    if (!arr.length) { container.innerHTML = '<p>No events yet</p>'; return; }
    const html = arr.map(ev => {
      const s = new Date(ev.start), e = new Date(ev.end);
      const dd = String(s.getDate()).padStart(2, '0'), mm = String(s.getMonth() + 1).padStart(2, '0');
      return `
        <div class="list-row" data-id="${ev.id}">
          <div class="meta">
            <div class="date-badge">${dd}/${mm}</div>
            <div class="time">${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="body">
            <div class="title">${ev.subject}</div>
            <div class="sub">${ev.teacher ? ev.teacher + ' • ' : ''}${ev.room ? ev.room : ''}</div>
          </div>
          <div class="actions"><button class="edit-btn" data-id="${ev.id}">Edit</button></div>
        </div>
      `;
    }).join('');
    container.innerHTML = html;

    $$('.edit-btn').forEach(btn => btn.onclick = (ev) => {
      ev.preventDefault();
      const id = btn.getAttribute('data-id');
      const found = loadEvents().find(x => x.id === id);
      if (!found) return;
      editingId = found.id;
      populateModalSelects();
      $('#evtDate').value = found.start.slice(0, 10);
      $('#evtStart').value = found.start.slice(11, 16);
      $('#evtEnd').value = found.end.slice(11, 16);
      $('#evtSubject').value = found.subject;
      $('#evtTeacher').value = found.teacher;
      $('#evtRoom').value = found.room;
      $('#deleteBtn').style.display = 'inline-block';
      showModal();
    });
  }

  exportXLSXBtn && exportXLSXBtn.addEventListener('click', () => {
    const arr = loadEvents(); if (!arr.length) { alert('No events to export'); return; }
    const rows = arr.map(ev => ({ Subject: ev.subject, Teacher: ev.teacher || '', Room: ev.room || '', Start: ev.start, End: ev.end }));
    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
      XLSX.writeFile(wb, 'timetable.xlsx');
    } else {
      const csv = 'Subject,Teacher,Room,Start,End\n' + rows.map(r => `"${r.Subject}","${r.Teacher}","${r.Room}","${r.Start}","${r.End}"`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'timetable.csv'; a.click(); URL.revokeObjectURL(a.href);
    }
  });

  exportICSBtn && exportICSBtn.addEventListener('click', () => {
    const arr = loadEvents(); if (!arr.length) { alert('No events'); return; }
    const startDateInput = prompt('Enter start date for recurrence (YYYY-MM-DD). Example: 2025-01-06');
    if (!startDateInput) return;
    const weeks = Number(prompt('Number of weeks to repeat (e.g. 15). Leave blank for 15.')) || 15;
    const startDate = new Date(startDateInput + 'T00:00:00'); if (isNaN(startDate.getTime())) { alert('Invalid start date'); return; }
    const untilDate = new Date(startDate); untilDate.setDate(untilDate.getDate() + weeks * 7);

    function toICSDatetimeUTC(date) { return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; }
    function escapeICal(s) { return (s || '').toString().replace(/(\r\n|\n|\r)/g, '\\n').replace(/,/g, '\\,'); }

    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TT-Manager//EN\r\n';
    arr.forEach((row, i) => {
      const s = new Date(row.start), e = new Date(row.end);
      const wk = s.getDay();
      const first = new Date(startDate);
      const diff = (wk + 7 - first.getDay()) % 7;
      first.setDate(first.getDate() + diff);
      const startDT = new Date(first); startDT.setHours(s.getHours(), s.getMinutes(), 0, 0);
      const endDT = new Date(first); endDT.setHours(e.getHours(), e.getMinutes(), 0, 0);

      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:tt-${Date.now()}-${i}@local\r\n`;
      ics += `DTSTAMP:${toICSDatetimeUTC(new Date())}\r\n`;
      ics += `DTSTART:${toICSDatetimeUTC(startDT)}\r\n`;
      ics += `DTEND:${toICSDatetimeUTC(endDT)}\r\n`;
      ics += `RRULE:FREQ=WEEKLY;UNTIL=${toICSDatetimeUTC(untilDate)}\r\n`;
      ics += `SUMMARY:${escapeICal(row.subject)}\r\n`;
      ics += `DESCRIPTION:${escapeICal('Teacher: ' + (row.teacher || '') + '\\nRoom: ' + (row.room || ''))}\r\n`;
      ics += 'END:VEVENT\r\n';
    });
    ics += 'END:VCALENDAR\r\n';
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'timetable.ics'; a.click(); URL.revokeObjectURL(a.href);
  });

  backBtn && backBtn.addEventListener('click', () => window.location.href = 'index.html');

  renderList();

  document.addEventListener('events-updated', () => {
    try { refresh(); } catch (e) { console.warn('events-updated: refresh failed', e); }
  });
}

function importAcademicICS(icsText) {
  try {
    const jcalData = ICAL.parse(icsText);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent') || [];
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    let blocked = JSON.parse(localStorage.getItem('blockedDates') || '[]');

    vevents.forEach(v => {
      const ve = new ICAL.Event(v);
      const start = ve.startDate.toJSDate();
      const end = ve.endDate ? ve.endDate.toJSDate() : new Date(start.getTime() + 60 * 60 * 1000);
      const summary = ve.summary || 'Academic Event';
      const desc = ve.description || '';
      const isAllDay = ve.startDate.isDate;         
      const dateOnly = start.toISOString().slice(0, 10);

      if (isAllDay) {
        if (!blocked.includes(dateOnly)) blocked.push(dateOnly);
      } else {
        events.push({
          id: 'acad-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          subject: summary,
          teacher: '',
          room: '',
          start: start.toISOString(),
          end: end.toISOString(),
          metaType: 'acad',
          description: desc
        });
      }
    });

    localStorage.setItem('events', JSON.stringify(events));
    localStorage.setItem('blockedDates', JSON.stringify(blocked));
    alert('Imported ' + vevents.length + ' ICS events (holidays marked).');

    if (typeof refresh === 'function') refresh();
    else if (typeof calendar !== 'undefined' && calendar) {
      calendar.removeAllEvents();
      JSON.parse(localStorage.getItem('events') || '[]').forEach(e => calendar.addEvent(evToFc(e)));
      addHolidayBackgroundsToCalendar(calendar);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to parse ICS file: ' + err);
  }
}

(function wireUpICSImport() {
  const importBtn = document.getElementById('importAcadBtn');
  const fileInput = document.getElementById('importFile');
  if (!importBtn || !fileInput) return;

  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith('.ics')) { alert('Please select a .ics file'); e.target.value = ''; return; }
    const text = await f.text();
    importAcademicICS(text);
    e.target.value = '';
  });
})();

function addHolidayBackgroundsToCalendar(calendarInstance) {
  if (!calendarInstance) return;
  calendarInstance.getEvents().filter(ev => ev.id && ev.id.startsWith('holiday-bg-')).forEach(ev => ev.remove());
  const blocked = JSON.parse(localStorage.getItem('blockedDates') || '[]');
  blocked.forEach((dateStr, idx) => {
    calendarInstance.addEvent({
      id: 'holiday-bg-' + idx,
      start: dateStr,
      end: dateStr,
      display: 'background',
      allDay: true,
      classNames: ['holiday-bg']
    });
  });
}

export async function signupWithEmail(email, password) {
  if (!auth) throw new Error('Auth not initialized');
  if (!email) throw new Error('Enter email');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = 'timetable.html';
    return cred;
  } catch (err) { throw err; }
}

export async function loginWithEmail(email, password) {
  if (!auth) throw new Error('Auth not initialized');
  if (!email) throw new Error('Enter email');
  if (!password) throw new Error('Enter password');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'timetable.html';
    return cred;
  } catch (err) { throw err; }
}

export async function logout() {
  if (!auth) throw new Error('Auth not initialized');
  try {
    await signOut(auth);
    window.location.href = 'login.html';
  } catch (err) { throw err; }
}

export function protectPage(redirectIfNot = true) {
  if (!auth) return;
  onAuthStateChanged(auth, user => {
    if (!user && redirectIfNot) window.location.href = 'login.html';
  });
}

if (auth) {
  onAuthStateChanged(auth, user => {
    if (user) {
      console.log('User signed in — starting Firestore listener for shared events.');
      startFirestoreListener((items) => {
        setLocal(K_EVENTS, items.map(it => ({ id: it.id, subject: it.subject, teacher: it.teacher || '', room: it.room || '', start: it.start, end: it.end, metaType: it.metaType || 'user' })));
        if (typeof calendar !== 'undefined' && calendar) {
          calendar.removeAllEvents();
          loadEventsUnified().forEach(e => calendar.addEvent(evToFc(e)));
          addHolidayBackgroundsToCalendar(calendar);
          const listContainer = $('#listContainer'); if (listContainer) {
            const html = loadEventsUnified().map(ev => {
              const s = new Date(ev.start), e = new Date(ev.end);
              const dd = String(s.getDate()).padStart(2, '0'), mm = String(s.getMonth() + 1).padStart(2, '0');
              return `
                <div class="list-row" data-id="${ev.id}">
                  <div class="meta">
                    <div class="date-badge">${dd}/${mm}</div>
                    <div class="time">${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div class="body">
                    <div class="title">${ev.subject}</div>
                    <div class="sub">${ev.teacher ? ev.teacher + ' • ' : ''}${ev.room ? ev.room : ''}</div>
                  </div>
                  <div class="actions"><button class="edit-btn" data-id="${ev.id}">Edit</button></div>
                </div>
              `;
            }).join('');
            listContainer.innerHTML = html;

            document.dispatchEvent(new Event('events-updated'));
          }
        }
      });
    } else {
      if (firestoreUnsub) { firestoreUnsub(); firestoreUnsub = null; }
      console.log('User signed out — stopped Firestore listener. Using localStorage events.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form') || document.querySelector('form[data-role="signup"]');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = signupForm.querySelector('input[name="email"], input[type="email"]');
      const passEl = signupForm.querySelector('input[name="password"], input[type="password"]');
      try { await signupWithEmail(emailEl.value.trim(), passEl.value); }
      catch (err) { alert(err.message || 'Signup failed'); }
    });
  }

  const loginForm = document.getElementById('login-form') || document.querySelector('form[data-role="login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = loginForm.querySelector('input[name="email"], input[type="email"]');
      const passEl = loginForm.querySelector('input[name="password"], input[type="password"]');
      try { await loginWithEmail(emailEl.value.trim(), passEl.value); }
      catch (err) { alert(err.message || 'Login failed'); }
    });
  }

  const logoutBtn = document.getElementById('logout-btn') || document.querySelector('button[data-role="logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await logout(); } catch (err) { alert('Logout failed: ' + (err.message || err)); }
    });
  }

  setupInit();
  timetableInit();
});

window.__ttms = window.__ttms || {};
Object.assign(window.__ttms, {
  saveEventUnified,
  deleteEventUnified,
  loadEventsUnified,
  cloudAddEvent,
  cloudSetEvent,
  cloudDeleteEvent
});

