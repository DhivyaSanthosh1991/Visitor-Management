/**
 * StartupTN Visitor Management - mailer (Google Apps Script)
 *
 * Sends from the Workspace account that deploys this script (e.g. spaces@startuptn.in).
 *  1. paymentConfirmation  - called by the app when the admin clicks "Verify Payment".
 *  2. sendRenewalReminders - daily timer: emails coworking members 2 days before their end date.
 *
 * Setup: see SETUP.md in this folder.
 * Script Properties required: MAIL_SECRET (same value as VITE_MAIL_SECRET), FIREBASE_PROJECT_ID.
 */

var BASE_URL = 'https://visitors.startuptn.in';
var LOGO_URL = BASE_URL + '/StartupTN_logo.png';
var SENDER_NAME = 'StartupTN Team';
var REMINDER_DAYS_BEFORE_END = 2;
var TZ = 'Asia/Kolkata';

/* ---------------- web app entry points ---------------- */

function doGet() {
  return json_({ ok: true, service: 'StartupTN mailer' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');
    if (!secret || body.secret !== secret) return json_({ ok: false, error: 'unauthorised' });
    if (body.action === 'paymentConfirmation') return json_(paymentConfirmation_(body));
    if (body.action === 'adminEmail') return json_(adminEmail_(body));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------------- 1. payment confirmation ---------------- */

function paymentConfirmation_(body) {
  var rec = getDoc_('coworking', body.firebaseId);
  if (!rec || rec.id !== body.id) return { ok: false, error: 'record not found' };

  // Never trust the browser: the record itself must show a verified payment.
  var p = rec.payment || {};
  if (rec.paymentStatus !== 'paid' || !p.verifiedOn) return { ok: false, error: 'payment is not verified in the record' };
  if (!rec.email) return { ok: false, error: 'no email on record' };

  var key = 'pc:' + rec.id + ':' + (rec.cycle || 1) + ':' + p.verifiedOn;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty(key)) return { ok: true, duplicate: true };

    var renewal = (rec.cycle || 1) > 1 && body.kind === 'renewal';
    var link = BASE_URL + '/?cowork=' + encodeURIComponent(rec.id);
    var rows = [
      ['Coworking ID', rec.id],
      ['Company', rec.company],
      ['Seats', rec.seats],
      ['Period', fmtDate_(rec.startDate) + ' to ' + fmtDate_(rec.endDate)],
      ['Amount paid', '₹' + p.amount + (p.mode ? ' (' + p.mode + (p.reference ? ', Ref: ' + p.reference : '') + ')' : '')],
      ['Verified on', p.verifiedOn]
    ];
    var intro = renewal
      ? 'We have received and verified your renewal payment for coworking space at StartupTN. Your space is renewed for the new period below.'
      : 'We have received and verified your payment for coworking space at StartupTN. Your seats are now confirmed.';
    var steps = [
      'Add or confirm your member details using your Coworking ID here: <a href="' + link + '">' + link + '</a>',
      'We will send you a reminder ' + REMINDER_DAYS_BEFORE_END + ' days before your end date, where you can choose to renew or exit.',
      'Your invoice will be sent separately.'
    ];
    var subject = (renewal ? 'Renewal payment received' : 'Payment received') + ' – Coworking ID ' + rec.id + ' | StartupTN';
    send_(rec.email, subject, rec.name, intro, rows, steps,
      'Please keep your Coworking ID safe. You need it for member registration and every renewal.');
    props.setProperty(key, new Date().toISOString());
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 1b. any admin email (booking approvals, rejections, etc.) ---------------- */

/**
 * Sends an email written by an admin in the app, always from this mailbox.
 * The caller must be signed in to the app: its Firebase ID token is verified with Google before anything is sent.
 * Optional Script Property ADMIN_EMAILS (comma-separated) limits it to those admin accounts.
 */
function adminEmail_(body) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('FIREBASE_API_KEY');
  if (!apiKey) return { ok: false, error: 'FIREBASE_API_KEY script property is not set' };
  if (!body.idToken) return { ok: false, error: 'not signed in' };

  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + apiKey, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ idToken: body.idToken })
  });
  if (res.getResponseCode() !== 200) return { ok: false, error: 'sign-in could not be verified' };
  var user = (JSON.parse(res.getContentText()).users || [])[0];
  if (!user || !user.email) return { ok: false, error: 'sign-in could not be verified' };
  var allowed = (props.getProperty('ADMIN_EMAILS') || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (allowed.length && allowed.indexOf(String(user.email).toLowerCase()) < 0) return { ok: false, error: 'this admin account is not allowed to send' };

  var to = String(body.to || '').trim();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to)) return { ok: false, error: 'invalid recipient address' };
  var subject = String(body.subject || '').slice(0, 250);
  var text = String(body.body || '');
  if (!subject || !text || text.length > 10000) return { ok: false, error: 'subject or message is empty or too long' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var dayKey = 'cap:' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    var n = parseInt(props.getProperty(dayKey) || '0', 10);
    if (n >= 300) return { ok: false, error: 'daily sending limit reached' };
    sendPlain_(to, subject, text);
    props.setProperty(dayKey, String(n + 1));
  } finally { lock.releaseLock(); }
  return { ok: true, sentBy: user.email };
}

