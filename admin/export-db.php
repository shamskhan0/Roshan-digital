<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

$db = getDB();

// Generate full database SQL export
$tables = [];
$stmt = $db->query("SHOW TABLES");
while ($row = $stmt->fetch(PDO::FETCH_NUM)) $tables[] = $row[0];

$version = json_decode(file_get_contents(__DIR__ . '/../version.json'), true);

$sql = "-- =============================================\n";
$sql .= "-- Roshan Digital — Full Database Export\n";
$sql .= "-- Version: " . ($version['version'] ?? 'unknown') . "\n";
$sql .= "-- Database Version: " . ($version['database_version'] ?? '001') . "\n";
$sql .= "-- Exported: " . date('Y-m-d H:i:s') . "\n";
$sql .= "-- =============================================\n\n";
$sql .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
$sql .= "SET AUTOCOMMIT = 0;\n";
$sql .= "START TRANSACTION;\n";
$sql .= "SET time_zone = \"+05:00\";\n\n";

foreach ($tables as $table) {
    $stmt = $db->query("SHOW CREATE TABLE `$table`");
    $row = $stmt->fetch(PDO::FETCH_NUM);
    $sql .= "-- =============================================\n";
    $sql .= "-- TABLE: $table\n";
    $sql .= "-- =============================================\n";
    $sql .= "DROP TABLE IF EXISTS `$table`;\n";
    $sql .= $row[1] . ";\n\n";

    $stmt = $db->query("SELECT * FROM `$table`");
    $rows = $stmt->fetchAll(PDO::FETCH_NUM);

    if (!empty($rows)) {
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
}

$sql .= "COMMIT;\n";

header('Content-Type: application/sql');
header('Content-Disposition: attachment; filename="roshan-digital-db-' . date('Y-m-d') . '.sql"');
header('Content-Length: ' . strlen($sql));
echo $sql;
exit;
