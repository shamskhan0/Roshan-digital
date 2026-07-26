import secrets
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


def gen_id():
    return secrets.token_urlsafe(16)


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    email = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String)
    phone = db.Column(db.String)
    password = db.Column(db.String, nullable=False)
    avatar = db.Column(db.String)
    role = db.Column(db.String, default='user')
    referralCode = db.Column(db.String, unique=True)
    referredBy = db.Column(db.String)
    active = db.Column(db.Boolean, default=True)
    verified = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OTP(db.Model):
    __tablename__ = 'otps'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    target = db.Column(db.String, nullable=False)
    code = db.Column(db.String, nullable=False)
    purpose = db.Column(db.String, nullable=False)
    expiresAt = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


class LoginHistory(db.Model):
    __tablename__ = 'login_history'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    device = db.Column(db.String)
    ip = db.Column(db.String)
    browser = db.Column(db.String)
    status = db.Column(db.String, default='success')
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='loginHistories')


class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.String, nullable=False)
    image = db.Column(db.String)
    type = db.Column(db.String, default='post')
    pinned = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = db.relationship('User', backref='posts')
    comments = db.relationship('Comment', backref='post', cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='post', cascade='all, delete-orphan')


class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    postId = db.Column(db.String, db.ForeignKey('posts.id'), nullable=False)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    parentId = db.Column(db.String, db.ForeignKey('comments.id'))
    content = db.Column(db.String, nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='comments')
    parent = db.relationship('Comment', remote_side=[id], backref='replies')


class Like(db.Model):
    __tablename__ = 'likes'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    postId = db.Column(db.String, db.ForeignKey('posts.id'), nullable=False)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='likes')
    __table_args__ = (db.UniqueConstraint('postId', 'userId'),)


class Wallet(db.Model):
    __tablename__ = 'wallets'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), unique=True, nullable=False)
    balance = db.Column(db.Float, default=0)
    earned = db.Column(db.Float, default=0)
    deposited = db.Column(db.Float, default=0)
    withdrawn = db.Column(db.Float, default=0)
    mainBalance = db.Column(db.Float, default=0)
    investmentBalance = db.Column(db.Float, default=0)
    referralBalance = db.Column(db.Float, default=0)
    bonusBalance = db.Column(db.Float, default=0)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = db.relationship('User', backref='wallet')


class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    title = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    reward = db.Column(db.Float, nullable=False)
    category = db.Column(db.String, default='general')
    link = db.Column(db.String)
    duration = db.Column(db.Integer, default=0)
    requireVisit = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


class UserTask(db.Model):
    __tablename__ = 'user_tasks'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    taskId = db.Column(db.String, db.ForeignKey('tasks.id'), nullable=False)
    status = db.Column(db.String, default='pending')
    completedAt = db.Column(db.DateTime)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='userTasks')
    task = db.relationship('Task', backref='userTasks')
    __table_args__ = (db.UniqueConstraint('userId', 'taskId'),)


class InvestmentPlan(db.Model):
    __tablename__ = 'investment_plans'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    name = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    amount = db.Column(db.Float, nullable=False)
    dailyProfit = db.Column(db.Float, nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    active = db.Column(db.Boolean, default=True)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)


class UserInvestment(db.Model):
    __tablename__ = 'user_investments'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    planId = db.Column(db.String, db.ForeignKey('investment_plans.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    dailyProfit = db.Column(db.Float, nullable=False)
    startDate = db.Column(db.DateTime, default=datetime.utcnow)
    endDate = db.Column(db.DateTime)
    totalProfit = db.Column(db.Float, default=0)
    daysPassed = db.Column(db.Integer, default=0)
    status = db.Column(db.String, default='active')
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='investments')
    plan = db.relationship('InvestmentPlan', backref='investments')


class Deposit(db.Model):
    __tablename__ = 'deposits'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String, nullable=False)
    accountName = db.Column(db.String)
    accountNumber = db.Column(db.String)
    screenshot = db.Column(db.String)
    status = db.Column(db.String, default='pending')
    adminNote = db.Column(db.String)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = db.relationship('User', backref='deposits')


class Withdrawal(db.Model):
    __tablename__ = 'withdrawals'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String, nullable=False)
    accountName = db.Column(db.String)
    accountNumber = db.Column(db.String)
    status = db.Column(db.String, default='pending')
    adminNote = db.Column(db.String)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = db.relationship('User', backref='withdrawals')


class Referral(db.Model):
    __tablename__ = 'referrals'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    referrerId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    referredId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    reward = db.Column(db.Float, default=0)
    status = db.Column(db.String, default='pending')
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    referrer = db.relationship('User', foreign_keys=[referrerId], backref=db.backref('referralsMade', overlaps='referred'))
    referred = db.relationship('User', foreign_keys=[referredId], backref=db.backref('referredEntries', overlaps='referrer'))


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String, nullable=False)
    message = db.Column(db.String, nullable=False)
    type = db.Column(db.String, default='info')
    read = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='notifications')


class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    userId = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    balance = db.Column(db.Float, nullable=False)
    detail = db.Column(db.String)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='transactions')


class Setting(db.Model):
    __tablename__ = 'settings'
    id = db.Column(db.String, primary_key=True, default=gen_id)
    key = db.Column(db.String, unique=True, nullable=False)
    value = db.Column(db.String)
