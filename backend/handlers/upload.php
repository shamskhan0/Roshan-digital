<?php
// Upload Handler - /api/app/upload
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') error('Method not allowed', 405);

if (!isset($_FILES['file'])) error('No file uploaded');

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) error('Upload error: ' . $file['error']);

if ($file['size'] > MAX_FILE_SIZE) error('File too large (max 5MB)');

$ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'png';
$filename = 'upload_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
$filepath = UPLOAD_DIR . $filename;

if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    error('Failed to save file', 500);
}

success([
    'url' => UPLOAD_URL . $filename,
    'filename' => $filename,
]);
