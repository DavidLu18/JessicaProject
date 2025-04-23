import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
from PIL import Image
import pytesseract
from werkzeug.utils import secure_filename
from pydub import AudioSegment

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/voice-to-text')
def voice_to_text_page():
    return render_template('voice_to_text.html')

@app.route('/audio-to-text')
def audio_to_text_page():
    return render_template('audio_to_text.html')

@app.route('/image-to-text')
def image_to_text_page():
    return render_template('image_to_text.html')

@app.route('/api/voice-to-text', methods=['POST'])
def voice_to_text():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No audio file selected'}), 400
    
    # Save the file regardless of extension for further processing
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Debug information
    print(f"File saved to {filepath}, size: {os.path.getsize(filepath)} bytes")
    
    try:
        # Always convert to WAV with proper PCM encoding for compatibility
        wav_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{os.path.splitext(filename)[0]}.wav")
        
        try:
            # For browser-recorded audio (likely webm format)
            print("Attempting to convert audio file to WAV...")
            AudioSegment.converter = "ffmpeg"  # Make sure to use ffmpeg
            sound = AudioSegment.from_file(filepath)
            
            # Ensure proper format for speech recognition
            sound = sound.set_channels(1)  # Mono
            sound = sound.set_frame_rate(16000)  # 16kHz
            
            # Save as WAV
            sound.export(wav_path, format="wav")
            print(f"Converted to WAV at {wav_path}")
        except Exception as conv_err:
            print(f"Conversion error: {str(conv_err)}")
            return jsonify({'error': f'Unable to convert audio: {str(conv_err)}'}), 500
            
        # Use the converted WAV file
        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(wav_path) as source:
                print("Reading audio file...")
                # Adjust for ambient noise and increase timeout
                recognizer.adjust_for_ambient_noise(source)
                print("Recording audio data...")
                audio_data = recognizer.record(source)
                
                print("Recognizing speech...")
                # Use language parameter and specify service
                text = recognizer.recognize_google(audio_data, language='en-US')
                print(f"Recognition successful: '{text}'")
                return jsonify({'text': text}), 200
        except sr.UnknownValueError:
            print("Speech Recognition could not understand audio")
            return jsonify({'error': 'Speech Recognition could not understand audio. Please speak clearly.'}), 500
        except sr.RequestError as e:
            print(f"Could not request results from Speech Recognition service: {e}")
            return jsonify({'error': f'Speech Recognition service unavailable: {e}'}), 500
        except Exception as e:
            print(f"General error in speech recognition: {str(e)}")
            return jsonify({'error': f'Error processing speech: {str(e)}'}), 500
        finally:
            # Clean up files
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
                if os.path.exists(wav_path):
                    os.remove(wav_path)
            except Exception as e:
                print(f"Error cleaning up files: {str(e)}")
    except Exception as e:
        print(f"Error in overall processing: {str(e)}")
        return jsonify({'error': f'Error processing audio: {str(e)}'}), 500
        
    return jsonify({'error': 'Failed to process audio file'}), 400

@app.route('/api/audio-to-text', methods=['POST'])
def audio_to_text():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No audio file selected'}), 400
    
    # Save the uploaded file
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Debug info
    print(f"Received file: {filename}, Size: {os.path.getsize(filepath)} bytes")
    
    # Determine if it's an MP3 file
    is_mp3 = filename.lower().endswith('.mp3')
    wav_path = os.path.join(app.config['UPLOAD_FOLDER'], f"converted_{os.path.splitext(filename)[0]}.wav")
    
    try:
        # Special handling for MP3 files
        if is_mp3:
            print("Detected MP3 file, using specialized conversion...")
            
            # Using direct system call to convert MP3 to WAV
            import subprocess
            try:
                print("Attempting ffmpeg conversion...")
                conversion_cmd = [
                    'ffmpeg',
                    '-y',  # Overwrite output file if it exists
                    '-i', filepath,  # Input file
                    '-acodec', 'pcm_s16le',  # PCM 16-bit output
                    '-ar', '16000',  # 16kHz sample rate
                    '-ac', '1',  # Mono channel
                    wav_path  # Output file
                ]
                
                # Run ffmpeg command
                process = subprocess.run(
                    conversion_cmd,
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                print(f"FFmpeg conversion completed successfully")
                
                # Check if the output file exists and has content
                if not os.path.exists(wav_path) or os.path.getsize(wav_path) < 1000:
                    print(f"Warning: Converted file is too small or doesn't exist")
                    return jsonify({'error': 'Failed to convert audio file properly'}), 500
                
            except subprocess.CalledProcessError as e:
                print(f"FFmpeg error: {e.stderr}")
                return jsonify({'error': 'Error converting audio file'}), 500
            except Exception as e:
                print(f"System conversion error: {str(e)}")
                return jsonify({'error': 'System error during conversion'}), 500
                
        else:
            # For WAV files, use directly
            print("Non-MP3 file, using original file...")
            wav_path = filepath
        
        # Now perform speech recognition on the WAV file
        recognizer = sr.Recognizer()
        try:
            print(f"Performing speech recognition on {wav_path}")
            
            with sr.AudioFile(wav_path) as source:
                # Configure recognizer for this audio source
                recognizer.pause_threshold = 1  # Longer pause threshold for better segmentation
                recognizer.energy_threshold = 300  # Lower energy threshold for better sensitivity
                
                # Record the audio data
                audio_data = recognizer.record(source)
                
                # Recognize speech using Google Speech Recognition
                print("Sending to Google Speech API...")
                text = recognizer.recognize_google(
                    audio_data, 
                    language='en-US',
                    show_all=False  # Return only the most likely result
                )
                
                print(f"Recognition successful, text length: {len(text)}")
                return jsonify({'text': text}), 200
                
        except sr.UnknownValueError:
            print("Speech Recognition could not understand audio")
            return jsonify({'error': 'No speech detected in the audio'}), 500
            
        except sr.RequestError as e:
            print(f"Could not request results from Speech Recognition service: {e}")
            return jsonify({'error': 'Speech recognition service unavailable'}), 500
            
        except Exception as e:
            print(f"Error during speech recognition: {str(e)}")
            return jsonify({'error': 'Error processing speech'}), 500
            
    except Exception as e:
        print(f"Unexpected error in audio processing: {str(e)}")
        return jsonify({'error': f'Error processing audio: {str(e)}'}), 500
        
    finally:
        # Clean up files
        try:
            if os.path.exists(filepath) and filepath != wav_path:
                os.remove(filepath)
                print(f"Removed original file {filepath}")
                
            if os.path.exists(wav_path) and wav_path != filepath:
                os.remove(wav_path)
                print(f"Removed converted file {wav_path}")
                
        except Exception as e:
            print(f"Error during file cleanup: {str(e)}")

    # This line should never be reached, but just in case
    return jsonify({'error': 'Unknown error in audio processing'}), 500

@app.route('/api/image-to-text', methods=['POST'])
def image_to_text():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            image = Image.open(filepath)
            text = pytesseract.image_to_string(image)
            return jsonify({'text': text}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up file
            if os.path.exists(filepath):
                os.remove(filepath)
    
    # Return error for unsupported file types
    return jsonify({'error': 'Unsupported file type. Please use PNG, JPG or JPEG files.'}), 400

if __name__ == '__main__':
    app.run(debug=True)