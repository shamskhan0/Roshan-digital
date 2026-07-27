<?php
// Investments Handler
$segments = getUrlSegments();
$action = $segments[1] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// GET /api/app/investment-plans
if ($method === 'GET' && $action === 'investment-plans') {
    $stmt = $db->prepare("SELECT * FROM investment_plans WHERE active = 1");
    $stmt->execute();
    $plans = $stmt->fetchAll();

    $result = [];
    foreach ($plans as $p) {
        $pct = (float)$p['profit_percentage'];
        $dailyCalc = (float)$p['amount'] * ($pct / 100);
        $result[] = [
            'id' => $p['id'],
            'name' => $p['name'],
            'description' => $p['description'],
            'amount' => (float)$p['amount'],
            'dailyProfit' => (float)$p['daily_profit'],
            'profitPercentage' => $pct,
            'profitType' => $p['profit_type'],
            'duration' => (int)$p['duration'],
            'durationDays' => (int)$p['duration_days'],
            'active' => (bool)$p['active'],
            'expectedDailyFromPercentage' => $dailyCalc,
        ];
    }
    success(['plans' => $result]);
}

// GET /api/app/investments/:userId
if ($method === 'GET' && $action === 'investments') {
    $userId = $segments[2] ?? '';
    if (!$userId) error('userId required');

    $stmt = $db->prepare("
        SELECT ui.*, ip.name as plan_name, ip.description as plan_description, ip.daily_profit as plan_daily_profit, ip.duration as plan_duration
        FROM user_investments ui
        JOIN investment_plans ip ON ui.plan_id = ip.id
        WHERE ui.user_id = ?
        ORDER BY ui.created_at DESC
    ");
    $stmt->execute([$userId]);
    $investments = $stmt->fetchAll();

    $result = [];
    foreach ($investments as $inv) {
        $result[] = [
            'id' => $inv['id'],
            'userId' => $inv['user_id'],
            'planId' => $inv['plan_id'],
            'amount' => (float)$inv['amount'],
            'dailyProfit' => (float)$inv['daily_profit'],
            'startDate' => $inv['start_date'],
            'endDate' => $inv['end_date'],
            'totalProfit' => (float)$inv['total_profit'],
            'daysPassed' => (int)$inv['days_passed'],
            'status' => $inv['status'],
            'createdAt' => $inv['created_at'],
            'plan' => [
                'id' => $inv['plan_id'],
                'name' => $inv['plan_name'],
                'description' => $inv['plan_description'],
                'dailyProfit' => (float)$inv['plan_daily_profit'],
                'duration' => (int)$inv['plan_duration'],
            ]
        ];
    }
    success(['investments' => $result]);
}

// POST /api/app/investments
if ($method === 'POST' && $action === 'investments') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $planId = $body['planId'] ?? '';

    if (!$userId || !$planId) error('userId and planId required');
    if (!getSettingBool('investmentsEnabled', true)) error('Investments are disabled', 403);

    $stmt = $db->prepare("SELECT * FROM investment_plans WHERE id = ?");
    $stmt->execute([$planId]);
    $plan = $stmt->fetch();
    if (!$plan) error('Plan not found', 404);

    $wallet = ensureWallet($userId);
    if ((float)$wallet['balance'] < (float)$plan['amount']) error('Insufficient balance');

    // Auto-calculate daily profit from percentage if available
    $dailyProfit = (float)$plan['daily_profit'];
    $profitPct = (float)$plan['profit_percentage'];
    if ($profitPct > 0) {
        $dailyProfit = round((float)$plan['amount'] * ($profitPct / 100), 2);
    }

    $durationDays = (int)$plan['duration_days'] ?: (int)$plan['duration'];
    $endDate = date('Y-m-d H:i:s', time() + ($durationDays * 86400));

    $stmt = $db->prepare("INSERT INTO user_investments (id, user_id, plan_id, amount, daily_profit, start_date, end_date, total_profit, days_passed, status, created_at) VALUES (?, ?, ?, ?, ?, NOW(), ?, 0, 0, 'active', NOW())");
    $stmt->execute([generateId(), $userId, $planId, $plan['amount'], $dailyProfit, $endDate]);

    $newBalance = (float)$wallet['balance'] - (float)$plan['amount'];
    $stmt = $db->prepare("UPDATE wallets SET balance = ?, main_balance = ? WHERE user_id = ?");
    $stmt->execute([$newBalance, $newBalance, $userId]);

    recordTx($userId, 'investment', -$plan['amount'], $newBalance, 'Investment: ' . $plan['name']);
    notify($userId, '💰 Investment Activated!', 'Your "' . $plan['name'] . '" plan activated.', 'investment');

    // Handle referral bonus
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if ($user && $user['referred_by']) {
        $stmt = $db->prepare("SELECT id FROM users WHERE referral_code = ?");
        $stmt->execute([$user['referred_by']]);
        $referrer = $stmt->fetch();

        if ($referrer) {
            $stmt = $db->prepare("SELECT * FROM referrals WHERE referrer_id = ? AND referred_id = ? AND status = 'pending'");
            $stmt->execute([$referrer['id'], $userId]);
            $ref = $stmt->fetch();

            if ($ref) {
                $refReward = (float)getSetting('referralReward', '100');
                $rw = ensureWallet($referrer['id']);
                $refNewBalance = (float)$rw['balance'] + $refReward;

                $stmt = $db->prepare("UPDATE wallets SET balance = ?, main_balance = ?, earned = earned + ? WHERE user_id = ?");
                $stmt->execute([$refNewBalance, $refNewBalance, $refReward, $referrer['id']]);

                $stmt = $db->prepare("UPDATE referrals SET status = 'approved', reward = ? WHERE id = ?");
                $stmt->execute([$refReward, $ref['id']]);

                recordTx($referrer['id'], 'referral_reward', $refReward, $refNewBalance, 'Referral bonus: ' . $user['name']);
                notify($referrer['id'], '🎉 Referral Bonus!', 'You received ' . $refReward . ' PKR referral bonus because ' . $user['name'] . ' activated an investment.', 'reward');
            }
        }
    }

    success(['balance' => $newBalance, 'message' => 'Your Investment plan successfully activated']);
}

