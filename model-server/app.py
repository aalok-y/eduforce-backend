from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import io
import json
import PyPDF2
import os
from dotenv import load_dotenv
from google import genai
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

app = FastAPI(title="Assessment Questions API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins, or you can specify a list of domains like ['https://example.com']
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

API_KEY = os.getenv('GEMINI_API_KEY')

# Data models for output formatting
class Question(BaseModel):
    question: str
    option1: str
    option2: str
    option3: str
    option4: str
    correctOption: int
    tags: List[str]
    difficulty: str

class QuestionSet(BaseModel):
    set_id: int
    questions: List[Question]

class QuestionsResponse(BaseModel):
    subject: str
    chapter: str
    sets: List[QuestionSet]

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from PDF file bytes.
    """
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        raise ValueError(f"Failed to extract PDF text: {str(e)}") from e

def generate_questions_from_gemini(pdf_text: str, num_questions: int = 15, num_sets: int = 1) -> Dict[str, Any]:
    """
    Use Gemini API to generate multiple sets of questions based on PDF text
    """
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is not set in environment variables.")
    
    client = genai.Client(api_key=API_KEY)
    
    # Create a prompt that instructs Gemini to generate questions in the required format with multiple sets
    prompt = f"""
    Based on the following educational content, generate {num_sets} {'set' if num_sets == 1 else 'sets'} of assessment questions, with {num_questions} questions per set.
    
    Content:
    {pdf_text[:15000]}  # Limiting text length to avoid token limits
    
    Generate a JSON object with the following structure:
    {{
      "subject": "Determine the subject based on the content",
      "chapter": "Determine the chapter based on the content",
      "sets": [
        {{
          "set_id": 1,
          "questions": [
            {{
              "question": "Question text",
              "option1": "First option",
              "option2": "Second option",
              "option3": "Third option",
              "option4": "Fourth option",
              "correctOption": 1, // Number between 1-4 indicating the correct answer
              "tags": ["tag1", "tag2"], // Relevant topic tags
              "difficulty": "easy" // One of: "easy", "medium", or "hard"
            }},
            // Each set should have exactly {num_questions} questions
          ]
        }},
        // Generate {num_sets} separate sets
      ]
    }}
    
    Make sure to:
    1. Create a mix of easy, medium, and hard questions in each set
    2. Ensure the correctOption is an integer between 1-4
    3. Generate relevant tags for each question
    4. Make all options plausible but only one correct
    5. Questions in different sets should be unique (don't repeat questions across sets)
    6. Each set should have exactly {num_questions} questions
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        # Parse the JSON from the response text
        # We need to extract just the JSON part in case there's any additional text
        response_text = response.text
        
        # Try to find JSON in the response
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = response_text[json_start:json_end]
            questions_data = json.loads(json_str)
            print(questions_data)
            return questions_data
        else:
            # If no JSON found, raise an error
            raise ValueError("Could not extract JSON from Gemini response")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")

@app.post("/generate-questions", response_model=QuestionsResponse)
async def generate_questions(
    pdf_file: UploadFile = File(...),
    questions: Optional[int] = Query(15, description="Number of questions per set"),
    sets: Optional[int] = Query(1, description="Number of question sets to generate")
):
    """
    Endpoint to accept a PDF upload, extract its text, call Gemini API to generate questions,
    and return multiple sets of questions in the specified format.
    
    Parameters:
    - pdf_file: PDF file upload containing the educational content
    - questions: Number of questions to generate per set (default: 15)
    - sets: Number of question sets to generate (default: 1)
    """
    # Validate input parameters
    if questions < 1 or questions > 50:
        raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 50")
    
    if sets < 1 or sets > 10:
        raise HTTPException(status_code=400, detail="Number of sets must be between 1 and 10")
    
    # Ensure the uploaded file is a PDF
    if not pdf_file.content_type == "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF file.")
    
    try:
        file_bytes = await pdf_file.read()
        pdf_text = extract_text_from_pdf(file_bytes)
        
        if not pdf_text or len(pdf_text) < 100:  # Basic validation
            raise HTTPException(status_code=400, detail="Could not extract sufficient text from PDF.")
        
        # Generate questions using Gemini API with specified parameters
        questions_data = generate_questions_from_gemini(pdf_text, questions, sets)
        
        # Validate the response structure
        if "sets" not in questions_data:
            # If the API returned the old format with "questions" at the top level,
            # convert it to the new format with a single set
            if "questions" in questions_data:
                questions_data["sets"] = [{"set_id": 1, "questions": questions_data["questions"]}]
        
        # Create QuestionsResponse object and return
        response_content = QuestionsResponse(
            subject=questions_data.get("subject", "General"),
            chapter=questions_data.get("chapter", "General"),
            sets=[QuestionSet(**s) for s in questions_data.get("sets", [])]
        )
        
        return response_content
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)