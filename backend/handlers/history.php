<?php
// History Handler - /api/app/history/:userId
$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

$userId = $segments[2] ?? '';
if (!$userId) error('userId required');

// Transactions
$stmt = $db->prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC");
$stmt->execute([$userId]);
$transactions = $stmt->fetchAll();

// Deposits
$stmt = $db->prepare("SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC");
$stmt->execute([$userId]);
$deposits = $stmt->fetchAll();

// Withdrawals
$stmt = $db->prepare("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC");
$stmt->execute([$userId]);
$withdrawals = $stmt->fetchAll();

// Investments
$stmt = $db->prepare("
    SELECT ui.*, ip.name as plan_name
    FROM user_investments ui
    JOIN investment_plans ip ON ui.plan_id = ip.id
    WHERE ui.user_id = ?
    ORDER BY ui.created_at DESC
");
$stmt->execute([$userId]);
$investments = $stmt->fetchAll();

// Referrals
$stmt = $db->prepare("
    SELECT r.*, u.name as referred_name
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
");
$stmt->execute([$userId]);
$referrals = $stmt->fetchAll();

// User tasks
$stmt = $db->prepare("
    SELECT ut.*, t.title as task_title
    FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE ut.user_id = ?
    ORDER BY ut.created_at DESC
");
$stmt->execute([$userId]);
$tasks = $stmt->fetchAll();

// Login history
$stmt = $db->prepare("SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
$stmt->execute([$userId]);
$loginHistory = $stmt->fetchAll();

success([
    'deposits' => $deposits,
    'withdrawals' => $withdrawals,
    'investments' => $investments,
    'referrals' => $referrals,
    'tasks' => $tasks,
    'transactions' => $transactions,
    'loginHistory' => $loginHistory,
]);
