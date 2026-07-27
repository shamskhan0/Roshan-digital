<?php
// Admin Handler - All admin APIs
$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

$action = $segments[2] ?? '';
$subAction = $segments[3] ?? '';

// GET /api/app/admin/stats
if ($method === 'GET' && $action === 'stats') {
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM users");
    $stmt->execute();
    $totalUsers = (int)$stmt->fetch()['cnt'];

    $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'approved'");
    $stmt->execute();
    $totalDeposits = (float)$stmt->fetch()['total'];

    $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'approved'");
    $stmt->execute();
    $totalWithdrawals = (float)$stmt->fetch()['total'];

    $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM user_investments WHERE status = 'active'");
    $stmt->execute();
    $totalInvestments = (float)$stmt->fetch()['total'];

    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM deposits WHERE status = 'pending'");
    $stmt->execute();
    $pendingDeposits = (int)$stmt->fetch()['cnt'];

    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'pending'");
    $stmt->execute();
    $pendingWithdrawals = (int)$stmt->fetch()['cnt'];

    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_investments WHERE status = 'active'");
    $stmt->execute();
    $activeInvestments = (int)$stmt->fetch()['cnt'];

    success([
        'totalUsers' => $totalUsers,
        'totalDeposits' => $totalDeposits,
        'totalWithdrawals' => $totalWithdrawals,
        'totalInvestments' => $totalInvestments,
        'pendingDeposits' => $pendingDeposits,
        'pendingWithdrawals' => $pendingWithdrawals,
        'activeInvestments' => $activeInvestments,
    ]);
}

// GET /api/app/admin/users
if ($method === 'GET' && $action === 'users') {
    $stmt = $db->prepare("SELECT id, name, email, phone, role, active, verified, referral_code, avatar, created_at FROM users ORDER BY created_at DESC");
    $stmt->execute();
    $users = $stmt->fetchAll();

    $result = [];
    foreach ($users as $u) {
        $result[] = [
            'id' => $u['id'],
            'name' => $u['name'],
            'email' => $u['email'],
            'phone' => $u['phone'],
            'role' => $u['role'],
            'active' => (bool)$u['active'],
            'verified' => (bool)$u['verified'],
            'referralCode' => $u['referral_code'],
            'avatar' => $u['avatar'],
            'createdAt' => $u['created_at'],
        ];
    }
    success(['users' => $result]);
}

