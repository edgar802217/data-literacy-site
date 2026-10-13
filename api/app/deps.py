"""共用的相依項目：目前登入者、角色檢查、寫入請求的來源檢查、操作紀錄。"""
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from . import config
from .db import get_db
from .models import AuditLog, AuthSession, User
from .security import token_hash

COOKIE = "dl_session"

def current_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    t = request.cookies.get(COOKIE)
    if not t:
        return None
    s = db.get(AuthSession, token_hash(t))
    if not s:
        return None
    exp = s.expires_at if s.expires_at.tzinfo else s.expires_at.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        db.delete(s); db.commit()
        return None
    u = db.get(User, s.user_id)
    return u if u and u.is_active else None

def require_user(u: User | None = Depends(current_user)) -> User:
    if not u:
        raise HTTPException(401, "請先登入")
    return u

def require_role(*roles: str):
    """任一角色即可；admin（系統管理者）一律通過"""
    def dep(u: User = Depends(require_user)) -> User:
        if u.must_change_password:
            raise HTTPException(403, "請先修改密碼")
        if "admin" in u.roles or any(r in u.roles for r in roles):
            return u
        raise HTTPException(403, "沒有權限")
    return dep

def check_origin(request: Request) -> None:
    """寫入請求必須帶 X-Requested-With，且來源是本站（防跨站偽造請求）"""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    if request.headers.get("x-requested-with") != "fetch":
        raise HTTPException(403, "請求來源不正確")
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin and origin not in config.ALLOWED_ORIGINS:
        raise HTTPException(403, "請求來源不正確")

def audit(db: Session, user: User | None, action: str, target: str = "", detail: str = "") -> None:
    db.add(AuditLog(user_id=user.id if user else None, action=action, target=target, detail=detail[:2000]))
