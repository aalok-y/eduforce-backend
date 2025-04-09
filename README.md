# How to setup backend

## In root directory

1. pnpm install
2. pnpm dev

**.env contents**
DATABASE_URL=
PORT=5000

## In model-server directory

1. pip install fastapi[all] PyPDF2 python-dotenv google-genai pydantic
2. uvicorn app:app --reload

**Add .env file with gemini API KEY**
**.env contents**
GEMINI_API_KEY=
