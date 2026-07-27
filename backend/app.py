import os
import hashlib
import secrets
from datetime import datetime, timedelta

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

# Allow the deployed frontend (and local dev) to call this API from another origin.
CORS(app, resources={r"/api/*": {"origins": "*"}})
db.init_app(app)


# ── helpers ──────────────────────────────────────────────────

def hash_pw(pw):
    return hashlib.sha256((pw or '').encode()).hexdigest()


def gen_otp():
    return str(secrets.randbelow(900000) + 100000)


def gen_ref_code():
    return secrets.token_hex(4).upper()


def ensure_wallet(user_id):
    w = Wallet.query.filter_by(userId=user_id).first()
    if not w:
        w = Wallet(userId=user_id)
        db.session.add(w)
        db.session.commit()
    return w


def daily_profit_for(user_id):
    invs = UserInvestment.query.filter_by(userId=user_id, status='active').all()
    return sum(i.dailyProfit for i in invs)


def wallet_dict(w, dp=0):
    return {
        'mainBalance': w.mainBalance,
        'balance': w.balance,
        'totalEarned': w.earned,
        'earned': w.earned,
        'totalDeposited': w.deposited,
        'deposited': w.deposited,
        'totalWithdrawn': w.withdrawn,
        'withdrawn': w.withdrawn,
        'investmentBalance': w.investmentBalance,
        'referralBalance': w.referralBalance,
        'bonusBalance': w.bonusBalance,
        'dailyProfit': dp,
    }


def record_tx(user_id, tx_type, amount, balance, detail=None):
    db.session.add(Transaction(userId=user_id, type=tx_type, amount=amount, balance=balance, detail=detail))
    db.session.commit()


def notify(user_id, title, message, ntype='info'):
    db.session.add(Notification(userId=user_id, title=title, message=message, type=ntype))
    db.session.commit()


def get_setting(key, fallback=''):
    s = Setting.query.filter_by(key=key).first()
    return s.value if s and s.value is not None else fallback


def set_setting(key, value):
    s = Setting.query.filter_by(key=key).first()
    if s:
        s.value = str(value)
    else:
        db.session.add(Setting(key=key, value=str(value)))
    db.session.commit()


def user_dict(u):
    return {
        'id': u.id, 'email': u.email, 'name': u.name, 'role': u.role,
        'referralCode': u.referralCode, 'avatar': u.avatar,
        'phone': u.phone, 'verified': u.verified, 'active': u.active,
    }


DEFAULT_SETTINGS = {
    'maintenanceMode': 'false',
    'tasksEnabled': 'true',
    'investmentsEnabled': 'true',
    'depositsEnabled': 'true',
    'withdrawalsEnabled': 'true',
    'referralsEnabled': 'true',
    'depositNumberJazzcash': '0300-0000000',
    'depositNumberEasypaisa': '0300-0000000',
    'depositNumberBank': '',
    'depositNumberUsdt': '',
    'minDeposit': '500',
    'maxDeposit': '100000',
    'minWithdrawal': '1000',
    'referralReward': '200',
}


def seed_data():
    db.create_all()

    for k, v in DEFAULT_SETTINGS.items():
        if Setting.query.filter_by(key=k).first() is None:
            db.session.add(Setting(key=k, value=v))
    db.session.commit()

    if Task.query.count() == 0:
        db.session.add_all([
            Task(title='Download App', description='Download and install our app', reward=50, category='app'),
            Task(title='Watch Video', description='Watch a short video', reward=25, category='video', duration=10, link='https://www.youtube.com'),
            Task(title='Follow Social Media', description='Follow our social accounts', reward=30, category='social'),
            Task(title='Write a Review', description='Leave a review on the App Store', reward=40, category='review'),
            Task(title='Refer a Friend', description='Invite a friend to join', reward=60, category='referral'),
            Task(title='Visit Website', description='Visit our website', reward=15, category='visit'),
        ])
        db.session.commit()

    if InvestmentPlan.query.count() == 0:
        db.session.add_all([
            InvestmentPlan(name='Starter Plan', description='Perfect for beginners', amount=1000, dailyProfit=50, duration=30),
            InvestmentPlan(name='Growth Plan', description='Steady returns', amount=5000, dailyProfit=300, duration=30),
            InvestmentPlan(name='Premium Plan', description='High returns', amount=15000, dailyProfit=1000, duration=30),
            InvestmentPlan(name='Elite Plan', description='Maximum returns', amount=50000, dailyProfit=4000, duration=30),
        ])
        db.session.commit()

    admin = User.query.filter_by(email='admin@roshan.com').first()
    if admin is None:
        admin = User(email='admin@roshan.com', name='Admin', password=hash_pw('admin123'),
                     role='admin', active=True, verified=True, referralCode='ADMIN001')
        db.session.add(admin)
        db.session.commit()
        ensure_wallet(admin.id)


