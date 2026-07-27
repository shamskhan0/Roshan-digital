<?php
// Admin Session Check — include this at the top of every admin page
session_start();

require_once __DIR__ . '/../backend/config.php';

function requireAdmin() {
    if (isset($_SESSION['admin_id'])) return true;

    // Check form login
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['email'], $_POST['password'])) {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, name, email, role FROM users WHERE email = ? AND password = ? AND role = 'admin' AND active = 1");
        $stmt->execute([$_POST['email'], $_POST['password']]);
        $admin = $stmt->fetch();

        if ($admin) {
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_name'] = $admin['name'];
            $_SESSION['admin_email'] = $admin['email'];
            return true;
        }
        return false;
    }
    return false;
}

function renderLoginForm($error = '') {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login — Roshan Digital</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .login-card { background: #1e293b; border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 25px 50px rgba(0,0,0,0.3); }
            .login-card h1 { color: #f8fafc; font-size: 24px; margin-bottom: 8px; }
            .login-card p { color: #94a3b8; margin-bottom: 30px; font-size: 14px; }
            .error { background: #450a0a; color: #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; border: 1px solid #7f1d1d; }
            .form-group { margin-bottom: 20px; }
            .form-group label { display: block; color: #cbd5e1; font-size: 13px; margin-bottom: 6px; font-weight: 500; }
            .form-group input { width: 100%; padding: 12px 16px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; font-size: 15px; outline: none; transition: border-color 0.2s; }
            .form-group input:focus { border-color: #6366f1; }
            .btn { width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
            .btn:hover { background: #4f46e5; }
            .back { display: block; text-align: center; color: #64748b; text-decoration: none; margin-top: 16px; font-size: 13px; }
            .back:hover { color: #94a3b8; }
        </style>
    </head>
    <body>
        <form class="login-card" method="POST">
            <h1>🔐 Admin Panel</h1>
            <p>Roshan Digital — Update System</p>
            <?php if ($error): ?>
                <div class="error">⚠️ <?= htmlspecialchars($error) ?></div>
            <?php endif; ?>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="admin@roshan.com" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="Enter password" required>
            </div>
            <button type="submit" class="btn">Login</button>
            <a href="/" class="back">← Back to Website</a>
        </form>
    </body>
    </html>
    <?php
    exit;
}

function adminLogout() {
    session_destroy();
    header('Location: update-panel.php');
    exit;
}
