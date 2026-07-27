<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$today = date('Y-m-d');
$processed = 0;
$skipped = 0;
$completed = 0;

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

    // Duplicate check
    $checkStmt = $db->prepare("SELECT id FROM profit_history WHERE user_id = ? AND investment_id = ? AND profit_date = ?");
    $checkStmt->execute([$userId, $invId, $today]);
    if ($checkStmt->fetch()) {
        $skipped++;
        continue;
    }

    // Wallet update
    $walletStmt = $db->prepare("SELECT * FROM wallets WHERE user_id = ?");
    $walletStmt->execute([$userId]);
    $wallet = $walletStmt->fetch();
    if (!$wallet) continue;

    $newBalance = (float)$wallet['balance'] + $profit;
    $newMainBalance = (float)$wallet['main_balance'] + $profit;

    $db->prepare("UPDATE wallets SET balance = ?, main_balance = ?, earned = earned + ? WHERE user_id = ?")
        ->execute([$newBalance, $newMainBalance, $profit, $userId]);

    // Investment update
    $newTotalProfit = (float)$inv['total_profit'] + $profit;
    $newDaysPassed = (int)$inv['days_passed'] + 1;
    $db->prepare("UPDATE user_investments SET total_profit = ?, days_passed = ? WHERE id = ?")
        ->execute([$newTotalProfit, $newDaysPassed, $invId]);

    // Profit history
    $db->prepare("INSERT INTO profit_history (user_id, investment_id, plan_name, profit_amount, profit_date, status, created_at) VALUES (?, ?, ?, ?, ?, 'distributed', NOW())")
        ->execute([$userId, $invId, $planName, $profit, $today]);

    // Transaction record
    $db->prepare("INSERT INTO transactions (id, user_id, type, amount, balance, detail, created_at) VALUES (?, ?, 'daily_profit', ?, ?, ?, NOW())")
        ->execute([generateId(), $userId, $profit, $newBalance, "Daily profit: $planName"]);

    // Notification
    $db->prepare("INSERT INTO notifications (id, user_id, title, message, type, read, created_at) VALUES (?, ?, ?, ?, 'profit', 0, NOW())")
        ->execute([generateId(), $userId, '💰 Daily Profit Credited!', "You received PKR $profit daily profit from \"$planName\". New balance: PKR $newBalance"]);

    $processed++;

    // Check completion
    if ($newDaysPassed >= (int)$inv['plan_duration']) {
        $db->prepare("UPDATE user_investments SET status = 'completed' WHERE id = ?")->execute([$invId]);
        $completed++;
    }
}

$msg = "✅ Profit distributed! Processed: $processed | Skipped: $skipped (already done today) | Completed: $completed investments finished.";
header('Location: update-panel.php?tab=profit-settings&msg=' . urlencode($msg));
exit;
