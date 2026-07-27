<?php
require_once __DIR__ . '/auth.php';

if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    adminLogout();
}

if (!requireAdmin()) {
    renderLoginForm($_POST ? 'Invalid email or password' : '');
}

$db = getDB();
$version = json_decode(file_get_contents(__DIR__ . '/../version.json'), true);

// Get stats
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM updates");
$stmt->execute();
$totalUpdates = (int)$stmt->fetch()['cnt'];

$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM backup_logs");
$stmt->execute();
$totalBackups = (int)$stmt->fetch()['cnt'];

$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM migration_logs");
$stmt->execute();
$totalMigrations = (int)$stmt->fetch()['cnt'];

// Disk usage
$uploadDir = __DIR__ . '/../uploads/';
$backupDir = __DIR__ . '/../backup/';
$uploadSize = is_dir($uploadDir) ? exec("du -sb $uploadDir 2>/dev/null | cut -f1") : 0;
$backupSize = is_dir($backupDir) ? exec("du -sb $backupDir 2>/dev/null | cut -f1") : 0;

function formatBytes($bytes) {
    $bytes = (int)$bytes;
    if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576) return round($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024) return round($bytes / 1024, 2) . ' KB';
    return $bytes . ' B';
}

$success = $_GET['msg'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Update Panel — Roshan Digital</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

        .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 20px; color: #f8fafc; display: flex; align-items: center; gap: 10px; }
        .header-right { display: flex; align-items: center; gap: 16px; }
        .header-right span { color: #94a3b8; font-size: 13px; }
        .logout-btn { background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; cursor: pointer; }
        .logout-btn:hover { background: #991b1b; color: white; }

        .container { max-width: 1200px; margin: 0 auto; padding: 32px; }

        .success { background: #14532d; color: #86efac; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #166534; font-size: 14px; }
        .error-msg { background: #450a0a; color: #fca5a5; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #7f1d1d; font-size: 14px; }

        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; }
        .stat-card h3 { color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .stat-card .value { color: #f8fafc; font-size: 28px; font-weight: 700; }
        .stat-card .sub { color: #64748b; font-size: 12px; margin-top: 4px; }

        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; margin-bottom: 20px; }
        .card h2 { color: #f8fafc; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .card p { color: #94a3b8; font-size: 14px; margin-bottom: 16px; line-height: 1.6; }

        .version-badge { display: inline-block; background: #6366f1; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
        .version-badge.green { background: #16a34a; }
        .version-badge.yellow { background: #ca8a04; }

        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; transition: all 0.2s; }
        .btn-blue { background: #6366f1; color: white; }
        .btn-blue:hover { background: #4f46e5; }
        .btn-green { background: #16a34a; color: white; }
        .btn-green:hover { background: #15803d; }
        .btn-yellow { background: #ca8a04; color: white; }
        .btn-yellow:hover { background: #a16207; }
        .btn-red { background: #dc2626; color: white; }
        .btn-red:hover { background: #b91c1c; }
        .btn-outline { background: transparent; border: 1px solid #475569; color: #cbd5e1; }
        .btn-outline:hover { background: #334155; }
        .btn-group { display: flex; gap: 12px; flex-wrap: wrap; }

        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; color: #cbd5e1; font-size: 13px; margin-bottom: 6px; font-weight: 500; }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; font-size: 14px; outline: none; }
        .form-group input:focus, .form-group textarea:focus { border-color: #6366f1; }
        .form-group textarea { min-height: 80px; resize: vertical; font-family: inherit; }
        .form-group input[type="file"] { padding: 8px; }

        .file-drop { border: 2px dashed #475569; border-radius: 12px; padding: 40px 20px; text-align: center; color: #94a3b8; cursor: pointer; transition: border-color 0.2s; }
        .file-drop:hover { border-color: #6366f1; }
        .file-drop input { display: none; }

        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .info-row .label { color: #94a3b8; }
        .info-row .val { color: #f8fafc; font-weight: 500; }

        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { text-align: left; color: #94a3b8; font-weight: 500; padding: 12px 16px; border-bottom: 1px solid #334155; }
        td { padding: 12px 16px; border-bottom: 1px solid #1e293b; }
        tr:hover td { background: #0f172a; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .badge-green { background: #14532d; color: #86efac; }
        .badge-red { background: #450a0a; color: #fca5a5; }
        .badge-yellow { background: #422006; color: #fde047; }

        .tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 1px solid #334155; }
        .tab { padding: 12px 20px; color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab:hover { color: #e2e8f0; }
        .tab.active { color: #6366f1; border-bottom-color: #6366f1; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

        footer { text-align: center; color: #475569; font-size: 12px; padding: 24px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Roshan Digital — Update Panel</h1>
        <div class="header-right">
            <span>👤 <?= htmlspecialchars($_SESSION['admin_name'] ?? 'Admin') ?></span>
            <a href="?action=logout" class="logout-btn">Logout</a>
        </div>
    </div>

    <div class="container">
        <?php if ($success): ?>
            <div class="success">✅ <?= htmlspecialchars($success) ?></div>
        <?php endif; ?>

        <!-- Stats -->
        <div class="grid">
            <div class="stat-card">
                <h3>Current Version</h3>
                <div class="value"><?= htmlspecialchars($version['version']) ?></div>
                <div class="sub">Database: v<?= htmlspecialchars($version['database_version']) ?></div>
            </div>
            <div class="stat-card">
                <h3>Total Updates</h3>
                <div class="value"><?= $totalUpdates ?></div>
                <div class="sub">Applied to production</div>
            </div>
            <div class="stat-card">
                <h3>Backups</h3>
                <div class="value"><?= $totalBackups ?></div>
                <div class="sub"><?= formatBytes($backupSize) ?> used</div>
            </div>
            <div class="stat-card">
                <h3>Migrations</h3>
                <div class="value"><?= $totalMigrations ?></div>
                <div class="sub"><?= formatBytes($uploadSize) ?> uploads</div>
            </div>
        </div>

        <!-- Tabs -->
        <?php $activeTab = $_GET['tab'] ?? 'overview'; ?>
        <div class="tabs">
            <a href="?tab=overview" class="tab <?= $activeTab === 'overview' ? 'active' : '' ?>">📊 Overview</a>
            <a href="?tab=backup" class="tab <?= $activeTab === 'backup' ? 'active' : '' ?>">💾 Backup</a>
            <a href="?tab=update" class="tab <?= $activeTab === 'update' ? 'active' : '' ?>">📦 Upload Update</a>
            <a href="?tab=migration" class="tab <?= $activeTab === 'migration' ? 'active' : '' ?>">🔄 Migrations</a>
            <a href="?tab=history" class="tab <?= $activeTab === 'history' ? 'active' : '' ?>">📜 History</a>
            <a href="?tab=settings" class="tab <?= $activeTab === 'settings' ? 'active' : '' ?>">⚙️ Version Info</a>
            <a href="?tab=profit-settings" class="tab <?= $activeTab === 'profit-settings' ? 'active' : '' ?>">💰 Profit Plans</a>
            <a href="?tab=profit-history" class="tab <?= $activeTab === 'profit-history' ? 'active' : '' ?>">📈 Profit History</a>
        </div>

        <?php if ($activeTab === 'overview'): ?>
        <!-- Overview -->
        <div class="two-col">
            <div class="card">
                <h2>📋 Version Info</h2>
                <div class="info-row"><span class="label">App Name</span><span class="val"><?= htmlspecialchars($version['name']) ?></span></div>
                <div class="info-row"><span class="label">Version</span><span class="val"><span class="version-badge">v<?= htmlspecialchars($version['version']) ?></span></span></div>
                <div class="info-row"><span class="label">Database</span><span class="val"><span class="version-badge green">v<?= htmlspecialchars($version['database_version']) ?></span></span></div>
                <div class="info-row"><span class="label">Release Date</span><span class="val"><?= htmlspecialchars($version['release_date'] ?? 'N/A') ?></span></div>
                <div class="info-row"><span class="label">PHP Version</span><span class="val"><?= htmlspecialchars($version['php_version'] ?? '8.x') ?></span></div>
            </div>
            <div class="card">
                <h2>🛠 Quick Actions</h2>
                <p>Click an action below to manage your deployment:</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <a href="?tab=backup" class="btn btn-green">💾 Create New Backup</a>
                    <a href="?tab=update" class="btn btn-blue">📦 Upload New Update</a>
                    <a href="?tab=migration" class="btn btn-yellow">🔄 Run Migration</a>
                    <a href="export-db.php" class="btn btn-outline">📥 Export Database SQL</a>
                </div>
            </div>
        </div>

        <?php elseif ($activeTab === 'backup'): ?>
        <!-- Backup -->
        <div class="card">
            <h2>💾 Create Backup</h2>
            <p>Backs up your database (all tables) and uploads it as a downloadable SQL file. You can also back up your files.</p>
            <div class="btn-group">
                <a href="backup.php?type=db" class="btn btn-green" onclick="return confirm('Create a database backup now?')">💾 Database Backup</a>
                <a href="backup.php?type=files" class="btn btn-blue" onclick="return confirm('Backup all uploaded files?')">📁 Files Backup</a>
                <a href="backup.php?type=full" class="btn btn-yellow" onclick="return confirm('Full backup (database + files)?')">🔒 Full Backup</a>
            </div>
        </div>

        <div class="card">
            <h2>📥 Download Previous Backups</h2>
            <?php
            $backupDir = __DIR__ . '/../backup/files/';
            if (is_dir($backupDir)) {
                $dirs = array_filter(scandir($backupDir), fn($d) => $d !== '.' && $d !== '..' && is_dir($backupDir . $d));
                rsort($dirs);

                if (empty($dirs)) {
                    echo '<p>No backups yet. Create your first backup above!</p>';
                } else {
                    echo '<table><thead><tr><th>Date</th><th>Size</th><th>Action</th></tr></thead><tbody>';
                    foreach (array_slice($dirs, 0, 20) as $d) {
                        $files = glob($backupDir . $d . '/*.*');
                        $size = 0;
                        foreach ($files as $f) $size += filesize($f);
                        echo '<tr>';
                        echo '<td>' . htmlspecialchars($d) . '</td>';
                        echo '<td>' . formatBytes($size) . '</td>';
                        echo '<td><a href="download-backup.php?date=' . urlencode($d) . '" class="btn btn-outline" style="padding:6px 12px;font-size:12px;">📥 Download</a></td>';
                        echo '</tr>';
                    }
                    echo '</tbody></table>';
                }
            } else {
                echo '<p>No backups directory found.</p>';
            }
            ?>
        </div>

        <?php elseif ($activeTab === 'update'): ?>
        <!-- Upload Update -->
        <div class="card">
            <h2>📦 Upload New Update</h2>
            <p>Upload a ZIP file containing updated PHP files, frontend build, or migration SQL. The system will extract and apply changes.</p>
            <form action="upload-update.php" method="POST" enctype="multipart/form-data">
                <div class="two-col">
                    <div>
                        <div class="form-group">
                            <label>Version Number</label>
                            <input type="text" name="version" placeholder="e.g. 1.1.0" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea name="description" placeholder="What's new in this update?"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Update Type</label>
                            <select name="update_type">
                                <option value="files">📁 Files Only (PHP/Frontend)</option>
                                <option value="migration">🔄 Database Migration Only</option>
                                <option value="full">🔒 Full Update (Files + Migration)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <div class="form-group">
                            <label>Upload ZIP File</label>
                            <div class="file-drop" onclick="this.querySelector('input').click()">
                                <input type="file" name="update_file" accept=".zip,.sql" required onchange="this.parentElement.innerHTML='<p>✅ '+this.files[0].name+'</p>'">
                                <p>📁 Click to select ZIP or SQL file<br><small>Max 50MB</small></p>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="create_backup" value="1" checked> Create backup before applying
                            </label>
                        </div>
                        <button type="submit" class="btn btn-blue" style="width:100%">🚀 Upload & Apply Update</button>
                    </div>
                </div>
            </form>
        </div>

        <?php elseif ($activeTab === 'migration'): ?>
        <!-- Migrations -->
        <div class="card">
            <h2>🔄 Database Migrations</h2>
            <p>Migrations safely alter your database schema. Upload a SQL file or run a pending migration.</p>

            <form action="migration.php" method="POST" enctype="multipart/form-data" style="margin-bottom: 20px;">
                <div class="two-col">
                    <div class="form-group">
                        <label>Migration SQL File</label>
                        <input type="file" name="migration_file" accept=".sql" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" name="description" placeholder="e.g. Add phone verification column">
                    </div>
                </div>
                <button type="submit" class="btn btn-yellow">🔄 Run Migration</button>
            </form>

            <!-- Pending Migrations -->
            <h3 style="color:#94a3b8;font-size:14px;margin-bottom:12px;">📁 Migrations Folder:</h3>
            <?php
            $migDir = __DIR__ . '/../migrations/';
            if (is_dir($migDir)) {
                $files = glob($migDir . '*.sql');
                if (empty($files)) {
                    echo '<p style="color:#64748b;font-size:13px;">No migration files found. Upload one above.</p>';
                } else {
                    echo '<table><thead><tr><th>File</th><th>Size</th><th>Action</th></tr></thead><tbody>';
                    foreach ($files as $f) {
                        $name = basename($f);
                        echo '<tr>';
                        echo '<td>' . htmlspecialchars($name) . '</td>';
                        echo '<td>' . formatBytes(filesize($f)) . '</td>';
                        echo '<td><a href="migration.php?file=' . urlencode($name) . '" class="btn btn-yellow" style="padding:6px 12px;font-size:12px;" onclick="return confirm(\'Run this migration? This will alter the database.\')">▶ Run</a></td>';
                        echo '</tr>';
                    }
                    echo '</tbody></table>';
                }
            }
            ?>
        </div>

        <?php elseif ($activeTab === 'history'): ?>
        <!-- History -->
        <div class="two-col">
            <div class="card">
                <h2>📜 Update History</h2>
                <?php
                $stmt = $db->prepare("SELECT * FROM updates ORDER BY created_at DESC LIMIT 50");
                $stmt->execute();
                $updates = $stmt->fetchAll();

                if (empty($updates)) {
                    echo '<p>No updates recorded yet.</p>';
                } else {
                    echo '<table><thead><tr><th>Version</th><th>Description</th><th>Status</th><th>Date</th></tr></thead><tbody>';
                    foreach ($updates as $u) {
                        $badgeClass = match($u['status']) { 'completed' => 'badge-green', 'failed' => 'badge-red', default => 'badge-yellow' };
                        echo '<tr>';
                        echo '<td><span class="version-badge">v' . htmlspecialchars($u['version']) . '</span></td>';
                        echo '<td>' . htmlspecialchars($u['description'] ?? '-') . '</td>';
                        echo '<td><span class="badge ' . $badgeClass . '">' . htmlspecialchars($u['status']) . '</span></td>';
                        echo '<td>' . htmlspecialchars($u['created_at']) . '</td>';
                        echo '</tr>';
                    }
                    echo '</tbody></table>';
                }
                ?>
            </div>

            <div class="card">
                <h2>📦 Migration History</h2>
                <?php
                $stmt = $db->prepare("SELECT * FROM migration_logs ORDER BY created_at DESC LIMIT 50");
                $stmt->execute();
                $migrations = $stmt->fetchAll();

                if (empty($migrations)) {
                    echo '<p>No migrations run yet.</p>';
                } else {
                    echo '<table><thead><tr><th>File</th><th>Tables</th><th>Status</th><th>Date</th></tr></thead><tbody>';
                    foreach ($migrations as $m) {
                        $badgeClass = $m['status'] === 'success' ? 'badge-green' : 'badge-red';
                        echo '<tr>';
                        echo '<td>' . htmlspecialchars($m['migration_file']) . '</td>';
                        echo '<td>' . htmlspecialchars($m['tables_affected'] ?? '-') . '</td>';
                        echo '<td><span class="badge ' . $badgeClass . '">' . htmlspecialchars($m['status']) . '</span></td>';
                        echo '<td>' . htmlspecialchars($m['created_at']) . '</td>';
                        echo '</tr>';
                    }
                    echo '</tbody></table>';
                }
                ?>
            </div>
        </div>

        <div class="card">
            <h2>💾 Backup History</h2>
            <?php
            $stmt = $db->prepare("SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 20");
            $stmt->execute();
            $backups = $stmt->fetchAll();

            if (empty($backups)) {
                echo '<p>No backups recorded yet.</p>';
            } else {
                echo '<table><thead><tr><th>Name</th><th>Tables</th><th>Status</th><th>Date</th></tr></thead><tbody>';
                foreach ($backups as $b) {
                    $badgeClass = $b['status'] === 'success' ? 'badge-green' : 'badge-red';
                    echo '<tr>';
                    echo '<td>' . htmlspecialchars($b['backup_name']) . '</td>';
                    echo '<td>' . htmlspecialchars($b['tables_included'] ?? '-') . '</td>';
                    echo '<td><span class="badge ' . $badgeClass . '">' . htmlspecialchars($b['status']) . '</span></td>';
                    echo '<td>' . htmlspecialchars($b['created_at']) . '</td>';
                    echo '</tr>';
                }
                echo '</tbody></table>';
            }
            ?>
        </div>

        <?php elseif ($activeTab === 'profit-settings'): ?>
        <!-- Profit Settings -->
        <div class="card">
            <h2>💰 Daily Profit Distribution</h2>
            <p>Run the profit distribution manually, or set up a cron job for automatic daily profit.</p>
            <div class="btn-group" style="margin-bottom: 20px;">
                <a href="profit-settings.php" class="btn btn-blue">💰 Manage Profit Plans</a>
                <a href="run-profit.php" class="btn btn-green" onclick="return confirm('Run daily profit distribution now? This will credit profits to all active investments.')">⚡ Run Now — Distribute Today's Profit</a>
                <a href="export-profit-log.php" class="btn btn-outline">📥 Export Profit Log</a>
            </div>
        </div>

        <?php
        // Fetch plan data directly from DB
        $stmt = $db->prepare("SELECT * FROM investment_plans WHERE active = 1 ORDER BY amount ASC");
        $stmt->execute();
        $plans = $stmt->fetchAll();
        ?>

        <div class="card">
            <h2>📊 Plan Profit Rates</h2>
            <p>Edit daily profit amounts for each investment plan. Changes apply to all active investments in that plan.</p>
            <table>
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Investment</th>
                        <th>Daily Profit</th>
                        <th>Daily %</th>
                        <th>Monthly ROI</th>
                        <th>Active Investors</th>
                        <th>Daily Payout</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($plans as $p): ?>
                    <?php
                    $stmt2 = $db->prepare("SELECT COUNT(*) as cnt FROM user_investments WHERE plan_id = ? AND status = 'active'");
                    $stmt2->execute([$p['id']]);
                    $invCount = (int)$stmt2->fetch()['cnt'];
                    $dailyPct = $p['amount'] > 0 ? round(($p['daily_profit'] / $p['amount']) * 100, 2) : 0;
                    $monthlyPct = round($dailyPct * 30, 2);
                    ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($p['name']) ?></strong></td>
                        <td>PKR <?= number_format($p['amount']) ?></td>
                        <td>PKR <?= number_format($p['daily_profit']) ?></td>
                        <td><span class="badge badge-green"><?= $dailyPct ?>%</span></td>
                        <td><span class="badge badge-yellow"><?= $monthlyPct ?>%</span></td>
                        <td><?= $invCount ?></td>
                        <td>PKR <?= number_format($invCount * $p['daily_profit']) ?></td>
                        <td>
                            <form action="update-profit.php" method="POST" style="display:flex;gap:6px;align-items:center;">
                                <input type="hidden" name="plan_id" value="<?= $p['id'] ?>">
                                <input type="number" name="daily_profit" value="<?= $p['daily_profit'] ?>" step="0.01" min="0" style="width:120px;padding:6px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f8fafc;font-size:13px;">
                                <button type="submit" class="btn btn-blue" style="padding:6px 12px;font-size:12px;">💾 Save</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>🌐 Global Stats</h2>
            <?php
            $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(daily_profit), 0) as total_daily FROM user_investments WHERE status = 'active'");
            $stmt->execute();
            $global = $stmt->fetch();
            ?>
            <div class="two-col">
                <div>
                    <div class="info-row"><span class="label">Active Investments</span><span class="val"><?= number_format($global['cnt']) ?></span></div>
                    <div class="info-row"><span class="label">Total Daily Payout</span><span class="val">PKR <?= number_format($global['total_daily']) ?></span></div>
                    <div class="info-row"><span class="label">Monthly Payout</span><span class="val">PKR <?= number_format($global['total_daily'] * 30) ?></span></div>
                </div>
                <div>
                    <div class="info-row"><span class="label">Cron URL</span><span class="val" style="font-size:11px;word-break:break-all;">/api/app/cron/distribute-profits</span></div>
                    <div class="info-row"><span class="label">Auth Token</span><span class="val" style="font-size:11px;">Bearer <?= htmlspecialchars(getSetting('cronSecret', 'roshan-digital-cron-2024')) ?></span></div>
                    <div class="info-row"><span class="label">Cron Schedule</span><span class="val">00:00 Daily</span></div>
                </div>
            </div>
            <div style="margin-top:16px;padding:16px;background:#0f172a;border-radius:8px;border:1px solid #334155;">
                <h3 style="color:#94a3b8;font-size:13px;margin-bottom:8px;">⏰ How to Setup Auto-Cron (cron-job.org):</h3>
                <ol style="color:#94a3b8;font-size:13px;padding-left:20px;line-height:1.8;">
                    <li>Go to <a href="https://cron-job.org" style="color:#6366f1;" target="_blank">cron-job.org</a> (free)</li>
                    <li>Create account → New Cron Job</li>
                    <li>URL: <code style="background:#334155;padding:2px 6px;border-radius:4px;color:#f8fafc;">https://yourdomain.com/api/app/cron/distribute-profits</code></li>
                    <li>Method: <strong>POST</strong></li>
                    <li>Headers: <code style="background:#334155;padding:2px 6px;border-radius:4px;color:#f8fafc;">Authorization: Bearer <?= htmlspecialchars(getSetting('cronSecret', 'roshan-digital-cron-2024')) ?></code></li>
                    <li>Schedule: <strong>Daily at 00:00 (midnight)</strong></li>
                    <li>Save → Done! ✅</li>
                </ol>
            </div>
        </div>

        <?php elseif ($activeTab === 'profit-history'): ?>
        <!-- Profit History -->
        <?php
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));

        $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(profit_amount), 0) as total FROM profit_history WHERE profit_date = ?");
        $stmt->execute([$today]);
        $todayStats = $stmt->fetch();

        $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(profit_amount), 0) as total FROM profit_history WHERE profit_date = ?");
        $stmt->execute([$yesterday]);
        $yesterdayStats = $stmt->fetch();

        $stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(profit_amount), 0) as total FROM profit_history");
        $stmt->execute();
        $totalStats = $stmt->fetch();
        ?>

        <div class="grid">
            <div class="stat-card">
                <h3>Today (<?= $today ?>)</h3>
                <div class="value"><?= number_format($todayStats['total'], 2) ?></div>
                <div class="sub"><?= $todayStats['cnt'] ?> profits distributed</div>
            </div>
            <div class="stat-card">
                <h3>Yesterday</h3>
                <div class="value"><?= number_format($yesterdayStats['total'], 2) ?></div>
                <div class="sub"><?= $yesterdayStats['cnt'] ?> profits distributed</div>
            </div>
            <div class="stat-card">
                <h3>All Time</h3>
                <div class="value"><?= number_format($totalStats['total'], 2) ?></div>
                <div class="sub"><?= $totalStats['cnt'] ?> total profits</div>
            </div>
        </div>

        <div class="card">
            <h2>🔍 Filter</h2>
            <form method="GET" style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;">
                <input type="hidden" name="tab" value="profit-history">
                <div class="form-group" style="margin:0;">
                    <label>Date</label>
                    <input type="date" name="date" value="<?= htmlspecialchars($_GET['date'] ?? $today) ?>">
                </div>
                <div class="form-group" style="margin:0;">
                    <label>User ID</label>
                    <input type="text" name="user_id" placeholder="Filter by user ID" value="<?= htmlspecialchars($_GET['user_id'] ?? '') ?>">
                </div>
                <button type="submit" class="btn btn-blue" style="margin-bottom:16px;">🔍 Search</button>
                <a href="?tab=profit-history" class="btn btn-outline" style="margin-bottom:16px;">Clear</a>
            </form>
        </div>

        <div class="card">
            <h2>📈 Profit Distribution History</h2>
            <?php
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = 50;
            $offset = ($page - 1) * $limit;

            $where = '1=1';
            $params = [];

            if (!empty($_GET['date'])) {
                $where .= ' AND ph.profit_date = ?';
                $params[] = $_GET['date'];
            }
            if (!empty($_GET['user_id'])) {
                $where .= ' AND ph.user_id = ?';
                $params[] = $_GET['user_id'];
            }

            $countStmt = $db->prepare("SELECT COUNT(*) as cnt FROM profit_history ph WHERE $where");
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetch()['cnt'];

            $stmt = $db->prepare("
                SELECT ph.*, u.name as user_name, u.email as user_email
                FROM profit_history ph
                JOIN users u ON ph.user_id = u.id
                WHERE $where
                ORDER BY ph.created_at DESC
                LIMIT $limit OFFSET $offset
            ");
            $stmt->execute($params);
            $records = $stmt->fetchAll();

            if (empty($records)) {
                echo '<p>No profit records found for this filter.</p>';
            } else {
                echo '<table><thead><tr><th>Date</th><th>User</th><th>Plan</th><th>Profit</th><th>Status</th><th>Time</th></tr></thead><tbody>';
                foreach ($records as $r) {
                    $badgeClass = $r['status'] === 'distributed' ? 'badge-green' : 'badge-yellow';
                    echo '<tr>';
                    echo '<td>' . htmlspecialchars($r['profit_date']) . '</td>';
                    echo '<td>' . htmlspecialchars($r['user_name'] ?? '-') . '<br><small style="color:#64748b;">' . htmlspecialchars($r['user_email']) . '</small></td>';
                    echo '<td>' . htmlspecialchars($r['plan_name'] ?? '-') . '</td>';
                    echo '<td><strong style="color:#86efac;">PKR ' . number_format($r['profit_amount'], 2) . '</strong></td>';
                    echo '<td><span class="badge ' . $badgeClass . '">' . htmlspecialchars($r['status']) . '</span></td>';
                    echo '<td>' . htmlspecialchars($r['created_at']) . '</td>';
                    echo '</tr>';
                }
                echo '</tbody></table>';

                // Pagination
                $totalPages = ceil($totalRecords / $limit);
                if ($totalPages > 1) {
                    echo '<div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">';
                    for ($i = 1; $i <= min($totalPages, 20); $i++) {
                        $active = $i === $page ? 'btn-blue' : 'btn-outline';
                        $params2 = array_merge($_GET, ['tab' => 'profit-history', 'page' => $i]);
                        echo '<a href="?' . http_build_query($params2) . '" class="btn ' . $active . '" style="padding:6px 12px;font-size:12px;">' . $i . '</a>';
                    }
                    echo '</div>';
                }
                echo '<p style="color:#64748b;font-size:12px;margin-top:12px;">Showing ' . ($offset + 1) . '-' . min($offset + $limit, $totalRecords) . ' of ' . $totalRecords . ' records</p>';
            }
            ?>
        </div>

        <?php elseif ($activeTab === 'settings'): ?>
        <!-- Version Settings -->
        <div class="card">
            <h2>⚙️ Version Information</h2>
            <form action="update-version.php" method="POST">
                <div class="two-col">
                    <div>
                        <div class="form-group">
                            <label>App Name</label>
                            <input type="text" name="name" value="<?= htmlspecialchars($version['name']) ?>">
                        </div>
                        <div class="form-group">
                            <label>Version</label>
                            <input type="text" name="version" value="<?= htmlspecialchars($version['version']) ?>" placeholder="1.0.0">
                        </div>
                    </div>
                    <div>
                        <div class="form-group">
                            <label>Database Version</label>
                            <input type="text" name="database_version" value="<?= htmlspecialchars($version['database_version']) ?>" placeholder="001">
                        </div>
                        <div class="form-group">
                            <label>Release Date</label>
                            <input type="date" name="release_date" value="<?= htmlspecialchars($version['release_date'] ?? date('Y-m-d')) ?>">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Release Notes</label>
                    <textarea name="description" rows="3"><?= htmlspecialchars($version['description'] ?? '') ?></textarea>
                </div>
                <button type="submit" class="btn btn-blue">💾 Save Version Info</button>
            </form>
        </div>

        <div class="card">
            <h2>⚠️ Danger Zone</h2>
            <p>These actions are irreversible. Make sure you have a backup before proceeding.</p>
            <div class="btn-group">
                <a href="reset-version.php" class="btn btn-red" onclick="return confirm('Reset version.json to v1.0.0? This is NOT a database reset.')">🔄 Reset Version to 1.0.0</a>
                <a href="export-db.php" class="btn btn-outline">📥 Export Full Database as SQL</a>
            </div>
        </div>

        <?php endif; ?>
    </div>

    <footer>
        Roshan Digital v<?= htmlspecialchars($version['version']) ?> — Admin Update Panel<br>
        <small>PHP <?= phpversion() ?> | MySQL <?= phpversion('mysql') ?? '?' ?></small>
    </footer>
</body>
</html>
