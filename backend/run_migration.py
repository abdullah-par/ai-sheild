import asyncio
from sqlalchemy import text
from database import engine

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE reports ADD user_id INT NULL"))
            print("Successfully added user_id column to reports table!")
            await conn.execute(text("ALTER TABLE reports ADD CONSTRAINT FK_reports_users FOREIGN KEY (user_id) REFERENCES users(id)"))
            print("Successfully added foreign key constraint!")
        except Exception as e:
            print(f"Error adding user_id column: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
