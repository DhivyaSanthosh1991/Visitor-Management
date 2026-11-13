// Calls the Google Apps Script web app (apps-script/Code.gs) that sends mail from the StartupTN Workspace mailbox.
// Set VITE_MAIL_WEBAPP_URL and VITE_MAIL_SECRET (in .env.local and in Vercel). If they are not set,
// the app falls back to the existing admin email dialog.
const URL_ = import.meta.env.VITE_MAIL_WEBAPP_URL;
const SECRET = import.meta.env.VITE_MAIL_SECRET;

export const mailEnabled = !!(URL_ && SECRET);

// kind: 'first' (first payment) or 'renewal'
export const sendPaymentConfirmation = async (c, kind) => {
  if (!mailEnabled) return { ok: false, error: 'not configured' };
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      // text/plain avoids a CORS preflight, which Apps Script web apps do not answer
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: SECRET, action: 'paymentConfirmation', firebaseId: c.firebaseId, id: c.id, kind }),
    });
    const data = await res.json();
    return data && data.ok ? { ok: true, duplicate: !!data.duplicate } : { ok: false, error: (data && data.error) || 'unknown error' };
  } catch (err) {
    return { ok: false, error: err.message || 'network error' };
  }
};
