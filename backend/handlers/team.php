<?php
// Team Handler - /api/app/team/:userId
$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

$userId = $segments[2] ?? '';
if (!$userId) error('userId required');

$stmt = $db->prepare("
    SELECT u.id, u.name, u.email, u.created_at as joined_at, r.reward
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ? AND r.status = 'approved'
    ORDER BY r.created_at DESC
");
$stmt->execute([$userId]);
$team = $stmt->fetchAll();

$result = [];
foreach ($team as $t) {
    $result[] = [
        'id' => $t['id'],
        'name' => $t['name'],
        'email' => $t['email'],
        'joinedAt' => $t['joined_at'],
        'reward' => (float)$t['reward'],
    ];
}

success(['team' => $result, 'count' => count($result)]);
