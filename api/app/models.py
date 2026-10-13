"""資料表。欄位名稱與前端 src/demo/types.ts 對齊，方便前端直接使用。"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

def now() -> datetime:
    return datetime.now(timezone.utc)

def uid() -> str:
    return uuid.uuid4().hex

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    # 登入帳號：一般是 email；第一個系統管理者是 admin
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80), default="")
    title: Mapped[str] = mapped_column(String(80), default="")
    org: Mapped[str] = mapped_column(String(120), default="")
    county: Mapped[str] = mapped_column(String(20), default="")
    job: Mapped[str | None] = mapped_column(String(20), nullable=True)   # teacher / school_admin / county_admin
    # learner 學員、lecturer 講師、county 推動辦公室、staff 計畫承辦、admin 系統管理者
    roles: Mapped[list] = mapped_column(JSON, default=lambda: ["learner"])
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    password_hash: Mapped[str] = mapped_column(String(255))
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    oidc_sub: Mapped[str | None] = mapped_column(String(255), nullable=True)   # 預留：教育雲端帳號
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")

class News(Base):
    __tablename__ = "news"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    date: Mapped[str] = mapped_column(String(10))
    category: Mapped[str] = mapped_column(String(20), default="")
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str] = mapped_column(String(500), default="")
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class Event(Base):
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    date: Mapped[str] = mapped_column(String(10))
    name: Mapped[str] = mapped_column(String(200))
    desc: Mapped[str] = mapped_column(Text, default="")
    visible: Mapped[bool] = mapped_column(Boolean, default=True)

class Faq(Base):
    __tablename__ = "faqs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    question: Mapped[str] = mapped_column(String(300))
    answer: Mapped[str] = mapped_column(Text, default="")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)

class Course(Base):
    __tablename__ = "courses"
    id: Mapped[str] = mapped_column(String(8), primary_key=True)          # A 基礎、B 進階、T 講師培訓
    level: Mapped[str] = mapped_column(String(20))
    code: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(120))
    hours: Mapped[int] = mapped_column(Integer)
    elig: Mapped[str] = mapped_column(String(10))                         # open / track / invite
    proof: Mapped[list | None] = mapped_column(JSON, nullable=True)
    desc: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[list] = mapped_column(JSON, default=list)
    sort: Mapped[int] = mapped_column(Integer, default=0)

class TrainingSession(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    course: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    track: Mapped[str | None] = mapped_column(String(20), nullable=True)
    region: Mapped[str] = mapped_column(String(10))
    date: Mapped[str] = mapped_column(String(10))
    date2: Mapped[str | None] = mapped_column(String(10), nullable=True)
    time: Mapped[str] = mapped_column(String(60), default="")
    venue: Mapped[str] = mapped_column(String(120))
    address: Mapped[str] = mapped_column(String(200), default="")
    venue2: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address2: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cap: Mapped[int] = mapped_column(Integer, default=30)
    open: Mapped[bool] = mapped_column(Boolean, default=False)
    deadline: Mapped[str] = mapped_column(String(10))
    lect: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    roll: Mapped[bool] = mapped_column(Boolean, default=False)

class Mail(Base):
    __tablename__ = "mails"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    to: Mapped[str] = mapped_column(String(254))
    subject: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="outbox")     # outbox 僅記錄 / sent / failed
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    user_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    target: Mapped[str] = mapped_column(String(120), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
