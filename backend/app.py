import os
import secrets
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from models import (
    db, User, OTP, LoginHistory, Post, Comment, Like, Wallet,
    Task, UserTask, InvestmentPlan, UserInvestment, Deposit,
    Withdrawal, Referral, Notification, Transaction, Setting
)

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///roshan.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))

CORS(app)
db.init_app(app)

with app.app_context():
    db.create_all()


# ── helpers ──────────────────────────────────────────────────

def gen_otp():
    return str(secrets.randbelow(900000) + 100000)


def otp_valid(expires_at):
    return datetime.utcnow() < expires_at


def ensure_wallet(user_id):
    w = Wallet.query.filter_by(userId=user_id).first()
    if not w:
        w = Wallet(userId=user_id)
        db.session.add(w)
        db.session.commit()
    if w.mainBalance == 0 and w.balance > 0:
        w.mainBalance = w.balance
        db.session.commit()
    return w


def record_tx(user_id, tx_type, amount, balance, detail=None):
    tx = Transaction(userId=user_id, type=tx_type, amount=amount, balance=balance, detail=detail)
    db.session.add(tx)
    db.session.commit()


def notify(user_id, title, message, ntype='info'):
    n = Notification(userId=user_id, title=title, message=message, type=ntype)
    db.session.add(n)
    db.session.commit()


def get_setting(key, fallback=''):
    s = Setting.query.filter_by(key=key).first()
    return s.value if s else fallback


def get_setting_bool(key, fallback=True):
    v = get_setting(key, 'true' if fallback else 'false')
    return v == 'true'


def seed_data():
    if Task.query.count() == 0:
        tasks = [
            Task(title='Download App', description='Download and install our app', reward=50, category='app'),
            Task(title='Watch Video', description='Watch a short video', reward=25, category='video'),
            Task(title='Follow Social Media', description='Follow our social accounts', reward=30, category='social'),
            Task(title='Write a Review', description='Leave a review on App Store', reward=40, category='review'),
            Task(title='Refer a Friend', description='Invite a friend to join', reward=60, category='referral'),
            Task(title='Visit Website', description='Visit our website', reward=15, category='visit'),
        ]
        db.session.add_all(tasks)
        db.session.commit()
    if InvestmentPlan.query.count() == 0:
        plans = [
            InvestmentPlan(name='Starter Plan', description='Perfect for beginners', amount=1000, dailyProfit=50, duration=30),
            InvestmentPlan(name='Growth Plan', description='Steady returns', amount=5000, dailyProfit=300, duration=30),
            InvestmentPlan(name='Premium Plan', description='High returns', amount=15000, dailyProfit=1000, duration=30),
            InvestmentPlan(name='Elite Plan', description='Maximum returns', amount=50000, dailyProfit=4000, duration=30),
        ]
        db.session.add_all(plans)
        db.session.commit()
if User.query.filter_by(email="admin@roshan.com").first() is None:
    admin = User(
        email="admin@roshan.com",
        name="Admin",
        password="admin123",
        role="admin",
        verified=True,
        active=True
    )
    db.session.add(admin)
    db.session.commit()

def user_dict(u):
    return {
        'id': u.id, 'email': u.email, 'name': u.name, 'role': u.role,
        'referralCode': u.referralCode, 'avatar': u.avatar,
        'phone': u.phone, 'verified': u.verified,
    }


# ── security headers ─────────────────────────────────────────

@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response


# ── health ───────────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify(ok=True, status='online')


@app.route('/api/app/status')
def system_status():
    return jsonify(
        status='online', version='2.0.0',
        users=User.query.count(),
        activeInvestments=UserInvestment.query.filter_by(status='active').count(),
        pendingDeposits=Deposit.query.filter_by(status='pending').count(),
        totalTransactions=Transaction.query.count(),
        timestamp=datetime.utcnow().isoformat(),
    )


# ── OTP ──────────────────────────────────────────────────────

@app.route('/api/otp/send', methods=['POST'])
def otp_send():
    data = request.json
    target, purpose = data.get('target'), data.get('purpose')
    if not target or not purpose:
        return jsonify(error='Required fields are incomplete'), 400
    code = gen_otp()
    otp = OTP(target=target, code=code, purpose=purpose, expiresAt=datetime.utcnow() + timedelta(minutes=5))
    db.session.add(otp)
    db.session.commit()
    print(f'[OTP] {purpose} → {target}: {code}')
    return jsonify(ok=True, message='OTP sent successfully', otp=code)


@app.route('/api/otp/verify', methods=['POST'])
def otp_verify():
    data = request.json
    target, code, purpose = data.get('target'), data.get('code'), data.get('purpose')
    if not target or not code or not purpose:
        return jsonify(error='Required fields are incomplete'), 400
    otp = OTP.query.filter_by(target=target, purpose=purpose, used=False).order_by(OTP.createdAt.desc()).first()
    if not otp:
        return jsonify(error='OTP not found'), 404
    if not otp_valid(otp.expiresAt):
        return jsonify(error='OTP has expired'), 410
    if otp.code != code:
        return jsonify(error='Invalid OTP'), 400
    otp.used = True
    db.session.commit()
    return jsonify(ok=True, message='OTP verified')


