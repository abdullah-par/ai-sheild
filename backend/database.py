from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os
import urllib

load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", "localhost")
DB_NAME   = os.getenv("DB_NAME",   "AiShieldDB")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

# Build ODBC connection string (Windows Authentication = Trusted_Connection=yes)
odbc_str = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_NAME};"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
)

# URL-encode for SQLAlchemy
DATABASE_URL = f"mssql+aioodbc:///?odbc_connect={urllib.parse.quote_plus(odbc_str)}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,           # set True to log SQL queries during development
    pool_pre_ping=True,   # validates connection before use
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
