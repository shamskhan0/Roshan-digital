<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

$date = $_GET['date'] ?? '';
$folder = __DIR__ . '/../backup/files/' . basename($date);

if (!$date || !is_dir($folder)) {
    header('Location: update-panel.php?tab=backup');
    exit;
}

// Download all files in the backup folder as a ZIP
$tmpFile = tempnam(sys_get_temp_dir(), 'backup_');
$zip = new ZipArchive();
$zip->open($tmpFile, ZipArchive::CREATE);

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($folder));
foreach ($files as $file) {
    if ($file->isFile()) {
        $relativePath = str_replace($folder . '/', '', $file->getRealPath());
        $zip->addFile($file->getRealPath(), $relativePath);
    }
}
$zip->close();

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="roshan-digital-backup-' . $date . '.zip"');
header('Content-Length: ' . filesize($tmpFile));
readfile($tmpFile);
unlink($tmpFile);
exit;
