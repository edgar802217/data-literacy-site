"""網站內容與課程場次：公開讀取＋後台管理（取代原本的 Google 試算表）。"""
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import get_db
from .deps import audit, require_role
from .models import Course, Event, Faq, News, Setting, TrainingSession, User

public = APIRouter(prefix="/public", tags=["public"])
admin = APIRouter(prefix="/admin", tags=["admin-content"])
staff = require_role("staff")

DATE = r"^\d{4}-\d{2}-\d{2}$"
SETTING_KEYS = ["重要公告", "重要公告連結", "聯絡窗口", "聯絡信箱", "培訓信箱", "聯絡電話", "標語"]

def news_out(n: News) -> dict:
    return {"id": n.id, "date": n.date, "category": n.category, "title": n.title, "body": n.body, "link": n.link, "visible": n.visible}
def event_out(e: Event) -> dict:
    return {"id": e.id, "date": e.date, "name": e.name, "desc": e.desc, "visible": e.visible}
def faq_out(f: Faq) -> dict:
    return {"id": f.id, "question": f.question, "answer": f.answer, "sort": f.sort, "visible": f.visible}
def course_out(c: Course) -> dict:
    return {"id": c.id, "level": c.level, "code": c.code, "name": c.name, "hours": c.hours, "elig": c.elig,
            "proof": c.proof or None, "desc": c.desc, "content": c.content or []}
def session_out(s: TrainingSession) -> dict:
    d = {k: getattr(s, k) for k in ("id", "course", "region", "date", "time", "venue", "address", "cap", "open", "deadline", "lect", "roll")}
    for k in ("track", "date2", "venue2", "address2"):
        if getattr(s, k):
            d[k] = getattr(s, k)
    return d

# ---------------- 公開 ----------------
@public.get("/content")
def content(db: Session = Depends(get_db)):
    return {
        "settings": {s.key: s.value for s in db.scalars(select(Setting))},
        "news": [news_out(n) for n in db.scalars(select(News).where(News.visible).order_by(News.date.desc()))],
        "events": [event_out(e) for e in db.scalars(select(Event).where(Event.visible).order_by(Event.date))],
        "faq": [faq_out(f) for f in db.scalars(select(Faq).where(Faq.visible).order_by(Faq.sort, Faq.question))],
    }

@public.get("/catalog")
def catalog(db: Session = Depends(get_db)):
    return {
        "courses": [course_out(c) for c in db.scalars(select(Course).order_by(Course.sort))],
        "sessions": [session_out(s) for s in db.scalars(select(TrainingSession).order_by(TrainingSession.date))],
    }

# ---------------- 後台：網站內容 ----------------
@admin.get("/content")
def admin_content(_: User = Depends(staff), db: Session = Depends(get_db)):
    st = {s.key: s.value for s in db.scalars(select(Setting))}
    return {
        "settings": {k: st.get(k, "") for k in SETTING_KEYS},
        "news": [news_out(n) for n in db.scalars(select(News).order_by(News.date.desc()))],
        "events": [event_out(e) for e in db.scalars(select(Event).order_by(Event.date))],
        "faq": [faq_out(f) for f in db.scalars(select(Faq).order_by(Faq.sort, Faq.question))],
    }

class SettingsIn(BaseModel):
    values: dict[str, str]

@admin.put("/settings")
def put_settings(body: SettingsIn, u: User = Depends(staff), db: Session = Depends(get_db)):
    for k, v in body.values.items():
        if k not in SETTING_KEYS:
            raise HTTPException(422, f"不認得的設定：{k}")
        if len(v) > 2000:
            raise HTTPException(422, f"{k} 太長")
        row = db.get(Setting, k)
        if row:
            row.value = v.strip()
        else:
            db.add(Setting(key=k, value=v.strip()))
    audit(db, u, "settings", ",".join(body.values))
    db.commit()
    return {"ok": True}

class NewsIn(BaseModel):
    date: str = Field(pattern=DATE)
    category: str = Field(default="", max_length=20)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(default="", max_length=5000)
    link: str = Field(default="", max_length=500)
    visible: bool = True

class EventIn(BaseModel):
    date: str = Field(pattern=DATE)
    name: str = Field(min_length=1, max_length=200)
    desc: str = Field(default="", max_length=5000)
    visible: bool = True

class FaqIn(BaseModel):
    question: str = Field(min_length=1, max_length=300)
    answer: str = Field(default="", max_length=10000)
    sort: int = 0
    visible: bool = True

def _link_ok(link: str) -> None:
    if link and not re.match(r"^(https?://|/)", link):
        raise HTTPException(422, "連結要以 https:// 或 / 開頭")