function sendPlain_(to, subject, text) {
  // The app's templates already end with "Best regards, StartupTN Team"; the signature block replaces it.
  var cleaned = text.replace(/\s*(best regards|regards|thanks)[,!]?\s*\n\s*startuptn team\s*$/i, '').replace(/\s+$/, '');
  var htmlBody = esc_(cleaned).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, '<br>');
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.5;max-width:620px">' +
    '<div>' + htmlBody + '</div><p style="margin-top:14px">Best regards,</p>' + signatureHtml_() + '</div>';
  MailApp.sendEmail({ to: to, subject: subject, body: cleaned + '\n\nBest regards,\nStartupTN Team', htmlBody: html, name: SENDER_NAME });
}

/* ---------------- 2. daily renewal reminders ---------------- */

/** Run once from the editor to create the daily 9 AM timer. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendRenewalReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendRenewalReminders').timeBased().everyDays(1).atHour(9).inTimezone(TZ).create();
}

function sendRenewalReminders() {
  var props = PropertiesService.getScriptProperties();
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var list = queryDocs_('coworking', 'status', 'approved');
  var sent = 0;
  list.forEach(function (rec) {
    try {
      var paid = rec.paymentStatus === 'paid' || (rec.paymentStatus === undefined);
      if (!paid || rec.renewal || !rec.email || !rec.endDate) return;
      var left = daysBetween_(today, rec.endDate);
      if (left < 0 || left > REMINDER_DAYS_BEFORE_END) return;
      if (rec.reminderSentFor === rec.endDate) return;
      var key = 'rm:' + rec.id + ':' + rec.endDate;
      if (props.getProperty(key)) return;

      var link = BASE_URL + '/?cowork=' + encodeURIComponent(rec.id);
      var when = left === 0 ? 'ends today' : 'ends on ' + fmtDate_(rec.endDate) + ' (' + left + ' day' + (left === 1 ? '' : 's') + ' left)';
      var intro = 'Your coworking space (Coworking ID ' + rec.id + ', ' + rec.seats + ' seats) ' + when + '.';
      var steps = [
        'To continue, confirm your renewal, update your members and make the payment here: <a href="' + link + '">' + link + '</a>',
        'If you do not wish to continue, you can mark your exit on the same page.'
      ];
      send_(rec.email, 'Your coworking space ends on ' + fmtDate_(rec.endDate) + ' – renew or exit | StartupTN',
        rec.name, intro, [], steps, '');
      props.setProperty(key, new Date().toISOString());
      markReminderSent_(rec, today);
      sent++;
    } catch (err) {
      console.error('Reminder failed for ' + rec.id + ': ' + err);
    }
  });
  console.log('Reminders sent: ' + sent);
}

/* ---------------- email builder ---------------- */

function send_(to, subject, name, intro, rows, steps, closing) {
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.5;max-width:620px">' +
    '<p>Dear ' + esc_(name) + ',</p><p>' + intro + '</p>';
  if (rows.length) {
    html += '<table style="border-collapse:collapse;margin:8px 0 14px">';
    rows.forEach(function (r) {
      html += '<tr><td style="padding:4px 14px 4px 0;color:#6b7280">' + esc_(r[0]) + '</td><td style="padding:4px 0"><b>' + esc_(r[1]) + '</b></td></tr>';
    });
    html += '</table>';
  }
  if (steps.length) {
    html += '<p style="margin-bottom:4px"><b>Next steps</b></p><ol style="margin-top:0;padding-left:20px">';
    steps.forEach(function (s) { html += '<li>' + s + '</li>'; });
    html += '</ol>';
  }
  if (closing) html += '<p>' + esc_(closing) + '</p>';
  html += signatureHtml_() + '</div>';

  var text = html.replace(/<\/td><td[^>]*>/g, ': ').replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|tr)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  MailApp.sendEmail({ to: to, subject: subject, body: text, htmlBody: html, name: SENDER_NAME });
}

