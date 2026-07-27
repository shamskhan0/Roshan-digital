<?php
// Dashboard Handler - /api/app/dashboard/:userId
$segments = getUrlSegments();
$userId = $segments[2] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') error('Method not allowed', 405);
if (!$userId) error('userId required');

$db = getDB();
$wallet = ensureWallet($userId);

// Pending tasks count
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_tasks WHERE user_id = ? AND status = 'pending'");
$stmt->execute([$userId]);
$pendingTasks = (int)$stmt->fetch()['cnt'];

// Completed tasks count
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_tasks WHERE user_id = ? AND status = 'completed'");
$stmt->execute([$userId]);
$completedTasks = (int)$stmt->fetch()['cnt'];

// Active investments count
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_investments WHERE user_id = ? AND status = 'active'");
$stmt->execute([$userId]);
$activeInvestments = (int)$stmt->fetch()['cnt'];

// Referral count
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM referrals WHERE referrer_id = ? AND status = 'approved'");
$stmt->execute([$userId]);
$referralCount = (int)$stmt->fetch()['cnt'];

// Today's completed tasks
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_tasks WHERE user_id = ? AND status = 'completed' AND DATE(created_at) = CURDATE()");
$stmt->execute([$userId]);
$todayTasks = (int)$stmt->fetch()['cnt'];

// Recent transactions
$stmt = $db->prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
$stmt->execute([$userId]);
$recentTx = $stmt->fetchAll();

// Unread notifications
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND `read` = 0");
$stmt->execute([$userId]);
$unreadNotif = (int)$stmt->fetch()['cnt'];

// Daily profit from active investments
$stmt = $db->prepare("SELECT COALESCE(SUM(daily_profit), 0) as total FROM user_investments WHERE user_id = ? AND status = 'active'");
$stmt->execute([$userId]);
$dailyProfit = (float)$stmt->fetch()['total'];

success([
    'wallet' => [
        'mainBalance' => (float)$wallet['main_balance'],
        'investmentBalance' => (float)$wallet['investment_balance'],
        'referralBalance' => (float)$wallet['referral_balance'],
        'bonusBalance' => (float)$wallet['bonus_balance'],
        'totalEarned' => (float)$wallet['earned'],
        'totalDeposited' => (float)$wallet['deposited'],
        'totalWithdrawn' => (float)$wallet['withdrawn'],
        'dailyProfit' => $dailyProfit,
    ],
    'stats' => [
        'pendingTasks' => $pendingTasks,
        'completedTasks' => $completedTasks,
        'activeInvestments' => $activeInvestments,
        'referralCount' => $referralCount,
        'todayTasks' => $todayTasks,
        'unreadNotif' => $unreadNotif,
    ],
    'recentTransactions' => $recentTx,
]);
