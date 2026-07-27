<?php
// Profit Distribution Handler
// POST /api/app/cron/distribute-profits — Run by cron (with auth)
// POST /api/app/admin/calculate-profits — Run by admin
// GET  /api/app/admin/profit-history — View profit history
// GET  /api/app/admin/profit-settings — View/edit profit settings

$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

$action = $segments[2] ?? '';
$subAction = $segments[3] ?? '';

// =============================================
// PUBLIC: Cron endpoint (with Bearer token auth)
// POST /api/app/cron/distribute-profits
// =============================================
if ($method === 'POST' && $segments[1] === 'cron' && $action === 'distribute-profits') {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $cronSecret = getSetting('cronSecret', 'roshan-digital-cron-2024');
    if ($authHeader !== 'Bearer ' . $cronSecret) {
        error('Unauthorized', 401);
    }

    $result = distributeProfits($db);
    success($result);
}

// =============================================
// ADMIN: Manual trigger + view history
// POST /api/app/admin/calculate-profits
// =============================================
if ($method === 'POST' && $action === 'calculate-profits') {
    $result = distributeProfits($db);
    success($result);
}

// GET /api/app/admin/profit-history
if ($method === 'GET' && $action === 'profit-history') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    $dateFilter = $_GET['date'] ?? '';
    $userId = $_GET['userId'] ?? '';

    $where = '1=1';
    $params = [];

    if ($dateFilter) {
        $where .= ' AND ph.profit_date = ?';
        $params[] = $dateFilter;
    }
    if ($userId) {
        $where .= ' AND ph.user_id = ?';
        $params[] = $userId;
    }

    $countStmt = $db->prepare("SELECT COUNT(*) as cnt FROM profit_history ph WHERE $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['cnt'];

    $stmt = $db->prepare("
        SELECT ph.*, u.name as user_name, u.email as user_email, ip.name as plan_name
        FROM profit_history ph
        JOIN users u ON ph.user_id = u.id
        JOIN user_investments ui ON ph.investment_id = ui.id
        JOIN investment_plans ip ON ui.plan_id = ip.id
        WHERE $where
        ORDER BY ph.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $params[] = $limit;
    $params[] = $offset;
    $stmt->execute($params);
    $records = $stmt->fetchAll();

    // Today's summary
    $today = date('Y-m-d');
    $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(profit_amount), 0) as total FROM profit_history WHERE profit_date = ?");
    $stmt->execute([$today]);
    $todayStats = $stmt->fetch();

    // Total summary
    $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(profit_amount), 0) as total FROM profit_history");
    $stmt->execute();
    $totalStats = $stmt->fetch();

    // Yesterday summary
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(profit_amount), 0) as total FROM profit_history WHERE profit_date = ?");
    $stmt->execute([$yesterday]);
    $yesterdayStats = $stmt->fetch();

    success([
        'history' => $records,
        'total' => $total,
        'page' => $page,
        'hasMore' => $offset + $limit < $total,
        'stats' => [
            'today' => ['count' => (int)$todayStats['cnt'], 'total' => (float)$todayStats['total']],
            'yesterday' => ['count' => (int)$yesterdayStats['cnt'], 'total' => (float)$yesterdayStats['total']],
            'allTime' => ['count' => (int)$totalStats['cnt'], 'total' => (float)$totalStats['total']],
        ],
    ]);
}

// GET /api/app/admin/profit-settings — Get plan profit rates
if ($method === 'GET' && $action === 'profit-settings') {
    $stmt = $db->prepare("SELECT * FROM investment_plans WHERE active = 1 ORDER BY amount ASC");
    $stmt->execute();
    $plans = $stmt->fetchAll();

    $result = [];
    foreach ($plans as $p) {
        $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_invested FROM user_investments WHERE plan_id = ? AND status = 'active'");
        $stmt->execute([$p['id']]);
        $stats = $stmt->fetch();

        $result[] = [
            'id' => $p['id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'amount' => (float)$p['amount'],
            'dailyProfit' => (float)$p['daily_profit'],
            'duration' => (int)$p['duration'],
            'roi' => (int)$p['amount'] > 0 ? round(((float)$p['daily_profit'] / (float)$p['amount']) * 100, 2) : 0,
            'dailyProfitRate' => (int)$p['amount'] > 0 ? round(((float)$p['daily_profit'] / (float)$p['amount']) * 100, 2) : 0,
            'monthlyROI' => (int)$p['amount'] > 0 ? round(((float)$p['daily_profit'] * 30 / (float)$p['amount']) * 100, 2) : 0,
            'activeInvestors' => (int)$stats['cnt'],
            'totalInvested' => (float)$stats['total_invested'],
            'dailyPayoutTotal' => (float)$stats['cnt'] * (float)$p['daily_profit'],
        ];
    }

    // Global stats
    $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(daily_profit), 0) as total_daily FROM user_investments WHERE status = 'active'");
    $stmt->execute();
    $global = $stmt->fetch();

    success([
        'plans' => $result,
        'global' => [
            'activeInvestors' => (int)$global['cnt'],
            'totalDailyPayout' => (float)$global['total_daily'],
            'monthlyPayout' => (float)$global['total_daily'] * 30,
        ],
        'cronUrl' => '/api/app/cron/distribute-profits',
        'cronSecret' => getSetting('cronSecret', 'roshan-digital-cron-2024'),
    ]);
}