# ── AUTH ─────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.json
    email, password = data.get('email'), data.get('password')
    if not email or not password:
        return jsonify(error='Email and password are required'), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error='Email already registered'), 409
    code = secrets.token_urlsafe(8).upper()
    user = User(
        email=email, name=data.get('name') or email.split('@')[0],
        password=password, phone=data.get('phone'),
        referralCode=code, referredBy=data.get('referralCode'),
    )
    db.session.add(user)
    db.session.commit()
    db.session.refresh(user)
    w = Wallet(userId=user.id)
    db.session.add(w)
    db.session.commit()
    return jsonify(ok=True, user=user_dict(user))


@app.route('/api/auth/verify-account', methods=['POST'])
def auth_verify_account():
    uid = request.json.get('userId')
    user = User.query.get(uid)
    if not user:
        return jsonify(error='User not found'), 404
    user.verified = True
    db.session.commit()
    if user.referredBy:
        referrer = User.query.filter_by(referralCode=user.referredBy).first()
        if referrer:
            existing = Referral.query.filter_by(referrerId=referrer.id, referredId=uid).first()
            if not existing:
                reward = float(get_setting('referralReward', '100'))
                ref = Referral(referrerId=referrer.id, referredId=uid, reward=reward, status='pending')
                db.session.add(ref)
                db.session.commit()
    return jsonify(ok=True)


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json
    email, password = data.get('email'), data.get('password')
    if not email or not password:
        return jsonify(error='Email and password are required'), 400
    user = User.query.filter_by(email=email).first()
    if not user or user.password != password:
        return jsonify(error='Invalid email or password'), 401
    if not user.active:
        return jsonify(error='Your account is deactivated'), 403
    db.session.add(LoginHistory(userId=user.id, status='success', browser='Web', device='Browser', ip='0.0.0.0'))
    db.session.commit()
    return jsonify(ok=True, user=user_dict(user))


@app.route('/api/auth/forgot-password', methods=['POST'])
def auth_forgot_password():
    email = request.json.get('email')
    if not email:
        return jsonify(error='Email is required'), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error='Email not registered'), 404
    code = gen_otp()
    otp = OTP(target=email, code=code, purpose='password-reset', expiresAt=datetime.utcnow() + timedelta(minutes=5))
    db.session.add(otp)
    db.session.commit()
    return jsonify(ok=True, message='OTP sent', otp=code)


@app.route('/api/auth/reset-password', methods=['POST'])
def auth_reset_password():
    data = request.json
    email, code, new_password = data.get('email'), data.get('code'), data.get('newPassword')
    if not email or not code or not new_password:
        return jsonify(error='All fields are required'), 400
    otp = OTP.query.filter_by(target=email, purpose='password-reset', used=False).order_by(OTP.createdAt.desc()).first()
    if not otp:
        return jsonify(error='OTP not found'), 404
    if not otp_valid(otp.expiresAt):
        return jsonify(error='OTP has expired'), 410
    if otp.code != code:
        return jsonify(error='Invalid OTP'), 400
    otp.used = True
    user = User.query.filter_by(email=email).first()
    user.password = new_password
    db.session.commit()
    return jsonify(ok=True, message='Password changed')


@app.route('/api/auth/update-profile', methods=['POST'])
def auth_update_profile():
    data = request.json
    uid = data.get('userId')
    user = User.query.get(uid)
    if not user:
        return jsonify(error='User not found'), 404
    if 'name' in data:
        user.name = data['name']
    if 'phone' in data:
        user.phone = data['phone']
    if 'avatar' in data:
        user.avatar = data['avatar']
    db.session.commit()
    return jsonify(ok=True, user=user_dict(user))


# ── SEED ─────────────────────────────────────────────────────

@app.route('/api/seed', methods=['POST'])
def api_seed():
    seed_data()
    return jsonify(ok=True, message='Data seeded')


@app.route('/api/auto-seed')
def api_auto_seed():
    seed_data()
    return jsonify(ok=True)


# ── DASHBOARD ────────────────────────────────────────────────

@app.route('/api/app/dashboard/<user_id>')
def dashboard(user_id):
    w = ensure_wallet(user_id)
    pending_tasks = UserTask.query.filter_by(userId=user_id, status='pending').count()
    completed_tasks = UserTask.query.filter_by(userId=user_id, status='completed').count()
    active_investments = UserInvestment.query.filter_by(userId=user_id, status='active').count()
    referral_count = Referral.query.filter_by(referrerId=user_id, status='approved').count()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_tasks = UserTask.query.filter(UserTask.userId == user_id, UserTask.status == 'completed', UserTask.createdAt >= today_start).count()
    recent_tx = Transaction.query.filter_by(userId=user_id).order_by(Transaction.createdAt.desc()).limit(10).all()
    unread_notif = Notification.query.filter_by(userId=user_id, read=False).count()
    active_invs = UserInvestment.query.filter_by(userId=user_id, status='active').all()
    daily_profit = sum(i.dailyProfit for i in active_invs)

    def tx_dict(t):
        return {'id': t.id, 'type': t.type, 'amount': t.amount, 'balance': t.balance, 'detail': t.detail, 'createdAt': t.createdAt.isoformat()}

    return jsonify(
        wallet={
            'mainBalance': w.mainBalance, 'investmentBalance': w.investmentBalance,
            'referralBalance': w.referralBalance, 'bonusBalance': w.bonusBalance,
            'totalEarned': w.earned, 'totalDeposited': w.deposited, 'totalWithdrawn': w.withdrawn,
            'dailyProfit': daily_profit,
        },
        stats={
            'pendingTasks': pending_tasks, 'completedTasks': completed_tasks,
            'activeInvestments': active_investments, 'referralCount': referral_count,
            'todayTasks': today_tasks, 'unreadNotif': unread_notif,
        },
        recentTransactions=[tx_dict(t) for t in recent_tx],
    )


