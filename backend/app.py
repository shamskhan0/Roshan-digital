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


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify(error='No token provided'), 401
        try:
            user_id = int(token)
            user = User.query.get(user_id)
            if not user or not user.active:
                return jsonify(error='Invalid user'), 401
        except (ValueError, TypeError):
            return jsonify(error='Invalid token'), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify(error='No token provided'), 401
        try:
            user_id = int(token)
            user = User.query.get(user_id)
            if not user or user.role != 'admin':
                return jsonify(error='Admin access required'), 403
        except (ValueError, TypeError):
            return jsonify(error='Invalid token'), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated


def user_dict(u):
    return {
        'id': u.id, 'email': u.email, 'name': u.name, 'role': u.role,
        'referralCode': u.referralCode, 'avatar': u.avatar,
        'phone': u.phone, 'verified': u.verified,
    }


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
        import hashlib
        admin = User(
            email="admin@roshan.com",
            name="Admin",
            password=hashlib.sha256("admin123".encode()).hexdigest(),
            role="admin",
            active=True,
            verified=True,
            referralCode='ADMIN001'
        )
        db.session.add(admin)
        db.session.commit()


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


# ── AUTH ─────────────────────────────────────────────────────

@app.route('/api/app/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    referralCode = data.get('referralCode', '')

    if not email or not password or not name:
        return jsonify(error='Email, password, and name are required'), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error='Email already registered'), 400

    import hashlib
    hashed = hashlib.sha256(password.encode()).hexdigest()
    code = secrets.token_hex(6).upper()

    user = User(
        email=email,
        name=name,
        password=hashed,
        referralCode=code,
        referredBy=None
    )

    if referralCode:
        referrer = User.query.filter_by(referralCode=referralCode).first()
        if referrer:
            user.referredBy = referrer.id

    db.session.add(user)
    db.session.commit()

    ensure_wallet(user.id)

    if referralCode and user.referredBy:
        referrer_wallet = ensure_wallet(user.referredBy)
        bonus = float(get_setting('referral_bonus', '100'))
        referrer_wallet.referralBonus += bonus
        referrer_wallet.balance += bonus
        referrer_wallet.mainBalance += bonus
        db.session.commit()
        record_tx(user.referredBy, 'referral', bonus, referrer_wallet.balance, f'Referral bonus for {name}')
        db.session.add(Referral(referrerId=user.referredBy, referredId=user.id, bonus=bonus))
        db.session.commit()

    return jsonify(ok=True, user=user_dict(user), token=str(user.id))


