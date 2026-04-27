import asyncio
from sqlalchemy import select
from database import get_db
from models import Report

async def test():
    async for db in get_db():
        try:
            # Try to query the Report table
            query = select(Report).limit(1)
            result = await db.execute(query)
            print("Successfully queried Report table!")
        except Exception as e:
            print(f"Error querying Report table: {e}")

if __name__ == "__main__":
    asyncio.run(test())