with app.app_context():
    seed_data()


@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


# ── HEALTH / SEED ────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify(ok=True, status='online')


@app.route('/api/auto-seed')
def auto_seed():
    seed_data()
    return jsonify(ok=True)


# ── OTP ──────────────────────────────────────────────────────

@app.route('/api/otp/send', methods=['POST'])
def otp_send():
    data = request.json or {}
    target = (data.get('target') or '').strip().lower()
    purpose = data.get('purpose', 'login')
    if not target:
        return jsonify(error='Target is required'), 400
    code = gen_otp()
    OTP.query.filter_by(target=target, purpose=purpose, used=False).delete()
    db.session.add(OTP(target=target, code=code, purpose=purpose,
                       expiresAt=datetime.utcnow() + timedelta(minutes=10)))
    db.session.commit()
    # Demo mode: return the OTP so it can be shown in the UI.
    return jsonify(ok=True, otp=code)


@app.route('/api/otp/verify', methods=['POST'])
def otp_verify():
    data = request.json or {}
    target = (data.get('target') or '').strip().lower()
    code = data.get('code', '')
    purpose = data.get('purpose', 'login')
    otp = (OTP.query.filter_by(target=target, code=code, purpose=purpose, used=False)
           .order_by(OTP.createdAt.desc()).first())
    if not otp:
        return jsonify(error='Invalid OTP'), 400
    if datetime.utcnow() > otp.expiresAt:
        return jsonify(error='OTP expired'), 400
    otp.used = True
    db.session.commit()
    return jsonify(ok=True)


# ── AUTH ─────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    name = (data.get('name') or '').strip()
    phone = data.get('phone', '')
    referral_code = (data.get('referralCode') or '').strip()

    if not email or not password or not name:
        return jsonify(error='Name, email and password are required'), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error='Email already registered'), 400

    code = gen_ref_code()
    while User.query.filter_by(referralCode=code).first():
        code = gen_ref_code()

    user = User(email=email, name=name, phone=phone, password=hash_pw(password),
                referralCode=code, verified=False, active=True)
    if referral_code:
        referrer = User.query.filter_by(referralCode=referral_code).first()
        if referrer:
            user.referredBy = referrer.id
    db.session.add(user)
    db.session.commit()
    ensure_wallet(user.id)

    # Reward the referrer.
    if user.referredBy:
        bonus = float(get_setting('referralReward', '200') or 0)
        rw = ensure_wallet(user.referredBy)
        rw.referralBalance += bonus
        rw.mainBalance += bonus
        rw.balance += bonus
        rw.earned += bonus
        db.session.commit()
        db.session.add(Referral(referrerId=user.referredBy, referredId=user.id,
                                reward=bonus, status='approved'))
        db.session.commit()
        record_tx(user.referredBy, 'referral', bonus, rw.mainBalance, f'Referral bonus for {name}')
        notify(user.referredBy, 'Referral Bonus', f'You earned PKR {bonus} for referring {name}.', 'reward')

    return jsonify(ok=True, user=user_dict(user), token=str(user.id))


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    ua = request.headers.get('User-Agent', '')
    if not user or user.password != hash_pw(password):
        if user:
            db.session.add(LoginHistory(userId=user.id, ip=request.remote_addr,
                                        device=ua, browser=ua[:60], status='failed'))
            db.session.commit()
        return jsonify(error='Invalid email or password'), 401
    if not user.active:
        return jsonify(error='Account deactivated. Contact support.'), 403

    db.session.add(LoginHistory(userId=user.id, ip=request.remote_addr,
                                device=ua, browser=ua[:60], status='success'))
    db.session.commit()
    ensure_wallet(user.id)
    return jsonify(ok=True, user=user_dict(user), token=str(user.id))


