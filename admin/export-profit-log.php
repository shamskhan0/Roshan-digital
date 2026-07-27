<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

require_once __DIR__ . '/../backend/config.php';

$db = getDB();
$dateFilter = $_GET['date'] ?? '';

$where = '1=1';
$params = [];
if ($dateFilter) {
    $where .= ' AND ph.profit_date = ?';
    $params[] = $dateFilter;
}

$stmt = $db->prepare("
    SELECT ph.profit_date, u.name as user_name, u.email as user_email, ph.plan_name, ph.profit_amount, ph.status, ph.created_at
    FROM profit_history ph
    JOIN users u ON ph.user_id = u.id
    WHERE $where
    ORDER BY ph.created_at DESC
");
$stmt->execute($params);
$records = $stmt->fetchAll();

$csv = "Date,User Name,User Email,Plan,Profit Amount (PKR),Status,Distributed At\n";
foreach ($records as $r) {
    $csv .= '"' . $r['profit_date'] . '",'
          . '"' . ($r['user_name'] ?? '') . '",'
          . '"' . ($r['user_email'] ?? '') . '",'
          . '"' . ($r['plan_name'] ?? '') . '",'
          . '"' . $r['profit_amount'] . '",'
          . '"' . $r['status'] . '",'
          . '"' . $r['created_at'] . '"'
          . "\n";
}

header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="profit-log-' . date('Y-m-d') . '.csv"');
echo $csv;
exit;
