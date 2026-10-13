"""帳號管理（系統管理者）：查詢帳號、指定角色、建立帳號、重設密碼、停用；寄件紀錄與操作紀錄。"""
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from .db import get_db
from .deps import audit, require_role
from .models import AuditLog, AuthSession, Mail, User
from .security import hash_password, temp_password

router = APIRouter(prefix="/admin", tags=["admin-users"])
sysadmin = require_role()          # 只有 admin 角色能通過
staff = require_role("staff")
ROLES = {"learner", "lecturer", "county", "staff", "admin"}
JOBS = {"teacher", "school_admin", "county_admin"}

def row(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "title": u.title, "org": u.org, "county": u.county, "job": u.job,
            "roles": u.roles, "verified": u.verified, "isActive": u.is_active, "mustChangePassword": u.must_change_password,
            "createdAt": u.created_at.isoformat() if u.created_at else None,
            "lastLoginAt": u.last_login_at.isoformat() if u.last_login_at else None}

@router.get("/users")
def list_users(q: str = "", role: str = "", page: int = 1, _: User = Depends(sysadmin), db: Session = Depends(get_db)):
    stmt = select(User)
    if q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(User.email).like(like), func.lower(User.name).like(like), func.lower(User.org).like(like)))
    users = list(db.scalars(stmt.order_by(User.created_at.desc())))
    if role:
        users = [u for u in users if role in (u.roles or [])]
    per = 50
    return {"total": len(users), "page": page, "users": [row(u) for u in users[(page - 1) * per: page * per]]}

@router.get("/lecturers")
def lecturers(_: User = Depends(staff), db: Session = Depends(get_db)):
    """場次指派講師用：計畫承辦也能看"""
    return [{"id": u.id, "name": u.name, "org": u.org} for u in db.scalars(select(User).where(User.is_active)) if "lecturer" in (u.roles or [])]

class UserEditIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    title: str = Field(default="", max_length=80)
    org: str = Field(default="", max_length=120)
    county: str = Field(default="", max_length=20)
    job: str | None = None
    roles: list[str]
    isActive: bool = True
    verified: bool = True

def _check(body: UserEditIn) -> None:
    bad = set(body.roles) - ROLES
    if bad:
        raise HTTPException(422, "不認得的角色：" + "、".join(bad))
    if body.job and body.job not in JOBS:
        raise HTTPException(422, "職務不正確")
    if "county" in body.roles and not body.county:
        raise HTTPException(422, "推動辦公室要填縣市（或國教署）")

@router.patch("/users/{uid}")
def edit_user(uid: str, body: UserEditIn, me: User = Depends(sysadmin), db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "找不到帳號")
    _check(body)
    if u.id == me.id and ("admin" not in body.roles or not body.isActive):
        raise HTTPException(422, "不能移除自己的系統管理者權限或停用自己")
    before = ",".join(u.roles)
    u.name, u.title, u.org, u.county, u.job = body.name.strip(), body.title.strip(), body.org.strip(), body.county.strip(), body.job
    u.roles, u.is_active, u.verified = sorted(set(body.roles)), body.isActive, body.verified
    if not u.is_active:
        db.query(AuthSession).filter(AuthSession.user_id == u.id).delete()
    audit(db, me, "user.update", u.email, f"角色 {before} → {','.join(u.roles)}；啟用 {u.is_active}")
    db.commit()
    return row(u)

class UserCreateIn(UserEditIn):
    email: str = Field(max_length=254)

@router.post("/users")
def create_user(body: UserCreateIn, me: User = Depends(sysadmin), db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(422, "email 格式不正確")
    _check(body)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "這個 email 已經有帳號")
    pw = temp_password()
    u = User(email=email, name=body.name.strip(), title=body.title.strip(), org=body.org.strip(), county=body.county.strip(),
             job=body.job, roles=sorted(set(body.roles)) or ["learner"], verified=body.verified, is_active=True,
             password_hash=hash_password(pw), must_change_password=True)
    db.add(u); db.flush()
    audit(db, me, "user.create", email, ",".join(u.roles))
    db.commit()
    return {"user": row(u), "tempPassword": pw}

@router.post("/users/{uid}/reset-password")
def reset_password(uid: str, me: User = Depends(sysadmin), db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "找不到帳號")
    pw = temp_password()
    u.password_hash, u.must_change_password, u.failed_attempts, u.locked_until = hash_password(pw), True, 0, None
    db.query(AuthSession).filter(AuthSession.user_id == u.id).delete()
    audit(db, me, "user.reset_password", u.email)
    db.commit()
    return {"tempPassword": pw}

@router.get("/mails")
def mails(_: User = Depends(staff), db: Session = Depends(get_db)):
    return [{"id": m.id, "to": m.to, "subject": m.subject, "body": m.body, "status": m.status, "error": m.error,
             "createdAt": m.created_at.isoformat()} for m in db.scalars(select(Mail).order_by(Mail.created_at.desc()).limit(200))]

@router.get("/audit")
def audit_log(_: User = Depends(sysadmin), db: Session = Depends(get_db)):
    names = {u.id: u.name or u.email for u in db.scalars(select(User))}
    return [{"at": a.at.isoformat(), "user": names.get(a.user_id or "", "—"), "action": a.action, "target": a.target, "detail": a.detail}
            for a in db.scalars(select(AuditLog).order_by(AuditLog.at.desc()).limit(300))]
