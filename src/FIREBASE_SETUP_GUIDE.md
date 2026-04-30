# 🔥 Firebase Setup Guide - StartupTN Visitor Management

## 📋 STEP 1: CREATE FIREBASE PROJECT

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Click "Add Project"**

3. **Enter Project Details:**
   - Project name: `startuptn-visitor-system`
   - Accept terms → Click "Continue"
   - Disable Google Analytics (optional) → Click "Create Project"
   - Wait for project creation → Click "Continue"

---

## 🌐 STEP 2: REGISTER WEB APP

1. **In Firebase Console, click the Web icon `</>`**

2. **Register your app:**
   - App nickname: `StartupTN Visitor App`
   - ✅ Check "Also set up Firebase Hosting"
   - Click "Register app"

3. **Copy Firebase Configuration**
   
   You'll see something like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "startuptn-visitor-system.firebaseapp.com",
     projectId: "startuptn-visitor-system",
     storageBucket: "startuptn-visitor-system.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```

   **📝 SAVE THIS! You'll need it in Step 4**

4. **Click "Continue to console"**

---

## 🔐 STEP 3: ENABLE FIRESTORE DATABASE

1. **In left sidebar, click "Firestore Database"**

2. **Click "Create database"**

3. **Choose location:**
   - Select: `asia-south1 (Mumbai)` (closest to India)
   - Click "Next"

4. **Security rules:**
   - Select: **"Start in test mode"** (for now)
   - Click "Enable"
   
   ⚠️ **Note:** We'll update security rules later

5. **Wait for database creation** (takes 1-2 minutes)

---

## 📊 STEP 4: CREATE ENVIRONMENT FILE

1. **In your project folder:** `C:\startuptn-visitor-system`

2. **Create file:** `.env.local`

3. **Add your Firebase config:**

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=startuptn-visitor-system.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=startuptn-visitor-system
VITE_FIREBASE_STORAGE_BUCKET=startuptn-visitor-system.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

**Replace the values with YOUR actual Firebase config from Step 2!**

---

## 📦 STEP 5: INSTALL FIREBASE SDK

```bash
cd C:\startuptn-visitor-system
npm install firebase --legacy-peer-deps
```

---

## 🔒 STEP 6: UPDATE SECURITY RULES (IMPORTANT!)

1. **Go back to Firebase Console → Firestore Database**

2. **Click "Rules" tab**

3. **Replace the rules with:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Visitors - anyone can create, only admin can read/update/delete
    match /visitors/{document=**} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    
    // Events - anyone can read, only admin can create/update/delete
    match /events/{document=**} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
    
    // Event registrations - anyone can create, only admin can read
    match /eventRegistrations/{document=**} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    
    // Halls - anyone can read, only admin can create/update/delete
    match /halls/{document=**} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
    
    // Bookings - anyone can create, only admin can read/update/delete
    match /bookings/{document=**} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
    
    // Coworking - anyone can create, only admin can read/update/delete
    match /coworking/{document=**} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

4. **Click "Publish"**

---

## 🔑 STEP 7: ENABLE AUTHENTICATION (FOR ADMIN)

1. **In Firebase Console, click "Authentication"**

2. **Click "Get started"**

3. **Click "Email/Password"**

4. **Enable it:**
   - Toggle "Email/Password" → ON
   - Click "Save"

5. **Add Admin User:**
   - Click "Users" tab
   - Click "Add user"
   - Email: `admin@startuptn.in` (or your email)
   - Password: `startuptn@2026` (or your password)
   - Click "Add user"

---

## ✅ VERIFICATION CHECKLIST

- [ ] Firebase project created
- [ ] Web app registered
- [ ] Firestore database enabled
- [ ] `.env.local` file created with Firebase config
- [ ] Firebase SDK installed (`npm install firebase`)
- [ ] Security rules updated
- [ ] Authentication enabled
- [ ] Admin user created

---

## 🚀 NEXT STEPS

1. **Update your code** with the Firebase-integrated version (I'll provide this next)
2. **Test locally:** `npm run dev`
3. **Deploy to Firebase Hosting:** `firebase deploy`

---

## 📞 COMMON ISSUES

**Q: "Firebase not defined" error?**
- Make sure `.env.local` file is in project root
- Restart dev server: `Ctrl+C` then `npm run dev`

**Q: "Permission denied" errors?**
- Check Firestore security rules are published
- Make sure admin is logged in for admin operations

**Q: Environment variables not loading?**
- File must be named `.env.local` (not `.env`)
- Variables must start with `VITE_`
- Restart dev server after creating/editing

---

## 🎉 YOU'RE READY!

Once you complete these steps, tell me and I'll provide:
1. ✅ Updated `visitor-management.jsx` with Firebase integration
2. ✅ Firebase utility functions
3. ✅ Deployment commands

**Let me know when you're done with the Firebase setup!** 🔥
