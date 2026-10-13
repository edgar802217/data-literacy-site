"""帳號：註冊、登入、登出、email 驗證、忘記密碼、修改密碼、個人資料。"""
from datetime import datetime, timedelta, timezone
import re
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import config, mail
from .db import get_db
from .deps import COOKIE, audit, current_user, require_user
from .models import AuthSession, User
from .security import (hash_password, make_link_token, new_session_token, password_problems, pw_fingerprint,
                       read_link_token, token_hash, verify_password)

router = APIRouter(prefix="/auth", tags=["auth"])
JOBS = {"teacher", "school_admin", "county_admin"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "title": u.title, "org": u.org, "county": u.county,
            "job": u.job, "roles": u.roles, "verified": u.verified, "mustChangePassword": u.must_change_password}

def _check_pw(pw: str) -> None:
    p = password_problems(pw)
    if p:
        raise HTTPException(422, "密碼需要：" + "、".join(p))

def _start_session(db: Session, resp: Response, u: User) -> None:
    t, h = new_session_token()
    db.add(AuthSession(token_hash=h, user_id=u.id, expires_at=datetime.now(timezone.utc) + timedelta(hours=config.SESSION_HOURS)))
    u.last_login_at = datetime.now(timezone.utc)
    db.commit()
    resp.set_cookie(COOKIE, t, httponly=True, secure=config.COOKIE_SECURE, samesite="lax", max_age=config.SESSION_HOURS * 3600, path="/")

def _verify_mail(db: Session, u: User) -> None:
    link = f"{config.BASE_URL}/verify?token={make_link_token('verify', u.id, u.email)}"
    mail.send(db, u.email, mail.subject("請驗證您的 email"),
              f"{u.name} 您好：\n\n請點下面的連結完成 email 驗證，驗證後即可報名研習：\n{link}\n\n連結 3 天內有效。如果不是您本人註冊，請忽略這封信。")

class RegisterIn(BaseModel):
    email: str = Field(max_length=254)
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(max_length=200)
    job: str | None = None
    org: str = Field(default="", max_length=120)
    county: str = Field(default="", max_length=20)
    title: str = Field(default="", max_length=80)

@router.post("/register")
def register(body: RegisterIn, resp: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "email 格式不正確")
    if body.job and body.job not in JOBS:
        raise HTTPException(422, "職務不正確")
    _check_pw(body.password)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "這個 email 已經註冊過，請直接登入")
    u = User(email=email, name=body.name.strip(), job=body.job, org=body.org.strip(), county=body.county.strip(),
             title=body.title.strip(), roles=["learner"], verified=False, password_hash=hash_password(body.password))
    db.add(u); db.flush()
    audit(db, u, "register", u.email)
    _verify_mail(db, u)
    _start_session(db, resp, u)
    return user_out(u)

class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)