@app.route('/api/auth/verify-account', methods=['POST'])
def verify_account():
    data = request.json or {}
    user = User.query.get(data.get('userId'))
    if not user:
        return jsonify(error='User not found'), 404
    user.verified = True
    db.session.commit()
    return jsonify(ok=True, user=user_dict(user))


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error='No account found with this email'), 404
    code = gen_otp()
    OTP.query.filter_by(target=email, purpose='password-reset', used=False).delete()
    db.session.add(OTP(target=email, code=code, purpose='password-reset',
                       expiresAt=datetime.utcnow() + timedelta(minutes=10)))
    db.session.commit()
    return jsonify(ok=True, otp=code)


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    code = data.get('code', '')
    new_password = data.get('newPassword', '')
    if len(new_password) < 6:
        return jsonify(error='Password must be at least 6 characters'), 400
    otp = (OTP.query.filter_by(target=email, code=code, purpose='password-reset', used=False)
           .order_by(OTP.createdAt.desc()).first())
    if not otp or datetime.utcnow() > otp.expiresAt:
        return jsonify(error='Invalid or expired OTP'), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error='User not found'), 404
    user.password = hash_pw(new_password)
    otp.used = True
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/auth/update-profile', methods=['POST'])
def update_profile():
    data = request.json or {}
    user = User.query.get(data.get('userId'))
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


# ── DASHBOARD ────────────────────────────────────────────────

