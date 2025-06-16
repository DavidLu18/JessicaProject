import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
from PIL import Image
import pytesseract
from werkzeug.utils import secure_filename
from pydub import AudioSegment
import tempfile
import time
import logging
from datetime import datetime
import ipaddress
import ssl



app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'png', 'jpg', 'jpeg', 'webm', 'ogg', 'm4a', 'flac'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Language support mapping
SUPPORTED_LANGUAGES = {
    'en-US': 'English (US)',
    'en-GB': 'English (UK)', 
    'vi-VN': 'Vietnamese',
    'zh-CN': 'Chinese (Simplified)',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'pt-BR': 'Portuguese (Brazil)',
    'ru-RU': 'Russian',
    'ar-SA': 'Arabic',
    'hi-IN': 'Hindi',
    'th-TH': 'Thai'
}

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def log_request(endpoint, filename, file_size, duration=None):
    """Log API requests for monitoring"""
    timestamp = datetime.now().isoformat()
    logger.info(f"[{timestamp}] {endpoint} - File: {filename}, Size: {file_size}MB" + 
                (f", Duration: {duration}s" if duration else ""))

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
    """Enhanced voice-to-text API with multi-language support and better error handling"""
    start_time = time.time()
    
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No audio file selected'}), 400
    
    # Get language preference
    language = request.form.get('language', 'en-US')
    if language not in SUPPORTED_LANGUAGES:
        language = 'en-US'  # Fallback to English
    
    # Get file size for logging
    file_size = len(file.read()) / (1024 * 1024)  # Convert to MB
    file.seek(0)  # Reset file pointer
    
    log_request('/api/voice-to-text', file.filename, file_size)
    
    # Validate file size
    if file_size > 25:  # 25MB limit for voice recordings
        return jsonify({'error': 'Audio file too large. Maximum size is 25MB.'}), 413
    
    # Create a temporary directory to store files
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save the file to temp directory
            temp_file = os.path.join(temp_dir, secure_filename(file.filename))
            file.save(temp_file)
            
            # Validate audio file
            if os.path.getsize(temp_file) < 1000:  # Less than 1KB
                return jsonify({'error': 'Audio file is too small or corrupted'}), 400
            
            logger.info(f"Processing voice file: {file.filename} ({file_size:.2f}MB) in {language}")
            
            # Generate a safe wav filename
            wav_file = os.path.join(temp_dir, "converted_audio.wav")
            
            # Enhanced audio conversion with quality optimization
            success = convert_audio_to_wav(temp_file, wav_file, optimize_for_speech=True)
            if not success:
                return jsonify({'error': 'Could not convert audio format'}), 500
            
            # Process with enhanced speech recognition
            result = process_speech_recognition(wav_file, language, file_size)
            
            # Log processing time
            processing_time = time.time() - start_time
            logger.info(f"Voice processing completed in {processing_time:.2f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Unexpected error in voice-to-text: {str(e)}")
            return jsonify({'error': 'An unexpected error occurred during processing'}), 500

@app.route('/api/audio-to-text', methods=['POST'])
def audio_to_text():
    """Enhanced audio-to-text API with improved large file handling"""
    start_time = time.time()
    
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No audio file selected'}), 400
    
    # Get language preference  
    language = request.form.get('language', 'en-US')
    if language not in SUPPORTED_LANGUAGES:
        language = 'en-US'
    
    # Create temp directory to avoid file permission issues
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save the uploaded file to temp directory
            filename = secure_filename(file.filename)
            filepath = os.path.join(temp_dir, filename)
            file.save(filepath)
            
            # Get file info
            file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
            log_request('/api/audio-to-text', filename, file_size_mb)
            
            # Validate file size (50MB limit)
            if file_size_mb > 50:
                return jsonify({'error': 'Audio file too large. Maximum size is 50MB.'}), 413
            
            logger.info(f"Processing audio file: {filename} ({file_size_mb:.2f}MB) in {language}")
            
            # Generate WAV path in temp directory
            wav_path = os.path.join(temp_dir, f"converted_{os.path.splitext(filename)[0]}.wav")
            
            # Enhanced audio conversion
            success = convert_audio_to_wav(filepath, wav_path, optimize_for_speech=True)
            if not success:
                return jsonify({'error': 'Could not convert audio format'}), 500
            
            # Determine processing strategy based on file size
            if file_size_mb > 10:
                logger.info("Using chunked processing for large file")
                result = process_large_audio_enhanced(wav_path, language, temp_dir)
            else:
                logger.info("Using standard processing")
                result = process_speech_recognition(wav_path, language, file_size_mb)
            
            # Log processing time
            processing_time = time.time() - start_time
            logger.info(f"Audio processing completed in {processing_time:.2f}s")
            
            return result
                
        except Exception as e:
            logger.error(f"Unexpected error in audio-to-text: {str(e)}")
            return jsonify({'error': f'Error processing audio: {str(e)}'}), 500