@router.post("/login")
def login(body: LoginIn, resp: Response, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    now = datetime.now(timezone.utc)
    bad = HTTPException(401, "帳號或密碼不正確")
    if not u or not u.is_active:
        raise bad
    lu = u.locked_until.replace(tzinfo=timezone.utc) if u.locked_until and not u.locked_until.tzinfo else u.locked_until
    if lu and lu > now:
        raise HTTPException(423, f"登入失敗次數過多，請 {config.LOCK_MINUTES} 分鐘後再試")
    if not verify_password(body.password, u.password_hash):
        u.failed_attempts += 1
        if u.failed_attempts >= config.LOCK_AFTER:
            u.failed_attempts, u.locked_until = 0, now + timedelta(minutes=config.LOCK_MINUTES)
        db.commit()
        raise bad
    u.failed_attempts, u.locked_until = 0, None
    audit(db, u, "login", u.email)
    _start_session(db, resp, u)
    return user_out(u)

@router.post("/logout")
def logout(request: Request, resp: Response, db: Session = Depends(get_db)):
    t = request.cookies.get(COOKIE)
    if t:
        s = db.get(AuthSession, token_hash(t))
        if s:
            db.delete(s); db.commit()
    resp.delete_cookie(COOKIE, path="/")
    return {"ok": True}

@router.get("/me")
def me(u: User | None = Depends(current_user)):
    return {"user": user_out(u) if u else None}

class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    title: str = Field(default="", max_length=80)
    org: str = Field(default="", max_length=120)
    county: str = Field(default="", max_length=20)
    job: str | None = None

@router.patch("/me")
def update_me(body: ProfileIn, u: User = Depends(require_user), db: Session = Depends(get_db)):
    if body.job and body.job not in JOBS:
        raise HTTPException(422, "職務不正確")
    u.name, u.title, u.org, u.county = body.name.strip(), body.title.strip(), body.org.strip(), body.county.strip()
    if body.job:
        u.job = body.job
    db.commit()
    return user_out(u)

class ChangePwIn(BaseModel):
    current: str = Field(max_length=200)
    password: str = Field(max_length=200)

@router.post("/change-password")
def change_password(body: ChangePwIn, request: Request, resp: Response, u: User = Depends(require_user), db: Session = Depends(get_db)):
    if not verify_password(body.current, u.password_hash):
        raise HTTPException(422, "目前的密碼不正確")
    if body.current == body.password:
        raise HTTPException(422, "新密碼不能和目前的密碼相同")
    _check_pw(body.password)
    u.password_hash, u.must_change_password = hash_password(body.password), False
    # 其他裝置的登入全部失效，目前這台重新發一個
    db.query(AuthSession).filter(AuthSession.user_id == u.id).delete()
    audit(db, u, "change_password", u.email)
    _start_session(db, resp, u)
    return user_out(u)

class TokenIn(BaseModel):
    token: str = Field(max_length=500)

@router.post("/verify")
def verify(body: TokenIn, db: Session = Depends(get_db)):
    d = read_link_token("verify", body.token, max_age=3 * 86400)
    u = db.get(User, d["u"]) if d else None
    if not u or u.email != d.get("f"):
        raise HTTPException(400, "驗證連結無效或已過期，請登入後重新寄送驗證信")
    u.verified = True
    db.commit()
    return {"ok": True, "email": u.email}

@router.post("/resend-verify")
def resend_verify(u: User = Depends(require_user), db: Session = Depends(get_db)):
    if u.verified:
        return {"ok": True}
    _verify_mail(db, u)
    return {"ok": True}

class ForgotIn(BaseModel):
    email: str = Field(max_length=254)

@router.post("/forgot")
def forgot(body: ForgotIn, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if u and u.is_active and EMAIL_RE.match(u.email):
        link = f"{config.BASE_URL}/reset-password?token={make_link_token('reset', u.id, pw_fingerprint(u.password_hash))}"
        mail.send(db, u.email, mail.subject("重設密碼"),
                  f"{u.name} 您好：\n\n請點下面的連結設定新密碼：\n{link}\n\n連結 1 小時內有效，只能使用一次。如果不是您本人申請，請忽略這封信。")
    # 不論帳號是否存在都回一樣的訊息，避免被拿來查帳號
    return {"ok": True}

class ResetIn(BaseModel):
    token: str = Field(max_length=500)
    password: str = Field(max_length=200)

@router.post("/reset")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    d = read_link_token("reset", body.token, max_age=3600)
    u = db.get(User, d["u"]) if d else None
    if not u or d.get("f") != pw_fingerprint(u.password_hash):
        raise HTTPException(400, "重設連結無效或已過期，請重新申請")
    _check_pw(body.password)
    u.password_hash, u.must_change_password, u.failed_attempts, u.locked_until = hash_password(body.password), False, 0, None
    db.query(AuthSession).filter(AuthSession.user_id == u.id).delete()
    audit(db, u, "reset_password", u.email)
    db.commit()
    return {"ok": True}
