<?php
// Referrals Handler - /api/app/referrals/:userId
$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

$userId = $segments[2] ?? '';
if (!$userId) error('userId required');

// Get user's referral code
$stmt = $db->prepare("SELECT referral_code FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

// Get referrals with referred user info
$stmt = $db->prepare("
    SELECT r.*, u.name as referred_name, u.email as referred_email, u.verified as referred_verified, u.created_at as referred_joined
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
");
$stmt->execute([$userId]);
$referrals = $stmt->fetchAll();

$result = [];
$totalReward = 0;
foreach ($referrals as $r) {
    if ($r['status'] === 'approved') $totalReward += (float)$r['reward'];
    $result[] = [
        'id' => $r['id'],
        'referrerId' => $r['referrer_id'],
        'referredId' => $r['referred_id'],
        'reward' => (float)$r['reward'],
        'status' => $r['status'],
        'createdAt' => $r['created_at'],
        'referred' => [
            'name' => $r['referred_name'],
            'email' => $r['referred_email'],
            'verified' => (bool)$r['referred_verified'],
            'createdAt' => $r['referred_joined'],
        ]
    ];
}

success([
    'referralCode' => $user ? $user['referral_code'] : null,
    'referrals' => $result,
    'totalReward' => $totalReward,
    'count' => count($result),
]);