def _crud(model, schema, out, name: str):
    """新增／修改／刪除同一種內容"""
    @admin.post(f"/{name}")
    def create(body: schema, u: User = Depends(staff), db: Session = Depends(get_db)):  # type: ignore[valid-type]
        if hasattr(body, "link"):
            _link_ok(body.link)
        row = model(**body.model_dump())
        db.add(row); db.flush()
        audit(db, u, f"{name}.create", row.id)
        db.commit()
        return out(row)

    @admin.patch(f"/{name}/{{rid}}")
    def edit(rid: str, body: schema, u: User = Depends(staff), db: Session = Depends(get_db)):  # type: ignore[valid-type]
        row = db.get(model, rid)
        if not row:
            raise HTTPException(404, "找不到這筆資料")
        if hasattr(body, "link"):
            _link_ok(body.link)
        for k, v in body.model_dump().items():
            setattr(row, k, v)
        audit(db, u, f"{name}.update", rid)
        db.commit()
        return out(row)

    @admin.delete(f"/{name}/{{rid}}")
    def remove(rid: str, u: User = Depends(staff), db: Session = Depends(get_db)):
        row = db.get(model, rid)
        if not row:
            raise HTTPException(404, "找不到這筆資料")
        db.delete(row)
        audit(db, u, f"{name}.delete", rid)
        db.commit()
        return {"ok": True}

_crud(News, NewsIn, news_out, "news")
_crud(Event, EventIn, event_out, "events")
_crud(Faq, FaqIn, faq_out, "faq")

# ---------------- 後台：課程與場次 ----------------
REGIONS = {"北區", "中區", "南區", "東區"}
REGION_CODE = {"北區": "N", "中區": "C", "南區": "S", "東區": "E"}
ID_PREFIX = {"A": "B6", "B": "ADV", "T": "G1"}

class CourseIn(BaseModel):
    level: str = Field(min_length=1, max_length=20)
    code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    hours: int = Field(ge=1, le=100)
    elig: str = Field(pattern="^(open|track|invite)$")
    proof: list[str] | None = None
    desc: str = Field(default="", max_length=3000)
    content: list[str] = []

@admin.patch("/courses/{cid}")
def edit_course(cid: str, body: CourseIn, u: User = Depends(staff), db: Session = Depends(get_db)):
    c = db.get(Course, cid)
    if not c:
        raise HTTPException(404, "找不到課程")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    audit(db, u, "course.update", cid)
    db.commit()
    return course_out(c)

class SessionIn(BaseModel):
    id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{2,32}$")
    course: str
    track: str | None = Field(default=None, pattern="^(teacher|school_admin|county_admin)$")
    region: str
    date: str = Field(pattern=DATE)
    date2: str | None = Field(default=None, pattern=DATE)
    time: str = Field(default="", max_length=60)
    venue: str = Field(min_length=1, max_length=120)
    address: str = Field(default="", max_length=200)
    venue2: str | None = Field(default=None, max_length=120)
    address2: str | None = Field(default=None, max_length=200)
    cap: int = Field(ge=1, le=2000)
    open: bool = False
    deadline: str = Field(pattern=DATE)
    lect: str | None = None

def _session_fields(body: SessionIn, db: Session) -> dict:
    if not db.get(Course, body.course):
        raise HTTPException(422, "課程不存在")
    if body.region not in REGIONS:
        raise HTTPException(422, "區域要是北區、中區、南區或東區")
    if body.date2 and body.date2 < body.date:
        raise HTTPException(422, "第二天不能早於第一天")
    if body.deadline > body.date:
        raise HTTPException(422, "報名截止日不能晚於研習日期")
    if body.course == "B" and not body.track:
        raise HTTPException(422, "進階課程要選分流")
    if body.lect and not db.get(User, body.lect):
        raise HTTPException(422, "講師帳號不存在")
    d = body.model_dump(exclude={"id"})
    for k in ("date2", "venue2", "address2", "track", "lect"):
        d[k] = d[k] or None
    return d

@admin.post("/sessions")
def create_session(body: SessionIn, u: User = Depends(staff), db: Session = Depends(get_db)):
    if body.region not in REGIONS:
        raise HTTPException(422, "區域要是北區、中區、南區或東區")
    sid = body.id or f"{ID_PREFIX.get(body.course, body.course)}{body.date.replace('-', '')[2:]}{REGION_CODE[body.region]}"
    if db.get(TrainingSession, sid):
        raise HTTPException(409, f"場次代號 {sid} 已存在，請換一個")
    s = TrainingSession(id=sid, **_session_fields(body, db))
    db.add(s)
    audit(db, u, "session.create", sid)
    db.commit()
    return session_out(s)

@admin.patch("/sessions/{sid}")
def edit_session(sid: str, body: SessionIn, u: User = Depends(staff), db: Session = Depends(get_db)):
    s = db.get(TrainingSession, sid)
    if not s:
        raise HTTPException(404, "找不到場次")
    for k, v in _session_fields(body, db).items():
        setattr(s, k, v)
    audit(db, u, "session.update", sid)
    db.commit()
    return session_out(s)

@admin.delete("/sessions/{sid}")
def delete_session(sid: str, u: User = Depends(staff), db: Session = Depends(get_db)):
    s = db.get(TrainingSession, sid)
    if not s:
        raise HTTPException(404, "找不到場次")
    db.delete(s)
    audit(db, u, "session.delete", sid)
    db.commit()
    return {"ok": True}