# ── TASKS ────────────────────────────────────────────────────

@app.route('/api/app/user-tasks/<user_id>')
def user_tasks(user_id):
    tasks = Task.query.filter_by(active=True).all()
    user_tasks = UserTask.query.filter_by(userId=user_id).all()
    ut_map = {ut.taskId: ut for ut in user_tasks}
    task_list = []
    for t in tasks:
        ut = ut_map.get(t.id)
        task_list.append({
            'id': t.id, 'title': t.title, 'description': t.description,
            'reward': t.reward, 'category': t.category, 'link': t.link,
            'duration': t.duration, 'requireVisit': t.requireVisit,
            'status': ut.status if ut else 'available',
        })
    completed = sum(1 for ut in user_tasks if ut.status == 'completed')
    return jsonify(tasks=task_list, completed=completed, total=len(tasks))


@app.route('/api/app/tasks/complete', methods=['POST'])
def complete_task():
    data = request.json
    user_id, task_id = data.get('userId'), data.get('taskId')
    if not user_id or not task_id:
        return jsonify(error='userId and taskId required'), 400
    existing = UserTask.query.filter_by(userId=user_id, taskId=task_id).first()
    if existing and existing.status == 'completed':
        return jsonify(error='Task already completed'), 409
    task = Task.query.get(task_id)
    if not task:
        return jsonify(error='Task not found'), 404
    if not get_setting_bool('tasksEnabled', True):
        return jsonify(error='Tasks are disabled'), 403
    if task.requireVisit and task.duration > 0:
        view_seconds = data.get('viewTime', 0) or 0
        if view_seconds < task.duration:
            return jsonify(error=f'You must watch for at least {task.duration} seconds'), 403
    if existing:
        existing.status = 'completed'
        existing.completedAt = datetime.utcnow()
    else:
        db.session.add(UserTask(userId=user_id, taskId=task_id, status='completed', completedAt=datetime.utcnow()))
    db.session.commit()
    w = ensure_wallet(user_id)
    new_balance = w.balance + task.reward
    w.balance = new_balance
    w.mainBalance = new_balance
    w.earned = w.earned + task.reward
    db.session.commit()
    record_tx(user_id, 'task_reward', task.reward, new_balance, f'Task: {task.title}')
    notify(user_id, 'Task Completed!', f'You received {task.reward} PKR reward.', 'reward')
    return jsonify(ok=True, reward=task.reward, balance=new_balance)


# ── INVESTMENTS ──────────────────────────────────────────────

@app.route('/api/app/investment-plans')
def investment_plans():
    plans = InvestmentPlan.query.filter_by(active=True).all()
    return jsonify(plans=[{
        'id': p.id, 'name': p.name, 'description': p.description,
        'amount': p.amount, 'dailyProfit': p.dailyProfit, 'duration': p.duration,
    } for p in plans])


@app.route('/api/app/investments/<user_id>')
def user_investments(user_id):
    investments = UserInvestment.query.filter_by(userId=user_id).order_by(UserInvestment.createdAt.desc()).all()
    result = []
    for inv in investments:
        p = InvestmentPlan.query.get(inv.planId)
        result.append({
            'id': inv.id, 'userId': inv.userId, 'planId': inv.planId,
            'amount': inv.amount, 'dailyProfit': inv.dailyProfit,
            'totalProfit': inv.totalProfit, 'daysPassed': inv.daysPassed,
            'status': inv.status, 'createdAt': inv.createdAt.isoformat(),
            'plan': {'id': p.id, 'name': p.name, 'amount': p.amount, 'dailyProfit': p.dailyProfit, 'duration': p.duration} if p else None,
        })
    return jsonify(investments=result)


@app.route('/api/app/investments', methods=['POST'])
def create_investment():
    data = request.json
    user_id, plan_id = data.get('userId'), data.get('planId')
    if not user_id or not plan_id:
        return jsonify(error='userId and planId required'), 400
    if not get_setting_bool('investmentsEnabled', True):
        return jsonify(error='Investments are disabled'), 403
    plan = InvestmentPlan.query.get(plan_id)
    if not plan:
        return jsonify(error='Plan not found'), 404
    w = ensure_wallet(user_id)
    if w.balance < plan.amount:
        return jsonify(error='Insufficient balance'), 400
    end_date = datetime.utcnow() + timedelta(days=plan.duration)
    inv = UserInvestment(userId=user_id, planId=plan_id, amount=plan.amount, dailyProfit=plan.dailyProfit, endDate=end_date)
    db.session.add(inv)
    new_balance = w.balance - plan.amount
    w.balance = new_balance
    w.mainBalance = new_balance
    db.session.commit()
    record_tx(user_id, 'investment', -plan.amount, new_balance, f'Investment: {plan.name}')
    notify(user_id, '💰 Investment Activated!', f'Your "{plan.name}" plan activated.', 'investment')
    user = User.query.get(user_id)
    if user and user.referredBy:
        referrer = User.query.filter_by(referralCode=user.referredBy).first()
        if referrer:
            ref = Referral.query.filter_by(referrerId=referrer.id, referredId=user_id).first()
            if ref and ref.status == 'pending':
                ref_reward = float(get_setting('referralReward', '100'))
                rw = ensure_wallet(referrer.id)
                ref_new_balance = rw.balance + ref_reward
                rw.balance = ref_new_balance
                rw.mainBalance = ref_new_balance
                rw.earned = rw.earned + ref_reward
                ref.status = 'approved'
                ref.reward = ref_reward
                db.session.commit()
                record_tx(referrer.id, 'referral_reward', ref_reward, ref_new_balance, f'Referral: {user.name}')
                notify(referrer.id, '🎉 Referral Bonus!', f'You received {ref_reward} PKR referral bonus.', 'reward')
    return jsonify(ok=True, balance=new_balance, message='Investment activated')


