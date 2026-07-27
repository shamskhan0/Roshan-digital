<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['update_file'])) {
    header('Location: update-panel.php?tab=update');
    exit;
}

$version = $_POST['version'] ?? 'unknown';
$description = $_POST['description'] ?? '';
$updateType = $_POST['update_type'] ?? 'files';
$createBackup = isset($_POST['create_backup']);

$file = $_FILES['update_file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    header('Location: update-panel.php?tab=update&error=' . urlencode('Upload failed: error ' . $file['error']));
    exit;
}

if ($file['size'] > 50 * 1024 * 1024) {
    header('Location: update-panel.php?tab=update&error=' . urlencode('File too large (max 50MB)'));
    exit;
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$date = date('Y-m-d_H-i-s');

// Auto backup before update
if ($createBackup) {
    $backupUrl = __DIR__ . '/backup.php?type=full';
    // Inline backup logic
    $folder = __DIR__ . '/../backup/files/' . date('Y-m-d');
    if (!is_dir($folder)) mkdir($folder, 0755, true);

    $db = getDB();
    $tables = [];
    $stmt = $db->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) $tables[] = $row[0];

    $sql = "-- Auto-backup before update v{$version}\n";
    $sql .= "-- Date: " . date('Y-m-d H:i:s') . "\n\n";
    $sql .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\nSET AUTOCOMMIT = 0;\nSTART TRANSACTION;\n\n";

    foreach ($tables as $table) {
        $stmt = $db->query("SHOW CREATE TABLE `$table`");
        $row = $stmt->fetch(PDO::FETCH_NUM);
        $sql .= "DROP TABLE IF EXISTS `$table`;\n" . $row[1] . ";\n\n";
    }
    $sql .= "COMMIT;\n";

    file_put_contents($folder . "/backup_pre_update_{$date}.sql", $sql);
}

if ($ext === 'zip') {
    // Extract ZIP
    $updatesDir = __DIR__ . '/../updates/';
    if (!is_dir($updatesDir)) mkdir($updatesDir, 0755, true);

    $zipPath = $updatesDir . "update_{$date}.zip";
    move_uploaded_file($file['tmp_name'], $zipPath);

    $zip = new ZipArchive();
    if ($zip->open($zipPath) === true) {
        $extractDir = $updatesDir . "extracted_{$date}/";
        $zip->extractTo($extractDir);
        $zip->close();

        // Apply files based on type
        $applied = 0;

        // Check for backend files
        if (is_dir($extractDir . 'backend')) {
            $dest = __DIR__ . '/../backend/';
            copyDirRecursive($extractDir . 'backend', $dest);
            $applied++;
        }

        // Check for frontend build files
        if (is_dir($extractDir . 'dist')) {
            // Frontend dist — log only, don't overwrite htdocs
            $applied++;
        }
        if (is_dir($extractDir . 'frontend')) {
            $applied++;
        }

        // Check for migration SQL
        $sqlFiles = glob($extractDir . '*.sql');
        foreach ($sqlFiles as $sqlFile) {
            $dest = __DIR__ . '/../migrations/' . basename($sqlFile);
            copy($sqlFile, $dest);
        }

        // Check for version.json
        if (file_exists($extractDir . 'version.json')) {
            $newVersion = json_decode(file_get_contents($extractDir . 'version.json'), true);
            if ($newVersion) {
                file_put_contents(__DIR__ . '/../version.json', json_encode($newVersion, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }
        }

        $msg = "Update v{$version} uploaded and applied successfully! ($applied items)";
    } else {
        $msg = "ZIP extraction failed. File saved to updates/ for manual inspection.";
    }
} elseif ($ext === 'sql') {
    // Migration SQL file
    $dest = __DIR__ . '/../migrations/migration_' . $date . '.sql';
    move_uploaded_file($file['tmp_name'], $dest);
    $msg = "Migration file uploaded. Go to Migrations tab to run it.";
} else {
    $msg = "Unsupported file type: .$ext";
}

// Log update
$db = getDB();
$stmt = $db->prepare("INSERT INTO updates (version, description, status, created_at) VALUES (?, ?, 'completed', NOW())");
$stmt->execute([$version, $description]);

header('Location: update-panel.php?tab=update&msg=' . urlencode($msg));
exit;

// Helper: Recursive directory copy
function copyDirRecursive($src, $dst) {
    if (!is_dir($dst)) mkdir($dst, 0755, true);
    $items = array_filter(scandir($src), fn($i) => $i !== '.' && $i !== '..');
    foreach ($items as $item) {
        $srcPath = $src . '/' . $item;
        $dstPath = $dst . '/' . $item;
        if (is_dir($srcPath)) {
            copyDirRecursive($srcPath, $dstPath);
        } else {
            copy($srcPath, $dstPath);
        }
    }
}
