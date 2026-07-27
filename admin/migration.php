<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

$db = getDB();
$migDir = __DIR__ . '/../migrations/';

// Run a migration from the migrations folder
if (isset($_GET['file'])) {
    $filename = basename($_GET['file']);
    $sqlFile = $migDir . $filename;

    if (!file_exists($sqlFile)) {
        header('Location: update-panel.php?tab=migration&error=' . urlencode('Migration file not found'));
        exit;
    }

    $sql = file_get_contents($sqlFile);
    $tablesAffected = [];

    // Parse table names from SQL
    preg_match_all('/(?:INSERT INTO|UPDATE|ALTER TABLE|CREATE TABLE|DROP TABLE)\s+`?(\w+)`?/i', $sql, $matches);
    if (!empty($matches[1])) $tablesAffected = array_unique($matches[1]);

    try {
        // Split by semicolons and execute each statement
        $statements = array_filter(array_map('trim', explode(';', $sql)), fn($s) => !empty($s) && !preg_match('/^--/', $s));

        foreach ($statements as $stmt) {
            $stmt = trim($stmt);
            if (!empty($stmt) && !preg_match('/^(SET|START|COMMIT|--|\s*$)/', $stmt)) {
                $db->exec($stmt);
            }
        }

        // Log success
        $stmt = $db->prepare("INSERT INTO migration_logs (migration_file, tables_affected, status, created_at) VALUES (?, ?, 'success', NOW())");
        $stmt->execute([$filename, implode(', ', $tablesAffected)]);

        header('Location: update-panel.php?tab=migration&msg=' . urlencode("Migration '$filename' completed successfully! Tables: " . implode(', ', $tablesAffected)));
        exit;

    } catch (Exception $e) {
        // Log failure
        $stmt = $db->prepare("INSERT INTO migration_logs (migration_file, tables_affected, status, error_message, created_at) VALUES (?, ?, 'failed', ?, NOW())");
        $stmt->execute([$filename, implode(', ', $tablesAffected), $e->getMessage()]);

        header('Location: update-panel.php?tab=migration&error=' . urlencode("Migration failed: " . $e->getMessage()));
        exit;
    }
}

// Upload and run a new migration file
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['migration_file'])) {
    $file = $_FILES['migration_file'];
    $description = $_POST['description'] ?? '';

    if ($file['error'] !== UPLOAD_ERR_OK) {
        header('Location: update-panel.php?tab=migration&error=' . urlencode('Upload failed'));
        exit;
    }

    $filename = 'migration_' . date('Y-m-d_H-i-s') . '.sql';
    if (!is_dir($migDir)) mkdir($migDir, 0755, true);
    $dest = $migDir . $filename;
    move_uploaded_file($file['tmp_name'], $dest);

    // Auto-run the migration
    $sql = file_get_contents($dest);
    $tablesAffected = [];
    preg_match_all('/(?:INSERT INTO|UPDATE|ALTER TABLE|CREATE TABLE|DROP TABLE)\s+`?(\w+)`?/i', $sql, $matches);
    if (!empty($matches[1])) $tablesAffected = array_unique($matches[1]);

    try {
        $statements = array_filter(array_map('trim', explode(';', $sql)), fn($s) => !empty($s) && !preg_match('/^--/', $s));

        foreach ($statements as $stmt) {
            $stmt = trim($stmt);
            if (!empty($stmt) && !preg_match('/^(SET|START|COMMIT|--|\s*$)/', $stmt)) {
                $db->exec($stmt);
            }
        }

        $stmt = $db->prepare("INSERT INTO migration_logs (migration_file, tables_affected, status, created_at) VALUES (?, ?, 'success', NOW())");
        $stmt->execute([$filename, implode(', ', $tablesAffected)]);

        header('Location: update-panel.php?tab=migration&msg=' . urlencode("Migration uploaded and applied! Tables: " . implode(', ', $tablesAffected)));
        exit;

    } catch (Exception $e) {
        $stmt = $db->prepare("INSERT INTO migration_logs (migration_file, tables_affected, status, error_message, created_at) VALUES (?, ?, 'failed', ?, NOW())");
        $stmt->execute([$filename, implode(', ', $tablesAffected), $e->getMessage()]);

        header('Location: update-panel.php?tab=migration&error=' . urlencode("Migration failed: " . $e->getMessage()));
        exit;
    }
}

header('Location: update-panel.php?tab=migration');
exit;