// GET /api/app/admin/deposits
if ($method === 'GET' && $action === 'deposits') {
    $stmt = $db->prepare("
        SELECT d.*, u.name as user_name, u.email as user_email
        FROM deposits d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
    ");
    $stmt->execute();
    $deposits = $stmt->fetchAll();

    $result = [];
    foreach ($deposits as $d) {
        $result[] = [
            'id' => $d['id'],
            'userId' => $d['user_id'],
            'amount' => (float)$d['amount'],
            'method' => $d['method'],
            'accountName' => $d['account_name'],
            'accountNumber' => $d['account_number'],
            'screenshot' => $d['screenshot'],
            'status' => $d['status'],
            'adminNote' => $d['admin_note'],
            'createdAt' => $d['created_at'],
            'user' => ['name' => $d['user_name'], 'email' => $d['user_email']],
        ];
    }
    success(['deposits' => $result]);
}

// POST /api/app/admin/deposits/:id/approve
if ($method === 'POST' && $action === 'deposits' && $subAction === 'approve') {
    $id = $segments[3] ?? $segments[2] ?? '';
    // Get deposit ID from URL: /api/app/admin/deposits/{id}/approve
    $id = $segments[3] ?? '';
    if (!$id) error('Deposit ID required');

    $stmt = $db->prepare("SELECT * FROM deposits WHERE id = ?");
    $stmt->execute([$id]);
    $deposit = $stmt->fetch();
    if (!$deposit) error('Deposit not found', 404);
    if ($deposit['status'] !== 'pending') error('This deposit has already been processed', 400);

    $stmt = $db->prepare("UPDATE deposits SET status = 'approved' WHERE id = ?");
    $stmt->execute([$id]);

    $wallet = ensureWallet($deposit['user_id']);
    $newBalance = (float)$wallet['balance'] + (float)$deposit['amount'];
    $stmt = $db->prepare("UPDATE wallets SET balance = ?, main_balance = ?, deposited = deposited + ? WHERE user_id = ?");
    $stmt->execute([$newBalance, $newBalance, $deposit['amount'], $deposit['user_id']]);

    recordTx($deposit['user_id'], 'deposit', $deposit['amount'], $newBalance, 'Deposit approved: ' . $deposit['method']);
    notify($deposit['user_id'], '✅ Deposit Approved!', 'Your ' . $deposit['amount'] . ' PKR deposit approved and credited to wallet', 'success');

    success();
}

// POST /api/app/admin/deposits/:id/reject
if ($method === 'POST' && $action === 'deposits' && $subAction === 'reject') {
    $id = $segments[3] ?? '';
    $body = getJsonBody();
    $reason = $body['reason'] ?? '';

    $stmt = $db->prepare("SELECT * FROM deposits WHERE id = ?");
    $stmt->execute([$id]);
    $deposit = $stmt->fetch();
    if (!$deposit) error('Deposit not found', 404);

    $stmt = $db->prepare("UPDATE deposits SET status = 'rejected', admin_note = ? WHERE id = ?");
    $stmt->execute([$reason, $id]);

    notify($deposit['user_id'], '❌ Deposit Rejected', 'Your ' . $deposit['amount'] . ' PKR deposit has been rejected. ' . $reason, 'error');

    success();
}

// GET /api/app/admin/withdrawals
if ($method === 'GET' && $action === 'withdrawals') {
    $stmt = $db->prepare("
        SELECT w.*, u.name as user_name, u.email as user_email
        FROM withdrawals w
        JOIN users u ON w.user_id = u.id
        ORDER BY w.created_at DESC
    ");
    $stmt->execute();
    $withdrawals = $stmt->fetchAll();

    $result = [];
    foreach ($withdrawals as $w) {
        $result[] = [
            'id' => $w['id'],
            'userId' => $w['user_id'],
            'amount' => (float)$w['amount'],
            'method' => $w['method'],
            'accountName' => $w['account_name'],
            'accountNumber' => $w['account_number'],
            'status' => $w['status'],
            'adminNote' => $w['admin_note'],
            'createdAt' => $w['created_at'],
            'user' => ['name' => $w['user_name'], 'email' => $w['user_email']],
        ];
    }
    success(['withdrawals' => $result]);
}

// POST /api/app/admin/withdrawals/:id/approve
if ($method === 'POST' && $action === 'withdrawals' && $subAction === 'approve') {
    $id = $segments[3] ?? '';

    $stmt = $db->prepare("SELECT * FROM withdrawals WHERE id = ?");
    $stmt->execute([$id]);
    $withdrawal = $stmt->fetch();
    if (!$withdrawal) error('Withdrawal not found', 404);
    if ($withdrawal['status'] !== 'pending') error('This withdrawal has already been processed', 400);

    $wallet = ensureWallet($withdrawal['user_id']);
    if ((float)$wallet['balance'] < (float)$withdrawal['amount']) error('User has insufficient balance', 400);

    $newBalance = (float)$wallet['balance'] - (float)$withdrawal['amount'];
    $stmt = $db->prepare("UPDATE wallets SET balance = ?, main_balance = ?, withdrawn = withdrawn + ? WHERE user_id = ?");
    $stmt->execute([$newBalance, $newBalance, $withdrawal['amount'], $withdrawal['user_id']]);

    $stmt = $db->prepare("UPDATE withdrawals SET status = 'approved' WHERE id = ?");
    $stmt->execute([$id]);

    recordTx($withdrawal['user_id'], 'withdrawal', -$withdrawal['amount'], $newBalance, 'Withdrawal approved: ' . $withdrawal['method']);
    notify($withdrawal['user_id'], '✅ Withdrawal Approved!', 'Your ' . $withdrawal['amount'] . ' PKR withdrawal approved.', 'success');

    success();
}

// POST /api/app/admin/withdrawals/:id/reject
if ($method === 'POST' && $action === 'withdrawals' && $subAction === 'reject') {
    $id = $segments[3] ?? '';
    $body = getJsonBody();
    $reason = $body['reason'] ?? '';

    $stmt = $db->prepare("SELECT * FROM withdrawals WHERE id = ?");
    $stmt->execute([$id]);
    $withdrawal = $stmt->fetch();
    if (!$withdrawal) error('Withdrawal not found', 404);

    $stmt = $db->prepare("UPDATE withdrawals SET status = 'rejected', admin_note = ? WHERE id = ?");
    $stmt->execute([$reason, $id]);

    notify($withdrawal['user_id'], '❌ Withdrawal Rejected', 'Your ' . $withdrawal['amount'] . ' PKR withdrawal rejected. ' . $reason, 'error');

    success();
}

// POST /api/app/admin/users/:id/role
if ($method === 'POST' && $action === 'users' && $subAction === 'role') {
    $id = $segments[3] ?? '';
    $body = getJsonBody();
    $role = $body['role'] ?? 'user';

    $stmt = $db->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->execute([$role, $id]);
    success();
}

// POST /api/app/admin/users/:id/toggle-active
if ($method === 'POST' && $action === 'users' && $subAction === 'toggle-active') {
    $id = $segments[3] ?? '';

    $stmt = $db->prepare("SELECT active FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) error('User not found', 404);

    $newActive = $user['active'] ? 0 : 1;
    $stmt = $db->prepare("UPDATE users SET active = ? WHERE id = ?");
    $stmt->execute([$newActive, $id]);

    success(['active' => (bool)$newActive]);
}

// POST /api/app/admin/force-logout
if ($method === 'POST' && $action === 'force-logout') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';

    if ($userId) {
        $stmt = $db->prepare("SELECT email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if ($user) {
            $stmt = $db->prepare("UPDATE otps SET used = 1 WHERE target = ? AND used = 0");
            $stmt->execute([$user['email']]);
        }
    }
    success();
}

// GET /api/app/admin/settings
if ($method === 'GET' && $action === 'settings') {
    $stmt = $db->prepare("SELECT setting_key, setting_value FROM settings");
    $stmt->execute();
    $settings = $stmt->fetchAll();

    $map = [];
    foreach ($settings as $s) { $map[$s['setting_key']] = $s['setting_value']; }
    success(['settings' => $map]);
}

// POST /api/app/admin/settings
if ($method === 'POST' && $action === 'settings') {
    $body = getJsonBody();
    foreach ($body as $key => $value) {
        $stmt = $db->prepare("INSERT INTO settings (id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $stmt->execute([generateId(), $key, strval($value)]);
    }
    success();
}

// GET /api/app/admin/plans
if ($method === 'GET' && $action === 'plans') {
    $stmt = $db->prepare("SELECT * FROM investment_plans ORDER BY created_at DESC");
    $stmt->execute();
    $plans = $stmt->fetchAll();
    success(['plans' => $plans]);
}

// POST /api/app/admin/plans
if ($method === 'POST' && $action === 'plans' && $subAction === '') {
    $body = getJsonBody();
    $id = generateId();
    $stmt = $db->prepare("INSERT INTO investment_plans (id, name, description, amount, daily_profit, duration, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $id,
        $body['name'] ?? '',
        $body['description'] ?? '',
        (float)($body['amount'] ?? 0),
        (float)($body['dailyProfit'] ?? 0),
        (int)($body['duration'] ?? 30),
        ($body['active'] ?? true) ? 1 : 0,
    ]);
    success(['plan' => ['id' => $id]]);
}

// PUT /api/app/admin/plans/:id
if ($method === 'PUT' && $action === 'plans') {
    $id = $subAction;
    $body = getJsonBody();
    $updates = [];
    $params = [];

    if (isset($body['name'])) { $updates[] = 'name = ?'; $params[] = $body['name']; }
    if (isset($body['description'])) { $updates[] = 'description = ?'; $params[] = $body['description']; }
    if (isset($body['amount'])) { $updates[] = 'amount = ?'; $params[] = (float)$body['amount']; }
    if (isset($body['dailyProfit'])) { $updates[] = 'daily_profit = ?'; $params[] = (float)$body['dailyProfit']; }
    if (isset($body['duration'])) { $updates[] = 'duration = ?'; $params[] = (int)$body['duration']; }
    if (isset($body['active'])) { $updates[] = 'active = ?'; $params[] = $body['active'] ? 1 : 0; }

    if (!empty($updates)) {
        $params[] = $id;
        $stmt = $db->prepare("UPDATE investment_plans SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
    }
    success();
}

// DELETE /api/app/admin/plans/:id
if ($method === 'DELETE' && $action === 'plans') {
    $id = $subAction;
    $stmt = $db->prepare("DELETE FROM investment_plans WHERE id = ?");
    $stmt->execute([$id]);
    success();
}

// GET /api/app/admin/tasks
if ($method === 'GET' && $action === 'tasks') {
    $stmt = $db->prepare("SELECT * FROM tasks ORDER BY created_at DESC");
    $stmt->execute();
    $tasks = $stmt->fetchAll();
    success(['tasks' => $tasks]);
}

// POST /api/app/admin/tasks
if ($method === 'POST' && $action === 'tasks' && $subAction === '') {
    $body = getJsonBody();
    $id = generateId();
    $stmt = $db->prepare("INSERT INTO tasks (id, title, description, reward, category, active, link, duration, require_visit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $id,
        $body['title'] ?? '',
        $body['description'] ?? '',
        (float)($body['reward'] ?? 0),
        $body['category'] ?? 'general',
        ($body['active'] ?? true) ? 1 : 0,
        $body['link'] ?? null,
        (int)($body['duration'] ?? 0),
        ($body['requireVisit'] ?? false) ? 1 : 0,
    ]);
    success(['task' => ['id' => $id]]);
}

// PUT /api/app/admin/tasks/:id
if ($method === 'PUT' && $action === 'tasks') {
    $id = $subAction;
    $body = getJsonBody();
    $updates = [];
    $params = [];

    if (isset($body['title'])) { $updates[] = 'title = ?'; $params[] = $body['title']; }
    if (isset($body['description'])) { $updates[] = 'description = ?'; $params[] = $body['description']; }
    if (isset($body['reward'])) { $updates[] = 'reward = ?'; $params[] = (float)$body['reward']; }
    if (isset($body['category'])) { $updates[] = 'category = ?'; $params[] = $body['category']; }
    if (isset($body['active'])) { $updates[] = 'active = ?'; $params[] = $body['active'] ? 1 : 0; }
    if (isset($body['link'])) { $updates[] = 'link = ?'; $params[] = $body['link'] ?: null; }
    if (isset($body['duration'])) { $updates[] = 'duration = ?'; $params[] = (int)$body['duration']; }
    if (isset($body['requireVisit'])) { $updates[] = 'require_visit = ?'; $params[] = $body['requireVisit'] ? 1 : 0; }

    if (!empty($updates)) {
        $params[] = $id;
        $stmt = $db->prepare("UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
    }
    success();
}

// DELETE /api/app/admin/tasks/:id
if ($method === 'DELETE' && $action === 'tasks') {
    $id = $subAction;
    $stmt = $db->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->execute([$id]);
    success();
}

// POST /api/app/admin/broadcast
if ($method === 'POST' && $action === 'broadcast') {
    $body = getJsonBody();
    $title = $body['title'] ?? '';
    $message = $body['message'] ?? '';
    $type = $body['type'] ?? 'info';

    $stmt = $db->prepare("SELECT id FROM users");
    $stmt->execute();
    $users = $stmt->fetchAll();

    $count = 0;
    foreach ($users as $u) {
        $stmt = $db->prepare("INSERT INTO notifications (id, user_id, title, message, type, read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())");
        $stmt->execute([generateId(), $u['id'], $title, $message, $type]);
        $count++;
    }

    success(['sent' => $count]);
}

// POST /api/app/admin/calculate-profits
if ($method === 'POST' && $action === 'calculate-profits') {
    $stmt = $db->prepare("SELECT ui.*, ip.name as plan_name, ip.duration as plan_duration FROM user_investments ui JOIN investment_plans ip ON ui.plan_id = ip.id WHERE ui.status = 'active'");
    $stmt->execute();
    $active = $stmt->fetchAll();

    $processed = 0;
    $completed = 0;

    foreach ($active as $inv) {
        $wallet = ensureWallet($inv['user_id']);
        $newBalance = (float)$wallet['balance'] + (float)$inv['daily_profit'];

        $stmt = $db->prepare("UPDATE wallets SET balance = ?, main_balance = ?, earned = earned + ? WHERE user_id = ?");
        $stmt->execute([$newBalance, $newBalance, $inv['daily_profit'], $inv['user_id']]);

        $stmt = $db->prepare("UPDATE user_investments SET total_profit = total_profit + ?, days_passed = days_passed + 1 WHERE id = ?");
        $stmt->execute([$inv['daily_profit'], $inv['id']]);

        recordTx($inv['user_id'], 'daily_profit', $inv['daily_profit'], $newBalance, 'Daily profit: ' . $inv['plan_name']);

        $newDays = (int)$inv['days_passed'] + 1;
        if ($newDays >= (int)$inv['plan_duration']) {
            $stmt = $db->prepare("UPDATE user_investments SET status = 'completed' WHERE id = ?");
            $stmt->execute([$inv['id']]);
            notify($inv['user_id'], '🎉 Investment Completed!', '"' . $inv['plan_name'] . '" completed.', 'investment');
            $completed++;
        } else {
            notify($inv['user_id'], '💰 Daily Profit', 'You received ' . $inv['daily_profit'] . ' daily profit credited.', 'profit');
        }
        $processed++;
    }

    success(['processed' => $processed, 'completed' => $completed]);
}

error('Invalid admin route: ' . $action . '/' . $subAction, 400);