function signatureHtml_() {
  return '<table style="margin-top:18px;border-collapse:collapse"><tr>' +
    '<td style="padding-right:14px;vertical-align:middle"><img src="' + LOGO_URL + '" alt="StartupTN" width="110" style="display:block"></td>' +
    '<td style="border-left:2px solid #2B4C7E;padding-left:14px;font-size:13px;line-height:1.5">' +
    '<b style="font-size:15px;color:#2B4C7E">StartupTN Team</b><br>' +
    'Contact: 9444679254<br>' +
    'Website : <a href="https://www.startuptn.in">www.startuptn.in</a><br>' +
    'Bookings: <a href="' + BASE_URL + '">' + BASE_URL + '</a><br>' +
    '<span style="font-size:12px">CMRL HQ Campus, 10th Floor, Nandanam, Chennai - 35</span>' +
    '</td></tr></table>';
}

/* ---------------- Firestore REST helpers ---------------- */

function fsBase_() {
  var pid = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
  if (!pid) throw new Error('FIREBASE_PROJECT_ID script property is not set');
  return 'https://firestore.googleapis.com/v1/projects/' + pid + '/databases/(default)/documents';
}

function fsFetch_(url, opts) {
  opts = opts || {};
  opts.muteHttpExceptions = true;
  opts.headers = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  var res = UrlFetchApp.fetch(url, opts);
  if (res.getResponseCode() === 401 || res.getResponseCode() === 403) {
    // Account has no IAM access to the Firebase project: fall back to the public Firestore rules.
    delete opts.headers;
    res = UrlFetchApp.fetch(url, opts);
  }
  if (res.getResponseCode() >= 300) throw new Error('Firestore ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText());
}

function getDoc_(collection, id) {
  if (!id) return null;
  var d = fsFetch_(fsBase_() + '/' + collection + '/' + encodeURIComponent(id));
  return fromDoc_(d);
}

function queryDocs_(collection, field, value) {
  var body = { structuredQuery: { from: [{ collectionId: collection }],
    where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } };
  var rows = fsFetch_(fsBase_() + ':runQuery', { method: 'post', contentType: 'application/json', payload: JSON.stringify(body) });
  return rows.filter(function (r) { return r.document; }).map(function (r) { return fromDoc_(r.document); });
}

function markReminderSent_(rec, today) {
  try {
    var url = fsBase_() + '/coworking/' + encodeURIComponent(rec.firebaseId) +
      '?updateMask.fieldPaths=reminderSentFor&updateMask.fieldPaths=reminderSentOn';
    fsFetch_(url, { method: 'patch', contentType: 'application/json', payload: JSON.stringify({ fields: {
      reminderSentFor: { stringValue: rec.endDate },
      reminderSentOn: { stringValue: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy, HH:mm:ss') }
    } }) });
  } catch (err) { console.warn('Could not mark reminder in Firestore: ' + err); }
}

function fromDoc_(doc) {
  var out = fromFields_(doc.fields || {});
  out.firebaseId = doc.name.split('/').pop();
  return out;
}
function fromFields_(f) { var o = {}; Object.keys(f).forEach(function (k) { o[k] = fromValue_(f[k]); }); return o; }
function fromValue_(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return fromFields_(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue_);
  return null;
}

/* ---------------- small utilities ---------------- */

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmtDate_(s) {
  if (!s) return '';
  var p = String(s).slice(0, 10).split('-');
  if (p.length !== 3) return s;
  var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(p[2], 10) + ' ' + m[parseInt(p[1], 10) - 1] + ' ' + p[0];
}
function daysBetween_(a, b) {
  var pa = a.split('-'), pb = String(b).slice(0, 10).split('-');
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

/** Run from the editor to preview the payment email in your own inbox (no data needed). */
function testPreview() {
  var me = Session.getActiveUser().getEmail();
  send_(me, 'TEST – Payment received – Coworking ID C-13112026-001 | StartupTN', 'Test Person',
    'We have received and verified your payment for coworking space at StartupTN. Your seats are now confirmed.',
    [['Coworking ID', 'C-13112026-001'], ['Company', 'Test Co'], ['Seats', '2'], ['Period', '1 Dec 2026 to 31 Dec 2026'], ['Amount paid', '₹5000 (UPI, Ref: TEST123)'], ['Verified on', '13/11/2026, 11:00:00']],
    ['Add or confirm your member details using your Coworking ID here: <a href="' + BASE_URL + '">' + BASE_URL + '</a>', 'We will send you a reminder 2 days before your end date, where you can choose to renew or exit.', 'Your invoice will be sent separately.'],
    'Please keep your Coworking ID safe. You need it for member registration and every renewal.');
}