# ── WALLET ───────────────────────────────────────────────────

@app.route('/api/app/wallet/<user_id>')
def get_wallet(user_id):
    w = ensure_wallet(user_id)
    return jsonify(wallet={
        'id': w.id, 'userId': w.userId, 'balance': w.balance,
        'mainBalance': w.mainBalance, 'earned': w.earned,
        'deposited': w.deposited, 'withdrawn': w.withdrawn,
        'investmentBalance': w.investmentBalance, 'referralBalance': w.referralBalance,
        'bonusBalance': w.bonusBalance,
    })


# ── CALCULATOR ───────────────────────────────────────────────

@app.route('/api/app/calculator')
def calculator():
    investment = float(request.args.get('investment', 10000))
    plan_id = request.args.get('planId')
    daily_profit = investment * 0.02
    duration = 30
    if plan_id:
        plan = InvestmentPlan.query.get(plan_id)
        if plan:
            daily_profit = plan.dailyProfit
            duration = plan.duration
    total_profit = daily_profit * duration
    return jsonify(
        investment=investment, dailyProfit=daily_profit,
        weeklyProfit=daily_profit * 7, monthlyProfit=daily_profit * duration,
        duration=duration, totalProfit=total_profit,
        totalReturn=investment + total_profit,
        roi=round((total_profit / investment) * 100, 1),
        startDate=datetime.utcnow().isoformat(),
        endDate=(datetime.utcnow() + timedelta(days=duration)).isoformat(),
        currency='PKR',
    )


# ── DEPOSITS ─────────────────────────────────────────────────

@app.route('/api/app/deposits/<user_id>')
def user_deposits(user_id):
    deposits = Deposit.query.filter_by(userId=user_id).order_by(Deposit.createdAt.desc()).all()
    return jsonify(deposits=[{
        'id': d.id, 'amount': d.amount, 'method': d.method,
        'status': d.status, 'createdAt': d.createdAt.isoformat(),
        'screenshot': d.screenshot,
    } for d in deposits])


@app.route('/api/app/deposits', methods=['POST'])
def create_deposit():
    data = request.json
    user_id, amount, method = data.get('userId'), data.get('amount'), data.get('method')
    if not user_id or not amount or not method:
        return jsonify(error='Required fields are incomplete'), 400
    if not get_setting_bool('depositsEnabled', True):
        return jsonify(error='Deposits are disabled'), 403
    min_dep = float(get_setting('minDeposit', '100'))
    max_dep = float(get_setting('maxDeposit', '500000'))
    if amount < min_dep:
        return jsonify(error=f'Minimum deposit is {min_dep} PKR'), 400
    if amount > max_dep:
        return jsonify(error=f'Maximum deposit is {max_dep} PKR'), 400
    deposit = Deposit(userId=user_id, amount=float(amount), method=method,
                      accountName=data.get('accountName'), accountNumber=data.get('accountNumber'),
                      screenshot=data.get('screenshot'))
    db.session.add(deposit)
    db.session.commit()
    notify(user_id, '📤 Deposit Request Submitted', f'Your {amount} PKR deposit request submitted.', 'info')
    return jsonify(ok=True, message='✅ Deposit request submitted. Please wait for approval.')


# ── UPLOAD ───────────────────────────────────────────────────

@app.route('/api/app/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify(error='No file uploaded'), 400
    file = request.files['file']
    if not file.filename:
        return jsonify(error='No file selected'), 400
    ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'png'
    filename = f'upload_{secrets.token_hex(6)}.{ext}'
    upload_dir = os.path.join(app.static_folder or 'dist', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))
    return jsonify(ok=True, url=f'/uploads/{filename}', filename=filename)


# ── WITHDRAWALS ──────────────────────────────────────────────

@app.route('/api/app/withdrawals/<user_id>')
def user_withdrawals(user_id):
    withdrawals = Withdrawal.query.filter_by(userId=user_id).order_by(Withdrawal.createdAt.desc()).all()
    return jsonify(withdrawals=[{
        'id': w.id, 'amount': w.amount, 'method': w.method,
        'accountName': w.accountName, 'accountNumber': w.accountNumber,
        'status': w.status, 'createdAt': w.createdAt.isoformat(),
    } for w in withdrawals])


