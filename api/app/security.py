"""密碼、登入工作階段與一次性連結。"""
import hashlib
import re
import secrets
import string
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from . import config

_ph = PasswordHasher()

def hash_password(pw: str) -> str:
    return _ph.hash(pw)

def verify_password(pw: str, h: str) -> bool:
    try:
        return _ph.verify(h, pw)
    except (VerificationError, InvalidHashError):
        return False

def password_problems(pw: str) -> list[str]:
    """密碼規則：至少 8 碼、含小寫與大寫英文字母、不能有 6 位連續或重複的數字（如 000000、123456、654321）。"""
    out = []
    if len(pw) < 8:
        out.append("至少 8 個字元")
    if not re.search(r"[a-z]", pw):
        out.append("至少一個小寫英文字母")
    if not re.search(r"[A-Z]", pw):
        out.append("至少一個大寫英文字母")
    for m in re.finditer(r"\d{6,}", pw):
        run = m.group()
        for i in range(len(run) - 5):
            d = [int(c) for c in run[i:i + 6]]
            steps = {d[k + 1] - d[k] for k in range(5)}
            if steps in ({0}, {1}, {-1}):
                out.append("不能有 6 位連續或重複的數字（例如 000000、123456）")
                return out
    return out

def temp_password() -> str:
    """管理者重設時給的臨時密碼，本身也符合密碼規則"""
    while True:
        pw = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        if not password_problems(pw):
            return pw

# ---- 登入工作階段：cookie 只放隨機字串，資料庫存它的雜湊 ----
def new_session_token() -> tuple[str, str]:
    t = secrets.token_urlsafe(32)
    return t, hashlib.sha256(t.encode()).hexdigest()

def token_hash(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()

# ---- email 驗證與重設密碼的連結 ----
_ser = URLSafeTimedSerializer(config.SECRET_KEY)

def make_link_token(kind: str, user_id: str, fingerprint: str = "") -> str:
    return _ser.dumps({"u": user_id, "f": fingerprint}, salt=kind)

def read_link_token(kind: str, token: str, max_age: int) -> dict | None:
    try:
        return _ser.loads(token, salt=kind, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None

def pw_fingerprint(password_hash: str) -> str:
    """重設連結綁定目前密碼：改過密碼後，舊連結自動失效（一次性）"""
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]
