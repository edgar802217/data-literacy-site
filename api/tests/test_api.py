import re
from app.security import password_problems
from .conftest import H, login

def test_password_rules():
    assert password_problems("Abcdefgh") == []
    assert "至少 8 個字元" in password_problems("Abc1")
    assert any("小寫" in p for p in password_problems("ABCDEFGH1"))
    assert any("大寫" in p for p in password_problems("abcdefgh1"))
    for bad in ("Abcd000000", "Abcd123456", "Ab654321cd", "x9876543Y"):
        assert any("連續" in p for p in password_problems(bad)), bad
    assert password_problems("Ab12345x7890") == []   # 5 碼連續沒關係
    assert password_problems("Ab135790") == []

def test_public_catalog_and_content(client):
    r = client.get("/api/public/catalog").json()
    assert {c["id"] for c in r["courses"]} == {"A", "B", "T"}
    g1n = next(s for s in r["sessions"] if s["id"] == "G1N")
    assert g1n["date2"] == "2026-11-22" and g1n["venue2"] == "國立臺北教育大學"
    c = client.get("/api/public/content").json()
    assert c["settings"]["聯絡電話"].startswith("07-7172930") and c["faq"]

def test_csrf_header_required(client):
    r = client.post("/api/auth/login", json={"email": "admin", "password": "x"})
    assert r.status_code == 403
    r = client.post("/api/auth/login", json={"email": "admin", "password": "x"}, headers={**H, "Origin": "https://evil.example"})
    assert r.status_code == 403


def test_register_verify_and_reset(client, admin):
    client.cookies.clear()
    r = client.post("/api/auth/register", json={"email": "T.Chen@school.edu.tw", "name": "陳老師", "password": "weak", "job": "teacher"}, headers=H)
    assert r.status_code == 422
    r = client.post("/api/auth/register", json={"email": "T.Chen@school.edu.tw", "name": "陳老師", "password": "Teacher2026", "job": "teacher", "org": "某國中", "county": "高雄市"}, headers=H)
    assert r.status_code == 200 and r.json()["verified"] is False and r.json()["email"] == "t.chen@school.edu.tw"
    assert client.get("/api/auth/me").json()["user"]["name"] == "陳老師"
    # 從寄件紀錄拿驗證連結（管理者才能看）
    login(client, "admin", "AdminPass2026")
    mails = client.get("/api/admin/mails").json()
    m = next(x for x in mails if x["to"] == "t.chen@school.edu.tw")
    token = re.search(r"token=([^\s]+)", m["body"]).group(1)
    assert client.post("/api/auth/verify", json={"token": token}, headers=H).status_code == 200
    assert client.post("/api/auth/verify", json={"token": token + "x"}, headers=H).status_code == 400
    # 忘記密碼
    client.post("/api/auth/forgot", json={"email": "t.chen@school.edu.tw"}, headers=H)
    m = next(x for x in client.get("/api/admin/mails").json() if "重設密碼" in x["subject"])
    tk = re.search(r"token=([^\s]+)", m["body"]).group(1)
    assert client.post("/api/auth/reset", json={"token": tk, "password": "Abc123456x"}, headers=H).status_code == 422
    assert client.post("/api/auth/reset", json={"token": tk, "password": "NewTeacher99"}, headers=H).status_code == 200
    assert client.post("/api/auth/reset", json={"token": tk, "password": "Another99X"}, headers=H).status_code == 400  # 一次性
    r = login(client, "t.chen@school.edu.tw", "NewTeacher99")
    assert r.status_code == 200 and r.json()["verified"] is True
    # 一般學員不能用後台
    assert client.get("/api/admin/content").status_code == 403

def test_lockout(client, admin):
    client.cookies.clear()
    client.post("/api/auth/register", json={"email": "lock@x.tw", "name": "鎖", "password": "LockTest2026"}, headers=H)
    for _ in range(5):
        assert login(client, "lock@x.tw", "WrongPass1").status_code == 401
    assert login(client, "lock@x.tw", "LockTest2026").status_code == 423

def test_admin_grants_roles_and_staff_edits_content(client, admin):
    login(client, "admin", "AdminPass2026")
    r = client.post("/api/admin/users", json={"email": "staff@nknu.edu.tw", "name": "李承辦", "roles": ["staff"], "county": "", "org": "計畫辦公室"}, headers=H)
    assert r.status_code == 200, r.text
    temp = r.json()["tempPassword"]
    uid = r.json()["user"]["id"]
    # 新帳號首次登入要先改密碼，改之前不能用後台
    login(client, "staff@nknu.edu.tw", temp)
    assert client.get("/api/admin/content").status_code == 403
    assert client.post("/api/auth/change-password", json={"current": temp, "password": "StaffPass2026"}, headers=H).status_code == 200
    # 計畫承辦：可以改內容，不能管帳號
    assert client.get("/api/admin/users").status_code == 403
    n = client.post("/api/admin/news", json={"date": "2026-10-13", "category": "研習", "title": "測試消息"}, headers=H).json()
    assert any(x["title"] == "測試消息" for x in client.get("/api/public/content").json()["news"])
    client.patch(f"/api/admin/news/{n['id']}", json={"date": "2026-10-13", "title": "測試消息（隱藏）", "visible": False}, headers=H)
    assert not any(x["id"] == n["id"] for x in client.get("/api/public/content").json()["news"])
    assert client.post("/api/admin/news", json={"date": "2026-10-13", "title": "x", "link": "javascript:alert(1)"}, headers=H).status_code == 422
    assert client.put("/api/admin/settings", json={"values": {"重要公告": "新公告"}}, headers=H).status_code == 200
    assert client.get("/api/public/content").json()["settings"]["重要公告"] == "新公告"
    # 場次
    s = {"course": "A", "region": "南區", "date": "2026-12-12", "venue": "國立高雄師範大學", "cap": 40, "deadline": "2026-12-01", "open": True}
    r = client.post("/api/admin/sessions", json=s, headers=H)
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    assert sid == "B6261212S"
    assert client.post("/api/admin/sessions", json={**s, "deadline": "2026-12-20"}, headers=H).status_code in (409, 422)
    assert client.patch(f"/api/admin/sessions/{sid}", json={**s, "cap": 60}, headers=H).json()["cap"] == 60
    assert client.delete(f"/api/admin/sessions/{sid}", headers=H).status_code == 200
    # 管理者可以撤銷權限
    login(client, "admin", "AdminPass2026")
    me = client.get("/api/auth/me").json()["user"]
    assert client.patch(f"/api/admin/users/{me['id']}", json={"name": "x", "roles": ["staff"]}, headers=H).status_code == 422
    r = client.patch(f"/api/admin/users/{uid}", json={"name": "李承辦", "roles": ["learner"], "org": "計畫辦公室"}, headers=H)
    assert r.json()["roles"] == ["learner"]
    assert client.get("/api/admin/audit").status_code == 200