def convert_audio_to_wav(input_path, output_path, optimize_for_speech=False):
    """Enhanced audio conversion with speech optimization"""
    try:
        logger.info(f"Converting {input_path} to WAV format...")
        
        # Try ffmpeg first for better performance and format support
        try:
            import subprocess
            
            # Base ffmpeg command
            cmd = [
                'ffmpeg', '-y',  # Overwrite output file
                '-i', input_path,  # Input file
                '-acodec', 'pcm_s16le',  # PCM 16-bit encoding
            ]
            
            if optimize_for_speech:
                # Speech optimization settings
                cmd.extend([
                    '-ar', '16000',  # 16kHz sample rate (optimal for speech)
                    '-ac', '1',      # Mono audio
                    '-af', 'highpass=f=80,lowpass=f=8000,loudnorm=I=-16:LRA=11:TP=-1.5'  # Audio filters for speech
                ])
            else:
                cmd.extend([
                    '-ar', '44100',  # Higher quality for music/general audio
                    '-ac', '1',      # Mono audio
                ])
            
            cmd.append(output_path)  # Output file
            
            # Execute ffmpeg
            result = subprocess.run(
                cmd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                logger.info("FFmpeg conversion successful")
                return True
            else:
                raise Exception("FFmpeg failed to produce valid output")
                
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.warning(f"FFmpeg failed: {str(e)}, falling back to pydub")
            
            # Fallback to pydub
            audio = AudioSegment.from_file(input_path)
            
            # Apply speech optimization if requested
            if optimize_for_speech:
                # Convert to mono and set sample rate for speech recognition
                audio = audio.set_channels(1).set_frame_rate(16000)
                
                # Normalize audio levels
                audio = normalize_audio_levels(audio)
                
                # Apply basic noise reduction (simple high-pass filter)
                audio = audio.high_pass_filter(80)  # Remove low frequency noise
                
            else:
                audio = audio.set_channels(1).set_frame_rate(44100)
            
            # Export as WAV
            audio.export(output_path, format="wav")
            logger.info("Pydub conversion successful")
            return True
            
    except Exception as e:
        logger.error(f"Audio conversion failed: {str(e)}")
        return False

def normalize_audio_levels(audio):
    """Normalize audio levels for better speech recognition"""
    try:
        # Target level: -20dBFS (good for speech recognition)
        target_dBFS = -20.0
        
        # Calculate gain adjustment needed
        change_in_dBFS = target_dBFS - audio.dBFS
        
        # Apply gain (but limit to prevent distortion)
        if change_in_dBFS > 20:  # Limit boost to 20dB
            change_in_dBFS = 20
        elif change_in_dBFS < -20:  # Limit reduction to 20dB
            change_in_dBFS = -20
            
        normalized_audio = audio.apply_gain(change_in_dBFS)
        return normalized_audio
        
    except Exception as e:
        logger.warning(f"Audio normalization failed: {str(e)}, using original audio")
        return audio

def process_speech_recognition(wav_path, language='en-US', file_size_mb=0):
    """Enhanced speech recognition with improved settings and error handling"""
    try:
        recognizer = sr.Recognizer()
        
        # Optimize recognizer settings based on file size and language
        if file_size_mb < 5:  # Small files - more sensitive settings
            recognizer.energy_threshold = 200
            recognizer.dynamic_energy_threshold = True
            recognizer.dynamic_energy_adjustment_ratio = 2.0
            recognizer.pause_threshold = 0.5
        else:  # Larger files - more conservative settings
            recognizer.energy_threshold = 300
            recognizer.dynamic_energy_threshold = True
            recognizer.dynamic_energy_adjustment_ratio = 1.5
            recognizer.pause_threshold = 0.8
        
        with sr.AudioFile(wav_path) as source:
            logger.info("Reading audio data...")
            
            # Adjust for ambient noise with longer sample for better accuracy
            recognizer.adjust_for_ambient_noise(source, duration=min(1.0, file_size_mb * 0.1))
            
            # Record the entire audio file
            audio_data = recognizer.record(source)
            
            logger.info(f"Sending to Google Speech Recognition API (language: {language})...")
            
            # Multiple recognition attempts with different services
            recognition_attempts = [
                ('google', lambda: recognizer.recognize_google(audio_data, language=language)),
                ('google_cloud', lambda: recognizer.recognize_google_cloud(audio_data, language=language) if hasattr(recognizer, 'recognize_google_cloud') else None),
                # Add more services as needed
            ]
            
            last_error = None
            for service_name, recognition_func in recognition_attempts:
                try:
                    text = recognition_func()
                    if text and text.strip():
                        logger.info(f"Recognition successful using {service_name}: {len(text)} characters")
                        
                        # Post-process text
                        processed_text = post_process_text(text, language)
                        
                        return jsonify({
                            'text': processed_text,
                            'language': language,
                            'service': service_name,
                            'word_count': len(processed_text.split()),
                            'confidence': 'high'  # Could be enhanced with actual confidence scores
                        }), 200
                        
                except sr.UnknownValueError:
                    last_error = 'No speech could be detected'
                    logger.warning(f"{service_name} could not understand audio")
                    continue
                    
                except sr.RequestError as e:
                    last_error = f'Recognition service error: {str(e)}'
                    logger.error(f"{service_name} service error: {str(e)}")
                    continue
                    
                except Exception as e:
                    last_error = f'Unexpected error: {str(e)}'
                    logger.error(f"{service_name} unexpected error: {str(e)}")
                    continue
            
            # If all recognition attempts failed
            return jsonify({'error': last_error or 'No speech could be detected in this audio'}), 400
                    
    except Exception as e:
        logger.error(f"Speech recognition error: {str(e)}")
        return jsonify({'error': 'Error during speech recognition'}), 500

def post_process_text(text, language):
    """Post-process recognized text for better formatting"""
    if not text:
        return text
    
    # Basic text cleaning
    text = text.strip()
    
    # Language-specific post-processing
    if language.startswith('en'):
        # English post-processing
        # Capitalize first letter of sentences
        sentences = text.split('. ')
        sentences = [s.capitalize() for s in sentences]
        text = '. '.join(sentences)
        
        # Ensure proper ending punctuation
        if not text.endswith(('.', '!', '?')):
            text += '.'
            
    elif language == 'vi-VN':
        # Vietnamese post-processing
        text = text.capitalize()
        if not text.endswith(('.', '!', '?')):
            text += '.'
    
    # Add more language-specific rules as needed
    
    return text

def process_large_audio_enhanced(wav_path, language='en-US', temp_dir=None):
    """Enhanced large audio processing with better chunk management and error recovery"""
    try:
        logger.info("Processing large audio file with enhanced chunking...")
        
        # Load and prepare audio
        audio = AudioSegment.from_file(wav_path)
        audio_duration = len(audio) / 1000  # Duration in seconds
        
        logger.info(f"Audio duration: {audio_duration:.1f} seconds")
        
        # Normalize audio for consistent processing
        audio = normalize_audio_levels(audio)
        
        # Dynamic chunk sizing based on audio length
        if audio_duration <= 120:  # 2 minutes or less
            chunk_length_ms = 30000  # 30 second chunks
        elif audio_duration <= 600:  # 10 minutes or less
            chunk_length_ms = 45000  # 45 second chunks
        else:
            chunk_length_ms = 60000  # 60 second chunks
        
        # Create overlapping chunks for better continuity
        overlap_ms = 2000  # 2 second overlap
        chunks = create_overlapping_chunks(audio, chunk_length_ms, overlap_ms)
        
        logger.info(f"Audio split into {len(chunks)} chunks of {chunk_length_ms/1000}s each")
        
        # Process chunks with improved error handling
        all_text_segments = []
        recognizer = sr.Recognizer()
        
        # Configure recognizer for large file processing
        recognizer.energy_threshold = 250
        recognizer.dynamic_energy_threshold = True
        recognizer.dynamic_energy_adjustment_ratio = 1.8
        
        failed_chunks = 0
        max_failed_chunks = max(1, len(chunks) // 4)  # Allow up to 25% failed chunks
        
        for i, chunk in enumerate(chunks):
            try:
                # Export chunk to temporary WAV file
                chunk_name = f"chunk_{i:03d}.wav"
                chunk_path = os.path.join(temp_dir, chunk_name)
                chunk.export(chunk_path, format="wav")
                
                # Process chunk with retries
                chunk_text = process_chunk_with_retries(
                    chunk_path, recognizer, language, max_retries=2
                )
                
                if chunk_text:
                    all_text_segments.append(chunk_text.strip())
                    logger.info(f"Chunk {i+1}/{len(chunks)} processed successfully")
                else:
                    failed_chunks += 1
                    logger.warning(f"Chunk {i+1}/{len(chunks)} - No speech detected")
                    
                    if failed_chunks > max_failed_chunks:
                        logger.error("Too many chunks failed processing")
                        return jsonify({'error': 'Too many audio segments could not be processed'}), 400
                
                # Progressive delay to avoid rate limiting
                if i < len(chunks) - 1:
                    delay = min(0.5 + (i * 0.1), 2.0)  # Increasing delay, max 2s
                    time.sleep(delay)
                    
            except Exception as e:
                failed_chunks += 1
                logger.error(f"Error processing chunk {i+1}: {str(e)}")
                
                if failed_chunks > max_failed_chunks:
                    return jsonify({'error': 'Audio processing failed due to too many errors'}), 500
        
        # Combine and post-process results
        if not all_text_segments:
            return jsonify({'error': 'No speech could be detected in this audio file'}), 400
        
        # Smart text combination (remove overlaps and join properly)
        combined_text = smart_combine_text_segments(all_text_segments, language)
        
        # Final post-processing
        final_text = post_process_text(combined_text, language)
        
        success_rate = ((len(chunks) - failed_chunks) / len(chunks)) * 100
        
        logger.info(f"Large file processing completed. Success rate: {success_rate:.1f}%")
        
        return jsonify({
            'text': final_text,
            'language': language,
            'chunks_processed': len(chunks) - failed_chunks,
            'total_chunks': len(chunks),
            'success_rate': f"{success_rate:.1f}%",
            'duration': f"{audio_duration:.1f}s",
            'word_count': len(final_text.split())
        }), 200
        
    except Exception as e:
        logger.error(f"Enhanced large file processing error: {str(e)}")
        return jsonify({'error': f'Error processing large audio file: {str(e)}'}), 500

def create_overlapping_chunks(audio, chunk_length_ms, overlap_ms):
    """Create overlapping audio chunks for better continuity"""
    chunks = []
    start = 0
    
    while start < len(audio):
        end = min(start + chunk_length_ms, len(audio))
        chunk = audio[start:end]
        
        # Only add chunk if it's substantial enough (at least 5 seconds)
        if len(chunk) >= 5000:
            chunks.append(chunk)
        
        # Move start position (with overlap)
        start += chunk_length_ms - overlap_ms
        
        # Prevent infinite loop
        if start >= len(audio):
            break
            
    return chunks

def process_chunk_with_retries(chunk_path, recognizer, language, max_retries=2):
    """Process a single chunk with retry logic"""
    for attempt in range(max_retries + 1):
        try:
            with sr.AudioFile(chunk_path) as source:
                # Adjust noise threshold for each chunk
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_data = recognizer.record(source)
                
                # Try recognition
                text = recognizer.recognize_google(audio_data, language=language)
                
                if text and text.strip():
                    return text.strip()
                else:
                    return None
                    
        except sr.UnknownValueError:
            # No speech detected - not an error, just empty result
            return None
            
        except (sr.RequestError, ConnectionError, OSError) as e:
            if attempt < max_retries:
                wait_time = (attempt + 1) * 1.5  # Progressive backoff
                logger.warning(f"Chunk processing attempt {attempt + 1} failed: {str(e)}, retrying in {wait_time}s")
                time.sleep(wait_time)
            else:
                logger.error(f"All retry attempts failed for chunk: {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Unexpected error processing chunk: {str(e)}")
            return None
            
    return None

def smart_combine_text_segments(segments, language):
    """Intelligently combine text segments, removing overlaps and ensuring proper flow"""
    if not segments:
        return ""
    
    if len(segments) == 1:
        return segments[0]
    
    # For now, simple joining - could be enhanced with overlap detection
    combined = []
    
    for i, segment in enumerate(segments):
        if not segment:
            continue
            
        # Clean up segment
        segment = segment.strip()
        
        if i == 0:
            combined.append(segment)
        else:
            # Check for potential overlap with previous segment
            prev_words = combined[-1].split()[-3:] if combined else []
            curr_words = segment.split()[:3]
            
            # Simple overlap detection (check if last 3 words match first 3 words)
            overlap_detected = False
            if len(prev_words) >= 2 and len(curr_words) >= 2:
                if ' '.join(prev_words[-2:]).lower() == ' '.join(curr_words[:2]).lower():
                    # Remove overlap from current segment
                    segment = ' '.join(segment.split()[2:])
                    overlap_detected = True
            
            if segment.strip():  # Only add if there's content left
                combined.append(segment)
    
    # Join with appropriate spacing
    result = ' '.join(combined)
    
    # Clean up multiple spaces
    import re
    result = re.sub(r'\s+', ' ', result).strip()
    
    return result

@app.route('/api/image-to-text', methods=['POST'])
def image_to_text():
    """Enhanced image-to-text with better error handling"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            file.save(filepath)
            
            # Get file size for logging
            file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
            log_request('/api/image-to-text', filename, file_size_mb)
            
            # Process image
            image = Image.open(filepath)
            
            # Enhanced OCR with better configuration
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:\'"()\-\s'
            text = pytesseract.image_to_string(image, config=custom_config)
            
            # Clean up the extracted text
            text = text.strip()
            if not text:
                return jsonify({'error': 'No text could be detected in this image'}), 400
            
            logger.info(f"Image OCR successful: {len(text)} characters extracted")
            
            return jsonify({
                'text': text,
                'character_count': len(text),
                'word_count': len(text.split()),
                'confidence': 'medium'  # OCR confidence is generally lower than speech recognition
            }), 200
            
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return jsonify({'error': 'Error processing image'}), 500
        finally:
            # Clean up file
            if os.path.exists(filepath):
                os.remove(filepath)
    
    return jsonify({'error': 'Unsupported file type. Please use PNG, JPG or JPEG files.'}), 400

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'version': '2.0',
        'services': {
            'speech_recognition': 'active',
            'image_processing': 'active',
            'audio_conversion': 'active'
        },
        'supported_languages': list(SUPPORTED_LANGUAGES.keys()),
        'max_file_size_mb': 50
    }), 200

def create_self_signed_cert(cert_file, key_file):
    """Create a self-signed certificate using Python cryptography library"""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime
        
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "VN"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "HCM"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Ho Chi Minh"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "EnglishPro"),
            x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.IPAddress(ipaddress.IPv6Address("::1")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Write certificate and key to files
        with open(cert_file, 'wb') as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
            
        with open(key_file, 'wb') as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
            
        print("✅ Self-signed certificate created with Python!")
        
    except ImportError:
        print("❌ Cryptography library not found")
        print("💡 Install it with: pip install cryptography")
        raise
    except Exception as e:
        print(f"❌ Certificate creation failed: {e}")
        raise

if __name__ == '__main__':
    import os
    from werkzeug.serving import WSGIRequestHandler
    import ssl
    
    # Create SSL context for HTTPS (required for microphone access)
    try:
        # Try to create a self-signed certificate if it doesn't exist
        cert_file = 'cert.pem'
        key_file = 'key.pem'
        
        if not os.path.exists(cert_file) or not os.path.exists(key_file):
            # Generate self-signed certificate
            import subprocess
            try:
                # Create self-signed certificate using OpenSSL (if available)
                subprocess.run([
                    'openssl', 'req', '-x509', '-newkey', 'rsa:4096', '-nodes', 
                    '-out', cert_file, '-keyout', key_file, '-days', '365',
                    '-subj', '/C=VN/ST=HCM/L=HoChiMinh/O=EnglishPro/CN=localhost'
                ], check=True, capture_output=True)
                print("✅ SSL certificate created successfully!")
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("⚠️ OpenSSL not found. Creating fallback certificate...")
                # Fallback: create certificate using Python
                create_self_signed_cert(cert_file, key_file)
        
        # Create SSL context
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert_file, key_file)
        
        print("🚀 Starting EnglishPro with HTTPS support...")
        print("📱 Access the app at: https://localhost:5000")
        print("🔒 SSL certificate loaded successfully")
        print("🎤 Microphone access will work properly now")
        
        # Run with SSL
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            ssl_context=context,
            threaded=True
        )
        
    except Exception as e:
        print(f"❌ SSL setup failed: {e}")
        print("🔄 Falling back to HTTP mode...")
        print("⚠️ Note: Microphone may not work without HTTPS")
        print("💡 For production, use a proper reverse proxy with SSL")
        
        # Fallback to HTTP
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            threaded=True
        )