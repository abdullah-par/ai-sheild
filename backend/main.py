from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from database import engine, Base
from routers.auth_router      import router as auth_router
from routers.phishing_router  import router as phishing_router
from routers.stego_router     import router as stego_router
from routers.dashboard_router import router as dashboard_router
from routers.chatbot_router   import router as chatbot_router


# ── DB Init on startup ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("""
            IF COL_LENGTH('dbo.users', 'username') IS NULL
                ALTER TABLE dbo.users ADD username NVARCHAR(100) NULL;
        """))
        await conn.execute(text("""
            IF COL_LENGTH('dbo.users', 'avatar_key') IS NULL
                ALTER TABLE dbo.users ADD avatar_key NVARCHAR(50) NULL;
        """))
    yield


# ── App ──────────────────────────────────────────
app = FastAPI(
    title="AI-SHIELD API",
    description="AI-powered Cyber Threat Detection Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────
app.include_router(auth_router)
app.include_router(phishing_router)
app.include_router(stego_router)
app.include_router(dashboard_router)
app.include_router(chatbot_router)


# ── Health Check ─────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "AI-SHIELD API", "version": "1.0.0"}

@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy"}
