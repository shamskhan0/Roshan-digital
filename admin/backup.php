<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

$type = $_GET['type'] ?? 'db';
$date = date('Y-m-d_H-i-s');
$folder = __DIR__ . '/../backup/files/' . date('Y-m-d');
if (!is_dir($folder)) mkdir($folder, 0755, true);

$db = getDB();
$included = [];

if ($type === 'db' || $type === 'full') {
    // Get all tables
    $tables = [];
    $stmt = $db->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $tables[] = $row[0];
    }

    $sql = "-- Roshan Digital Database Backup\n";
    $sql .= "-- Date: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Database: " . DB_NAME . "\n\n";
    $sql .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
    $sql .= "SET AUTOCOMMIT = 0;\n";
    $sql .= "START TRANSACTION;\n\n";

    foreach ($tables as $table) {
        // Get CREATE TABLE
        $stmt = $db->query("SHOW CREATE TABLE `$table`");
        $row = $stmt->fetch(PDO::FETCH_NUM);
        $sql .= "-- Table: $table\n";
        $sql .= "DROP TABLE IF EXISTS `$table`;\n";
        $sql .= $row[1] . ";\n\n";

        // Get data
        $stmt = $db->query("SELECT * FROM `$table`");
        $rows = $stmt->fetchAll(PDO::FETCH_NUM);

        if (!empty($rows)) {
            // Get column count for proper INSERT
            $colStmt = $db->query("SHOW COLUMNS FROM `$table`");
            $cols = $colStmt->fetchAll(PDO::FETCH_NUM);
            $colNames = array_map(fn($c) => '`' . $c[0] . '`', $cols);

            $sql .= "INSERT INTO `$table` (" . implode(', ', $colNames) . ") VALUES\n";

            $valueRows = [];
            foreach ($rows as $row) {
                $values = array_map(function($v) {
                    if ($v === null) return 'NULL';
                    return "'" . addslashes($v) . "'";
                }, $row);
                $valueRows[] = '(' . implode(', ', $values) . ')';
            }
            $sql .= implode(",\n", $valueRows) . ";\n\n";
        }

        $included[] = $table;
    }

    $sql .= "COMMIT;\n";

    $filename = "backup_db_{$date}.sql";
    file_put_contents($folder . '/' . $filename, $sql);

    // Log to database
    $stmt = $db->prepare("INSERT INTO backup_logs (backup_name, backup_path, tables_included, status, created_at) VALUES (?, ?, ?, 'completed', NOW())");
    $stmt->execute([$filename, $folder . '/' . $filename, implode(', ', $included)]);
}

if ($type === 'files' || $type === 'full') {
    // Backup uploads folder
    $uploadsDir = __DIR__ . '/../uploads/';
    if (is_dir($uploadsDir)) {
        $files = array_filter(scandir($uploadsDir), fn($f) => $f !== '.' && $f !== '..');
        $fileList = [];
        foreach ($files as $f) $fileList[] = $f;
        $filename = "backup_files_{$date}.json";
        file_put_contents($folder . '/' . $filename, json_encode($fileList, JSON_PRETTY_PRINT));
    }
}

// Also backup version.json
copy(__DIR__ . '/../version.json', $folder . '/version.json');

header('Location: update-panel.php?tab=backup&msg=' . urlencode("Backup created successfully! ($type) — " . date('Y-m-d')));
exit;
