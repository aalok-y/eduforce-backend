#How to setup backend

##In root directory

1. pnpm install
2. pnpm dev

##In model-server directory

1. pip install fastapi[all] PyPDF2 python-dotenv google-genai pydantic
2. uvicorn app:app --reload
