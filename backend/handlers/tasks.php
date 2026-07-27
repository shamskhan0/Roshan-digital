<?php
// Tasks Handler - /api/app/user-tasks/:userId, /api/app/tasks/complete
$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Route: GET /api/app/user-tasks/:userId
if ($method === 'GET' && $segments[1] === 'user-tasks') {
    $userId = $segments[2] ?? '';
    if (!$userId) error('userId required');

    $stmt = $db->prepare("SELECT * FROM tasks WHERE active = 1");
    $stmt->execute();
    $tasks = $stmt->fetchAll();

    $stmt = $db->prepare("SELECT * FROM user_tasks WHERE user_id = ?");
    $stmt->execute([$userId]);
    $userTasks = $stmt->fetchAll();
    $utMap = [];
    foreach ($userTasks as $ut) { $utMap[$ut['task_id']] = $ut; }

    $list = [];
    foreach ($tasks as $t) {
        $status = isset($utMap[$t['id']]) ? $utMap[$t['id']]['status'] : 'available';
        $list[] = [
            'id' => $t['id'],
            'title' => $t['title'],
            'description' => $t['description'],
            'reward' => (float)$t['reward'],
            'category' => $t['category'],
            'link' => $t['link'],
            'duration' => (int)$t['duration'],
            'requireVisit' => (bool)$t['require_visit'],
            'status' => $status,
        ];
    }

    $completedCount = 0;
    foreach ($userTasks as $ut) {
        if ($ut['status'] === 'completed') $completedCount++;
    }

    success(['tasks' => $list, 'completed' => $completedCount, 'total' => count($tasks)]);
}

// Route: POST /api/app/tasks/complete
if ($method === 'POST' && $segments[1] === 'tasks' && $segments[2] === 'complete') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $taskId = $body['taskId'] ?? '';
    $viewTime = $body['viewTime'] ?? 0;

    if (!$userId || !$taskId) error('userId and taskId required');

    // Check if already completed
    $stmt = $db->prepare("SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ?");
    $stmt->execute([$userId, $taskId]);
    $existing = $stmt->fetch();
    if ($existing && $existing['status'] === 'completed') error('Task already completed', 409);

    // Get task
    $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    if (!$task) error('Task not found', 404);

    // Check if tasks enabled
    if (!getSettingBool('tasksEnabled', true)) error('Tasks are disabled', 403);

    // Check view time requirements
    if ($task['require_visit'] && $task['duration'] > 0) {
        $viewSeconds = (int)$viewTime;
        if ($viewSeconds < $task['duration']) {
            error('You must watch for at least ' . $task['duration'] . ' seconds before completing', 403);
        }
    }
    if ($task['link'] && $task['duration'] > 0) {
        $viewSeconds = (int)$viewTime;
        if ($viewSeconds < $task['duration']) {
            error('You must watch for at least ' . $task['duration'] . ' seconds before completing', 403);
        }
    }

    // Upsert user task
    if ($existing) {
        $stmt = $db->prepare("UPDATE user_tasks SET status = 'completed', completed_at = NOW() WHERE user_id = ? AND task_id = ?");
        $stmt->execute([$userId, $taskId]);
    } else {
        $stmt = $db->prepare("INSERT INTO user_tasks (id, user_id, task_id, status, completed_at, created_at) VALUES (?, ?, ?, 'completed', NOW(), NOW())");
        $stmt->execute([generateId(), $userId, $taskId]);
    }

    // Credit reward
    $wallet = ensureWallet($userId);
    $newBalance = (float)$wallet['balance'] + (float)$task['reward'];

    $stmt = $db->prepare("UPDATE wallets SET balance = ?, main_balance = ?, earned = earned + ? WHERE user_id = ?");
    $stmt->execute([$newBalance, $newBalance, $task['reward'], $userId]);

    recordTx($userId, 'task_reward', $task['reward'], $newBalance, 'Task completed: ' . $task['title']);
    notify($userId, 'Task Completed!', 'You received ' . $task['reward'] . ' PKR reward.', 'reward');

    success(['reward' => (float)$task['reward'], 'balance' => $newBalance]);
}

error('Invalid route', 400);
