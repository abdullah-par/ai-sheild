"""
Run this ONCE before starting the server to:
  1. Create the AiShieldDB database in SQL Server
  2. Create all tables (users, scans)

Usage:
    python create_db.py
"""
import sys
import pyodbc
import asyncio
from dotenv import load_dotenv
import os

# Force UTF-8 output so emojis don't crash on Windows cp1252
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", "localhost")
DB_NAME   = os.getenv("DB_NAME",   "AiShieldDB")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")


def create_database():
    """Connect to master and create the AiShieldDB database if it doesn't exist."""
    conn_str = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        "DATABASE=master;"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
    )
    conn = pyodbc.connect(conn_str, autocommit=True)
    cursor = conn.cursor()
    cursor.execute(
        f"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '{DB_NAME}') "
        f"CREATE DATABASE [{DB_NAME}]"
    )
    print(f"[OK] Database '{DB_NAME}' is ready on server '{DB_SERVER}'")
    cursor.close()
    conn.close()


async def create_tables():
    """Use SQLAlchemy to create all ORM-defined tables."""
    from database import engine, Base
    import models  # noqa - registers models with Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("[OK] Tables created: users, scans")


if __name__ == "__main__":
    print("[*] Setting up AI-SHIELD database...")
    create_database()
    asyncio.run(create_tables())
    print("[DONE] Setup complete. Run: python -m uvicorn main:app --reload")
