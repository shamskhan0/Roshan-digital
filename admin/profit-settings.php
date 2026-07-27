<?php
require_once __DIR__ . '/auth.php';
if (!requireAdmin()) { header('Location: update-panel.php'); exit; }

require_once __DIR__ . '/../backend/config.php';
$db = getDB();

$success = $_GET['msg'] ?? '';
$error = $_GET['error'] ?? '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['form_action'] ?? '';

    // CREATE PLAN
    if ($action === 'create') {
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $amount = (float)($_POST['amount'] ?? 0);
        $profitPercentage = (float)($_POST['profit_percentage'] ?? 0);
        $durationDays = (int)($_POST['duration_days'] ?? 30);

        if (!$name || $amount <= 0 || $profitPercentage <= 0 || $durationDays <= 0) {
            header('Location: profit-settings.php?error=' . urlencode('All fields are required and must be positive'));
            exit;
        }

        $dailyProfit = round($amount * ($profitPercentage / 100), 2);
        $id = generateId();

        $stmt = $db->prepare("INSERT INTO investment_plans (id, name, description, amount, daily_profit, profit_percentage, profit_type, duration, duration_days, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 'percentage', ?, ?, 1, NOW())");
        $stmt->execute([$id, $name, $description, $amount, $dailyProfit, $profitPercentage, $durationDays, $durationDays]);

        header('Location: profit-settings.php?msg=' . urlencode("✅ Plan \"$name\" created! Daily profit: PKR $dailyProfit ($profitPercentage% of $amount)"));
        exit;
    }

    // UPDATE PLAN
    if ($action === 'update') {
        $planId = $_POST['plan_id'] ?? '';
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $amount = (float)($_POST['amount'] ?? 0);
        $profitPercentage = (float)($_POST['profit_percentage'] ?? 0);
        $durationDays = (int)($_POST['duration_days'] ?? 30);
        $active = isset($_POST['active']) ? 1 : 0;

        if (!$planId || !$name || $amount <= 0) {
            header('Location: profit-settings.php?error=' . urlencode('Invalid plan data'));
            exit;
        }

        $dailyProfit = round($amount * ($profitPercentage / 100), 2);

        $stmt = $db->prepare("UPDATE investment_plans SET name = ?, description = ?, amount = ?, daily_profit = ?, profit_percentage = ?, duration = ?, duration_days = ?, active = ? WHERE id = ?");
        $stmt->execute([$name, $description, $amount, $dailyProfit, $profitPercentage, $durationDays, $durationDays, $active, $planId]);

        // Update active investments using this plan
        $db->prepare("UPDATE user_investments SET daily_profit = ? WHERE plan_id = ? AND status = 'active'")
            ->execute([$dailyProfit, $planId]);

        header('Location: profit-settings.php?msg=' . urlencode("✅ Plan \"$name\" updated! New daily profit: PKR $dailyProfit"));
        exit;
    }

    // DELETE PLAN
    if ($action === 'delete') {
        $planId = $_POST['plan_id'] ?? '';

        // Check if any active investments exist
        $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_investments WHERE plan_id = ? AND status = 'active'");
        $stmt->execute([$planId]);
        if ((int)$stmt->fetch()['cnt'] > 0) {
            header('Location: profit-settings.php?error=' . urlencode('Cannot delete: plan has active investments'));
            exit;
        }

        $db->prepare("DELETE FROM investment_plans WHERE id = ?")->execute([$planId]);
        header('Location: profit-settings.php?msg=' . urlencode('✅ Plan deleted'));
        exit;
    }

    // QUICK UPDATE PROFIT
    if ($action === 'quick-profit') {
        $planId = $_POST['plan_id'] ?? '';
        $profitPercentage = (float)($_POST['profit_percentage'] ?? 0);

        $stmt = $db->prepare("SELECT amount FROM investment_plans WHERE id = ?");
        $stmt->execute([$planId]);
        $plan = $stmt->fetch();

        if ($plan && $profitPercentage > 0) {
            $dailyProfit = round((float)$plan['amount'] * ($profitPercentage / 100), 2);
            $db->prepare("UPDATE investment_plans SET profit_percentage = ?, daily_profit = ? WHERE id = ?")
                ->execute([$profitPercentage, $dailyProfit, $planId]);
            $db->prepare("UPDATE user_investments SET daily_profit = ? WHERE plan_id = ? AND status = 'active'")
                ->execute([$dailyProfit, $planId]);
        }

        header('Location: profit-settings.php?msg=' . urlencode('✅ Profit rate updated'));
        exit;
    }
}

