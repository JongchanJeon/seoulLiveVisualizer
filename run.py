import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"Starting Seoul Realtime City Data FastAPI server on {settings.HOST}:{settings.PORT}...")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
