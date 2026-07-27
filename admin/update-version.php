<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

$version = json_decode(file_get_contents(__DIR__ . '/../version.json'), true);

$version['name'] = $_POST['name'] ?? $version['name'];
$version['version'] = $_POST['version'] ?? $version['version'];
$version['database_version'] = $_POST['database_version'] ?? $version['database_version'];
$version['release_date'] = $_POST['release_date'] ?? $version['release_date'];
$version['description'] = $_POST['description'] ?? $version['description'];

file_put_contents(__DIR__ . '/../version.json', json_encode($version, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

header('Location: update-panel.php?tab=settings&msg=' . urlencode('Version info updated!'));
exit;