// GET /api/app/calculator
if ($method === 'GET' && $action === 'calculator') {
    $investment = (float)($_GET['investment'] ?? 10000);
    $planId = $_GET['planId'] ?? null;

    $dailyProfit = $investment * 0.02;
    $duration = 30;
    $profitPercentage = 2.0;
    $profitType = 'fixed';

    if ($planId) {
        $stmt = $db->prepare("SELECT * FROM investment_plans WHERE id = ?");
        $stmt->execute([$planId]);
        $plan = $stmt->fetch();
        if ($plan) {
            $profitPercentage = (float)$plan['profit_percentage'];
            $profitType = $plan['profit_type'];
            $duration = (int)$plan['duration_days'] ?: (int)$plan['duration'];
            // Auto-calculate from percentage
            $dailyProfit = $investment * ($profitPercentage / 100);
        }
    }

    $totalProfit = $dailyProfit * $duration;
    $roi = $investment > 0 ? round(($totalProfit / $investment) * 100, 1) : 0;

    success([
        'investment' => $investment,
        'dailyProfit' => round($dailyProfit, 2),
        'weeklyProfit' => round($dailyProfit * 7, 2),
        'monthlyProfit' => round($dailyProfit * $duration, 2),
        'duration' => $duration,
        'totalProfit' => round($totalProfit, 2),
        'totalReturn' => round($investment + $totalProfit, 2),
        'roi' => $roi,
        'profitPercentage' => $profitPercentage,
        'profitType' => $profitType,
        'startDate' => date('c'),
        'endDate' => date('c', time() + ($duration * 86400)),
        'currency' => 'PKR',
    ]);
}

error('Invalid route', 400);
