<?php
// Withdrawals Handler
$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// GET /api/app/withdrawals/:userId
if ($method === 'GET') {
    $userId = $segments[2] ?? '';
    if (!$userId) error('userId required');

    $stmt = $db->prepare("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
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
        ];
    }
    success(['withdrawals' => $result]);
}

// POST /api/app/withdrawals
if ($method === 'POST') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $amount = (float)($body['amount'] ?? 0);
    $method_ = $body['method'] ?? '';
    $accountName = $body['accountName'] ?? null;
    $accountNumber = $body['accountNumber'] ?? null;

    if (!$userId || !$amount || !$method_ || !$accountNumber) error('Required fields are incomplete');
    if (!getSettingBool('withdrawalsEnabled', true)) error('Withdrawals are disabled', 403);

    $minWithdrawal = (float)getSetting('minWithdrawal', '500');
    if ($amount < $minWithdrawal) error('Minimum withdrawal is ' . $minWithdrawal . ' PKR');

    $wallet = ensureWallet($userId);
    if ((float)$wallet['balance'] < $amount) error('Insufficient balance');

    $stmt = $db->prepare("INSERT INTO withdrawals (id, user_id, amount, method, account_name, account_number, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())");
    $stmt->execute([generateId(), $userId, $amount, $method_, $accountName, $accountNumber]);

    notify($userId, '📥 Withdrawal Request', 'Your ' . $amount . ' PKR withdrawal request submitted.', 'info');

    success(['message' => '✅ Withdrawal request submitted successfully.']);
}

error('Invalid route', 400);