@app.route('/api/app/withdrawals', methods=['POST'])
def create_withdrawal():
    data = request.json
    user_id = data.get('userId')
    amount = data.get('amount')
    method = data.get('method')
    account_number = data.get('accountNumber')
    if not user_id or not amount or not method or not account_number:
        return jsonify(error='Required fields are incomplete'), 400
    if not get_setting_bool('withdrawalsEnabled', True):
        return jsonify(error='Withdrawals are disabled'), 403
    min_wd = float(get_setting('minWithdrawal', '500'))
    if amount < min_wd:
        return jsonify(error=f'Minimum withdrawal is {min_wd} PKR'), 400
    w = ensure_wallet(user_id)
    if w.balance < amount:
        return jsonify(error='Insufficient balance'), 400
    wd = Withdrawal(userId=user_id, amount=float(amount), method=method,
                    accountName=data.get('accountName'), accountNumber=account_number)
    db.session.add(wd)
    db.session.commit()
    notify(user_id, '📥 Withdrawal Request', f'Your {amount} PKR withdrawal request submitted.', 'info')
    return jsonify(ok=True, message='✅ Withdrawal request submitted.')


# ── REFERRALS ────────────────────────────────────────────────

@app.route('/api/app/referrals/<user_id>')
def user_referrals(user_id):
    user = User.query.get(user_id)
    referrals = Referral.query.filter_by(referrerId=user_id).all()
    total_reward = sum(r.reward for r in referrals if r.status == 'approved')
    ref_list = []
    for r in referrals:
        u = User.query.get(r.referredId)
        ref_list.append({
            'id': r.id, 'status': r.status, 'reward': r.reward, 'createdAt': r.createdAt.isoformat(),
            'referred': {'name': u.name if u else None, 'email': u.email if u else None,
                         'verified': u.verified if u else False, 'createdAt': u.createdAt.isoformat() if u else None} if u else None,
        })
    return jsonify(referralCode=user.referralCode if user else None, referrals=ref_list, totalReward=total_reward, count=len(referrals))


# ── NOTIFICATIONS ────────────────────────────────────────────

@app.route('/api/app/notifications/<user_id>')
def user_notifications(user_id):
    notifications = Notification.query.filter_by(userId=user_id).order_by(Notification.createdAt.desc()).limit(50).all()
    unread = Notification.query.filter_by(userId=user_id, read=False).count()
    return jsonify(notifications=[{
        'id': n.id, 'title': n.title, 'message': n.message,
        'type': n.type, 'read': n.read, 'createdAt': n.createdAt.isoformat(),
    } for n in notifications], unread=unread)


@app.route('/api/app/notifications/read', methods=['POST'])
def mark_notification_read():
    nid = request.json.get('notificationId')
    n = Notification.query.get(nid)
    if n:
        n.read = True
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/notifications/read-all', methods=['POST'])
def mark_all_read():
    uid = request.json.get('userId')
    Notification.query.filter_by(userId=uid, read=False).update({'read': True})
    db.session.commit()
    return jsonify(ok=True)


# ── TEAM ─────────────────────────────────────────────────────

@app.route('/api/app/team/<user_id>')
def user_team(user_id):
    referrals = Referral.query.filter_by(referrerId=user_id, status='approved').all()
    team = []
    for r in referrals:
        u = User.query.get(r.referredId)
        if u:
            team.append({
                'id': u.id, 'name': u.name, 'email': u.email,
                'joinedAt': u.createdAt.isoformat(), 'reward': r.reward,
            })
    return jsonify(team=team, count=len(team))


# ── HISTORY ──────────────────────────────────────────────────

@app.route('/api/app/history/<user_id>')
def user_history(user_id):
    def tx_dict(t):
        return {'id': t.id, 'type': t.type, 'amount': t.amount, 'balance': t.balance, 'detail': t.detail, 'createdAt': t.createdAt.isoformat()}
    def dep_dict(d):
        return {'id': d.id, 'amount': d.amount, 'method': d.method, 'status': d.status, 'createdAt': d.createdAt.isoformat()}
    def wd_dict(w):
        return {'id': w.id, 'amount': w.amount, 'method': w.method, 'status': w.status, 'createdAt': w.createdAt.isoformat()}
    def inv_dict(i):
        p = InvestmentPlan.query.get(i.planId)
        return {'id': i.id, 'amount': i.amount, 'status': i.status, 'createdAt': i.createdAt.isoformat(),
                'plan': {'name': p.name, 'duration': p.duration} if p else None}
    def task_dict(ut):
        t = Task.query.get(ut.taskId)
        return {'id': ut.id, 'status': ut.status, 'createdAt': ut.createdAt.isoformat(),
                'task': {'title': t.title, 'reward': t.reward} if t else None}
    def login_dict(l):
        return {'id': l.id, 'device': l.device, 'browser': l.browser, 'ip': l.ip, 'status': l.status, 'createdAt': l.createdAt.isoformat()}

    transactions = Transaction.query.filter_by(userId=user_id).order_by(Transaction.createdAt.desc()).all()
    deposits = Deposit.query.filter_by(userId=user_id).order_by(Deposit.createdAt.desc()).all()
    withdrawals = Withdrawal.query.filter_by(userId=user_id).order_by(Withdrawal.createdAt.desc()).all()
    investments = UserInvestment.query.filter_by(userId=user_id).order_by(UserInvestment.createdAt.desc()).all()
    tasks = UserTask.query.filter_by(userId=user_id).order_by(UserTask.createdAt.desc()).all()
    login_history = LoginHistory.query.filter_by(userId=user_id).order_by(LoginHistory.createdAt.desc()).limit(50).all()

    return jsonify(
        transactions=[tx_dict(t) for t in transactions],
        deposits=[dep_dict(d) for d in deposits],
        withdrawals=[wd_dict(w) for w in withdrawals],
        investments=[inv_dict(i) for i in investments],
        tasks=[task_dict(t) for t in tasks],
        loginHistory=[login_dict(l) for l in login_history],
    )


