# EnglishPro - English Learning Platform

This web-based application provides tools for English language learning, particularly targeted at IELTS preparation and practice.

## Features

1. **Voice to Text Conversion**
   - Record your voice and convert it to text in real-time
   - Perfect for practicing speaking skills and checking pronunciation

2. **Audio to Text Conversion**
   - Upload MP3 files and convert them to text
   - Useful for transcribing lectures, podcasts, and study materials

3. **Image to Text (OCR)**
   - Extract text from images
   - Ideal for IELTS writing practice with printed materials

## Technologies Used

- **Backend**: Python with Flask
- **Frontend**: HTML, CSS, JavaScript (Vanilla JS)
- **Libraries**:
  - SpeechRecognition for audio processing
  - Pytesseract for OCR functionality
  - Pydub for MP3 handling

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd english-learning-platform
```

2. Set up a virtual environment:
```
python -m venv venv
```

3. Activate the virtual environment:

On Windows:
```
venv\Scripts\activate
```

On macOS/Linux:
```
source venv/bin/activate
```

4. Install dependencies:
```
pip install -r requirements.txt
```

5. Install Tesseract-OCR (required for image-to-text functionality):

On Windows:
- Download and install from: https://github.com/UB-Mannheim/tesseract/wiki
- Add the installation path to your system PATH

On macOS:
```
brew install tesseract
```

On Linux:
```
sudo apt install tesseract-ocr
```

## Running the Application

1. Start the Flask server:
```
python app.py
```

2. Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

## Usage

### Voice to Text
1. Navigate to the Voice to Text page
2. Click "Start Recording" and speak into your microphone
3. Click "Stop Recording" when finished
4. View your transcribed text

### Audio to Text
1. Navigate to the Audio to Text page
2. Upload an MP3 or WAV file
3. Click "Convert to Text"
4. View your transcribed text

### Image to Text
1. Navigate to the Image to Text page
2. Upload an image containing text
3. Click "Extract Text"
4. View the extracted text

## Project Structure

- `app.py` - Main Flask application
- `templates/` - HTML templates
- `static/` - Static files
  - `css/` - Stylesheets
  - `js/` - JavaScript files
  - `images/` - Image assets
- `uploads/` - Temporary folder for uploaded files