# Email automation setup (Google Apps Script)

Sends payment confirmations (when you click Verify Payment) and renewal reminders (daily, 2 days before the end date)
from one StartupTN Workspace mailbox.

## 1. Create the mailbox
Create a normal Workspace user, e.g. **spaces@startuptn.in**. Sign in to Google as that user for steps 2-5.

## 2. Create the script
1. Go to script.google.com > New project. Name it "StartupTN Mailer".
2. Replace the contents of `Code.gs` with the file `apps-script/Code.gs` from this repo.
3. Project Settings > tick "Show appsscript.json manifest file in editor", then replace its contents with `apps-script/appsscript.json`.
4. Project Settings > Script Properties > add:
   - `MAIL_SECRET` = a long random string you make up (e.g. 30+ characters)
   - `FIREBASE_PROJECT_ID` = your Firebase project ID (same as `VITE_FIREBASE_PROJECT_ID`)

## 3. Preview the email
Select `testPreview` in the editor toolbar and click Run. Approve the permission prompt. A sample payment email arrives in this mailbox.

## 4. Deploy the web app
Deploy > New deployment > type **Web app** > Execute as **Me** > Who has access **Anyone** > Deploy.
Copy the Web app URL (ends in `/exec`).
If "Anyone" is not offered, your Workspace admin has blocked it; tell me and we will use a Cloud Function instead.

## 5. Start the daily reminder
Select `installTriggers` and click Run (creates a 9 AM IST daily timer).

## 6. Connect the app
Add these two values in **Vercel > Project Settings > Environment Variables** (and in `.env.local` for local testing), then redeploy:
```
VITE_MAIL_WEBAPP_URL=<the /exec URL from step 4>
VITE_MAIL_SECRET=<the same MAIL_SECRET from step 2>
```
Until both are set, the app keeps using the manual email dialog.

## How it behaves
- Verify Payment (first payment or renewal) saves the record, then the script re-reads it from Firestore, checks the payment is really verified, and emails the address on that record. A repeat click never sends twice.
- If sending fails, the app tells you and opens the manual email dialog.
- The reminder timer skips members who have a pending renewal, were already reminded, or have exited.
- Editing the wording: change the text in `Code.gs`, then Deploy > Manage deployments > edit > New version.
- Daily limit: about 1,500 emails per Workspace account.
