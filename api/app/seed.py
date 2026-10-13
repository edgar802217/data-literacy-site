"""第一次啟動時建立資料表、匯入初始內容（課程、115 年下半年場次、消息、FAQ），並建立系統管理者 admin。"""
import json
import logging
from pathlib import Path
from sqlalchemy import select
from . import config
from .db import Base, SessionLocal, engine
from .models import Course, Event, Faq, News, Setting, TrainingSession, User
from .security import hash_password

log = logging.getLogger("seed")

def init_db() -> None:
    Base.metadata.create_all(engine)
    data = json.loads((Path(__file__).parent / "seed_data.json").read_text(encoding="utf-8"))
    with SessionLocal() as db:
        if not db.scalar(select(Course).limit(1)):
            db.add_all(Course(**c) for c in data["courses"])
            db.flush()
            db.add_all(TrainingSession(**s) for s in data["sessions"])
            db.add_all(Setting(key=k, value=v) for k, v in data["settings"].items())
            db.add_all(News(**n) for n in data["news"])
            db.add_all(Event(**e) for e in data["events"])
            db.add_all(Faq(**f) for f in data["faq"])
            log.info("已匯入初始內容")
        if not db.scalar(select(User).where(User.email == "admin")):
            if config.ADMIN_BOOTSTRAP_PASSWORD:
                db.add(User(email="admin", name="系統管理者", roles=["admin", "staff"], verified=True,
                            password_hash=hash_password(config.ADMIN_BOOTSTRAP_PASSWORD), must_change_password=True))
                log.info("已建立系統管理者 admin（首次登入需改密碼）")
            else:
                log.warning("尚未設定 ADMIN_BOOTSTRAP_PASSWORD，沒有建立 admin 帳號")
        db.commit()
