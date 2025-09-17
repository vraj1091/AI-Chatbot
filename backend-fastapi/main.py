import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from PIL import Image
import io
from typing import Optional

# Initialize FastAPI app
app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=GEMINI_API_KEY)

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.get("/")
async def root():
    return {"message": "Gemini Fullstack Chatbot API - Fixed Image Processing"}

@app.post("/chat", response_model=ChatResponse)
async def chat(chat_message: ChatMessage):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(chat_message.message)
        return ChatResponse(response=response.text)
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.post("/chat/image")
async def chat_with_image(
    file: UploadFile = File(...),
    message: Optional[str] = "What do you see in this image?"
):
    try:
        print(f"Received file: {file.filename}, content_type: {file.content_type}")

        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read image bytes
        image_bytes = await file.read()
        print(f"Image bytes length: {len(image_bytes)}")

        # Validate that we have image data
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")

        # Try to open and validate the image with Pillow
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Verify the image can be loaded
            image.verify()

            # Reopen the image for processing (verify() closes the file)
            image = Image.open(io.BytesIO(image_bytes))
            print(f"Image format: {image.format}, size: {image.size}, mode: {image.mode}")

            # Convert to RGB if necessary (for JPEG compatibility)
            if image.mode != 'RGB':
                image = image.convert('RGB')

        except Exception as img_error:
            print(f"PIL Error: {str(img_error)}")
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(img_error)}")

        # Use Gemini 1.5 Flash for image analysis
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Create the prompt with both text and image
            prompt_parts = [message, image]
            response = model.generate_content(prompt_parts)

            return {
                "response": response.text, 
                "filename": file.filename,
                "image_info": f"Format: {image.format}, Size: {image.size}"
            }

        except Exception as genai_error:
            print(f"Gemini API Error: {str(genai_error)}")
            raise HTTPException(status_code=500, detail=f"Gemini API error: {str(genai_error)}")

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error in image chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error processing image: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models": ["gemini-1.5-flash"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