// PUT /api/app/admin/profit-settings/:planId — Update plan profit
if ($method === 'PUT' && $action === 'profit-settings') {
    $planId = $subAction;
    $body = getJsonBody();
    $dailyProfit = (float)($body['dailyProfit'] ?? -1);

    if ($dailyProfit < 0) error('Invalid daily profit amount');

    $stmt = $db->prepare("UPDATE investment_plans SET daily_profit = ? WHERE id = ?");
    $stmt->execute([$dailyProfit, $planId]);

    // Also update active investments using this plan
    $stmt = $db->prepare("UPDATE user_investments SET daily_profit = ? WHERE plan_id = ? AND status = 'active'");
    $stmt->execute([$dailyProfit, $planId]);

    success(['message' => 'Profit rate updated successfully']);
}

error('Invalid profit route', 400);


// =============================================
// CORE FUNCTION: Distribute Daily Profits
// =============================================
function distributeProfits($db) {
    $today = date('Y-m-d');
    $processed = 0;
    $skipped = 0;
    $completed = 0;
    $errors = [];

    // Get all active investments
    $stmt = $db->prepare("
        SELECT ui.*, ip.name as plan_name, ip.duration as plan_duration
        FROM user_investments ui
        JOIN investment_plans ip ON ui.plan_id = ip.id
        WHERE ui.status = 'active'
    ");
    $stmt->execute();
    $active = $stmt->fetchAll();

    foreach ($active as $inv) {
        $userId = $inv['user_id'];
        $invId = $inv['id'];
        $profit = (float)$inv['daily_profit'];
        $planName = $inv['plan_name'];

        // CHECK: Already distributed today? (NO DUPLICATE!)
        $checkStmt = $db->prepare("SELECT id FROM profit_history WHERE user_id = ? AND investment_id = ? AND profit_date = ?");
        $checkStmt->execute([$userId, $invId, $today]);
        if ($checkStmt->fetch()) {
            $skipped++;
            continue;
        }

        // Update user wallet
        $walletStmt = $db->prepare("SELECT * FROM wallets WHERE user_id = ?");
        $walletStmt->execute([$userId]);
        $wallet = $walletStmt->fetch();

        if (!$wallet) continue;

        $newBalance = (float)$wallet['balance'] + $profit;
        $newMainBalance = (float)$wallet['main_balance'] + $profit;

        $updateWallet = $db->prepare("UPDATE wallets SET balance = ?, main_balance = ?, earned = earned + ? WHERE user_id = ?");
        $updateWallet->execute([$newBalance, $newMainBalance, $profit, $userId]);

        // Update investment total_profit and days_passed
        $newTotalProfit = (float)$inv['total_profit'] + $profit;
        $newDaysPassed = (int)$inv['days_passed'] + 1;

        $updateInv = $db->prepare("UPDATE user_investments SET total_profit = ?, days_passed = ? WHERE id = ?");
        $updateInv->execute([$newTotalProfit, $newDaysPassed, $invId]);

        // Record in profit_history (UNIQUE constraint prevents duplicates)
        $insertProfit = $db->prepare("INSERT INTO profit_history (user_id, investment_id, plan_name, profit_amount, profit_date, status, created_at) VALUES (?, ?, ?, ?, ?, 'distributed', NOW())");
        $insertProfit->execute([$userId, $invId, $planName, $profit, $today]);

        // Record transaction
        $txStmt = $db->prepare("INSERT INTO transactions (id, user_id, type, amount, balance, detail, created_at) VALUES (?, ?, 'daily_profit', ?, ?, ?, NOW())");
        $txStmt->execute([generateId(), $userId, $profit, $newBalance, "Daily profit: $planName"]);

        // Send notification
        notify($userId, '💰 Daily Profit Credited!', "You received PKR $profit daily profit from \"$planName\". New balance: PKR $newBalance", 'profit');

        $processed++;

        // Check if investment completed
        if ($newDaysPassed >= (int)$inv['plan_duration']) {
            $completeInv = $db->prepare("UPDATE user_investments SET status = 'completed' WHERE id = ?");
            $completeInv->execute([$invId]);

            notify($userId, '🎉 Investment Completed!', "Your \"$planName\" investment has completed! Total profit earned: PKR " . $newTotalProfit, 'investment');
            $completed++;
        }
    }

    // Log this run
    $logStmt = $db->prepare("INSERT INTO updates (version, description, status, created_at) VALUES (?, ?, 'completed', NOW())");
    $logStmt->execute(['cron', "Daily profit: $processed distributed, $skipped skipped, $completed completed"]);

    return [
        'ok' => true,
        'date' => $today,
        'timestamp' => date('c'),
        'processed' => $processed,
        'skipped' => $skipped,
        'completed' => $completed,
        'totalInvestments' => count($active),
    ];
}
