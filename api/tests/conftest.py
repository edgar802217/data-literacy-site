import os, sys, tempfile
from pathlib import Path
_db = Path(tempfile.mkdtemp()) / "test.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_db}")
os.environ["ADMIN_BOOTSTRAP_PASSWORD"] = "Bootstrap2026"
os.environ["BASE_URL"] = "http://testserver"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient
from app.main import app

H = {"X-Requested-With": "fetch"}

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

def login(c, email, pw):
    c.cookies.clear()
    return c.post("/api/auth/login", json={"email": email, "password": pw}, headers=H)

@pytest.fixture(scope="session")
def admin(client):
    """admin 首次登入後改成正式密碼，回傳已登入的 client"""
    r = login(client, "admin", "Bootstrap2026")
    assert r.status_code == 200 and r.json()["mustChangePassword"]
    r = client.post("/api/auth/change-password", json={"current": "Bootstrap2026", "password": "AdminPass2026"}, headers=H)
    assert r.status_code == 200, r.text
    return client
