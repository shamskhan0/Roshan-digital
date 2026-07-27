<?php
// Seed Handler - /api/seed, /api/auto-seed
$db = getDB();

// Seed tasks
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM tasks");
$stmt->execute();
$count = (int)$stmt->fetch()['cnt'];

if ($count === 0) {
    $tasks = [
        ['t1', 'Download App', 'Our Download App Install', 50, 'app'],
        ['t2', 'Watch Video', 'Watch a short video and submit a screenshot', 25, 'video'],
        ['t3', 'Follow Social Media', 'Follow our social media accounts', 30, 'social'],
        ['t4', 'Write a Review', 'on Google Play or App Store Write a Review', 40, 'review'],
        ['t5', 'Refer a Friend', 'Invite a friend to join our platform', 60, 'referral'],
        ['t6', 'Visit Website', 'Visit our website for 5 minutes', 15, 'visit'],
    ];
    $stmt = $db->prepare("INSERT INTO tasks (id, title, description, reward, category, active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())");
    foreach ($tasks as $t) {
        $stmt->execute($t);
    }
}

// Seed investment plans
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM investment_plans");
$stmt->execute();
$count = (int)$stmt->fetch()['cnt'];

if ($count === 0) {
    $plans = [
        ['p1', 'Starter Plan', 'Perfect for beginners', 1000, 50, 30],
        ['p2', 'Growth Plan', 'Steady returns for growing investors', 5000, 300, 30],
        ['p3', 'Premium Plan', 'High returns for serious investors', 15000, 1000, 30],
        ['p4', 'Elite Plan', 'Maximum returns for premium members', 50000, 4000, 30],
    ];
    $stmt = $db->prepare("INSERT INTO investment_plans (id, name, description, amount, daily_profit, duration, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())");
    foreach ($plans as $p) {
        $stmt->execute($p);
    }
}

success(['message' => 'Data seeded']);
