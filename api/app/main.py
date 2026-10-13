"""教育資料素養提升計畫入口網：後端 API。所有路徑都在 /api 底下，由 Vercel 轉接。"""
import logging
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from .auth import router as auth_router
from .content import admin as content_admin, public
from .deps import check_origin
from .seed import init_db
from .users import router as users_router

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield

app = FastAPI(title="教育資料素養提升計畫入口網 API", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json",
              dependencies=[Depends(check_origin)])
for r in (auth_router, public, content_admin, users_router):
    app.include_router(r, prefix="/api")

@app.get("/api/health")
def health():
    return {"ok": True}
