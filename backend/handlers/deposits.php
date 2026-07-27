<?php
// Deposits Handler
$segments = getUrlSegments();
$action = $segments[1] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// GET /api/app/deposits/:userId
if ($method === 'GET') {
    $userId = $segments[2] ?? '';
    if (!$userId) error('userId required');

    $stmt = $db->prepare("SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
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
        ];
    }
    success(['deposits' => $result]);
}

// POST /api/app/deposits
if ($method === 'POST') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $amount = (float)($body['amount'] ?? 0);
    $method_ = $body['method'] ?? '';
    $accountName = $body['accountName'] ?? null;
    $accountNumber = $body['accountNumber'] ?? null;
    $screenshot = $body['screenshot'] ?? null;

    if (!$userId || !$amount || !$method_) error('Required fields are incomplete');
    if (!getSettingBool('depositsEnabled', true)) error('Deposits are disabled', 403);

    $minDeposit = (float)getSetting('minDeposit', '100');
    $maxDeposit = (float)getSetting('maxDeposit', '500000');
    if ($amount < $minDeposit) error('Minimum deposit is ' . $minDeposit . ' PKR');
    if ($amount > $maxDeposit) error('Maximum deposit is ' . $maxDeposit . ' PKR');

    $stmt = $db->prepare("INSERT INTO deposits (id, user_id, amount, method, account_name, account_number, screenshot, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())");
    $stmt->execute([generateId(), $userId, $amount, $method_, $accountName, $accountNumber, $screenshot]);

    notify($userId, '📤 Deposit Request Submitted', 'Your ' . $amount . ' PKR deposit request submitted.', 'info');

    success([
        'deposit' => [
            'userId' => $userId,
            'amount' => $amount,
            'method' => $method_,
            'accountName' => $accountName,
            'accountNumber' => $accountNumber,
            'screenshot' => $screenshot,
            'status' => 'pending',
        ],
        'message' => '✅ Your Deposit request submitted successfully. Please wait for approval.'
    ]);
}

error('Invalid route', 400);
