<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

require_once __DIR__ . '/../backend/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: update-panel.php?tab=profit-settings');
    exit;
}

$planId = $_POST['plan_id'] ?? '';
$dailyProfit = (float)($_POST['daily_profit'] ?? -1);

if (!$planId || $dailyProfit < 0) {
    header('Location: update-panel.php?tab=profit-settings&msg=' . urlencode('❌ Invalid data'));
    exit;
}

$db = getDB();

// Update plan
$db->prepare("UPDATE investment_plans SET daily_profit = ? WHERE id = ?")
    ->execute([$dailyProfit, $planId]);

// Update active investments using this plan
$db->prepare("UPDATE user_investments SET daily_profit = ? WHERE plan_id = ? AND status = 'active'")
    ->execute([$dailyProfit, $planId]);

// Get plan name
$stmt = $db->prepare("SELECT name FROM investment_plans WHERE id = ?");
$stmt->execute([$planId]);
$plan = $stmt->fetch();
$name = $plan['name'] ?? 'Unknown';

header('Location: update-panel.php?tab=profit-settings&msg=' . urlencode("✅ Profit rate updated for \"$name\" to PKR $dailyProfit/day"));
exit;
