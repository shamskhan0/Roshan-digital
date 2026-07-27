<?php
// Community Handler - Posts, Comments, Likes
$segments = getUrlSegments();
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// GET /api/app/community/posts
if ($method === 'GET') {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    // Get posts
    $stmt = $db->prepare("
        SELECT p.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.pinned DESC, p.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $posts = $stmt->fetchAll();

    // Get total count
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM posts");
    $stmt->execute();
    $total = (int)$stmt->fetch()['cnt'];

    $result = [];
    foreach ($posts as $p) {
        // Get comments for this post
        $stmt = $db->prepare("
            SELECT c.*, u.name as user_name, u.avatar as user_avatar
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        ");
        $stmt->execute([$p['id']]);
        $comments = $stmt->fetchAll();

        $commentsResult = [];
        foreach ($comments as $c) {
            // Get replies for each comment
            $stmt2 = $db->prepare("
                SELECT c2.*, u.name as user_name, u.avatar as user_avatar
                FROM comments c2
                JOIN users u ON c2.user_id = u.id
                WHERE c2.parent_id = ?
                ORDER BY c2.created_at ASC
            ");
            $stmt2->execute([$c['id']]);
            $replies = $stmt2->fetchAll();

            $repliesResult = [];
            foreach ($replies as $r) {
                $repliesResult[] = [
                    'id' => $r['id'],
                    'postId' => $r['post_id'],
                    'userId' => $r['user_id'],
                    'parentId' => $r['parent_id'],
                    'content' => $r['content'],
                    'createdAt' => $r['created_at'],
                    'user' => ['id' => $r['user_id'], 'name' => $r['user_name'], 'avatar' => $r['user_avatar']],
                ];
            }

            $commentsResult[] = [
                'id' => $c['id'],
                'postId' => $c['post_id'],
                'userId' => $c['user_id'],
                'parentId' => $c['parent_id'],
                'content' => $c['content'],
                'createdAt' => $c['created_at'],
                'user' => ['id' => $c['user_id'], 'name' => $c['user_name'], 'avatar' => $c['user_avatar']],
                'replies' => $repliesResult,
            ];
        }

        // Get likes for this post
        $stmt = $db->prepare("SELECT user_id FROM likes WHERE post_id = ?");
        $stmt->execute([$p['id']]);
        $likes = $stmt->fetchAll();

        $result[] = [
            'id' => $p['id'],
            'userId' => $p['user_id'],
            'content' => $p['content'],
            'image' => $p['image'],
            'type' => $p['type'],
            'pinned' => (bool)$p['pinned'],
            'createdAt' => $p['created_at'],
            'user' => ['id' => $p['user_id'], 'name' => $p['user_name'], 'avatar' => $p['user_avatar'], 'role' => $p['user_role']],
            'comments' => $commentsResult,
            'likes' => array_map(fn($l) => ['userId' => $l['user_id']], $likes),
        ];
    }

    success([
        'posts' => $result,
        'total' => $total,
        'page' => $page,
        'hasMore' => $offset + $limit < $total,
    ]);
}

// POST /api/app/community/posts
if ($method === 'POST') {
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $content = $body['content'] ?? '';
    $image = $body['image'] ?? null;

    if (!$userId || !$content) error('Post cannot be empty');

    $postId = generateId();
    $stmt = $db->prepare("INSERT INTO posts (id, user_id, content, image, type, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, 'post', 0, NOW(), NOW())");
    $stmt->execute([$postId, $userId, $content, $image]);

    $stmt = $db->prepare("SELECT * FROM posts WHERE id = ?");
    $stmt->execute([$postId]);
    $post = $stmt->fetch();

    success(['post' => $post]);
}

// DELETE /api/app/community/posts/:id
if ($method === 'DELETE' && isset($segments[2]) && $segments[2] === 'posts') {
    $postId = $segments[3] ?? '';
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $isAdmin = $body['isAdmin'] ?? false;

    if (!$postId) error('Post ID required');

    $stmt = $db->prepare("SELECT * FROM posts WHERE id = ?");
    $stmt->execute([$postId]);
    $post = $stmt->fetch();
    if (!$post) error('Post not found', 404);
    if ($post['user_id'] !== $userId && !$isAdmin) error('Not authorized', 403);

    $stmt = $db->prepare("DELETE FROM comments WHERE post_id = ?");
    $stmt->execute([$postId]);
    $stmt = $db->prepare("DELETE FROM likes WHERE post_id = ?");
    $stmt->execute([$postId]);
    $stmt = $db->prepare("DELETE FROM posts WHERE id = ?");
    $stmt->execute([$postId]);

    success();
}

// POST /api/app/community/posts/:id/like
if ($method === 'POST' && isset($segments[2]) && $segments[2] === 'posts' && isset($segments[4]) && $segments[4] === 'like') {
    $postId = $segments[3] ?? '';
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';

    if (!$postId || !$userId) error('postId and userId required');

    $stmt = $db->prepare("SELECT * FROM likes WHERE post_id = ? AND user_id = ?");
    $stmt->execute([$postId, $userId]);
    $existing = $stmt->fetch();

    if ($existing) {
        $stmt = $db->prepare("DELETE FROM likes WHERE id = ?");
        $stmt->execute([$existing['id']]);
        success(['liked' => false]);
    }

    $stmt = $db->prepare("INSERT INTO likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->execute([generateId(), $postId, $userId]);
    success(['liked' => true]);
}

// POST /api/app/community/posts/:id/comment
if ($method === 'POST' && isset($segments[2]) && $segments[2] === 'posts' && isset($segments[4]) && $segments[4] === 'comment') {
    $postId = $segments[3] ?? '';
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $content = $body['content'] ?? '';
    $parentId = $body['parentId'] ?? null;

    if (!$content) error('Comment cannot be empty');

    $commentId = generateId();
    $stmt = $db->prepare("INSERT INTO comments (id, post_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$commentId, $postId, $userId, $parentId, $content]);

    // Fetch full comment with user info
    $stmt = $db->prepare("
        SELECT c.*, u.name as user_name, u.avatar as user_avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    ");
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch();

    // Fetch replies
    $stmt = $db->prepare("
        SELECT c2.*, u.name as user_name, u.avatar as user_avatar
        FROM comments c2
        JOIN users u ON c2.user_id = u.id
        WHERE c2.parent_id = ?
        ORDER BY c2.created_at ASC
    ");
    $stmt->execute([$commentId]);
    $replies = $stmt->fetchAll();

    $repliesResult = [];
    foreach ($replies as $r) {
        $repliesResult[] = [
            'id' => $r['id'],
            'postId' => $r['post_id'],
            'userId' => $r['user_id'],
            'parentId' => $r['parent_id'],
            'content' => $r['content'],
            'createdAt' => $r['created_at'],
            'user' => ['id' => $r['user_id'], 'name' => $r['user_name'], 'avatar' => $r['user_avatar']],
        ];
    }

    success([
        'comment' => [
            'id' => $comment['id'],
            'postId' => $comment['post_id'],
            'userId' => $comment['user_id'],
            'parentId' => $comment['parent_id'],
            'content' => $comment['content'],
            'createdAt' => $comment['created_at'],
            'user' => ['id' => $comment['user_id'], 'name' => $comment['user_name'], 'avatar' => $comment['user_avatar']],
            'replies' => $repliesResult,
        ]
    ]);
}

// DELETE /api/app/community/comments/:id
if ($method === 'DELETE' && $segments[0] === 'comments') {
    $commentId = $segments[1] ?? '';
    $body = getJsonBody();
    $userId = $body['userId'] ?? '';
    $isAdmin = $body['isAdmin'] ?? false;

    if (!$commentId) error('Comment ID required');

    $stmt = $db->prepare("SELECT * FROM comments WHERE id = ?");
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch();
    if (!$comment) error('Comment not found', 404);
    if ($comment['user_id'] !== $userId && !$isAdmin) error('Not authorized', 403);

    $stmt = $db->prepare("DELETE FROM comments WHERE parent_id = ?");
    $stmt->execute([$commentId]);
    $stmt = $db->prepare("DELETE FROM comments WHERE id = ?");
    $stmt->execute([$commentId]);

    success();
}

error('Invalid route', 400);
