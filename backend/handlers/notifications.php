<?php
// Notifications Handler
$segments = getUrlSegments();
$action = $segments[1] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// GET /api/app/notifications/:userId
if ($method === 'GET') {
    $userId = $segments[2] ?? '';
    if (!$userId) error('userId required');

    $stmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
    $stmt->execute([$userId]);
    $notifications = $stmt->fetchAll();

    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND `read` = 0");
    $stmt->execute([$userId]);
    $unread = (int)$stmt->fetch()['cnt'];

    $result = [];
    foreach ($notifications as $n) {
        $result[] = [
            'id' => $n['id'],
            'userId' => $n['user_id'],
            'title' => $n['title'],
            'message' => $n['message'],
            'type' => $n['type'],
            'read' => (bool)$n['read'],
            'createdAt' => $n['created_at'],
        ];
    }
    success(['notifications' => $result, 'unread' => $unread]);
}

// POST /api/app/notifications/read
if ($method === 'POST' && $action === 'notifications') {
    $body = getJsonBody();
    $notificationId = $body['notificationId'] ?? '';

    if ($notificationId) {
        $stmt = $db->prepare("UPDATE notifications SET `read` = 1 WHERE id = ?");
        $stmt->execute([$notificationId]);
        success();
    }

    // POST /api/app/notifications/read-all
    $userId = $body['userId'] ?? '';
    if ($userId) {
        $stmt = $db->prepare("UPDATE notifications SET `read` = 1 WHERE user_id = ? AND `read` = 0");
        $stmt->execute([$userId]);
        success();
    }

    error('notificationId or userId required');
}

error('Invalid route', 400);