@app.route('/api/app/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error='User not found'), 404

    import hashlib
    if user.password != hashlib.sha256(password.encode()).hexdigest():
        db.session.add(LoginHistory(userId=user.id, ip=request.remote_addr, device=request.headers.get('User-Agent', ''), success=False))
        db.session.commit()
        return jsonify(error='Invalid password'), 401

    if not user.active:
        return jsonify(error='Account deactivated'), 403

    db.session.add(LoginHistory(userId=user.id, ip=request.remote_addr, device=request.headers.get('User-Agent', ''), success=True))
    db.session.commit()

    return jsonify(ok=True, user=user_dict(user), token=str(user.id))


@app.route('/api/app/logout', methods=['POST'])
@login_required
def logout():
    return jsonify(ok=True)


# ── USER PROFILE ─────────────────────────────────────────────

@app.route('/api/app/profile')
@login_required
def get_profile():
    u = request.user
    wallet = ensure_wallet(u.id)
    return jsonify(
        ok=True,
        user=user_dict(u),
        wallet={
            'balance': wallet.balance,
            'mainBalance': wallet.mainBalance,
            'earned': wallet.earned,
            'invested': wallet.invested,
            'withdrawn': wallet.withdrawn,
            'deposit': wallet.deposit,
            'referralBonus': wallet.referralBonus,
        }
    )


@app.route('/api/app/profile', methods=['PUT'])
@login_required
def update_profile():
    u = request.user
    data = request.json
    if 'name' in data:
        u.name = data['name']
    if 'phone' in data:
        u.phone = data['phone']
    if 'avatar' in data:
        u.avatar = data['avatar']
    db.session.commit()
    return jsonify(ok=True, user=user_dict(u))


# ── NOTIFICATIONS ────────────────────────────────────────────

@app.route('/api/app/notifications')
@login_required
def get_notifications():
    notes = Notification.query.filter_by(userId=request.user.id).order_by(Notification.createdAt.desc()).all()
    return jsonify(ok=True, notifications=[{
        'id': n.id, 'title': n.title, 'message': n.message,
        'type': n.type, 'read': n.read, 'createdAt': n.createdAt.isoformat()
    } for n in notes])


@app.route('/api/app/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read():
    Notification.query.filter_by(userId=request.user.id, read=False).update({'read': True})
    db.session.commit()
    return jsonify(ok=True)


# ── WALLET & TRANSACTIONS ────────────────────────────────────

@app.route('/api/app/wallet')
@login_required
def get_wallet():
    w = ensure_wallet(request.user.id)
    return jsonify(ok=True, wallet={
        'balance': w.balance,
        'mainBalance': w.mainBalance,
        'earned': w.earned,
        'invested': w.invested,
        'withdrawn': w.withdrawn,
        'deposit': w.deposit,
        'referralBonus': w.referralBonus,
    })


@app.route('/api/app/transactions')
@login_required
def get_transactions():
    txs = Transaction.query.filter_by(userId=request.user.id).order_by(Transaction.createdAt.desc()).limit(50).all()
    return jsonify(ok=True, transactions=[{
        'id': tx.id, 'type': tx.type, 'amount': tx.amount,
        'balance': tx.balance, 'detail': tx.detail,
        'createdAt': tx.createdAt.isoformat()
    } for tx in txs])


# ── TASKS ────────────────────────────────────────────────────

@app.route('/api/app/tasks')
@login_required
def get_tasks():
    tasks = Task.query.filter_by(active=True).all()
    user_tasks = {ut.taskId: ut.status for ut in UserTask.query.filter_by(userId=request.user.id).all()}
    return jsonify(ok=True, tasks=[{
        'id': t.id, 'title': t.title, 'description': t.description,
        'reward': t.reward, 'category': t.category, 'link': t.link,
        'duration': t.duration, 'requireVisit': t.requireVisit,
        'status': user_tasks.get(t.id, 'available')
    } for t in tasks])


@app.route('/api/app/tasks/<int:task_id>/complete', methods=['POST'])
@login_required
def complete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify(error='Task not found'), 404

    existing = UserTask.query.filter_by(userId=request.user.id, taskId=task_id).first()
    if existing:
        return jsonify(error='Task already completed'), 400

    ut = UserTask(userId=request.user.id, taskId=task_id, status='completed', completedAt=datetime.utcnow())
    db.session.add(ut)
    db.session.commit()

    w = ensure_wallet(request.user.id)
    w.balance += task.reward
    w.mainBalance += task.reward
    w.earned += task.reward
    db.session.commit()
    record_tx(request.user.id, 'task_reward', task.reward, w.balance, f'Task: {task.title}')
    notify(request.user.id, '✅ Task Completed', f'Earned {task.reward} PKR for: {task.title}', 'reward')

    return jsonify(ok=True, reward=task.reward)


# ── INVESTMENTS ──────────────────────────────────────────────

@app.route('/api/app/investments/plans')
@login_required
def get_investment_plans():
    plans = InvestmentPlan.query.filter_by(active=True).all()
    return jsonify(ok=True, plans=[{
        'id': p.id, 'name': p.name, 'description': p.description,
        'amount': p.amount, 'dailyProfit': p.dailyProfit, 'duration': p.duration
    } for p in plans])


@app.route('/api/app/investments')
@login_required
def get_investments():
    invs = UserInvestment.query.filter_by(userId=request.user.id).order_by(UserInvestment.createdAt.desc()).all()
    return jsonify(ok=True, investments=[{
        'id': i.id, 'planId': i.planId, 'amount': i.amount,
        'dailyProfit': i.dailyProfit, 'totalProfit': i.totalProfit,
        'daysPassed': i.daysPassed, 'status': i.status,
        'createdAt': i.createdAt.isoformat()
    } for i in invs])


@app.route('/api/app/investments/buy', methods=['POST'])
@login_required
def buy_investment():
    data = request.json
    plan_id = data.get('planId')
    plan = InvestmentPlan.query.get(plan_id)
    if not plan:
        return jsonify(error='Plan not found'), 404

    w = ensure_wallet(request.user.id)
    if w.balance < plan.amount:
        return jsonify(error='Insufficient balance'), 400

    w.balance -= plan.amount
    w.mainBalance -= plan.amount
    w.invested += plan.amount
    db.session.commit()

    inv = UserInvestment(
        userId=request.user.id,
        planId=plan.id,
        amount=plan.amount,
        dailyProfit=plan.dailyProfit,
    )
    db.session.add(inv)
    db.session.commit()

    record_tx(request.user.id, 'investment', plan.amount, w.balance, f'Invested in {plan.name}')
    notify(request.user.id, '📈 Investment Purchased', f'{plan.name} — {plan.amount} PKR', 'investment')

    return jsonify(ok=True, investment={
        'id': inv.id, 'planId': inv.planId, 'amount': inv.amount,
        'dailyProfit': inv.dailyProfit, 'status': inv.status
    })


# ── DEPOSITS ─────────────────────────────────────────────────

@app.route('/api/app/deposits')
@login_required
def get_deposits():
    deps = Deposit.query.filter_by(userId=request.user.id).order_by(Deposit.createdAt.desc()).all()
    return jsonify(ok=True, deposits=[{
        'id': d.id, 'amount': d.amount, 'method': d.method,
        'reference': d.reference, 'status': d.status,
        'createdAt': d.createdAt.isoformat()
    } for d in deps])


@app.route('/api/app/deposits', methods=['POST'])
@login_required
def make_deposit():
    data = request.json
    amount = float(data.get('amount', 0))
    method = data.get('method', '')
    reference = data.get('reference', '')

    if amount <= 0:
        return jsonify(error='Invalid amount'), 400

    dep = Deposit(
        userId=request.user.id,
        amount=amount,
        method=method,
        reference=reference,
        screenshot=data.get('screenshot'),
    )
    db.session.add(dep)
    db.session.commit()

    return jsonify(ok=True, deposit={
        'id': dep.id, 'amount': dep.amount, 'status': dep.status
    })


# ── WITHDRAWALS ──────────────────────────────────────────────

@app.route('/api/app/withdrawals')
@login_required
def get_withdrawals():
    wds = Withdrawal.query.filter_by(userId=request.user.id).order_by(Withdrawal.createdAt.desc()).all()
    return jsonify(ok=True, withdrawals=[{
        'id': w.id, 'amount': w.amount, 'method': w.method,
        'account': w.account, 'status': w.status,
        'createdAt': w.createdAt.isoformat()
    } for w in wds])


@app.route('/api/app/withdrawals', methods=['POST'])
@login_required
def request_withdrawal():
    data = request.json
    amount = float(data.get('amount', 0))
    method = data.get('method', '')
    account = data.get('account', '')

    if amount <= 0:
        return jsonify(error='Invalid amount'), 400

    w = ensure_wallet(request.user.id)
    if w.balance < amount:
        return jsonify(error='Insufficient balance'), 400

    min_withdraw = float(get_setting('min_withdrawal', '500'))
    if amount < min_withdraw:
        return jsonify(error=f'Minimum withdrawal is {min_withdraw} PKR'), 400

    w.balance -= amount
    w.mainBalance -= amount
    w.withdrawn += amount
    db.session.commit()

    wd = Withdrawal(userId=request.user.id, amount=amount, method=method, account=account)
    db.session.add(wd)
    db.session.commit()

    record_tx(request.user.id, 'withdrawal', amount, w.balance, f'Withdrawal via {method}')
    return jsonify(ok=True, withdrawal={'id': wd.id, 'amount': wd.amount, 'status': wd.status})


# ── SOCIAL ───────────────────────────────────────────────────

@app.route('/api/app/posts')
@login_required
def get_posts():
    posts = Post.query.filter_by(active=True).order_by(Post.createdAt.desc()).limit(50).all()
    return jsonify(ok=True, posts=[{
        'id': p.id, 'content': p.content, 'image': p.image,
        'likes': p.likes, 'comments': p.comments,
        'author': p.author.name if p.author else '',
        'createdAt': p.createdAt.isoformat()
    } for p in posts])


@app.route('/api/app/posts', methods=['POST'])
@login_required
def create_post():
    data = request.json
    post = Post(userId=request.user.id, content=data.get('content', ''), image=data.get('image'))
    db.session.add(post)
    db.session.commit()
    return jsonify(ok=True, post={'id': post.id, 'content': post.content})


@app.route('/api/app/posts/<int:post_id>/like', methods=['POST'])
@login_required
def like_post(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify(error='Post not found'), 404
    existing = Like.query.filter_by(postId=post_id, userId=request.user.id).first()
    if existing:
        db.session.delete(existing)
        post.likes -= 1
    else:
        db.session.add(Like(postId=post_id, userId=request.user.id))
        post.likes += 1
    db.session.commit()
    return jsonify(ok=True, likes=post.likes)


# ── ADMIN ────────────────────────────────────────────────────

@app.route('/api/app/admin/users')
@admin_required
def admin_users():
    users = User.query.order_by(User.createdAt.desc()).all()
    return jsonify(ok=True, users=[{
        'id': u.id, 'email': u.email, 'name': u.name, 'role': u.role,
        'active': u.active, 'verified': u.verified,
        'createdAt': u.createdAt.isoformat() if u.createdAt else ''
    } for u in users])


@app.route('/api/app/admin/users/<int:user_id>/toggle', methods=['POST'])
@admin_required
def toggle_user(user_id):
    u = User.query.get(user_id)
    if not u:
        return jsonify(error='User not found'), 404
    u.active = not u.active
    db.session.commit()
    return jsonify(ok=True, active=u.active)


@app.route('/api/app/admin/dashboard')
@admin_required
def admin_dashboard():
    total_users = User.query.count()
    active_users = User.query.filter_by(active=True).count()
    total_deposits = db.session.query(db.func.sum(Deposit.amount)).filter_by(status='approved').scalar() or 0
    total_withdrawals = db.session.query(db.func.sum(Withdrawal.amount)).filter_by(status='approved').scalar() or 0
    active_investments = UserInvestment.query.filter_by(status='active').count()
    total_profit = db.session.query(db.func.sum(UserInvestment.totalProfit)).scalar() or 0
    pending_deposits = Deposit.query.filter_by(status='pending').count()
    pending_withdrawals = Withdrawal.query.filter_by(status='pending').count()

    return jsonify(ok=True, stats={
        'totalUsers': total_users,
        'activeUsers': active_users,
        'totalDeposits': total_deposits,
        'totalWithdrawals': total_withdrawals,
        'activeInvestments': active_investments,
        'totalProfit': total_profit,
        'pendingDeposits': pending_deposits,
        'pendingWithdrawals': pending_withdrawals,
    })


@app.route('/api/app/admin/deposits')
@admin_required
def admin_deposits():
    deps = Deposit.query.order_by(Deposit.createdAt.desc()).all()
    return jsonify(ok=True, deposits=[{
        'id': d.id, 'userId': d.userId, 'amount': d.amount,
        'method': d.method, 'reference': d.reference, 'status': d.status,
        'createdAt': d.createdAt.isoformat()
    } for d in deps])


@app.route('/api/app/admin/deposits/<int:dep_id>/<action>', methods=['POST'])
@admin_required
def process_deposit(dep_id, action):
    d = Deposit.query.get(dep_id)
    if not d:
        return jsonify(error='Deposit not found'), 404
    if action == 'approve':
        d.status = 'approved'
        d.processedAt = datetime.utcnow()
        w = ensure_wallet(d.userId)
        w.balance += d.amount
        w.mainBalance += d.amount
        w.deposit += d.amount
        db.session.commit()
        record_tx(d.userId, 'deposit', d.amount, w.balance, f'Deposit approved ({d.method})')
        notify(d.userId, '💰 Deposit Approved', f'{d.amount} PKR has been credited.', 'deposit')
    elif action == 'reject':
        d.status = 'rejected'
        d.processedAt = datetime.utcnow()
        db.session.commit()
        notify(d.userId, '❌ Deposit Rejected', f'Your deposit of {d.amount} PKR was rejected.', 'warning')
    return jsonify(ok=True, status=d.status)


@app.route('/api/app/admin/withdrawals')
@admin_required
def admin_withdrawals():
    wds = Withdrawal.query.order_by(Withdrawal.createdAt.desc()).all()
    return jsonify(ok=True, withdrawals=[{
        'id': w.id, 'userId': w.userId, 'amount': w.amount,
        'method': w.method, 'account': w.account, 'status': w.status,
        'createdAt': w.createdAt.isoformat()
    } for w in wds])


@app.route('/api/app/admin/withdrawals/<int:wd_id>/<action>', methods=['POST'])
@admin_required
def process_withdrawal(wd_id, action):
    w = Withdrawal.query.get(wd_id)
    if not w:
        return jsonify(error='Withdrawal not found'), 404
    if action == 'approve':
        w.status = 'approved'
        w.processedAt = datetime.utcnow()
        db.session.commit()
        notify(w.userId, '✅ Withdrawal Approved', f'{w.amount} PKR withdrawal approved.', 'info')
    elif action == 'reject':
        wallet = ensure_wallet(w.userId)
        wallet.balance += w.amount
        wallet.mainBalance += w.amount
        wallet.withdrawn -= w.amount
        w.status = 'rejected'
        w.processedAt = datetime.utcnow()
        db.session.commit()
        record_tx(w.userId, 'withdrawal_refund', w.amount, wallet.balance, 'Withdrawal rejected — refunded')
        notify(w.userId, '❌ Withdrawal Rejected', f'{w.amount} PKR has been refunded.', 'warning')
    return jsonify(ok=True, status=w.status)


@app.route('/api/app/admin/tasks')
@admin_required
def admin_tasks():
    tasks = Task.query.order_by(Task.createdAt.desc()).all()
    return jsonify(ok=True, tasks=[{
        'id': t.id, 'title': t.title, 'description': t.description,
        'reward': t.reward, 'category': t.category, 'active': t.active,
        'link': t.link, 'duration': t.duration
    } for t in tasks])


@app.route('/api/app/admin/tasks', methods=['POST'])
@admin_required
def create_task():
    data = request.json
    t = Task(
        title=data.get('title', ''),
        description=data.get('description', ''),
        reward=float(data.get('reward', 0)),
        category=data.get('category', ''),
        link=data.get('link'),
        duration=int(data.get('duration', 0)),
        requireVisit=data.get('requireVisit', False),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(ok=True, task={'id': t.id, 'title': t.title})


@app.route('/api/app/admin/tasks/<int:task_id>', methods=['PUT'])
@admin_required
def update_task(task_id):
    t = Task.query.get(task_id)
    if not t:
        return jsonify(error='Not found'), 404
    data = request.json
    if 'title' in data:
        t.title = data['title']
    if 'description' in data:
        t.description = data['description']
    if 'reward' in data:
        t.reward = float(data['reward'])
    if 'category' in data:
        t.category = data['category']
    if 'active' in data:
        t.active = data['active']
    if 'link' in data:
        t.link = data['link'] or None
    if 'duration' in data:
        t.duration = int(data['duration'] or 0)
    if 'requireVisit' in data:
        t.requireVisit = data['requireVisit']
    db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/tasks/<int:task_id>', methods=['DELETE'])
@admin_required
def delete_task(task_id):
    t = Task.query.get(task_id)
    if t:
        db.session.delete(t)
        db.session.commit()
    return jsonify(ok=True)


@app.route('/api/app/admin/broadcast', methods=['POST'])
@admin_required
def broadcast():
    data = request.json
    users = User.query.all()
    for u in users:
        db.session.add(Notification(
            userId=u.id,
            title=data.get('title', '📢 Announcement'),
            message=data.get('message', ''),
            type=data.get('type', 'info')
        ))
    db.session.commit()
    return jsonify(ok=True, sent=len(users))


@app.route('/api/app/admin/calculate-profits', methods=['POST'])
@admin_required
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
        record_tx(inv.userId, 'daily_profit', inv.dailyProfit, new_balance, 'Daily profit')
        plan = InvestmentPlan.query.get(inv.planId)
        if inv.daysPassed >= (plan.duration if plan else 30):
            inv.status = 'completed'
            notify(inv.userId, '🎉 Investment Completed!', f'Total profit: {inv.totalProfit} PKR', 'investment')
        else:
            notify(inv.userId, '💰 Daily Profit', f'{inv.dailyProfit} PKR credited.', 'profit')
    db.session.commit()
    return jsonify(ok=True, processed=len(active))


@app.route('/api/create-admin')
def create_admin():
    user = User.query.filter_by(email="admin@roshan.com").first()
    if user:
        return jsonify(ok=True, message='Admin already exists')
    import hashlib
    admin = User(
        email="admin@roshan.com",
        name="Admin",
        password=hashlib.sha256("admin123".encode()).hexdigest(),
        role="admin",
        active=True,
        verified=True,
        referralCode='ADMIN001'
    )
    db.session.add(admin)
    db.session.commit()
    ensure_wallet(admin.id)
    return jsonify(ok=True, message='Admin created')


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
