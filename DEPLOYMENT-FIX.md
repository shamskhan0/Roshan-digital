# ====================================
# Railway + Vercel Deployment Fix Guide
# ====================================

## Problems Fixed (v1.3.1)
1. ✅ Admin panel not showing → Router missing top-level /api/admin/ route
2. ✅ "Server connection failed" → Frontend couldn't reach backend on Vercel
3. ✅ All 61 fetch calls now use api() helper → works on ANY deployment

## How It Works Now

### api() helper (frontend/src/lib/api-config.ts)
- If VITE_API_URL is set → prepends it to all API calls
- If NOT set → uses relative URLs (same domain = same server)
- Works on: Railway (same domain), Vercel + Railway (separate), Netlify + backend

---

## Option A: Railway Full-Stack (RECOMMENDED) ✅
Frontend + Backend = SAME domain. Simplest setup.

### Steps:
1. Push code to GitHub
2. Create new Railway project
3. Add environment variables:
   ```
   DB_HOST=your-mysql-host
   DB_NAME=your-database
   DB_USER=your-username
   DB_PASS=your-password
   ```
4. Railway auto-detects Dockerfile.railway
5. Build frontend: `cd frontend && npm run build`
6. Done! Admin panel works at https://your-app.up.railway.app

---

## Option B: Vercel (Frontend) + Railway (Backend)
Frontend on Vercel, Backend on Railway.

### Steps:
1. **Deploy Backend on Railway** → get URL like `https://my-api.up.railway.app`
2. **Deploy Frontend on Vercel:**
   - Import from GitHub
   - Set build command: `cd frontend && npm install && npm run build`
   - Set output directory: `frontend/dist`
   - Add environment variable:
     ```
     VITE_API_URL=https://my-api.up.railway.app
     ```
3. **Update vercel.json:** Replace `YOUR-RAILWAY-APP` with your actual Railway URL
4. **Also set in Vercel dashboard:** Settings → Environment Variables → VITE_API_URL

### OR use rewrites (no env var needed):
Edit `vercel.json` and replace the destination:
```json
"rewrites": [
  { "source": "/api/:path*", "destination": "https://my-api.up.railway.app/api/:path*" }
]
```

---

## Admin Panel Fix

### Why admin button wasn't showing:
1. Backend route was wrong: `/api/admin/settings` → 404 (needed `/api/app/admin/settings`)
2. Now FIXED: Router handles BOTH `/api/admin/...` AND `/api/app/admin/...`

### Admin Login:
1. Open app → Login
2. Email: `admin@roshan.com` (or your admin email)
3. After login, Shield icon (🛡️) appears in top-right → That's admin panel!

### Make a user admin (via database):
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Or via admin panel:
1. Login as existing admin
2. Go to admin panel
3. Find user → Click "Make Admin"

---

## Verify Everything Works:

### Test Backend:
```
curl https://your-backend-url/api/admin/settings
```
Should return: `{"ok":true,"settings":{...}}`

### Test Login:
```
curl -X POST https://your-backend-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@roshan.com","password":"admin123"}'
```
Should return: `{"ok":true,"user":{"role":"admin",...}}`

### Test Health Check:
```
curl https://your-backend-url/
```
Should return: `{"ok":true,"app":"Roshan Digital API","version":"2.0.0"}`

---

## Checklist:
- [ ] Backend deployed and `/api/admin/settings` returns JSON
- [ ] Admin user exists with `role = 'admin'`
- [ ] Frontend `VITE_API_URL` points to backend (if separate)
- [ ] OR `vercel.json` rewrites configured (if using Vercel)
- [ ] CORS headers working (config.php allows your frontend origin)
- [ ] Database tables exist (run database.sql if needed)
