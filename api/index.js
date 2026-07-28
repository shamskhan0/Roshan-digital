import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER || '2pHFbEBTcg1dymG.root',
  password: process.env.DB_PASS || 'SiUK7wx9hlQnpn8u',
  database: process.env.DB_NAME || 'roshan_digital',
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function ok(data = {}, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
}

function err(message, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function db() { return await pool.getConnection(); }

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders() });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const parts = path ? path.split('/') : [];
  const segment0 = parts[0] || '';
  const segment1 = parts[1] || '';
  const segment2 = parts[2] || '';
  const segment3 = parts[3] || '';
  const method = req.method;

  let conn;
  try {
    conn = await db();

    // ===== HEALTH CHECK =====
    if (!segment0 || segment0 === '') {
      return ok({ status: 'ok', app: 'Roshan Digital API', version: '3.0.0', platform: 'Vercel' });
    }

    // ===== OTP =====
    if (segment0 === 'otp' && segment1 === 'send') {
      if (method !== 'POST') return err('Method not allowed', 405);
      const body = await req.json();
      const { target, purpose } = body;
      if (!target || !purpose) return err('target and purpose required');
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 300000).toISOString().slice(0, 19).replace('T', ' ');
      await conn.execute('INSERT INTO otps (id, target, code, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())', [uuid(), target, code, purpose, expires]);
      conn.release();
      return ok({ message: 'OTP sent', otp: code });
    }

    if (segment0 === 'otp' && segment1 === 'verify') {
      if (method !== 'POST') return err('Method not allowed', 405);
      const body = await req.json();
      const { target, code, purpose } = body;
      const [rows] = await conn.execute('SELECT * FROM otps WHERE target = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1', [target, purpose]);
      const otp = rows[0];
      if (!otp) { conn.release(); return err('OTP not found', 404); }
      if (new Date(otp.expires_at) < new Date()) { conn.release(); return err('OTP expired', 410); }
      if (otp.code !== code) { conn.release(); return err('Invalid OTP'); }
      await conn.execute('UPDATE otps SET used = 1 WHERE id = ?', [otp.id]);
      conn.release();
      return ok({ message: 'OTP verified' });
    }

    // ===== AUTO SEED =====
    if (segment0 === 'auto-seed' || segment0 === 'seed') {
      const [existing] = await conn.execute('SELECT COUNT(*) as c FROM tasks');
      if (existing[0].c === 0) {
        const tasks = [
          ['t1', 'Download App', 'Our Download App Install', 50.00, 'app'],
          ['t2', 'Watch Video', 'Watch a short video and submit a screenshot', 25.00, 'video'],
          ['t3', 'Follow Social Media', 'Follow our social media accounts', 30.00, 'social'],
          ['t4', 'Write a Review', 'on Google Play or App Store Write a Review', 40.00, 'review'],
          ['t5', 'Refer a Friend', 'Invite a friend to join our platform', 60.00, 'referral'],
          ['t6', 'Visit Website', 'Visit our website for 5 minutes', 15.00, 'visit'],
        ];
        for (const t of tasks) {
          await conn.execute('INSERT IGNORE INTO tasks (id, title, description, reward, category, active) VALUES (?, ?, ?, ?, ?, 1)', t);
        }
      }
      const [plans] = await conn.execute('SELECT COUNT(*) as c FROM investment_plans');
      if (plans[0].c === 0) {
        const pl = [
          ['p1', 'Starter Plan', 'Perfect for beginners', 1000, 50, 5.00, 'percentage', 30, 30],
          ['p2', 'Growth Plan', 'Steady returns', 5000, 300, 6.00, 'percentage', 30, 30],
          ['p3', 'Premium Plan', 'High returns', 15000, 1000, 6.67, 'percentage', 30, 30],
          ['p4', 'Elite Plan', 'Maximum returns', 50000, 4000, 8.00, 'percentage', 30, 30],
        ];
        for (const p of pl) {
          await conn.execute('INSERT IGNORE INTO investment_plans (id, name, description, amount, daily_profit, profit_percentage, profit_type, duration, duration_days, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', p);
        }
      }
      conn.release();
      return ok({ message: 'Seeded' });
    }

    // ===== AUTH =====
    if (segment0 === 'auth') {
      if (segment1 === 'register' && method === 'POST') {
        const body = await req.json();
        const { email, password, name, phone, referralCode } = body;
        if (!email || !password) return err('Email and password required');
        const [exists] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length > 0) { conn.release(); return err('Email already registered', 409); }
        const userId = uuid();
        const userRef = userId.replace(/-/g, '').substring(0, 8).toUpperCase();
        const userName = name || email.split('@')[0];
        await conn.execute('INSERT INTO users (id, email, name, phone, password, role, referral_code, referred_by, active, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())', [userId, email, userName, phone || null, password, 'user', userRef, referralCode || null]);
        await conn.execute('INSERT INTO wallets (id, user_id, balance, earned, deposited, withdrawn, main_balance, investment_balance, referral_balance, bonus_balance) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)', [uuid(), userId]);
        conn.release();
        return ok({ user: { id: userId, email, name: userName, role: 'user', referralCode: userRef, avatar: null, phone: phone || null, verified: false } });
      }

      if (segment1 === 'login' && method === 'POST') {
        const body = await req.json();
        const { email, password } = body;
        if (!email || !password) return err('Email and password required');
        const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        if (!user || user.password !== password) { conn.release(); return err('Invalid email or password', 401); }
        if (!user.active) { conn.release(); return err('Account deactivated', 403); }
        await conn.execute('INSERT INTO login_history (id, user_id, status, browser, device, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [uuid(), user.id, 'success', 'Web', 'Browser', '0.0.0.0']);
        conn.release();
        return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role, referralCode: user.referral_code, avatar: user.avatar, phone: user.phone, verified: !!user.verified } });
      }

      if (segment1 === 'verify-account' && method === 'POST') {
        const body = await req.json();
        const { userId } = body;
        if (!userId) return err('userId required');
        await conn.execute('UPDATE users SET verified = 1 WHERE id = ?', [userId]);
        const [urows] = await conn.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const u = urows[0];
        if (u && u.referred_by) {
          const [refs] = await conn.execute('SELECT id FROM users WHERE referral_code = ?', [u.referred_by]);
          if (refs[0]) {
            const [existing] = await conn.execute('SELECT id FROM referrals WHERE referrer_id = ? AND referred_id = ?', [refs[0].id, userId]);
            if (existing.length === 0) {
              const [settings] = await conn.execute("SELECT setting_value FROM settings WHERE setting_key = 'referralReward'");
              const reward = settings[0] ? parseFloat(settings[0].setting_value) : 100;
              await conn.execute('INSERT INTO referrals (id, referrer_id, referred_id, reward, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [uuid(), refs[0].id, userId, reward, 'pending']);
            }
          }
        }
        conn.release();
        return ok({ message: 'Verified' });
      }

      if (segment1 === 'forgot-password' && method === 'POST') {
        const body = await req.json();
        const { email } = body;
        if (!email) return err('Email required');
        const [u] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (u.length === 0) { conn.release(); return err('Email not registered', 404); }
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + 300000).toISOString().slice(0, 19).replace('T', ' ');
        await conn.execute('INSERT INTO otps (id, target, code, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())', [uuid(), email, code, 'password-reset', expires]);
        conn.release();
        return ok({ message: 'OTP sent', otp: code });
      }

      if (segment1 === 'reset-password' && method === 'POST') {
        const body = await req.json();
        const { email, code, newPassword } = body;
        if (!email || !code || !newPassword) return err('All fields required');
        const [otps] = await conn.execute('SELECT * FROM otps WHERE target = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1', [email, 'password-reset']);
        const otp = otps[0];
        if (!otp) { conn.release(); return err('OTP not found', 404); }
        if (new Date(otp.expires_at) < new Date()) { conn.release(); return err('OTP expired', 410); }
        if (otp.code !== code) { conn.release(); return err('Invalid OTP'); }
        await conn.execute('UPDATE otps SET used = 1 WHERE id = ?', [otp.id]);
        await conn.execute('UPDATE users SET password = ? WHERE email = ?', [newPassword, email]);
        conn.release();
        return ok({ message: 'Password changed' });
      }

      if (segment1 === 'update-profile' && method === 'POST') {
        const body = await req.json();
        const { userId, name, phone, avatar } = body;
        if (!userId) return err('userId required');
        if (name) await conn.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
        if (phone) await conn.execute('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
        if (avatar) await conn.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatar, userId]);
        const [u] = await conn.execute('SELECT * FROM users WHERE id = ?', [userId]);
        conn.release();
        const user = u[0];
        return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role, referralCode: user.referral_code, avatar: user.avatar, phone: user.phone, verified: !!user.verified } });
      }
      conn.release();
      return err('Invalid action', 400);
    }

    // ===== APP ROUTES =====
    if (segment0 === 'app') {
      const route = segment1;

      // Dashboard
      if (route === 'dashboard') {
        const userId = segment2;
        const [u] = await conn.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const [w] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [userId]);
        const [tasks] = await conn.execute('SELECT t.*, COALESCE(ut.status, "pending") as task_status FROM tasks t LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ? WHERE t.active = 1', [userId]);
        const [investments] = await conn.execute('SELECT * FROM user_investments WHERE user_id = ? AND status = "active"', [userId]);
        const [refCount] = await conn.execute('SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?', [userId]);
        const [notifs] = await conn.execute('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND `read` = 0', [userId]);
        conn.release();
        return ok({ user: u[0], wallet: w[0] || null, tasks, investments, referralCount: refCount[0].c, unreadNotifs: notifs[0].c });
      }

      // Wallet
      if (route === 'wallet') {
        const userId = segment2;
        const [w] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [userId]);
        if (!w[0]) {
          await conn.execute('INSERT INTO wallets (id, user_id, balance, earned, deposited, withdrawn, main_balance, investment_balance, referral_balance, bonus_balance) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)', [uuid(), userId]);
          const [nw] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [userId]);
          conn.release();
          return ok({ wallet: nw[0] });
        }
        conn.release();
        return ok({ wallet: w[0] });
      }

      // User Tasks
      if (route === 'user-tasks') {
        const userId = segment2;
        const [tasks] = await conn.execute('SELECT t.*, COALESCE(ut.status, "pending") as task_status, ut.completed_at FROM tasks t LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ? WHERE t.active = 1', [userId]);
        conn.release();
        return ok({ tasks });
      }

      // Tasks Complete
      if (route === 'tasks' && segment2 === 'complete' && method === 'POST') {
        const body = await req.json();
        const { userId, taskId } = body;
        const [existing] = await conn.execute('SELECT id FROM user_tasks WHERE user_id = ? AND task_id = ?', [userId, taskId]);
        if (existing.length > 0) { conn.release(); return err('Task already completed'); }
        const [task] = await conn.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (!task[0]) { conn.release(); return err('Task not found', 404); }
        await conn.execute('INSERT INTO user_tasks (id, user_id, task_id, status, completed_at, created_at) VALUES (?, ?, ?, ?, NOW(), NOW())', [uuid(), userId, taskId, 'completed']);
        const [w] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [userId]);
        const newBal = (parseFloat(w[0].balance) + parseFloat(task[0].reward)).toFixed(2);
        await conn.execute('UPDATE wallets SET balance = ?, earned = ? WHERE user_id = ?', [newBal, (parseFloat(w[0].earned) + parseFloat(task[0].reward)).toFixed(2), userId]);
        await conn.execute('INSERT INTO transactions (id, user_id, type, amount, balance, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [uuid(), userId, 'task_reward', task[0].reward, newBal, 'Completed: ' + task[0].title]);
        conn.release();
        return ok({ message: 'Task completed', reward: task[0].reward });
      }

      // Investment Plans
      if (route === 'investment-plans' && method === 'GET') {
        const [plans] = await conn.execute('SELECT * FROM investment_plans WHERE active = 1');
        conn.release();
        return ok({ plans });
      }

      // Investments
      if (route === 'investments') {
        if (method === 'GET') {
          const userId = segment2;
          const [inv] = await conn.execute('SELECT ui.*, ip.name as plan_name FROM user_investments ui JOIN investment_plans ip ON ui.plan_id = ip.id WHERE ui.user_id = ?', [userId]);
          conn.release();
          return ok({ investments: inv });
        }
        if (method === 'POST') {
          const body = await req.json();
          const { userId, planId } = body;
          const [plans] = await conn.execute('SELECT * FROM investment_plans WHERE id = ?', [planId]);
          const plan = plans[0];
          if (!plan) { conn.release(); return err('Plan not found', 404); }
          const [w] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [userId]);
          if (parseFloat(w[0].balance) < parseFloat(plan.amount)) { conn.release(); return err('Insufficient balance'); }
          const newBal = (parseFloat(w[0].balance) - parseFloat(plan.amount)).toFixed(2);
          await conn.execute('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBal, userId]);
          const endDate = new Date(Date.now() + plan.duration_days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
          await conn.execute('INSERT INTO user_investments (id, user_id, plan_id, amount, daily_profit, start_date, end_date, total_profit, days_passed, status, created_at) VALUES (?, ?, ?, ?, ?, NOW(), ?, 0, 0, "active", NOW())', [uuid(), userId, planId, plan.amount, plan.daily_profit, endDate]);
          await conn.execute('INSERT INTO transactions (id, user_id, type, amount, balance, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [uuid(), userId, 'investment', plan.amount, newBal, 'Invested in: ' + plan.name]);
          conn.release();
          return ok({ message: 'Investment created' });
        }
      }

      // Deposits
      if (route === 'deposits') {
        if (method === 'GET') {
          const userId = segment2;
          const [dep] = await conn.execute('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC', [userId]);
          conn.release();
          return ok({ deposits: dep });
        }
        if (method === 'POST') {
          const body = await req.json();
          const { userId, amount, method: payMethod, screenshot } = body;
          if (!amount || !payMethod) return err('Amount and method required');
          await conn.execute('INSERT INTO deposits (id, user_id, amount, method, screenshot, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, "pending", NOW(), NOW())', [uuid(), userId, amount, payMethod, screenshot || null]);
          conn.release();
          return ok({ message: 'Deposit request submitted' });
        }
      }

      // Withdrawals
      if (route === 'withdrawals') {
        if (method === 'GET') {
          const userId = segment2;
          const [w] = await conn.execute('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC', [userId]);
          conn.release();
          return ok({ withdrawals: w });
        }
        if (method === 'POST') {
          const body = await req.json();
          const { userId, amount, method: payMethod, accountName, accountNumber } = body;
          if (!amount || !payMethod) return err('Amount and method required');
          const [wallet] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [userId]);
          if (parseFloat(wallet[0].balance) < parseFloat(amount)) { conn.release(); return err('Insufficient balance'); }
          await conn.execute('INSERT INTO withdrawals (id, user_id, amount, method, account_name, account_number, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, "pending", NOW(), NOW())', [uuid(), userId, amount, payMethod, accountName || null, accountNumber || null]);
          const newBal = (parseFloat(wallet[0].balance) - parseFloat(amount)).toFixed(2);
          await conn.execute('UPDATE wallets SET balance = ?, withdrawn = ? WHERE user_id = ?', [newBal, (parseFloat(wallet[0].withdrawn) + parseFloat(amount)).toFixed(2), userId]);
          conn.release();
          return ok({ message: 'Withdrawal request submitted' });
        }
      }

      // Referrals
      if (route === 'referrals') {
        const userId = segment2;
        const [refs] = await conn.execute('SELECT r.*, u.name as referred_name, u.email as referred_email FROM referrals r JOIN users u ON r.referred_id = u.id WHERE r.referrer_id = ?', [userId]);
        const [u] = await conn.execute('SELECT referral_code FROM users WHERE id = ?', [userId]);
        const [total] = await conn.execute('SELECT COALESCE(SUM(reward), 0) as total FROM referrals WHERE referrer_id = ?', [userId]);
        conn.release();
        return ok({ referrals: refs, referralCode: u[0]?.referral_code, totalReward: total[0].total, count: refs.length });
      }

      // Notifications
      if (route === 'notifications') {
        if (segment2 && !segment3) {
          const [notifs] = await conn.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [segment2]);
          conn.release();
          return ok({ notifications: notifs });
        }
        if (segment2 === 'read' && method === 'POST') {
          const body = await req.json();
          const { notificationId } = body;
          await conn.execute('UPDATE notifications SET `read` = 1 WHERE id = ?', [notificationId]);
          conn.release();
          return ok({ message: 'Marked as read' });
        }
        if (segment2 === 'read-all' && method === 'POST') {
          const body = await req.json();
          const { userId } = body;
          await conn.execute('UPDATE notifications SET `read` = 1 WHERE user_id = ?', [userId]);
          conn.release();
          return ok({ message: 'All marked as read' });
        }
      }

      // History
      if (route === 'history') {
        const userId = segment2;
        const [tx] = await conn.execute('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userId]);
        conn.release();
        return ok({ transactions: tx });
      }

      // Team
      if (route === 'team') {
        const userId = segment2;
        const [refs] = await conn.execute('SELECT u.id, u.name, u.email, u.created_at, r.reward, r.status FROM referrals r JOIN users u ON r.referred_id = u.id WHERE r.referrer_id = ?', [userId]);
        conn.release();
        return ok({ team: refs });
      }

      // Community
      if (route === 'community') {
        if (segment2 === 'posts') {
          if (method === 'GET') {
            const urlParams = new URL(req.url).searchParams;
            const page = parseInt(urlParams.get('page') || '0');
            const [posts] = await conn.execute('SELECT p.*, u.name as author_name, u.avatar as author_avatar FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.pinned DESC, p.created_at DESC LIMIT 20 OFFSET ?', [page * 20]);
            for (const post of posts) {
              const [likes] = await conn.execute('SELECT COUNT(*) as c FROM likes WHERE post_id = ?', [post.id]);
              const [comments] = await conn.execute('SELECT COUNT(*) as c FROM comments WHERE post_id = ?', [post.id]);
              post.likes = likes[0].c;
              post.comments_count = comments[0].c;
            }
            conn.release();
            return ok({ posts });
          }
          if (method === 'POST') {
            const body = await req.json();
            const { userId, content, image } = body;
            if (!content) return err('Content required');
            const postId = uuid();
            await conn.execute('INSERT INTO posts (id, user_id, content, image, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', [postId, userId, content, image || null]);
            conn.release();
            return ok({ message: 'Post created', postId });
          }
        }
        if (segment2 && segment3 === 'like' && method === 'POST') {
          const body = await req.json();
          const { userId } = body;
          const [existing] = await conn.execute('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [segment2, userId]);
          if (existing.length > 0) {
            await conn.execute('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [segment2, userId]);
            conn.release();
            return ok({ message: 'Unliked', liked: false });
          } else {
            await conn.execute('INSERT INTO likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, NOW())', [uuid(), segment2, userId]);
            conn.release();
            return ok({ message: 'Liked', liked: true });
          }
        }
        if (segment2 && segment3 === 'comment' && method === 'POST') {
          const body = await req.json();
          const { userId, content } = body;
          if (!content) return err('Content required');
          await conn.execute('INSERT INTO comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, NOW())', [uuid(), segment2, userId, content]);
          conn.release();
          return ok({ message: 'Comment added' });
        }
        if (segment2 === 'posts' && segment3 && !segment4 && method === 'DELETE') {
          await conn.execute('DELETE FROM posts WHERE id = ?', [segment3]);
          conn.release();
          return ok({ message: 'Post deleted' });
        }
        if (segment2 === 'comments' && segment3 && method === 'DELETE') {
          await conn.execute('DELETE FROM comments WHERE id = ?', [segment3]);
          conn.release();
          return ok({ message: 'Comment deleted' });
        }
      }

      // ===== ADMIN =====
      if (route === 'admin') {
        const action = segment2;

        if (action === 'stats' || action === '' || !action) {
          const [users] = await conn.execute('SELECT COUNT(*) as c FROM users');
          const [deposits] = await conn.execute('SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = "approved"');
          const [withdrawals] = await conn.execute('SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = "approved"');
          const [activeInvest] = await conn.execute('SELECT COUNT(*) as c FROM user_investments WHERE status = "active"');
          const [pendingDep] = await conn.execute('SELECT COUNT(*) as c FROM deposits WHERE status = "pending"');
          const [pendingW] = await conn.execute('SELECT COUNT(*) as c FROM withdrawals WHERE status = "pending"');
          conn.release();
          return ok({ stats: { totalUsers: users[0].c, totalDeposits: deposits[0].total, totalWithdrawals: withdrawals[0].total, activeInvestments: activeInvest[0].c, pendingDeposits: pendingDep[0].c, pendingWithdrawals: pendingW[0].c } });
        }

        if (action === 'users') {
          const [users] = await conn.execute('SELECT id, email, name, phone, role, referral_code, active, verified, created_at FROM users ORDER BY created_at DESC');
          conn.release();
          return ok({ users });
        }

        if (action === 'deposits') {
          if (method === 'GET') {
            const [deps] = await conn.execute('SELECT d.*, u.name as user_name, u.email as user_email FROM deposits d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC');
            conn.release();
            return ok({ deposits: deps });
          }
        }

        if (action === 'withdrawals') {
          if (method === 'GET') {
            const [wds] = await conn.execute('SELECT w.*, u.name as user_name, u.email as user_email FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC');
            conn.release();
            return ok({ withdrawals: wds });
          }
        }

        if (action === 'plans') {
          const [plans] = await conn.execute('SELECT * FROM investment_plans ORDER BY amount ASC');
          conn.release();
          return ok({ plans });
        }

        if (action === 'tasks') {
          const [tasks] = await conn.execute('SELECT * FROM tasks ORDER BY created_at DESC');
          conn.release();
          return ok({ tasks });
        }

        if (action === 'settings') {
          if (method === 'GET') {
            const [settings] = await conn.execute('SELECT * FROM settings');
            const s = {};
            settings.forEach(r => { s[r.setting_key] = r.setting_value; });
            conn.release();
            return ok({ settings: s });
          }
          if (method === 'POST') {
            const body = await req.json();
            for (const [key, value] of Object.entries(body)) {
              await conn.execute('INSERT INTO settings (id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [key, key, String(value), String(value)]);
            }
            conn.release();
            return ok({ message: 'Settings updated' });
          }
        }

        // Deposit approve/reject
        if (action === 'deposits' || (segment2 === 'deposits' && segment3)) {
          if (segment3 && segment4 === 'approve' && method === 'POST') {
            const [dep] = await conn.execute('SELECT * FROM deposits WHERE id = ?', [segment3]);
            if (!dep[0]) { conn.release(); return err('Not found', 404); }
            await conn.execute('UPDATE deposits SET status = "approved" WHERE id = ?', [segment3]);
            const [w] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [dep[0].user_id]);
            if (w[0]) {
              const newBal = (parseFloat(w[0].balance) + parseFloat(dep[0].amount)).toFixed(2);
              const newDep = (parseFloat(w[0].deposited) + parseFloat(dep[0].amount)).toFixed(2);
              await conn.execute('UPDATE wallets SET balance = ?, deposited = ?, main_balance = ? WHERE user_id = ?', [newBal, newDep, newBal, dep[0].user_id]);
              await conn.execute('INSERT INTO transactions (id, user_id, type, amount, balance, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [uuid(), dep[0].user_id, 'deposit', dep[0].amount, newBal, 'Deposit approved']);
              await conn.execute('INSERT INTO notifications (id, user_id, title, message, type, `read`, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())', [uuid(), dep[0].user_id, '💰 Deposit Approved', 'Your deposit of Rs ' + dep[0].amount + ' has been approved!', 'success']);
            }
            conn.release();
            return ok({ message: 'Approved' });
          }
          if (segment3 && segment4 === 'reject' && method === 'POST') {
            const body = await req.json();
            await conn.execute('UPDATE deposits SET status = "rejected", admin_note = ? WHERE id = ?', [body.reason || '', segment3]);
            conn.release();
            return ok({ message: 'Rejected' });
          }
        }

        // Withdrawal approve/reject
        if (segment2 === 'withdrawals' && segment3) {
          if (segment4 === 'approve' && method === 'POST') {
            const [wds] = await conn.execute('SELECT * FROM withdrawals WHERE id = ?', [segment3]);
            if (!wds[0]) { conn.release(); return err('Not found', 404); }
            await conn.execute('UPDATE withdrawals SET status = "approved" WHERE id = ?', [segment3]);
            await conn.execute('INSERT INTO notifications (id, user_id, title, message, type, `read`, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())', [uuid(), wds[0].user_id, '✅ Withdrawal Approved', 'Your withdrawal of Rs ' + wds[0].amount + ' has been approved!', 'success']);
            conn.release();
            return ok({ message: 'Approved' });
          }
          if (segment4 === 'reject' && method === 'POST') {
            const body = await req.json();
            const [wds] = await conn.execute('SELECT * FROM withdrawals WHERE id = ?', [segment3]);
            if (wds[0]) {
              const [w] = await conn.execute('SELECT * FROM wallets WHERE user_id = ?', [wds[0].user_id]);
              if (w[0]) {
                const newBal = (parseFloat(w[0].balance) + parseFloat(wds[0].amount)).toFixed(2);
                await conn.execute('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBal, wds[0].user_id]);
              }
            }
            await conn.execute('UPDATE withdrawals SET status = "rejected", admin_note = ? WHERE id = ?', [body.reason || '', segment3]);
            conn.release();
            return ok({ message: 'Rejected' });
          }
        }

        // User role/toggle
        if (action === 'users' && segment3 && segment4 === 'role' && method === 'POST') {
          const body = await req.json();
          await conn.execute('UPDATE users SET role = ? WHERE id = ?', [body.role, segment3]);
          conn.release();
          return ok({ message: 'Role updated' });
        }
        if (action === 'users' && segment3 && segment4 === 'toggle-active' && method === 'POST') {
          await conn.execute('UPDATE users SET active = NOT active WHERE id = ?', [segment3]);
          conn.release();
          return ok({ message: 'Toggled' });
        }

        // Force logout
        if (action === 'force-logout' && method === 'POST') {
          conn.release();
          return ok({ message: 'Logged out' });
        }

        // Broadcast
        if (action === 'broadcast' && method === 'POST') {
          const body = await req.json();
          const { title, message, type } = body;
          const [users] = await conn.execute('SELECT id FROM users');
          for (const u of users) {
            await conn.execute('INSERT INTO notifications (id, user_id, title, message, type, `read`, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())', [uuid(), u.id, title || '📢 Announcement', message, type || 'info']);
          }
          conn.release();
          return ok({ message: 'Broadcast sent to ' + users.length + ' users' });
        }

        // Delete plan
        if (action === 'plans' && segment3 && method === 'DELETE') {
          await conn.execute('DELETE FROM investment_plans WHERE id = ?', [segment3]);
          conn.release();
          return ok({ message: 'Deleted' });
        }

        // Delete task
        if (action === 'tasks' && segment3 && method === 'DELETE') {
          await conn.execute('DELETE FROM tasks WHERE id = ?', [segment3]);
          conn.release();
          return ok({ message: 'Deleted' });
        }

        conn.release();
        return err('Not found', 404);
      }

      conn.release();
      return err('Not found', 404);
    }

    conn.release();
    return err('Not found', 404);
  } catch (e) {
    if (conn) conn.release();
    return err('Server error: ' + e.message, 500);
  }
}
