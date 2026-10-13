"""寄信：一律先存進寄件紀錄；MAIL_BACKEND=smtp 時才真的寄出（之後接 Google Cloud 寄信服務只要改設定）。"""
import logging
import smtplib
from email.message import EmailMessage
from sqlalchemy.orm import Session
from . import config
from .models import Mail

log = logging.getLogger("mail")

def send(db: Session, to: str, subject: str, body: str) -> Mail:
    m = Mail(to=to, subject=subject, body=body, status="outbox")
    db.add(m)
    if config.MAIL_BACKEND == "smtp" and config.SMTP_HOST:
        try:
            msg = EmailMessage()
            msg["From"], msg["To"], msg["Subject"] = config.MAIL_FROM, to, subject
            msg.set_content(body)
            with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as s:
                if config.SMTP_STARTTLS:
                    s.starttls()
                if config.SMTP_USER:
                    s.login(config.SMTP_USER, config.SMTP_PASSWORD)
                s.send_message(msg)
            m.status = "sent"
        except Exception as e:  # 寄失敗不影響主要動作，記錄下來讓管理者看
            m.status, m.error = "failed", str(e)[:500]
            log.warning("寄信失敗 %s: %s", to, e)
    db.commit()
    return m

def subject(t: str) -> str:
    return f"【教育資料素養提升計畫】{t}"