@app.route('/api/app/dashboard/<user_id>')
def dashboard(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify(error='User not found'), 404
    w = ensure_wallet(user_id)
    dp = daily_profit_for(user_id)

    total_tasks = Task.query.filter_by(active=True).count()
    completed_tasks = UserTask.query.filter_by(userId=user_id, status='completed').count()
    active_investments = UserInvestment.query.filter_by(userId=user_id, status='active').count()
    referral_count = Referral.query.filter_by(referrerId=user_id).count()
    unread = Notification.query.filter_by(userId=user_id, read=False).count()

    txs = (Transaction.query.filter_by(userId=user_id)
           .order_by(Transaction.createdAt.desc()).limit(5).all())
    return jsonify(
        wallet=wallet_dict(w, dp),
        stats={
            'pendingTasks': max(0, total_tasks - completed_tasks),
            'completedTasks': completed_tasks,
            'activeInvestments': active_investments,
            'referralCount': referral_count,
            'todayTasks': total_tasks,
            'unreadNotif': unread,
        },
        recentTransactions=[{
            'id': t.id, 'type': t.type, 'detail': t.detail, 'amount': t.amount,
            'createdAt': t.createdAt.isoformat()
        } for t in txs]
    )


# ── WALLET ───────────────────────────────────────────────────

@app.route('/api/app/wallet/<user_id>')
def get_wallet(user_id):
    w = ensure_wallet(user_id)
    return jsonify(ok=True, wallet=wallet_dict(w, daily_profit_for(user_id)))


# ── INVESTMENTS ──────────────────────────────────────────────

@app.route('/api/app/investment-plans')
def investment_plans():
    plans = InvestmentPlan.query.filter_by(active=True).all()
    return jsonify(ok=True, plans=[{
        'id': p.id, 'name': p.name, 'description': p.description,
        'amount': p.amount, 'dailyProfit': p.dailyProfit, 'duration': p.duration
    } for p in plans])


@app.route('/api/app/investments/<user_id>')
def get_investments(user_id):
    invs = (UserInvestment.query.filter_by(userId=user_id)
            .order_by(UserInvestment.createdAt.desc()).all())
    return jsonify(ok=True, investments=[{
        'id': i.id, 'amount': i.amount, 'dailyProfit': i.dailyProfit,
        'totalProfit': i.totalProfit, 'daysPassed': i.daysPassed, 'status': i.status,
        'createdAt': i.createdAt.isoformat(),
        'plan': {'name': i.plan.name, 'duration': i.plan.duration} if i.plan else None,
    } for i in invs])


@app.route('/api/app/investments', methods=['POST'])
def buy_investment():
    data = request.json or {}
    user_id = data.get('userId')
    plan = InvestmentPlan.query.get(data.get('planId'))
    if not plan:
        return jsonify(error='Plan not found'), 404
    w = ensure_wallet(user_id)
    if w.mainBalance < plan.amount:
        return jsonify(error='Insufficient balance'), 400

    w.mainBalance -= plan.amount
    w.balance -= plan.amount
    w.investmentBalance += plan.amount
    db.session.commit()

    inv = UserInvestment(userId=user_id, planId=plan.id, amount=plan.amount,
                         dailyProfit=plan.dailyProfit,
                         endDate=datetime.utcnow() + timedelta(days=plan.duration))
    db.session.add(inv)
    db.session.commit()
    record_tx(user_id, 'investment', -plan.amount, w.mainBalance, f'Invested in {plan.name}')
    notify(user_id, 'Investment Activated', f'{plan.name} activated for PKR {plan.amount}.', 'success')
    return jsonify(ok=True, investment={'id': inv.id, 'status': inv.status})


@app.route('/api/app/calculator')
def calculator():
    investment = float(request.args.get('investment', 0) or 0)
    plan_id = request.args.get('planId')
    if plan_id:
        plan = InvestmentPlan.query.get(plan_id)
        if plan and plan.amount > 0:
            daily = plan.dailyProfit * (investment / plan.amount)
            duration = plan.duration
        else:
            daily = investment * 0.05
            duration = 30
    else:
        daily = investment * 0.05
        duration = 30
    total_profit = daily * duration
    return jsonify(
        investment=round(investment, 2),
        dailyProfit=round(daily, 2),
        weeklyProfit=round(daily * 7, 2),
        monthlyProfit=round(daily * 30, 2),
        duration=duration,
        totalProfit=round(total_profit, 2),
        totalReturn=round(investment + total_profit, 2),
        roi=round((total_profit / investment * 100) if investment else 0, 1),
        endDate=(datetime.utcnow() + timedelta(days=duration)).isoformat(),
    )


# ── TASKS ────────────────────────────────────────────────────

@app.route('/api/app/user-tasks/<user_id>')
def user_tasks(user_id):
    tasks = Task.query.filter_by(active=True).all()
    done = {ut.taskId: ut.status for ut in UserTask.query.filter_by(userId=user_id).all()}
    out = [{
        'id': t.id, 'title': t.title, 'description': t.description,
        'reward': t.reward, 'category': t.category, 'link': t.link,
        'duration': t.duration or 0, 'requireVisit': t.requireVisit,
        'status': done.get(t.id, 'available'),
    } for t in tasks]
    completed = sum(1 for t in out if t['status'] == 'completed')
    return jsonify(ok=True, tasks=out, completed=completed, total=len(out))


@app.route('/api/app/tasks/complete', methods=['POST'])
def complete_task():
    data = request.json or {}
    user_id = data.get('userId')
    task = Task.query.get(data.get('taskId'))
    if not task:
        return jsonify(error='Task not found'), 404
    if UserTask.query.filter_by(userId=user_id, taskId=task.id, status='completed').first():
        return jsonify(error='Task already completed'), 400

    ut = UserTask.query.filter_by(userId=user_id, taskId=task.id).first()
    if ut:
        ut.status = 'completed'
        ut.completedAt = datetime.utcnow()
    else:
        db.session.add(UserTask(userId=user_id, taskId=task.id, status='completed',
                                completedAt=datetime.utcnow()))
    w = ensure_wallet(user_id)
    w.mainBalance += task.reward
    w.balance += task.reward
    w.earned += task.reward
    db.session.commit()
    record_tx(user_id, 'task_reward', task.reward, w.mainBalance, f'Task: {task.title}')
    notify(user_id, 'Task Completed', f'You earned PKR {task.reward} for: {task.title}', 'reward')
    return jsonify(ok=True, reward=task.reward)


# ── DEPOSITS ─────────────────────────────────────────────────

@app.route('/api/app/deposits/<user_id>')
def get_deposits(user_id):
    deps = Deposit.query.filter_by(userId=user_id).order_by(Deposit.createdAt.desc()).all()
    return jsonify(ok=True, deposits=[{
        'id': d.id, 'amount': d.amount, 'method': d.method,
        'status': d.status, 'createdAt': d.createdAt.isoformat()
    } for d in deps])


@app.route('/api/app/deposits', methods=['POST'])
def make_deposit():
    data = request.json or {}
    user_id = data.get('userId')
    amount = float(data.get('amount', 0) or 0)
    method = data.get('method', '')
    if amount <= 0 or not method:
        return jsonify(error='Amount and method are required'), 400
    dep = Deposit(userId=user_id, amount=amount, method=method,
                  screenshot=data.get('screenshot'), status='pending')
    db.session.add(dep)
    db.session.commit()
    notify(user_id, 'Deposit Submitted', f'Your deposit of PKR {amount} is pending approval.', 'info')
    return jsonify(ok=True, message='Deposit submitted successfully. Waiting for approval. \u2705')


# ── WITHDRAWALS ──────────────────────────────────────────────

@app.route('/api/app/withdrawals/<user_id>')
def get_withdrawals(user_id):
    wds = Withdrawal.query.filter_by(userId=user_id).order_by(Withdrawal.createdAt.desc()).all()
    return jsonify(ok=True, withdrawals=[{
        'id': w.id, 'amount': w.amount, 'method': w.method,
        'status': w.status, 'createdAt': w.createdAt.isoformat()
    } for w in wds])


@app.route('/api/app/withdrawals', methods=['POST'])
def request_withdrawal():
    data = request.json or {}
    user_id = data.get('userId')
    amount = float(data.get('amount', 0) or 0)
    method = data.get('method', '')
    if amount <= 0 or not method:
        return jsonify(error='All fields are required'), 400

    min_w = float(get_setting('minWithdrawal', '1000') or 0)
    if amount < min_w:
        return jsonify(error=f'Minimum withdrawal is PKR {int(min_w)}'), 400

    w = ensure_wallet(user_id)
    if w.mainBalance < amount:
        return jsonify(error='Insufficient balance'), 400

    w.mainBalance -= amount
    w.balance -= amount
    w.withdrawn += amount
    db.session.commit()

    wd = Withdrawal(userId=user_id, amount=amount, method=method,
                    accountName=data.get('accountName'), accountNumber=data.get('accountNumber'),
                    status='pending')
    db.session.add(wd)
    db.session.commit()
    record_tx(user_id, 'withdrawal', -amount, w.mainBalance, f'Withdrawal via {method}')
    notify(user_id, 'Withdrawal Requested', f'Your withdrawal of PKR {amount} is pending.', 'info')
    return jsonify(ok=True, message='Withdrawal request submitted successfully. \u2705')


# ── REFERRALS / TEAM ─────────────────────────────────────────

@app.route('/api/app/referrals/<user_id>')
def get_referrals(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify(error='User not found'), 404
    refs = Referral.query.filter_by(referrerId=user_id).order_by(Referral.createdAt.desc()).all()
    total_reward = sum(r.reward for r in refs if r.status == 'approved')
    return jsonify(
        referralCode=user.referralCode,
        count=len(refs),
        totalReward=total_reward,
        referrals=[{
            'id': r.id, 'status': r.status, 'reward': r.reward,
            'referred': {'name': r.referred.name, 'email': r.referred.email} if r.referred else None,
        } for r in refs]
    )


@app.route('/api/app/team/<user_id>')
def get_team(user_id):
    refs = Referral.query.filter_by(referrerId=user_id).order_by(Referral.createdAt.desc()).all()
    team = [{
        'id': r.id,
        'name': r.referred.name if r.referred else 'User',
        'email': r.referred.email if r.referred else '',
        'joinedAt': (r.referred.createdAt.isoformat() if r.referred and r.referred.createdAt
                     else r.createdAt.isoformat()),
        'reward': r.reward,
    } for r in refs]
    return jsonify(ok=True, team=team, count=len(team))


# ── HISTORY ──────────────────────────────────────────────────

@app.route('/api/app/history/<user_id>')
def get_history(user_id):
    deps = Deposit.query.filter_by(userId=user_id).order_by(Deposit.createdAt.desc()).all()
    wds = Withdrawal.query.filter_by(userId=user_id).order_by(Withdrawal.createdAt.desc()).all()
    uts = (UserTask.query.filter_by(userId=user_id, status='completed')
           .order_by(UserTask.createdAt.desc()).all())
    txs = (Transaction.query.filter_by(userId=user_id)
           .order_by(Transaction.createdAt.desc()).limit(50).all())
    logins = (LoginHistory.query.filter_by(userId=user_id)
              .order_by(LoginHistory.createdAt.desc()).limit(20).all())
    return jsonify(
        deposits=[{'id': d.id, 'amount': d.amount, 'method': d.method, 'status': d.status,
                   'createdAt': d.createdAt.isoformat()} for d in deps],
        withdrawals=[{'id': w.id, 'amount': w.amount, 'method': w.method, 'status': w.status,
                      'createdAt': w.createdAt.isoformat()} for w in wds],
        tasks=[{'id': ut.id, 'status': ut.status, 'createdAt': ut.createdAt.isoformat(),
                'task': {'title': ut.task.title, 'reward': ut.task.reward} if ut.task else None}
               for ut in uts],
        transactions=[{'id': t.id, 'type': t.type, 'detail': t.detail, 'amount': t.amount,
                       'createdAt': t.createdAt.isoformat()} for t in txs],
        loginHistory=[{'id': l.id, 'device': l.device, 'browser': l.browser, 'ip': l.ip,
                       'status': l.status, 'createdAt': l.createdAt.isoformat()} for l in logins],
    )


# ── NOTIFICATIONS ────────────────────────────────────────────

@app.route('/api/app/notifications/<user_id>')
def get_notifications(user_id):
    notes = (Notification.query.filter_by(userId=user_id)
             .order_by(Notification.createdAt.desc()).all())
    unread = sum(1 for n in notes if not n.read)
    return jsonify(ok=True, unread=unread, notifications=[{
        'id': n.id, 'title': n.title, 'message': n.message, 'type': n.type,
        'read': n.read, 'createdAt': n.createdAt.isoformat()
    } for n in notes])


@app.route('/api/app/notifications/read', methods=['POST'])
def mark_read():
    data = request.json or {}
    n = Notification.query.get(data.get('notificationId'))
    if n:
        n.read = True
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/notifications/read-all', methods=['POST'])
def mark_all_read():
    data = request.json or {}
    Notification.query.filter_by(userId=data.get('userId'), read=False).update({'read': True})
    db.session.commit()
    return jsonify(ok=True)


# ── COMMUNITY ────────────────────────────────────────────────

def post_dict(p):
    return {
        'id': p.id, 'content': p.content, 'image': p.image, 'userId': p.userId,
        'createdAt': p.createdAt.isoformat(),
        'user': {'name': p.user.name, 'role': p.user.role, 'avatar': p.user.avatar} if p.user else None,
        'likes': [{'id': l.id, 'userId': l.userId} for l in p.likes],
        'comments': [{
            'id': c.id, 'userId': c.userId, 'parentId': c.parentId, 'content': c.content,
            'createdAt': c.createdAt.isoformat(),
            'user': {'name': c.user.name, 'role': c.user.role} if c.user else None,
        } for c in sorted(p.comments, key=lambda c: c.createdAt)],
    }


@app.route('/api/app/community/posts')
def community_posts():
    page = int(request.args.get('page', 1) or 1)
    limit = int(request.args.get('limit', 20) or 20)
    q = Post.query.order_by(Post.pinned.desc(), Post.createdAt.desc())
    total = q.count()
    posts = q.offset((page - 1) * limit).limit(limit).all()
    return jsonify(ok=True, posts=[post_dict(p) for p in posts], hasMore=total > page * limit)


@app.route('/api/app/community/posts', methods=['POST'])
def create_post():
    data = request.json or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify(error='Content required'), 400
    p = Post(userId=data.get('userId'), content=content)
    db.session.add(p)
    db.session.commit()
    return jsonify(ok=True, post={'id': p.id})


@app.route('/api/app/community/posts/<post_id>', methods=['DELETE'])
def delete_post(post_id):
    data = request.json or {}
    p = Post.query.get(post_id)
    if not p:
        return jsonify(error='Not found'), 404
    if p.userId != data.get('userId') and not data.get('isAdmin'):
        return jsonify(error='Not allowed'), 403
    db.session.delete(p)
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/community/posts/<post_id>/like', methods=['POST'])
def like_post(post_id):
    data = request.json or {}
    user_id = data.get('userId')
    if not Post.query.get(post_id):
        return jsonify(error='Not found'), 404
    existing = Like.query.filter_by(postId=post_id, userId=user_id).first()
    if existing:
        db.session.delete(existing)
    else:
        db.session.add(Like(postId=post_id, userId=user_id))
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/community/posts/<post_id>/comment', methods=['POST'])
def add_comment(post_id):
    data = request.json or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify(error='Content required'), 400
    if not Post.query.get(post_id):
        return jsonify(error='Not found'), 404
    c = Comment(postId=post_id, userId=data.get('userId'), content=content,
                parentId=data.get('parentId'))
    db.session.add(c)
    db.session.commit()
    return jsonify(ok=True, comment={'id': c.id})


@app.route('/api/app/community/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    data = request.json or {}
    c = Comment.query.get(comment_id)
    if not c:
        return jsonify(error='Not found'), 404
    if c.userId != data.get('userId') and not data.get('isAdmin'):
        return jsonify(error='Not allowed'), 403
    db.session.delete(c)
    db.session.commit()
    return jsonify(ok=True)


# ── ADMIN ────────────────────────────────────────────────────

@app.route('/api/app/admin/stats')
def admin_stats():
    total_deposits = db.session.query(db.func.sum(Deposit.amount)).filter_by(status='approved').scalar() or 0
    total_withdrawals = db.session.query(db.func.sum(Withdrawal.amount)).filter_by(status='approved').scalar() or 0
    return jsonify(
        totalUsers=User.query.count(),
        activeInvestments=UserInvestment.query.filter_by(status='active').count(),
        totalDeposits=total_deposits,
        totalWithdrawals=total_withdrawals,
        pendingDeposits=Deposit.query.filter_by(status='pending').count(),
        pendingWithdrawals=Withdrawal.query.filter_by(status='pending').count(),
    )


@app.route('/api/app/admin/users')
def admin_users():
    users = User.query.order_by(User.createdAt.desc()).all()
    out = []
    for u in users:
        w = Wallet.query.filter_by(userId=u.id).first()
        out.append({
            'id': u.id, 'name': u.name, 'email': u.email, 'role': u.role,
            'active': u.active, 'verified': u.verified,
            'mainBalance': w.mainBalance if w else 0,
            'createdAt': u.createdAt.isoformat() if u.createdAt else '',
        })
    return jsonify(ok=True, users=out)


@app.route('/api/app/admin/users/<user_id>/role', methods=['POST'])
def admin_set_role(user_id):
    data = request.json or {}
    u = User.query.get(user_id)
    if not u:
        return jsonify(error='Not found'), 404
    u.role = data.get('role', 'user')
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/users/<user_id>/toggle-active', methods=['POST'])
def admin_toggle_active(user_id):
    u = User.query.get(user_id)
    if not u:
        return jsonify(error='Not found'), 404
    u.active = not u.active
    db.session.commit()
    return jsonify(ok=True, active=u.active)


@app.route('/api/app/admin/force-logout', methods=['POST'])
def admin_force_logout():
    return jsonify(ok=True)


@app.route('/api/app/admin/deposits')
def admin_deposits():
    deps = Deposit.query.order_by(Deposit.createdAt.desc()).all()
    return jsonify(ok=True, deposits=[{
        'id': d.id, 'amount': d.amount, 'method': d.method, 'status': d.status,
        'screenshot': d.screenshot, 'createdAt': d.createdAt.isoformat(),
        'user': {'name': d.user.name, 'email': d.user.email} if d.user else None,
    } for d in deps])


@app.route('/api/app/admin/deposits/<dep_id>/approve', methods=['POST'])
def admin_approve_deposit(dep_id):
    d = Deposit.query.get(dep_id)
    if not d:
        return jsonify(error='Not found'), 404
    if d.status != 'approved':
        d.status = 'approved'
        w = ensure_wallet(d.userId)
        w.mainBalance += d.amount
        w.balance += d.amount
        w.deposited += d.amount
        db.session.commit()
        record_tx(d.userId, 'deposit', d.amount, w.mainBalance, f'Deposit approved ({d.method})')
        notify(d.userId, 'Deposit Approved', f'PKR {d.amount} has been credited to your wallet.', 'success')
    return jsonify(ok=True)


@app.route('/api/app/admin/deposits/<dep_id>/reject', methods=['POST'])
def admin_reject_deposit(dep_id):
    data = request.json or {}
    d = Deposit.query.get(dep_id)
    if not d:
        return jsonify(error='Not found'), 404
    d.status = 'rejected'
    d.adminNote = data.get('reason')
    db.session.commit()
    notify(d.userId, 'Deposit Rejected', f'Your deposit of PKR {d.amount} was rejected.', 'error')
    return jsonify(ok=True)


@app.route('/api/app/admin/withdrawals')
def admin_withdrawals():
    wds = Withdrawal.query.order_by(Withdrawal.createdAt.desc()).all()
    return jsonify(ok=True, withdrawals=[{
        'id': w.id, 'amount': w.amount, 'method': w.method, 'status': w.status,
        'accountName': w.accountName, 'accountNumber': w.accountNumber,
        'createdAt': w.createdAt.isoformat(),
        'user': {'name': w.user.name, 'email': w.user.email} if w.user else None,
    } for w in wds])


@app.route('/api/app/admin/withdrawals/<wd_id>/approve', methods=['POST'])
def admin_approve_withdrawal(wd_id):
    w = Withdrawal.query.get(wd_id)
    if not w:
        return jsonify(error='Not found'), 404
    w.status = 'approved'
    db.session.commit()
    notify(w.userId, 'Withdrawal Approved', f'Your withdrawal of PKR {w.amount} has been approved.', 'success')
    return jsonify(ok=True)


@app.route('/api/app/admin/withdrawals/<wd_id>/reject', methods=['POST'])
def admin_reject_withdrawal(wd_id):
    data = request.json or {}
    w = Withdrawal.query.get(wd_id)
    if not w:
        return jsonify(error='Not found'), 404
    if w.status != 'rejected':
        w.status = 'rejected'
        w.adminNote = data.get('reason')
        wallet = ensure_wallet(w.userId)
        wallet.mainBalance += w.amount
        wallet.balance += w.amount
        wallet.withdrawn = max(0, wallet.withdrawn - w.amount)
        db.session.commit()
        record_tx(w.userId, 'refund', w.amount, wallet.mainBalance, 'Withdrawal rejected - refunded')
        notify(w.userId, 'Withdrawal Rejected', f'PKR {w.amount} has been refunded to your wallet.', 'warning')
    return jsonify(ok=True)


@app.route('/api/app/admin/plans')
def admin_plans():
    plans = InvestmentPlan.query.order_by(InvestmentPlan.createdAt.desc()).all()
    return jsonify(ok=True, plans=[{
        'id': p.id, 'name': p.name, 'description': p.description, 'amount': p.amount,
        'dailyProfit': p.dailyProfit, 'duration': p.duration, 'active': p.active
    } for p in plans])


@app.route('/api/app/admin/plans', methods=['POST'])
def admin_create_plan():
    data = request.json or {}
    p = InvestmentPlan(
        name=data.get('name', ''), description=data.get('description', ''),
        amount=float(data.get('amount', 0) or 0),
        dailyProfit=float(data.get('dailyProfit', 0) or 0),
        duration=int(data.get('duration', 30) or 30),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(ok=True, id=p.id)


@app.route('/api/app/admin/plans/<plan_id>', methods=['PUT'])
def admin_update_plan(plan_id):
    data = request.json or {}
    p = InvestmentPlan.query.get(plan_id)
    if not p:
        return jsonify(error='Not found'), 404
    if 'name' in data:
        p.name = data['name']
    if 'description' in data:
        p.description = data['description']
    if 'amount' in data:
        p.amount = float(data['amount'] or 0)
    if 'dailyProfit' in data:
        p.dailyProfit = float(data['dailyProfit'] or 0)
    if 'duration' in data:
        p.duration = int(data['duration'] or 30)
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/plans/<plan_id>', methods=['DELETE'])
def admin_delete_plan(plan_id):
    p = InvestmentPlan.query.get(plan_id)
    if p:
        db.session.delete(p)
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/tasks')
def admin_tasks():
    tasks = Task.query.order_by(Task.createdAt.desc()).all()
    return jsonify(ok=True, tasks=[{
        'id': t.id, 'title': t.title, 'description': t.description, 'reward': t.reward,
        'category': t.category, 'link': t.link, 'duration': t.duration,
        'requireVisit': t.requireVisit, 'active': t.active
    } for t in tasks])


@app.route('/api/app/admin/tasks', methods=['POST'])
def admin_create_task():
    data = request.json or {}
    t = Task(
        title=data.get('title', ''), description=data.get('description', ''),
        reward=float(data.get('reward', 0) or 0), category=data.get('category', 'general'),
        link=data.get('link') or None, duration=int(data.get('duration', 0) or 0),
        requireVisit=bool(data.get('requireVisit', False)),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(ok=True, id=t.id)


@app.route('/api/app/admin/tasks/<task_id>', methods=['PUT'])
def admin_update_task(task_id):
    data = request.json or {}
    t = Task.query.get(task_id)
    if not t:
        return jsonify(error='Not found'), 404
    if 'title' in data:
        t.title = data['title']
    if 'description' in data:
        t.description = data['description']
    if 'reward' in data:
        t.reward = float(data['reward'] or 0)
    if 'category' in data:
        t.category = data['category']
    if 'link' in data:
        t.link = data['link'] or None
    if 'duration' in data:
        t.duration = int(data['duration'] or 0)
    if 'requireVisit' in data:
        t.requireVisit = bool(data['requireVisit'])
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/tasks/<task_id>', methods=['DELETE'])
def admin_delete_task(task_id):
    t = Task.query.get(task_id)
    if t:
        db.session.delete(t)
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/broadcast', methods=['POST'])
def admin_broadcast():
    data = request.json or {}
    users = User.query.all()
    for u in users:
        db.session.add(Notification(
            userId=u.id, title=data.get('title', 'Announcement'),
            message=data.get('message', ''), type=data.get('type', 'info')))
    db.session.commit()
    return jsonify(ok=True, sent=len(users))


@app.route('/api/app/admin/settings', methods=['GET'])
def admin_get_settings():
    settings = {s.key: s.value for s in Setting.query.all()}
    return jsonify(ok=True, settings=settings)


@app.route('/api/app/admin/settings', methods=['POST'])
def admin_save_settings():
    data = request.json or {}
    for key, value in data.items():
        set_setting(key, value)
    return jsonify(ok=True)


# ── FRONTEND SERVE (optional, when built together) ───────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    static_dir = app.static_folder or 'dist'
    if path and os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    index = os.path.join(static_dir, 'index.html')
    if os.path.exists(index):
        return send_from_directory(static_dir, 'index.html')
    return jsonify(ok=True, service='Roshan Digital API', status='online')


# ── MAIN ─────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f'Backend running on http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port,
            debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
