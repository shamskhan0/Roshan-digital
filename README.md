# 🚀 Roshan Digital — PHP + MySQL + React

A complete investment & earning platform with **PHP backend**, **MySQL database**, and **React frontend**. Ready for InfinityFree, Railway, Docker, and local development.

---

## 📁 Project Structure

```
roshan-digital/
├── frontend/               # React + Vite (localhost:3000)
│   ├── src/
│   │   ├── components/     # 18 React components
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                # PHP 8.x API (localhost:5000)
│   ├── config.php          # DB config + helpers
│   ├── router.php          # API router
│   ├── index.php           # Entry point
│   ├── handlers/           # All API handlers
│   │   ├── otp.php
│   │   ├── auth.php
│   │   ├── dashboard.php
│   │   ├── tasks.php
│   │   ├── investments.php
│   │   ├── deposits.php
│   │   ├── withdrawals.php
│   │   ├── referrals.php
│   │   ├── notifications.php
│   │   ├── team.php
│   │   ├── history.php
│   │   ├── community.php
│   │   ├── admin.php
│   │   ├── upload.php
│   │   ├── seed.php
│   │   └── cron.php
│   └── .htaccess
├── uploads/                # User uploaded files
├── database.sql            # MySQL schema + seed data
├── Dockerfile              # Production Docker
├── Dockerfile.local        # Local dev Docker
├── docker-compose.yml      # Full stack Docker
├── .htaccess               # URL rewriting
└── .gitignore
```

---

## 🏃 Local Development

### Option 1: Docker (Easiest)

```bash
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# Database: localhost:3306
```

### Option 2: Manual Setup

**Terminal 1 — PHP Backend:**
```bash
cd backend

# Install PHP dependencies (if needed)
# No composer needed — pure PHP!

# Start PHP server
php -S localhost:5000 index.php
```

**Terminal 2 — React Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Database Setup:**
1. Create MySQL database
2. Import `database.sql`
3. Update `backend/config.php` with your credentials

---

## 🌐 InfinityFree Deployment

### Step 1: Build Frontend
```bash
cd frontend
npm install
npm run build
```

### Step 2: Upload to InfinityFree
```
htdocs/
├── index.html          (from frontend/dist/)
├── assets/             (from frontend/dist/assets/)
├── backend/            (entire backend/ folder)
│   ├── config.php
│   ├── router.php
│   ├── index.php
│   ├── handlers/
│   └── .htaccess
├── uploads/            (empty folder)
├── .htaccess           (root .htaccess)
└── database.sql        (for reference)
```

### Step 3: MySQL Database
1. Go to InfinityFree Control Panel
2. Create MySQL database
3. Import `database.sql` via phpMyAdmin
4. Update `backend/config.php`:
```php
define('DB_HOST', 'sql123.infinityfree.com');  // Your MySQL host
define('DB_NAME', 'if0_12345678_roshan');       // Your database name
define('DB_USER', 'if0_12345678');              // Your MySQL username
define('DB_PASS', 'your_password');             // Your MySQL password
```

### Step 4: Done! 🎉
Visit: `https://yourdomain.com`

---

## 🐳 Docker Deployment

```bash
# Production
docker build -t roshan-digital .
docker run -p 8080:5000 roshan-digital

# Full stack with database
docker-compose up --build
```

---

## 🔧 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/otp/send | Send OTP |
| POST | /api/otp/verify | Verify OTP |
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/forgot-password | Forgot password |
| POST | /api/auth/reset-password | Reset password |
| POST | /api/auth/update-profile | Update profile |

### App
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/app/dashboard/:userId | Dashboard |
| GET | /api/app/wallet/:userId | Wallet |
| GET | /api/app/user-tasks/:userId | Tasks |
| POST | /api/app/tasks/complete | Complete task |
| GET | /api/app/investment-plans | Plans |
| GET | /api/app/investments/:userId | My investments |
| POST | /api/app/investments | Buy plan |
| GET | /api/app/calculator | Calculator |
| GET | /api/app/deposits/:userId | Deposits |
| POST | /api/app/deposits | Submit deposit |
| GET | /api/app/withdrawals/:userId | Withdrawals |
| POST | /api/app/withdrawals | Submit withdrawal |
| GET | /api/app/referrals/:userId | Referrals |
| GET | /api/app/notifications/:userId | Notifications |
| GET | /api/app/team/:userId | Team |
| GET | /api/app/history/:userId | History |

### Community
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/app/community/posts | Get posts |
| POST | /api/app/community/posts | Create post |
| DELETE | /api/app/community/posts/:id | Delete post |
| POST | /api/app/community/posts/:id/like | Like/unlike |
| POST | /api/app/community/posts/:id/comment | Comment |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/app/admin/stats | Statistics |
| GET | /api/app/admin/users | All users |
| GET | /api/app/admin/deposits | All deposits |
| POST | /api/app/admin/deposits/:id/approve | Approve deposit |
| POST | /api/app/admin/deposits/:id/reject | Reject deposit |
| GET | /api/app/admin/withdrawals | All withdrawals |
| POST | /api/app/admin/withdrawals/:id/approve | Approve withdrawal |
| POST | /api/app/admin/withdrawals/:id/reject | Reject withdrawal |
| POST | /api/app/admin/users/:id/role | Change role |
| POST | /api/app/admin/users/:id/toggle-active | Toggle active |
| GET | /api/app/admin/settings | Get settings |
| POST | /api/app/admin/settings | Update settings |
| POST | /api/app/admin/broadcast | Broadcast msg |
| POST | /api/app/admin/calculate-profits | Calculate profits |

---

## 👤 Default Admin Account

- **Email:** admin@roshan.com
- **Password:** admin123

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | PHP 8.x (Pure PHP, no framework) |
| Database | MySQL 8.x |
| UI Components | shadcn/ui + Lucide Icons |
| Icons | Lucide React |
| Charts | Recharts |

---

## 🔧 Admin Update Panel

Access at: `https://yourdomain.com/admin/update-panel.php`

### Features:
| Feature | Description |
|---------|-------------|
| 🔐 Login Protection | Admin-only access with session auth |
| 📊 Dashboard | Version info, stats, quick actions |
| 💾 Backup | Database backup, files backup, full backup |
| 📦 Upload Update | ZIP/SQL file upload with auto-apply |
| 🔄 Migrations | Safe database schema changes |
| 📜 History | Update history, migration logs, backup logs |
| ⚙️ Version Control | Edit version.json from UI |
| 📥 Export DB | Download full database as SQL |
| 🛡 Pre-update Backup | Auto-backup before applying updates |

### How to Update:
1. Go to `admin/update-panel.php`
2. Login with admin credentials
3. Click "📦 Upload Update"
4. Select ZIP/SQL file
5. System auto-backs up before applying

### Version Control:
- `version.json` tracks app version and database version
- Edit from UI or manually
- Each update is logged in the `updates` table

---

## 📝 License

Private — For personal use only.
