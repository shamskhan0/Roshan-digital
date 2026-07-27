<?php
require_once __DIR__ . '/config.php';

$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];

// Health check endpoint
if (empty($segments) || ($segments[0] === '' && count($segments) <= 1)) {
    success([
        'status' => 'ok',
        'app' => 'Roshan Digital API',
        'version' => '2.0.0',
        'php' => phpversion(),
    ]);
}

// Route to appropriate handler
$resource = $segments[0] ?? '';
$action = $segments[1] ?? '';

switch ($resource) {
    // === OTP ===
    case 'otp':
        require __DIR__ . '/handlers/otp.php';
        break;

    // === AUTH ===
    case 'auth':
        require __DIR__ . '/handlers/auth.php';
        break;

    // === SEED ===
    case 'seed':
    case 'auto-seed':
        require __DIR__ . '/handlers/seed.php';
        break;

    // === ADMIN (top-level: /api/admin/settings, etc.) ===
    case 'admin':
        require __DIR__ . '/handlers/admin.php';
        break;

    // === APP ROUTES (require userId in URL or body) ===
    case 'app':
        $appRoute = $segments[1] ?? '';
        $appAction = $segments[2] ?? '';
        $appExtra = $segments[3] ?? '';

        switch ($appRoute) {
            case 'dashboard':
                require __DIR__ . '/handlers/dashboard.php';
                break;
            case 'wallet':
                require __DIR__ . '/handlers/wallet.php';
                break;
            case 'user-tasks':
                require __DIR__ . '/handlers/tasks.php';
                break;
            case 'tasks':
                if ($appAction === 'complete') {
                    require __DIR__ . '/handlers/tasks.php';
                } else {
                    require __DIR__ . '/handlers/tasks.php';
                }
                break;
            case 'investment-plans':
                require __DIR__ . '/handlers/investments.php';
                break;
            case 'investments':
                require __DIR__ . '/handlers/investments.php';
                break;
            case 'calculator':
                require __DIR__ . '/handlers/investments.php';
                break;
            case 'deposits':
                require __DIR__ . '/handlers/deposits.php';
                break;
            case 'upload':
                require __DIR__ . '/handlers/upload.php';
                break;
            case 'withdrawals':
                require __DIR__ . '/handlers/withdrawals.php';
                break;
            case 'referrals':
                require __DIR__ . '/handlers/referrals.php';
                break;
            case 'notifications':
                require __DIR__ . '/handlers/notifications.php';
                break;
            case 'team':
                require __DIR__ . '/handlers/team.php';
                break;
            case 'history':
                require __DIR__ . '/handlers/history.php';
                break;
            case 'community':
                require __DIR__ . '/handlers/community.php';
                break;
            case 'comments':
                require __DIR__ . '/handlers/community.php';
                break;
            case 'admin':
                $adminAction = $segments[2] ?? '';
                if (in_array($adminAction, ['calculate-profits', 'profit-history', 'profit-settings'])) {
                    require __DIR__ . '/handlers/profit.php';
                } else {
                    require __DIR__ . '/handlers/admin.php';
                }
                break;
            case 'cron':
                $cronAction = $segments[2] ?? '';
                if ($cronAction === 'distribute-profits') {
                    require __DIR__ . '/handlers/profit.php';
                } else {
                    require __DIR__ . '/handlers/cron.php';
                }
                break;
            default:
                error('Not found', 404);
                break;
        }
        break;

    default:
        error('Not found', 404);
        break;
}