# ── COMMUNITY ────────────────────────────────────────────────

@app.route('/api/app/community/posts')
def community_posts():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    total = Post.query.count()
    posts = Post.query.order_by(Post.pinned.desc(), Post.createdAt.desc()).offset((page - 1) * limit).limit(limit).all()
    result = []
    for p in posts:
        u = User.query.get(p.userId)
        comments = []
        for c in Comment.query.filter_by(postId=p.id, parentId=None).order_by(Comment.createdAt.asc()).all():
            cu = User.query.get(c.userId)
            replies = []
            for r in Comment.query.filter_by(parentId=c.id).order_by(Comment.createdAt.asc()).all():
                ru = User.query.get(r.userId)
                replies.append({'id': r.id, 'content': r.content, 'createdAt': r.createdAt.isoformat(),
                                'user': {'id': ru.id, 'name': ru.name, 'avatar': ru.avatar} if ru else None})
            comments.append({
                'id': c.id, 'content': c.content, 'createdAt': c.createdAt.isoformat(),
                'userId': c.userId, 'parentId': c.parentId,
                'user': {'id': cu.id, 'name': cu.name, 'avatar': cu.avatar} if cu else None,
                'replies': replies,
            })
        likes = Like.query.filter_by(postId=p.id).all()
        result.append({
            'id': p.id, 'content': p.content, 'createdAt': p.createdAt.isoformat(), 'userId': p.userId,
            'user': {'id': u.id, 'name': u.name, 'avatar': u.avatar, 'role': u.role} if u else None,
            'comments': comments, 'likes': [{'userId': l.userId} for l in likes],
        })
    return jsonify(posts=result, total=total, page=page, hasMore=(page - 1) * limit + limit < total)


@app.route('/api/app/community/posts', methods=['POST'])
def create_post():
    data = request.json
    user_id, content = data.get('userId'), data.get('content')
    if not user_id or not content:
        return jsonify(error='Post cannot be empty'), 400
    post = Post(userId=user_id, content=content, image=data.get('image'))
    db.session.add(post)
    db.session.commit()
    return jsonify(ok=True, post={'id': post.id, 'content': post.content, 'createdAt': post.createdAt.isoformat()})


