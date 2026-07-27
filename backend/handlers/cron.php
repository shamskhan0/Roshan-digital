<?php
// Cron Handler - /api/app/cron/distribute-profits
$segments = getUrlSegments();
$action = $segments[2] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($action !== 'distribute-profits') error('Invalid cron route', 400);

// Auth check
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$cronSecret = getSetting('cronSecret', 'roshan-digital-cron-2024');
if ($authHeader !== 'Bearer ' . $cronSecret) error('Unauthorized', 401);

// Get active investments
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
        notify($inv['user_id'], '🎉 Investment Completed!', '"' . $inv['plan_name'] . '" completed. Total profit: ' . ($inv['total_profit'] + $inv['daily_profit']) . ' PKR', 'investment');
        $completed++;
    } else {
        notify($inv['user_id'], '💰 Daily Profit', 'You received ' . $inv['daily_profit'] . ' daily profit credited.', 'profit');
    }
    $processed++;
}

success([
    'ok' => true,
    'processed' => $processed,
    'completed' => $completed,
    'timestamp' => date('c'),
]);
