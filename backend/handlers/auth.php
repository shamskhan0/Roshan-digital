<?php
// Auth Handler - Register, Login, Verify, Reset Password
$segments = getUrlSegments();
$action = $segments[1] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') error('Method not allowed', 405);

$db = getDB();
$body = getJsonBody();

switch ($action) {
    case 'register':
        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        $name = $body['name'] ?? '';
        $phone = $body['phone'] ?? null;
        $referralCode = $body['referralCode'] ?? null;

        if (!$email || !$password) error('Email and password are required');

        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) error('Email already registered', 409);

        $userId = generateId();
        $userReferralCode = strtoupper(substr(md5($userId . time()), 0, 8));
        $userName = $name ?: explode('@', $email)[0];

        $stmt = $db->prepare("INSERT INTO users (id, email, name, phone, password, role, referral_code, referred_by, active, verified, created_at) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, 1, 0, NOW())");
        $stmt->execute([$userId, $email, $userName, $phone, $password, $userReferralCode, $referralCode]);

        // Create wallet
        $walletId = generateId();
        $stmt = $db->prepare("INSERT INTO wallets (id, user_id, balance, earned, deposited, withdrawn, main_balance, investment_balance, referral_balance, bonus_balance) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)");
        $stmt->execute([$walletId, $userId]);

        success([
            'user' => [
                'id' => $userId,
                'email' => $email,
                'name' => $userName,
                'role' => 'user',
                'referralCode' => $userReferralCode,
                'avatar' => null,
                'phone' => $phone,
                'verified' => false,
            ]
        ]);
        break;

    case 'verify-account':
        $userId = $body['userId'] ?? '';
        if (!$userId) error('userId is required');

        $stmt = $db->prepare("UPDATE users SET verified = 1 WHERE id = ?");
        $stmt->execute([$userId]);

        // Handle referral
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user && $user['referred_by']) {
            $stmt = $db->prepare("SELECT id FROM users WHERE referral_code = ?");
            $stmt->execute([$user['referred_by']]);
            $referrer = $stmt->fetch();

            if ($referrer) {
                $stmt = $db->prepare("SELECT id FROM referrals WHERE referrer_id = ? AND referred_id = ?");
                $stmt->execute([$referrer['id'], $userId]);
                if (!$stmt->fetch()) {
                    $reward = (float)getSetting('referralReward', '100');
                    $refId = generateId();
                    $stmt = $db->prepare("INSERT INTO referrals (id, referrer_id, referred_id, reward, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())");
                    $stmt->execute([$refId, $referrer['id'], $userId, $reward]);
                }
            }
        }

        success();
        break;

    case 'login':
        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';

        if (!$email || !$password) error('Email and password are required');

        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || $user['password'] !== $password) error('Invalid email or password', 401);
        if (!$user['active']) error('Your account is deactivated', 403);

        // Record login
        $stmt = $db->prepare("INSERT INTO login_history (id, user_id, status, browser, device, ip, created_at) VALUES (?, ?, 'success', 'Web', 'Browser', '0.0.0.0', NOW())");
        $stmt->execute([generateId(), $user['id']]);

        success([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role'],
                'referralCode' => $user['referral_code'],
                'avatar' => $user['avatar'],
                'phone' => $user['phone'],
                'verified' => (bool)$user['verified'],
            ]
        ]);
        break;

    case 'forgot-password':
        $email = $body['email'] ?? '';
        if (!$email) error('Email is required');

        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if (!$stmt->fetch()) error('Email not registered', 404);

        $code = generateOTP();
        $expiresAt = date('Y-m-d H:i:s', time() + 300);

        $stmt = $db->prepare("INSERT INTO otps (id, target, code, purpose, expires_at, used, created_at) VALUES (?, ?, ?, 'password-reset', ?, 0, NOW())");
        $stmt->execute([generateId(), $email, $code, $expiresAt]);

        success(['message' => 'OTP sent to your email', 'otp' => $code]);
        break;

    case 'reset-password':
        $email = $body['email'] ?? '';
        $code = $body['code'] ?? '';
        $newPassword = $body['newPassword'] ?? '';

        if (!$email || !$code || !$newPassword) error('All fields are required');

        $stmt = $db->prepare("SELECT * FROM otps WHERE target = ? AND purpose = 'password-reset' AND used = 0 ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$email]);
        $otp = $stmt->fetch();

        if (!$otp) error('OTP not found', 404);
        if (!isOTPValid($otp['expires_at'])) error('OTP has expired', 410);
        if ($otp['code'] !== $code) error('Invalid OTP');

        $stmt = $db->prepare("UPDATE otps SET used = 1 WHERE id = ?");
        $stmt->execute([$otp['id']]);

        $stmt = $db->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->execute([$newPassword, $email]);

        success(['message' => 'Password changed successfully']);
        break;

    case 'update-profile':
        $userId = $body['userId'] ?? '';
        if (!$userId) error('userId is required');

        $updates = [];
        $params = [];
        if (isset($body['name'])) { $updates[] = 'name = ?'; $params[] = $body['name']; }
        if (isset($body['phone'])) { $updates[] = 'phone = ?'; $params[] = $body['phone']; }
        if (isset($body['avatar'])) { $updates[] = 'avatar = ?'; $params[] = $body['avatar']; }

        if (!empty($updates)) {
            $params[] = $userId;
            $stmt = $db->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?");
            $stmt->execute($params);
        }

        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        success([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role'],
                'referralCode' => $user['referral_code'],
                'avatar' => $user['avatar'],
                'phone' => $user['phone'],
                'verified' => (bool)$user['verified'],
            ]
        ]);
        break;

    default:
        error('Invalid action', 400);
        break;
}