@app.route('/api/app/community/posts/<post_id>', methods=['DELETE'])
def delete_post(post_id):
    data = request.json or {}
    user_id = data.get('userId')
    is_admin = data.get('isAdmin', False)
    post = Post.query.get(post_id)
    if not post:
        return jsonify(error='Post not found'), 404
    if post.userId != user_id and not is_admin:
        return jsonify(error='Not authorized'), 403
    Comment.query.filter_by(postId=post_id).delete()
    Like.query.filter_by(postId=post_id).delete()
    db.session.delete(post)
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/community/posts/<post_id>/like', methods=['POST'])
def toggle_like(post_id):
    user_id = request.json.get('userId')
    existing = Like.query.filter_by(postId=post_id, userId=user_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify(ok=True, liked=False)
    db.session.add(Like(postId=post_id, userId=user_id))
    db.session.commit()
    return jsonify(ok=True, liked=True)


@app.route('/api/app/community/posts/<post_id>/comment', methods=['POST'])
def add_comment(post_id):
    data = request.json
    user_id, content = data.get('userId'), data.get('content')
    if not content:
        return jsonify(error='Comment cannot be empty'), 400
    comment = Comment(postId=post_id, userId=user_id, content=content, parentId=data.get('parentId'))
    db.session.add(comment)
    db.session.commit()
    cu = User.query.get(user_id)
    return jsonify(ok=True, comment={
        'id': comment.id, 'content': comment.content, 'createdAt': comment.createdAt.isoformat(),
        'user': {'id': cu.id, 'name': cu.name, 'avatar': cu.avatar} if cu else None,
    })


@app.route('/api/app/community/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    data = request.json or {}
    user_id = data.get('userId')
    is_admin = data.get('isAdmin', False)
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify(error='Comment not found'), 404
    if comment.userId != user_id and not is_admin:
        return jsonify(error='Not authorized'), 403
    Comment.query.filter_by(parentId=comment_id).delete()
    db.session.delete(comment)
    db.session.commit()
    return jsonify(ok=True)


# ── ADMIN ────────────────────────────────────────────────────

@app.route('/api/app/admin/stats')
def admin_stats():
    from sqlalchemy import func
    total_users = User.query.count()
    total_deposits = db.session.query(func.sum(Deposit.amount)).filter_by(status='approved').scalar() or 0
    total_withdrawals = db.session.query(func.sum(Withdrawal.amount)).filter_by(status='approved').scalar() or 0
    total_investments = db.session.query(func.sum(UserInvestment.amount)).filter_by(status='active').scalar() or 0
    pending_deposits = Deposit.query.filter_by(status='pending').count()
    pending_withdrawals = Withdrawal.query.filter_by(status='pending').count()
    active_investments = UserInvestment.query.filter_by(status='active').count()
    return jsonify(totalUsers=total_users, totalDeposits=total_deposits, totalWithdrawals=total_withdrawals,
                   totalInvestments=total_investments, pendingDeposits=pending_deposits,
                   pendingWithdrawals=pending_withdrawals, activeInvestments=active_investments)


@app.route('/api/app/admin/users')
def admin_users():
    users = User.query.order_by(User.createdAt.desc()).all()
    return jsonify(users=[{
        'id': u.id, 'name': u.name, 'email': u.email, 'role': u.role,
        'active': u.active, 'verified': u.verified, 'referralCode': u.referralCode,
        'createdAt': u.createdAt.isoformat(), 'phone': u.phone, 'avatar': u.avatar,
    } for u in users])


@app.route('/api/app/admin/deposits')
def admin_deposits():
    deposits = Deposit.query.order_by(Deposit.createdAt.desc()).all()
    result = []
    for d in deposits:
        u = User.query.get(d.userId)
        result.append({
            'id': d.id, 'amount': d.amount, 'method': d.method, 'status': d.status,
            'screenshot': d.screenshot, 'createdAt': d.createdAt.isoformat(),
            'user': {'name': u.name, 'email': u.email} if u else None,
        })
    return jsonify(deposits=result)


@app.route('/api/app/admin/deposits/<deposit_id>/approve', methods=['POST'])
def approve_deposit(deposit_id):
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify(error='Deposit not found'), 404
    if deposit.status != 'pending':
        return jsonify(error='Already processed'), 400
    deposit.status = 'approved'
    w = ensure_wallet(deposit.userId)
    new_balance = w.balance + deposit.amount
    w.balance = new_balance
    w.mainBalance = new_balance
    w.deposited = w.deposited + deposit.amount
    db.session.commit()
    record_tx(deposit.userId, 'deposit', deposit.amount, new_balance, f'Deposit: {deposit.method}')
    notify(deposit.userId, '✅ Deposit Approved!', f'Your {deposit.amount} PKR deposit approved.', 'success')
    return jsonify(ok=True)


@app.route('/api/app/admin/deposits/<deposit_id>/reject', methods=['POST'])
def reject_deposit(deposit_id):
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify(error='Deposit not found'), 404
    reason = (request.json or {}).get('reason', '')
    deposit.status = 'rejected'
    deposit.adminNote = reason
    db.session.commit()
    notify(deposit.userId, '❌ Deposit Rejected', f'Your {deposit.amount} PKR deposit rejected. {reason}', 'error')
    return jsonify(ok=True)


@app.route('/api/app/admin/withdrawals')
def admin_withdrawals():
    withdrawals = Withdrawal.query.order_by(Withdrawal.createdAt.desc()).all()
    result = []
    for w in withdrawals:
        u = User.query.get(w.userId)
        result.append({
            'id': w.id, 'amount': w.amount, 'method': w.method, 'status': w.status,
            'accountNumber': w.accountNumber, 'createdAt': w.createdAt.isoformat(),
            'user': {'name': u.name, 'email': u.email} if u else None,
        })
    return jsonify(withdrawals=result)


@app.route('/api/app/admin/withdrawals/<wd_id>/approve', methods=['POST'])
def approve_withdrawal(wd_id):
    wd = Withdrawal.query.get(wd_id)
    if not wd:
        return jsonify(error='Withdrawal not found'), 404
    if wd.status != 'pending':
        return jsonify(error='Already processed'), 400
    w = ensure_wallet(wd.userId)
    if w.balance < wd.amount:
        return jsonify(error='Insufficient balance'), 400
    new_balance = w.balance - wd.amount
    w.balance = new_balance
    w.mainBalance = new_balance
    w.withdrawn = w.withdrawn + wd.amount
    wd.status = 'approved'
    db.session.commit()
    record_tx(wd.userId, 'withdrawal', -wd.amount, new_balance, f'Withdrawal: {wd.method}')
    notify(wd.userId, '✅ Withdrawal Approved!', f'Your {wd.amount} PKR withdrawal approved.', 'success')
    return jsonify(ok=True)


@app.route('/api/app/admin/withdrawals/<wd_id>/reject', methods=['POST'])
def reject_withdrawal(wd_id):
    wd = Withdrawal.query.get(wd_id)
    if not wd:
        return jsonify(error='Withdrawal not found'), 404
    reason = (request.json or {}).get('reason', '')
    wd.status = 'rejected'
    wd.adminNote = reason
    db.session.commit()
    notify(wd.userId, '❌ Withdrawal Rejected', f'Your {wd.amount} PKR withdrawal rejected. {reason}', 'error')
    return jsonify(ok=True)


@app.route('/api/app/admin/users/<user_id>/role', methods=['POST'])
def change_role(user_id):
    role = request.json.get('role')
    user = User.query.get(user_id)
    if user:
        user.role = role
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/users/<user_id>/toggle-active', methods=['POST'])
def toggle_active(user_id):
    user = User.query.get(user_id)
    if user:
        user.active = not user.active
        db.session.commit()
    return jsonify(ok=True, active=user.active if user else False)


@app.route('/api/app/admin/force-logout', methods=['POST'])
def force_logout():
    uid = request.json.get('userId')
    user = User.query.get(uid)
    if user:
        OTP.query.filter_by(target=user.email, used=False).update({'used': True})
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/settings')
def admin_settings():
    settings = Setting.query.all()
    return jsonify(settings={s.key: s.value for s in settings})


@app.route('/api/app/admin/settings', methods=['POST'])
def save_settings():
    for key, value in request.json.items():
        existing = Setting.query.filter_by(key=key).first()
        if existing:
            existing.value = str(value)
        else:
            db.session.add(Setting(key=key, value=str(value)))
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/plans')
def admin_plans():
    plans = InvestmentPlan.query.order_by(InvestmentPlan.createdAt.desc()).all()
    return jsonify(plans=[{
        'id': p.id, 'name': p.name, 'description': p.description,
        'amount': p.amount, 'dailyProfit': p.dailyProfit, 'duration': p.duration,
        'active': p.active,
    } for p in plans])


@app.route('/api/app/admin/plans', methods=['POST'])
def create_plan():
    data = request.json
    p = InvestmentPlan(
        name=data['name'], description=data.get('description', ''),
        amount=float(data['amount']), dailyProfit=float(data['dailyProfit']),
        duration=int(data['duration']), active=data.get('active', True) is not False,
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/plans/<plan_id>', methods=['PUT'])
def update_plan(plan_id):
    p = InvestmentPlan.query.get(plan_id)
    if not p:
        return jsonify(error='Not found'), 404
    data = request.json
    if 'name' in data: p.name = data['name']
    if 'description' in data: p.description = data['description']
    if 'amount' in data: p.amount = float(data['amount'])
    if 'dailyProfit' in data: p.dailyProfit = float(data['dailyProfit'])
    if 'duration' in data: p.duration = int(data['duration'])
    if 'active' in data: p.active = data['active']
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/plans/<plan_id>', methods=['DELETE'])
def delete_plan(plan_id):
    p = InvestmentPlan.query.get(plan_id)
    if p:
        db.session.delete(p)
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/tasks')
def admin_tasks():
    tasks = Task.query.order_by(Task.createdAt.desc()).all()
    return jsonify(tasks=[{
        'id': t.id, 'title': t.title, 'description': t.description,
        'reward': t.reward, 'category': t.category, 'active': t.active,
        'link': t.link, 'duration': t.duration, 'requireVisit': t.requireVisit,
    } for t in tasks])


@app.route('/api/app/admin/tasks', methods=['POST'])
def create_task():
    data = request.json
    t = Task(
        title=data['title'], description=data.get('description', ''),
        reward=float(data['reward']), category=data.get('category', 'general'),
        active=data.get('active', True) is not False,
        link=data.get('link'), duration=int(data.get('duration', 0) or 0),
        requireVisit=data.get('requireVisit', False),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    t = Task.query.get(task_id)
    if not t:
        return jsonify(error='Not found'), 404
    data = request.json
    if 'title' in data: t.title = data['title']
    if 'description' in data: t.description = data['description']
    if 'reward' in data: t.reward = float(data['reward'])
    if 'category' in data: t.category = data['category']
    if 'active' in data: t.active = data['active']
    if 'link' in data: t.link = data['link'] or None
    if 'duration' in data: t.duration = int(data['duration'] or 0)
    if 'requireVisit' in data: t.requireVisit = data['requireVisit']
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    t = Task.query.get(task_id)
    if t:
        db.session.delete(t)
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/broadcast', methods=['POST'])
def broadcast():
    data = request.json
    users = User.query.all()
    for u in users:
        db.session.add(Notification(userId=u.id, title=data.get('title', '📢 Announcement'),
                                    message=data.get('message', ''), type=data.get('type', 'info')))
    db.session.commit()
    return jsonify(ok=True, sent=len(users))


@app.route('/api/app/admin/calculate-profits', methods=['POST'])
def calculate_profits():
    active = UserInvestment.query.filter_by(status='active').all()
    for inv in active:
        w = ensure_wallet(inv.userId)
        new_balance = w.balance + inv.dailyProfit
        w.balance = new_balance
        w.mainBalance = new_balance
        w.earned = w.earned + inv.dailyProfit
        inv.totalProfit += inv.dailyProfit
        inv.daysPassed += 1
        record_tx(inv.userId, 'daily_profit', inv.dailyProfit, new_balance, f'Daily profit')
        plan = InvestmentPlan.query.get(inv.planId)
        if inv.daysPassed >= (plan.duration if plan else 30):
            inv.status = 'completed'
            notify(inv.userId, '🎉 Investment Completed!', f'Total profit: {inv.totalProfit} PKR', 'investment')
        else:
            notify(inv.userId, '💰 Daily Profit', f'{inv.dailyProfit} PKR credited.', 'profit')
    db.session.commit()
    return jsonify(ok=True, processed=len(active))


# ── FRONTEND SERVE ───────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(app.static_folder or 'dist', path)):
        return send_from_directory(app.static_folder or 'dist', path)
    return send_from_directory(app.static_folder or 'dist', 'index.html')


# ── MAIN ─────────────────────────────────────────────────────

if __name__ == '__main__':
    with app.app_context():
        seed_data()
    port = int(os.environ.get('PORT', 5000))
    print(f'🚀 Backend running on http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
