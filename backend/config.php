<?php
// =============================================
// Database Configuration
// Supports Railway (env vars) + InfinityFree (hardcoded fallback)
// =============================================

// Use environment variables if available (Railway/Render), otherwise use TiDB Cloud defaults
define('DB_HOST', getenv('DB_HOST') ?: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com');
define('DB_NAME', getenv('DB_NAME') ?: 'roshan_digital');
define('DB_USER', getenv('DB_USER') ?: '2pHFbEBTcg1dymG.root');
define('DB_PASS', getenv('DB_PASS') ?: 'SiUK7wx9hlQnpn8u');
define('DB_PORT', getenv('DB_PORT') ?: '4000');

// Upload settings
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', '/uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB

// CORS headers — allow all origins for deployment
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database connection
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

// Helper: Generate UUID
function generateId() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Helper: Generate OTP
function generateOTP() {
    return strval(mt_rand(100000, 999999));
}

// Helper: Check OTP expiry
function isOTPValid($expiresAt) {
    return time() < strtotime($expiresAt);
}

// Helper: Get setting
function getSetting($key, $fallback = '') {
    $db = getDB();
    $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    return $row ? $row['setting_value'] : $fallback;
}

// Helper: Get setting as boolean
function getSettingBool($key, $fallback = true) {
    $val = getSetting($key, $fallback ? 'true' : 'false');
    return $val === 'true';
}

// Helper: Record transaction
function recordTx($userId, $type, $amount, $balance, $detail = '') {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO transactions (id, user_id, type, amount, balance, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([generateId(), $userId, $type, $amount, $balance, $detail]);
}

// Helper: Send notification
function notify($userId, $title, $message, $type = 'info') {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO notifications (id, user_id, title, message, type, read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())");
    $stmt->execute([generateId(), $userId, $title, $message, $type]);
}

// Helper: Ensure wallet exists
function ensureWallet($userId) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM wallets WHERE user_id = ?");
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch();

    if (!$wallet) {
        $id = generateId();
        $stmt = $db->prepare("INSERT INTO wallets (id, user_id, balance, earned, deposited, withdrawn, main_balance, investment_balance, referral_balance, bonus_balance) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)");
        $stmt->execute([$id, $userId]);
        $stmt = $db->prepare("SELECT * FROM wallets WHERE user_id = ?");
        $stmt->execute([$userId]);
        $wallet = $stmt->fetch();
    }

    if ($wallet['main_balance'] == 0 && $wallet['balance'] > 0) {
        $stmt = $db->prepare("UPDATE wallets SET main_balance = balance WHERE user_id = ?");
        $stmt->execute([$userId]);
        $wallet['main_balance'] = $wallet['balance'];
    }

    return $wallet;
}

// Helper: Get JSON body
function getJsonBody() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

// Helper: Get URL segments
function getUrlSegments() {
    $uri = $_SERVER['REQUEST_URI'];
    $path = parse_url($uri, PHP_URL_PATH);
    // Remove /api/ prefix
    $path = preg_replace('#^/api/#', '', $path);
    $path = trim($path, '/');
    return $path ? explode('/', $path) : [];
}

// Helper: Get segment by index
function getSegment($index, $default = null) {
    $segments = getUrlSegments();
    return isset($segments[$index]) ? $segments[$index] : $default;
}

// Helper: Success response
function success($data = []) {
    echo json_encode(array_merge(['ok' => true], $data));
    exit;
}

// Helper: Error response
function error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}
