<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

$version = [
    "name" => "Roshan Digital",
    "version" => "1.0.0",
    "database_version" => "001",
    "release_date" => date('Y-m-d'),
    "php_version" => "8.x",
    "description" => "Reset to initial version"
];

file_put_contents(__DIR__ . '/../version.json', json_encode($version, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

header('Location: update-panel.php?tab=settings&msg=' . urlencode('Version reset to 1.0.0'));
exit;
