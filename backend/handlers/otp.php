<?php
// OTP Handler - /api/otp/send, /api/otp/verify
$segments = getUrlSegments();
$action = $segments[1] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') error('Method not allowed', 405);

if ($action === 'send') {
    $body = getJsonBody();
    $target = $body['target'] ?? '';
    $purpose = $body['purpose'] ?? '';

    if (!$target || !$purpose) error('Required fields are incomplete');

    $db = getDB();
    $code = generateOTP();
    $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutes

    $stmt = $db->prepare("INSERT INTO otps (id, target, code, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())");
    $stmt->execute([generateId(), $target, $code, $purpose, $expiresAt]);

    success(['message' => 'OTP sent successfully', 'otp' => $code]);
}

if ($action === 'verify') {
    $body = getJsonBody();
    $target = $body['target'] ?? '';
    $code = $body['code'] ?? '';
    $purpose = $body['purpose'] ?? '';

    if (!$target || !$code || !$purpose) error('Required fields are incomplete');

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM otps WHERE target = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$target, $purpose]);
    $otp = $stmt->fetch();

    if (!$otp) error('OTP not found', 404);
    if (!isOTPValid($otp['expires_at'])) error('OTP has expired', 410);
    if ($otp['code'] !== $code) error('Invalid OTP');

    $stmt = $db->prepare("UPDATE otps SET used = 1 WHERE id = ?");
    $stmt->execute([$otp['id']]);

    success(['message' => 'OTP verified']);
}

error('Invalid action', 400);
