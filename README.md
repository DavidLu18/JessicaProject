# 🎤 EnglishPro - Voice to Text Application

English learning platform with advanced voice recognition, audio-to-text, and image-to-text features.

## 🚨 Fixing HTTPS Error

The error you're seeing is because modern browsers require HTTPS for microphone access. Here's how to fix it:

### Quick Fix (Recommended)

1. **Install SSL support:**
   ```bash
   pip install cryptography
   ```

2. **Restart the server:**
   ```bash
   python app.py
   ```

3. **Access via HTTPS:**
   - Open: `https://localhost:5000`
   - Or: `https://127.0.0.1:5000`

4. **Accept SSL certificate:**
   - Click "Advanced" → "Proceed to localhost (unsafe)"
   - This is safe for local development

### Alternative: Complete Setup

1. **Install all dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the application:**
   ```bash
   python app.py
   ```

3. **Access securely:**
   - HTTPS: `https://localhost:5000`
   - HTTP (limited): `http://localhost:5000`

## 🎯 Features

- **🎤 Voice to Text**: Advanced speech recognition with 15+ languages
- **🔊 Audio to Text**: Upload audio files for transcription
- **📷 Image to Text**: OCR text extraction from images
- **🎨 Beautiful UI**: Modern glass morphism design with custom color palette
- **🔧 Advanced Controls**: Quality settings, duration management, language selection

## 🛠️ Technical Details

### Voice Recognition Features:
- Real-time waveform visualization
- Multi-language support (Vietnamese, English, Chinese, etc.)
- Quality selection (Standard/High/Ultra)
- Duration controls (1-10 minutes)
- Keyboard shortcuts (Space = record, Ctrl+C = copy)

### Browser Compatibility:
- ✅ Chrome (Recommended)
- ✅ Firefox
- ✅ Edge
- ✅ Safari
- ⚠️ Requires HTTPS for microphone access

## 🎨 Color Palette

- **Maroon (#690B22)**: Primary dark elements
- **Coral (#E07A5F)**: Accent highlights
- **Cream (#F1E3D3)**: Light backgrounds
- **Dark Green (#1B4D3E)**: Secondary elements

## 🔧 Troubleshooting

### Microphone Issues:
1. Ensure HTTPS is being used
2. Grant microphone permissions
3. Check browser compatibility
4. Test microphone in system settings

### SSL Certificate Issues:
1. Install cryptography: `pip install cryptography`
2. Restart the server
3. Accept the self-signed certificate
4. Clear browser cache if needed

### Performance Tips:
- Use Chrome for best performance
- Enable hardware acceleration
- Close unnecessary browser tabs
- Use wired internet connection

## 📱 Usage Instructions

### Voice to Text:
1. Select your language
2. Choose quality setting
3. Click microphone button or press Space
4. Speak clearly into microphone
5. Press Space again to stop
6. Copy results with Ctrl+C

### Audio Upload:
1. Go to "Audio to Text" tab
2. Upload your audio file
3. Wait for processing
4. Download the transcript

### Image OCR:
1. Go to "Image to Text" tab
2. Upload your image
3. Wait for text extraction
4. Copy the extracted text

## 🚀 Development

Built with:
- **Backend**: Flask, Python
- **Frontend**: HTML5, CSS3, JavaScript
- **Audio**: Web Audio API, MediaRecorder
- **Styling**: Glass morphism, CSS animations
- **Security**: HTTPS, SSL certificates

---

## 📞 Support

If you encounter any issues:

1. **Check HTTPS**: Make sure you're using `https://localhost:5000`
2. **Update browser**: Use the latest version of Chrome/Firefox/Edge
3. **Grant permissions**: Allow microphone access when prompted
4. **Check dependencies**: Install all requirements from `requirements.txt`

**Happy learning! 🎓**