// Fetch all plans
$stmt = $db->prepare("SELECT * FROM investment_plans ORDER BY amount ASC");
$stmt->execute();
$plans = $stmt->fetchAll();

// Global stats
$stmt = $db->prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_invested, COALESCE(SUM(daily_profit), 0) as total_daily FROM user_investments WHERE status = 'active'");
$stmt->execute();
$stats = $stmt->fetch();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Investment Plan Management — Roshan Digital</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

        .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 20px; color: #f8fafc; display: flex; align-items: center; gap: 10px; }
        .header-right { display: flex; align-items: center; gap: 16px; }
        .header-right span { color: #94a3b8; font-size: 13px; }
        .back-link { color: #6366f1; text-decoration: none; font-size: 13px; font-weight: 500; }

        .container { max-width: 1200px; margin: 0 auto; padding: 32px; }

        .success { background: #14532d; color: #86efac; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #166534; font-size: 14px; }
        .error-msg { background: #450a0a; color: #fca5a5; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #7f1d1d; font-size: 14px; }

        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; }
        .stat-card h3 { color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .stat-card .value { color: #f8fafc; font-size: 28px; font-weight: 700; }
        .stat-card .sub { color: #64748b; font-size: 12px; margin-top: 4px; }
        .stat-card .sub.green { color: #86efac; }

        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; margin-bottom: 20px; }
        .card h2 { color: #f8fafc; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .card p { color: #94a3b8; font-size: 14px; margin-bottom: 16px; line-height: 1.6; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .two-col, .three-col { grid-template-columns: 1fr; } }

        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; color: #cbd5e1; font-size: 13px; margin-bottom: 6px; font-weight: 500; }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; font-size: 14px; outline: none; }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #6366f1; }
        .form-group textarea { min-height: 60px; resize: vertical; font-family: inherit; }
        .form-group .hint { color: #64748b; font-size: 11px; margin-top: 4px; }

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
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        .btn-group { display: flex; gap: 12px; flex-wrap: wrap; }

        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { text-align: left; color: #94a3b8; font-weight: 500; padding: 12px 16px; border-bottom: 1px solid #334155; }
        td { padding: 12px 16px; border-bottom: 1px solid #1e293b; vertical-align: middle; }
        tr:hover td { background: #0f172a; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .badge-green { background: #14532d; color: #86efac; }
        .badge-red { background: #450a0a; color: #fca5a5; }
        .badge-yellow { background: #422006; color: #fde047; }
        .badge-blue { background: #1e3a5f; color: #93c5fd; }

        .plan-card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 24px; position: relative; }
        .plan-card.active { border-color: #16a34a; }
        .plan-card.inactive { border-color: #64748b; opacity: 0.6; }
        .plan-card h3 { color: #f8fafc; font-size: 18px; margin-bottom: 12px; }
        .plan-card .amount { color: #6366f1; font-size: 24px; font-weight: 700; }
        .plan-card .detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #1e293b; }
        .plan-card .detail:last-child { border-bottom: none; }
        .plan-card .detail .val { color: #e2e8f0; font-weight: 500; }
        .plan-card .detail .val.green { color: #86efac; }

        .preview-box { background: #0f172a; border: 1px dashed #6366f1; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .preview-box h4 { color: #6366f1; font-size: 13px; margin-bottom: 8px; }

        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.show { display: flex; }
        .modal { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
        .modal h2 { margin-bottom: 20px; }

        footer { text-align: center; color: #475569; font-size: 12px; padding: 24px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>💰 Investment Plan Management</h1>
        <div class="header-right">
            <a href="update-panel.php" class="back-link">← Back to Admin Panel</a>
            <span>👤 <?= htmlspecialchars($_SESSION['admin_name'] ?? 'Admin') ?></span>
        </div>
    </div>

    <div class="container">
        <?php if ($success): ?><div class="success">✅ <?= htmlspecialchars($success) ?></div><?php endif; ?>
        <?php if ($error): ?><div class="error-msg">⚠️ <?= htmlspecialchars($error) ?></div><?php endif; ?>

        <!-- Global Stats -->
        <div class="grid">
            <div class="stat-card">
                <h3>Active Investments</h3>
                <div class="value"><?= number_format($stats['cnt']) ?></div>
                <div class="sub">Across all plans</div>
            </div>
            <div class="stat-card">
                <h3>Total Invested</h3>
                <div class="value">PKR <?= number_format($stats['total_invested']) ?></div>
                <div class="sub">In active investments</div>
            </div>
            <div class="stat-card">
                <h3>Daily Payout</h3>
                <div class="value">PKR <?= number_format($stats['total_daily']) ?></div>
                <div class="sub green">Total daily profit to distribute</div>
            </div>
            <div class="stat-card">
                <h3>Monthly Payout</h3>
                <div class="value">PKR <?= number_format($stats['total_daily'] * 30) ?></div>
                <div class="sub">Estimated monthly</div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="btn-group" style="margin-bottom: 24px;">
            <button onclick="document.getElementById('createModal').classList.add('show')" class="btn btn-green">➕ Create New Plan</button>
            <a href="run-profit.php" class="btn btn-blue" onclick="return confirm('Run profit distribution now?')">⚡ Distribute Profits Now</a>
            <a href="export-profit-log.php" class="btn btn-outline">📥 Export Profit Log</a>
        </div>

        <!-- Plan Cards -->
        <h2 style="color:#f8fafc;font-size:18px;margin-bottom:16px;">📋 Investment Plans (<?= count($plans) ?>)</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:32px;">
            <?php foreach ($plans as $p): ?>
                <?php
                $pct = (float)$p['profit_percentage'];
                $monthlyROI = $pct * 30;
                $totalROI = $pct * (int)$p['duration_days'];
                $totalProfit = (float)$p['daily_profit'] * (int)$p['duration_days'];

                $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_investments WHERE plan_id = ? AND status = 'active'");
                $stmt->execute([$p['id']]);
                $invCount = (int)$stmt->fetch()['cnt'];
                ?>
                <div class="plan-card <?= $p['active'] ? 'active' : 'inactive' ?>">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <h3><?= htmlspecialchars($p['name']) ?></h3>
                        <span class="badge <?= $p['active'] ? 'badge-green' : 'badge-red' ?>"><?= $p['active'] ? 'Active' : 'Inactive' ?></span>
                    </div>
                    <div class="amount">PKR <?= number_format((float)$p['amount']) ?></div>
                    <div style="margin-top:16px;">
                        <div class="detail"><span>Daily Profit %</span><span class="val green"><?= $pct ?>%</span></div>
                        <div class="detail"><span>Daily Profit (PKR)</span><span class="val">PKR <?= number_format((float)$p['daily_profit']) ?></span></div>
                        <div class="detail"><span>Duration</span><span class="val"><?= (int)$p['duration_days'] ?> days</span></div>
                        <div class="detail"><span>Monthly ROI</span><span class="val green"><?= round($monthlyROI, 1) ?>%</span></div>
                        <div class="detail"><span>Total Return</span><span class="val">PKR <?= number_format((float)$p['amount'] + $totalProfit) ?></span></div>
                        <div class="detail"><span>Total Profit</span><span class="val green">PKR <?= number_format($totalProfit) ?> (<?= round($totalROI, 1) ?>%)</span></div>
                        <div class="detail"><span>Active Investors</span><span class="val"><?= $invCount ?></span></div>
                    </div>
                    <div style="margin-top:16px;display:flex;gap:8px;">
                        <button onclick="openEdit(<?= htmlspecialchars(json_encode([
                            'id' => $p['id'], 'name' => $p['name'], 'description' => $p['description'],
                            'amount' => $p['amount'], 'profit_percentage' => $p['profit_percentage'],
                            'duration_days' => $p['duration_days'], 'active' => $p['active']
                        ])) ?>" class="btn btn-blue btn-sm">✏️ Edit</button>
                        <form method="POST" style="display:inline;" onsubmit="return confirm('Delete this plan? Only works if no active investments.')">
                            <input type="hidden" name="form_action" value="delete">
                            <input type="hidden" name="plan_id" value="<?= $p['id'] ?>">
                            <button type="submit" class="btn btn-red btn-sm">🗑 Delete</button>
                        </form>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <!-- Quick Profit Edit Table -->
        <div class="card">
            <h2>⚡ Quick Profit Edit</h2>
            <p>Change the daily profit percentage for any plan. Daily profit is auto-calculated as: <strong>Amount × Percentage ÷ 100</strong></p>
            <table>
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Investment Amount</th>
                        <th>Current %</th>
                        <th>Current Daily</th>
                        <th>New %</th>
                        <th>Preview</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($plans as $p): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($p['name']) ?></strong></td>
                        <td>PKR <?= number_format((float)$p['amount']) ?></td>
                        <td><span class="badge badge-green"><?= (float)$p['profit_percentage'] ?>%</span></td>
                        <td>PKR <?= number_format((float)$p['daily_profit']) ?></td>
                        <td>
                            <form method="POST" style="display:flex;gap:6px;align-items:center;">
                                <input type="hidden" name="form_action" value="quick-profit">
                                <input type="hidden" name="plan_id" value="<?= $p['id'] ?>">
                                <input type="number" name="profit_percentage" value="<?= $p['profit_percentage'] ?>" step="0.01" min="0.01" max="100" style="width:100px;padding:6px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f8fafc;font-size:13px;">
                            </form>
                        </td>
                        <td style="font-size:12px;color:#64748b;">PKR <?= number_format((float)$p['amount'] * (float)$p['profit_percentage'] / 100) ?>/day</td>
                        <td><button type="submit" form="quick-form-<?= $p['id'] ?>" class="btn btn-blue btn-sm">💾 Save</button></td>
                    </tr>
                    <form id="quick-form-<?= $p['id'] ?>" method="POST" style="display:none;">
                        <input type="hidden" name="form_action" value="quick-profit">
                        <input type="hidden" name="plan_id" value="<?= $p['id'] ?>">
                        <input type="hidden" name="profit_percentage" id="quick-pct-<?= $p['id'] ?>">
                    </form>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Create Plan Modal -->
    <div class="modal-overlay" id="createModal">
        <div class="modal">
            <h2>➕ Create New Investment Plan</h2>
            <form method="POST">
                <input type="hidden" name="form_action" value="create">
                <div class="two-col">
                    <div class="form-group">
                        <label>Plan Name</label>
                        <input type="text" name="name" placeholder="e.g. Gold Plan" required>
                    </div>
                    <div class="form-group">
                        <label>Investment Amount (PKR)</label>
                        <input type="number" name="amount" step="100" min="100" placeholder="e.g. 10000" required oninput="calcPreview(this)">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" placeholder="Describe this plan..."></textarea>
                </div>
                <div class="three-col">
                    <div class="form-group">
                        <label>Daily Profit %</label>
                        <input type="number" name="profit_percentage" step="0.01" min="0.01" max="100" placeholder="e.g. 5" required oninput="calcPreview(this)">
                        <div class="hint">Daily Profit = Amount × % ÷ 100</div>
                    </div>
                    <div class="form-group">
                        <label>Duration (Days)</label>
                        <input type="number" name="duration_days" min="1" max="365" value="30" required>
                    </div>
                    <div class="form-group">
                        <label>Auto-calculated</label>
                        <div class="preview-box">
                            <div id="createPreview" style="color:#86efac;font-size:15px;font-weight:600;">PKR 0/day</div>
                            <div id="createPreviewTotal" style="color:#94a3b8;font-size:12px;margin-top:4px;">Total: PKR 0 (0%)</div>
                        </div>
                    </div>
                </div>
                <div class="btn-group">
                    <button type="submit" class="btn btn-green">✅ Create Plan</button>
                    <button type="button" class="btn btn-outline" onclick="document.getElementById('createModal').classList.remove('show')">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Plan Modal -->
    <div class="modal-overlay" id="editModal">
        <div class="modal">
            <h2>✏️ Edit Investment Plan</h2>
            <form method="POST">
                <input type="hidden" name="form_action" value="update">
                <input type="hidden" name="plan_id" id="edit_id">
                <div class="two-col">
                    <div class="form-group">
                        <label>Plan Name</label>
                        <input type="text" name="name" id="edit_name" required>
                    </div>
                    <div class="form-group">
                        <label>Investment Amount (PKR)</label>
                        <input type="number" name="amount" id="edit_amount" step="100" min="100" required oninput="calcEditPreview()">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" id="edit_description"></textarea>
                </div>
                <div class="three-col">
                    <div class="form-group">
                        <label>Daily Profit %</label>
                        <input type="number" name="profit_percentage" id="edit_percentage" step="0.01" min="0.01" max="100" required oninput="calcEditPreview()">
                        <div class="hint">Auto-calculates daily profit</div>
                    </div>
                    <div class="form-group">
                        <label>Duration (Days)</label>
                        <input type="number" name="duration_days" id="edit_duration" min="1" max="365" required>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <label style="display:flex;align-items:center;gap:8px;padding:10px;cursor:pointer;">
                            <input type="checkbox" name="active" id="edit_active"> Active
                        </label>
                    </div>
                </div>
                <div class="preview-box">
                    <div id="editPreview" style="color:#86efac;font-size:15px;font-weight:600;">PKR 0/day</div>
                    <div id="editPreviewTotal" style="color:#94a3b8;font-size:12px;margin-top:4px;">Total: PKR 0 (0%)</div>
                </div>
                <div class="btn-group" style="margin-top:16px;">
                    <button type="submit" class="btn btn-green">💾 Save Changes</button>
                    <button type="button" class="btn btn-outline" onclick="document.getElementById('editModal').classList.remove('show')">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <footer>
        Roshan Digital — Investment Plan Management<br>
        <small>PHP <?= phpversion() ?> | Daily profit = Amount × Percentage ÷ 100</small>
    </footer>

    <script>
    function calcPreview(el) {
        const modal = el.closest('.modal');
        const amount = parseFloat(modal.querySelector('[name=amount]').value) || 0;
        const pct = parseFloat(modal.querySelector('[name=profit_percentage]').value) || 0;
        const days = parseInt(modal.querySelector('[name=duration_days]').value) || 30;
        const daily = Math.round(amount * (pct / 100) * 100) / 100;
        const total = daily * days;
        document.getElementById('createPreview').textContent = 'PKR ' + daily.toLocaleString() + '/day';
        document.getElementById('createPreviewTotal').textContent = 'Total: PKR ' + total.toLocaleString() + ' (' + (pct * days / 30).toFixed(1) + '% monthly)';
    }

    function openEdit(plan) {
        document.getElementById('edit_id').value = plan.id;
        document.getElementById('edit_name').value = plan.name;
        document.getElementById('edit_description').value = plan.description || '';
        document.getElementById('edit_amount').value = plan.amount;
        document.getElementById('edit_percentage').value = plan.profit_percentage;
        document.getElementById('edit_duration').value = plan.duration_days;
        document.getElementById('edit_active').checked = plan.active == 1;
        calcEditPreview();
        document.getElementById('editModal').classList.add('show');
    }

    function calcEditPreview() {
        const amount = parseFloat(document.getElementById('edit_amount').value) || 0;
        const pct = parseFloat(document.getElementById('edit_percentage').value) || 0;
        const days = parseInt(document.getElementById('edit_duration').value) || 30;
        const daily = Math.round(amount * (pct / 100) * 100) / 100;
        const total = daily * days;
        document.getElementById('editPreview').textContent = 'PKR ' + daily.toLocaleString() + '/day';
        document.getElementById('editPreviewTotal').textContent = 'Total: PKR ' + total.toLocaleString() + ' over ' + days + ' days';
    }

    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });
    });
    </script>
</body>
</html>
