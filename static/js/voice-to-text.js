// Enhanced Voice to Text functionality for EnglishPro with advanced features

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 EnglishPro Voice-to-Text initialized');
    
    // Check HTTPS requirement first
    checkHTTPSRequirement();
    
    // DOM Elements
    const startRecordingBtn = document.getElementById('startRecording');
    const stopRecordingBtn = document.getElementById('stopRecording');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTimer = document.getElementById('recordingTimer');
    const textResult = document.getElementById('textResult');
    const copyTextBtn = document.getElementById('copyText');
    const downloadTextBtn = document.getElementById('downloadText');

    // Enhanced Variables
    let mediaRecorder;
    let audioChunks = [];
    let startTime;
    let timerInterval;
    let recordingDuration = 0;
    let audioContext;
    let analyser;
    let dataArray;
    let animationFrame;
    let stream;
    let maxRecordingTime = 300; // 5 minutes default
    let recognitionRetries = 0;
    let maxRetries = 3;
    
    // Visual Elements
    let canvas;
    let canvasContext;
    let waveformContainer;
    
    // Browser Compatibility - Enhanced detection
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasWebRTC = window.RTCPeerConnection;
    const isEdgeChromium = navigator.userAgent.indexOf("Edg/") !== -1;
    const isChrome = navigator.userAgent.indexOf("Chrome") !== -1 && !isEdgeChromium;
    const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
    const isSafari = navigator.userAgent.indexOf("Safari") !== -1 && !isChrome && !isEdgeChromium;
    
    // Audio format optimization with better fallbacks
    let mimeType = 'audio/webm;codecs=opus';
    if (isFirefox) {
        mimeType = 'audio/ogg;codecs=opus';
    } else if (isSafari) {
        mimeType = 'audio/mp4';
    }
    
    // Check MediaRecorder support for the chosen format
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        } else {
            mimeType = ''; // Let browser choose
        }
    }

    // Initialize the application
    initializeVoiceToText();

    function initializeVoiceToText() {
        showCompatibilityStatus();
        setupEventListeners();
        createWaveformVisualization();
        setupAudioConstraints();
        addAdvancedControls();
        performCompatibilityCheck();
        
        // Initialize with clean state
        textResult.innerHTML = '<p class="placeholder">Your transcript will appear here after recording...</p>';
        
        // Show initial ready status
        updateCompatibilityStatus('microphone', true, 'Ready to test microphone when you start recording');
    }

    function showCompatibilityStatus() {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'compatibility-status';
        statusDiv.style.cssText = `
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1rem;
            border-left: 4px solid #48bb78;
        `;
        
        let statusHTML = `
            <h4 style="margin-bottom: 0.5rem; color: #2d3748;">🎤 Microphone Status</h4>
            <div style="font-size: 0.9rem; color: #4a5568;">
        `;
        
        if (isHTTPS) {
            statusHTML += `<div style="color: #38a169;">✓ Secure connection (HTTPS)</div>`;
        } else {
            statusHTML += `<div style="color: #e53e3e;">⚠ Insecure connection. Microphone may not work.</div>`;
        }
        
        if (hasGetUserMedia) {
            statusHTML += `<div style="color: #38a169;">✓ Browser supports microphone access</div>`;
        } else {
            statusHTML += `<div style="color: #e53e3e;">✗ Browser doesn't support microphone</div>`;
        }
        
        statusHTML += `
                <div style="color: #38a169;">✓ Recording format: ${mimeType}</div>
            </div>
        `;
        
        statusDiv.innerHTML = statusHTML;
        
        // Insert after page header
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader) {
            pageHeader.after(statusDiv);
        }
    }

    function setupEventListeners() {
        startRecordingBtn.addEventListener('click', startRecording);
        stopRecordingBtn.addEventListener('click', stopRecording);
        copyTextBtn.addEventListener('click', copyTranscript);
        downloadTextBtn.addEventListener('click', downloadTranscript);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Prevent accidental page leave while recording
        window.addEventListener('beforeunload', function(e) {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                e.preventDefault();
                e.returnValue = '';
                return 'You are currently recording. Are you sure you want to leave?';
            }
        });
    }

    function createWaveformVisualization() {
        // Create waveform container
        waveformContainer = document.createElement('div');
        waveformContainer.className = 'waveform-container';
        waveformContainer.style.cssText = `
            width: 100%;
            height: 140px;
            margin: 1.5rem 0;
            padding: 1.5rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            border-radius: 20px;
            border: 2px solid rgba(102, 126, 234, 0.2);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(15px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        `;
        
        // Create canvas for waveform
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 100;
        canvas.style.cssText = `
            width: 100%;
            height: 100px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
        `;
        
        canvasContext = canvas.getContext('2d');
        waveformContainer.appendChild(canvas);
        
        // Add frequency indicator
        const frequencyIndicator = document.createElement('div');
        frequencyIndicator.id = 'frequencyIndicator';
        frequencyIndicator.style.cssText = `
            position: absolute;
            top: 1.5rem;
            right: 1.5rem;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 0.75rem 1.25rem;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 600;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        `;
        frequencyIndicator.textContent = '🎤 Ready to record';
        waveformContainer.appendChild(frequencyIndicator);
        
        // Insert waveform before recording status
        recordingIndicator.parentNode.insertBefore(waveformContainer, recordingIndicator);
    }

    function addAdvancedControls() {
        // Create advanced controls container
        const advancedControls = document.createElement('div');
        advancedControls.className = 'advanced-controls';
        advancedControls.style.cssText = `
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(15px);
            padding: 1.5rem;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        `;

        // Recording quality selector
        const qualitySelect = document.createElement('select');
        qualitySelect.id = 'recordingQuality';
        qualitySelect.style.cssText = `
            padding: 0.75rem 1.25rem;
            border-radius: 12px;
            border: 2px solid rgba(102, 126, 234, 0.3);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            font-weight: 500;
            font-size: 0.9rem;
            min-width: 150px;
        `;
        
        qualitySelect.innerHTML = `
            <option value="standard">🎙️ Standard Quality</option>
            <option value="high" selected>🎯 High Quality</option>
            <option value="ultra">⭐ Ultra Quality</option>
        `;
        
        const qualityLabel = document.createElement('label');
        qualityLabel.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            color: #4a5568;
        `;
        qualityLabel.innerHTML = '<span>Recording Quality</span>';
        qualityLabel.appendChild(qualitySelect);

        // Max duration selector
        const durationSelect = document.createElement('select');
        durationSelect.id = 'maxDuration';
        durationSelect.style.cssText = qualitySelect.style.cssText;
        
        durationSelect.innerHTML = `
            <option value="60">⏱️ 1 minute</option>
            <option value="180">⏱️ 3 minutes</option>
            <option value="300" selected>⏱️ 5 minutes</option>
            <option value="600">⏱️ 10 minutes</option>
        `;
        
        durationSelect.addEventListener('change', function() {
            maxRecordingTime = parseInt(this.value);
        });
        
        const durationLabel = document.createElement('label');
        durationLabel.style.cssText = qualityLabel.style.cssText;
        durationLabel.innerHTML = '<span>Max Duration</span>';
        durationLabel.appendChild(durationSelect);

        // Language selector
        const languageSelect = document.createElement('select');
        languageSelect.id = 'recognitionLanguage';
        languageSelect.style.cssText = qualitySelect.style.cssText;
        
        languageSelect.innerHTML = `
            <option value="en-US" selected>🇺🇸 English (US)</option>
            <option value="en-GB">🇬🇧 English (UK)</option>
            <option value="vi-VN">🇻🇳 Tiếng Việt</option>
            <option value="zh-CN">🇨🇳 中文 (普通话)</option>
            <option value="ja-JP">🇯🇵 日本語</option>
            <option value="ko-KR">🇰🇷 한국어</option>
            <option value="es-ES">🇪🇸 Español</option>
            <option value="fr-FR">🇫🇷 Français</option>
            <option value="de-DE">🇩🇪 Deutsch</option>
        `;
        
        const languageLabel = document.createElement('label');
        languageLabel.style.cssText = qualityLabel.style.cssText;
        languageLabel.innerHTML = '<span>Recognition Language</span>';
        languageLabel.appendChild(languageSelect);

        advancedControls.appendChild(qualityLabel);
        advancedControls.appendChild(durationLabel);
        advancedControls.appendChild(languageLabel);
        
        // Insert before recorder container
        const recorderContainer = document.querySelector('.recorder-container');
        if (recorderContainer) {
            recorderContainer.parentNode.insertBefore(advancedControls, recorderContainer);
        }
    }

    function setupAudioConstraints() {
        // Enhanced audio constraints based on quality selection - fixed function definition
    }

    function getAudioConstraints() {
        const quality = document.getElementById('recordingQuality')?.value || 'high';
        
        const baseConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1
            }
        };
        
        switch (quality) {
            case 'ultra':
                baseConstraints.audio.sampleRate = 48000;
                baseConstraints.audio.sampleSize = 16;
                break;
            case 'high':
                baseConstraints.audio.sampleRate = 44100;
                baseConstraints.audio.sampleSize = 16;
                break;
            default:
                baseConstraints.audio.sampleRate = 22050;
                baseConstraints.audio.sampleSize = 16;
        }
        
        return baseConstraints;
    }

    function performCompatibilityCheck() {
        // Comprehensive compatibility check - improved detection
        const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const isSecure = location.protocol === 'https:' || isLocalhost;
        
        if (!isSecure && !isLocalhost) {
            showError('⚠️ HTTPS required for microphone access. Please use a secure connection.', 'warning');
            startRecordingBtn.disabled = true;
            return false;
        }
        
        if (!hasGetUserMedia) {
            showError('❌ Your browser doesn\'t support microphone recording. Please use Chrome, Firefox, Safari, or Edge.', 'error');
            startRecordingBtn.disabled = true;
            return false;
        }
        
        if (!window.MediaRecorder) {
            showError('❌ Your browser doesn\'t support audio recording. Please update your browser.', 'error');
            startRecordingBtn.disabled = true;
            return false;
        }
        
        // Don't automatically test microphone on page load - wait for user interaction
        // This prevents false errors when the page loads
        console.log('✅ Basic compatibility checks passed. Microphone will be tested when recording starts.');
        showStatus('🎤 Ready to record! Click "Start Recording" to begin.', 'info');
        
        // Enable the start button - microphone will be tested when user clicks it
        startRecordingBtn.disabled = false;
        
        return true;
    }

    async function testMicrophonePermissions() {
        try {
            console.log('🎤 Testing microphone permissions...');
            
            // Check HTTPS requirement first
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('HTTPS_REQUIRED');
            }
            
            // Warning for HTTP on localhost
            if (location.protocol !== 'https:') {
                console.warn('⚠️ Using HTTP - some features may not work properly');
                showStatus('⚠️ Using HTTP - HTTPS recommended for best experience', 'warning');
            }
            
            // Test microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Success - microphone is available
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Microphone permissions granted');
            updateCompatibilityStatus('microphone', true, 'Microphone access granted');
            return true;
            
        } catch (error) {
            console.error('❌ Microphone test failed:', error);
            
            let errorMessage = '';
            let troubleshootingSteps = [];
            
            if (error.message === 'HTTPS_REQUIRED') {
                errorMessage = 'HTTPS required for microphone access. Please use a secure connection.';
                troubleshootingSteps = [
                    '🔐 Access the app via HTTPS instead of HTTP',
                    '💻 Use https://localhost:5000 or https://127.0.0.1:5000',
                    '🌐 If using external IP, set up SSL certificate',
                    '🔄 Restart the server to enable HTTPS support',
                    '📋 Install cryptography: pip install cryptography'
                ];
            } else if (error.name === 'NotAllowedError' && location.protocol !== 'https:') {
                errorMessage = 'Microphone blocked - HTTPS required for secure access.';
                troubleshootingSteps = [
                    '🔒 Switch to HTTPS: https://localhost:5000',
                    '💻 Install SSL support: pip install cryptography',
                    '🔄 Restart server and use HTTPS URL',
                    '🎤 Grant microphone permission after switching'
                ];
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone access denied. Please grant permission.';
                troubleshootingSteps = [
                    '🔓 Click the microphone icon in your browser address bar',
                    '✅ Select "Allow" for microphone access',
                    '🔄 Refresh the page after granting permission',
                    '⚙️ Check your browser microphone settings'
                ];
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found. Please connect a microphone.';
                troubleshootingSteps = [
                    '🎤 Connect a microphone to your device',
                    '🔌 Check if microphone is properly plugged in',
                    '🔧 Test microphone in system settings',
                    '🔄 Refresh the page after connecting microphone'
                ];
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Your browser does not support audio recording.';
                troubleshootingSteps = [
                    '🌐 Use a modern browser (Chrome, Firefox, Edge, Safari)',
                    '📱 Update your browser to the latest version',
                    '🔒 Ensure you\'re using HTTPS',
                    '💻 Try a different browser if issues persist'
                ];
            } else {
                errorMessage = `Microphone access failed: ${error.message}`;
                troubleshootingSteps = [
                    '🔄 Try refreshing the page',
                    '🔒 Ensure you\'re using HTTPS',
                    '🎤 Check microphone permissions',
                    '🌐 Try a different browser'
                ];
            }
            
            updateCompatibilityStatus('microphone', false, errorMessage, troubleshootingSteps);
            return false;
        }
    }

    function updateCompatibilityStatus(device, isWorking, message, troubleshootingSteps = []) {
        // Find or create status container
        let statusContainer = document.querySelector('.compatibility-status');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.className = 'compatibility-status';
            statusContainer.style.cssText = `
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 1rem;
                margin-bottom: 1rem;
                border-left: 4px solid ${isWorking ? '#48bb78' : '#e53e3e'};
            `;
            
            const pageHeader = document.querySelector('.page-header');
            if (pageHeader) {
                pageHeader.after(statusContainer);
            } else {
                document.body.insertBefore(statusContainer, document.body.firstChild);
            }
        }
        
        // Update status content
        let statusHTML = `
            <h4 style="margin-bottom: 0.5rem; color: #2d3748;">🎤 Microphone Status</h4>
            <div style="font-size: 0.9rem; color: #4a5568;">
        `;
        
        const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (isSecure) {
            statusHTML += `<div style="color: #38a169;">✓ Secure connection (HTTPS)</div>`;
        } else {
            statusHTML += `<div style="color: #e53e3e;">⚠ Insecure connection. Microphone may not work.</div>`;
        }
        
        if (hasGetUserMedia) {
            statusHTML += `<div style="color: #38a169;">✓ Browser supports microphone access</div>`;
        } else {
            statusHTML += `<div style="color: #e53e3e;">✗ Browser doesn't support microphone</div>`;
        }
        
        // Device-specific status
        if (device === 'microphone') {
            if (isWorking) {
                statusHTML += `<div style="color: #38a169;">✓ ${message}</div>`;
            } else {
                statusHTML += `<div style="color: #e53e3e;">✗ ${message}</div>`;
                if (troubleshootingSteps.length > 0) {
                    statusHTML += `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(229, 62, 62, 0.1); border-radius: 6px;">
                            <strong>💡 Troubleshooting steps:</strong>
                            <ul style="margin: 0.25rem 0 0 1rem; font-size: 0.85rem;">
                                ${troubleshootingSteps.map(step => `<li>${step}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
            }
        }
        
        statusHTML += `
                <div style="color: #38a169;">✓ Recording format: ${mimeType}</div>
            </div>
        `;
        
        statusContainer.innerHTML = statusHTML;
        statusContainer.style.borderLeftColor = isWorking ? '#48bb78' : '#e53e3e';
    }

    function handleKeyboardShortcuts(e) {
        // Space bar to start/stop recording
        if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            } else if (!startRecordingBtn.disabled) {
                startRecording();
            }
        }
        
        // Ctrl+C to copy transcript
        if (e.ctrlKey && e.key === 'c' && textResult.textContent && textResult.textContent !== 'Your transcript will appear here after recording...') {
            e.preventDefault();
            copyTranscript();
        }
    }

    async function startRecording() {
        try {
            recognitionRetries = 0;
            showStatus('🎤 Requesting microphone access...', 'info');
            
            // Clear any previous error messages from the transcript area
            if (textResult.innerHTML.includes('Could not access your microphone')) {
                textResult.innerHTML = '<p class="placeholder">Your transcript will appear here after recording...</p>';
            }
            
            const constraints = getAudioConstraints();
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            showStatus('✅ Microphone connected! Starting recording...', 'success');
            
            // Update compatibility status to show success
            updateCompatibilityStatus('microphone', true, 'Microphone is working correctly');
            
            // Create MediaRecorder with enhanced options
            const options = { 
                mimeType: mimeType,
                audioBitsPerSecond: getAudioBitrate()
            };
            
            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];
            
            // Setup event listeners
            mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
            mediaRecorder.addEventListener('stop', handleRecordingStop);
            mediaRecorder.addEventListener('error', handleRecordingError);
            
            // Setup audio visualization
            setupAudioVisualization(stream);
            
            // Start recording
            mediaRecorder.start(1000); // Collect data every second
            startTime = Date.now();
            recordingDuration = 0;
            
            // Update UI
            updateUIForRecording(true);
            startTimer();
            startVisualization();
            
            showStatus('🔴 Recording in progress...', 'recording');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            
            // Only show microphone error if it's actually a microphone-related error
            if (error.name === 'NotAllowedError' || error.name === 'NotFoundError' || 
                error.name === 'NotReadableError' || error.name === 'OverconstrainedError') {
                handleMicrophoneError(error);
            } else {
                showError(`Recording failed: ${error.message}`);
            }
        }
    }

    function getAudioBitrate() {
        const quality = document.getElementById('recordingQuality')?.value || 'high';
        switch (quality) {
            case 'ultra': return 128000;
            case 'high': return 96000;
            default: return 64000;
        }
    }

    function setupAudioVisualization(stream) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        } catch (error) {
            console.warn('Audio visualization setup failed:', error);
        }
    }

    function startVisualization() {
        if (!analyser) return;
        
        function draw() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                animationFrame = requestAnimationFrame(draw);
                drawWaveform();
                updateFrequencyIndicator();
            }
        }
        draw();
    }

    function drawWaveform() {
        if (!analyser || !canvasContext) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasContext.fillStyle = 'rgba(255, 255, 255, 0.1)';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        // Create gradient for bars with new color palette
        const gradient = canvasContext.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#690B22');    // Maroon
        gradient.addColorStop(0.5, '#E07A5F');  // Coral
        gradient.addColorStop(1, '#1B4D3E');    // Dark Green
        
        for (let i = 0; i < dataArray.length; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height;
            
            canvasContext.fillStyle = gradient;
            canvasContext.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    function updateFrequencyIndicator() {
        if (!analyser || !dataArray) return;
        
        const frequencyIndicator = document.getElementById('frequencyIndicator');
        if (!frequencyIndicator) return;
        
        // Calculate average frequency
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const percentage = Math.round((average / 255) * 100);
        
        // Update indicator with signal strength using new color palette
        if (percentage > 50) {
            frequencyIndicator.textContent = `🔊 Strong signal (${percentage}%)`;
            frequencyIndicator.style.background = 'rgba(27, 77, 62, 0.9)';  // Dark Green
        } else if (percentage > 20) {
            frequencyIndicator.textContent = `🎤 Good signal (${percentage}%)`;
            frequencyIndicator.style.background = 'rgba(224, 122, 95, 0.9)';  // Coral
        } else {
            frequencyIndicator.textContent = `🔇 Weak signal (${percentage}%)`;
            frequencyIndicator.style.background = 'rgba(105, 11, 34, 0.9)';  // Maroon
        }
    }

    function handleDataAvailable(event) {
        if (event.data.size > 0) {
            console.log(`Received audio chunk: ${event.data.size} bytes`);
            audioChunks.push(event.data);
        }
    }

    function handleRecordingStop() {
        console.log('MediaRecorder stopped, processing audio...');
        stopVisualization();
        clearInterval(timerInterval);
        processAudio();
    }

    function handleRecordingError(e) {
        console.error('MediaRecorder error:', e);
        showStatus('Recording error occurred', 'error');
        updateUIForRecording(false);
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            console.log('Stopping MediaRecorder...');
            mediaRecorder.stop();
            
            // Stop all audio tracks
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            // Close audio context
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close();
            }
            
            updateUIForRecording(false);
            showStatus('Processing audio...', 'processing');
        }
    }

    function stopVisualization() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        
        // Clear canvas
        if (canvasContext) {
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw idle state with new colors
            canvasContext.fillStyle = 'rgba(105, 11, 34, 0.1)';  // Maroon background
            canvasContext.fillRect(0, 0, canvas.width, canvas.height);
            
            canvasContext.fillStyle = 'rgba(105, 11, 34, 0.4)';  // Maroon text
            canvasContext.font = '16px Inter, sans-serif';
            canvasContext.textAlign = 'center';
            canvasContext.fillText('Click Start Recording to begin', canvas.width / 2, canvas.height / 2);
        }
        
        // Reset frequency indicator
        const indicator = document.getElementById('frequencyIndicator');
        if (indicator) {
            indicator.textContent = '🎤 Ready to record';
            indicator.style.background = 'rgba(0, 0, 0, 0.7)';
        }
    }

    function startTimer() {
        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        recordingDuration = Math.floor((Date.now() - startTime) / 1000);
        recordingTimer.textContent = formatTime(recordingDuration);
        
        // Add color coding based on duration with new palette
        const percentage = (recordingDuration / maxRecordingTime) * 100;
        
        if (percentage > 90) {
            recordingTimer.style.color = '#690B22'; // Maroon for danger
            recordingTimer.style.fontWeight = 'bold';
        } else if (percentage > 75) {
            recordingTimer.style.color = '#E07A5F'; // Coral for warning
            recordingTimer.style.fontWeight = '600';
        } else {
            recordingTimer.style.color = '#1B4D3E'; // Dark Green for normal
            recordingTimer.style.fontWeight = '500';
        }
        
        // Auto-stop at max duration
        if (recordingDuration >= maxRecordingTime) {
            showStatus(`⏰ Maximum recording time (${formatTime(maxRecordingTime)}) reached`, 'warning');
            stopRecording();
        }
    }

    function updateUIForRecording(isRecording) {
        startRecordingBtn.disabled = isRecording;
        stopRecordingBtn.disabled = !isRecording;
        
        if (isRecording) {
            recordingIndicator.classList.add('recording');
            startRecordingBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Recording...';
        } else {
            recordingIndicator.classList.remove('recording');
            startRecordingBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Recording';
        }
    }

    function processAudio() {
        console.log(`Processing ${audioChunks.length} audio chunks`);
        
        if (audioChunks.length === 0) {
            showError('No audio recorded. Please try again.');
            showStatus('No audio recorded', 'error');
            return;
        }
        
        // Create blob with the correct MIME type
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log(`Created audio blob of size: ${audioBlob.size} bytes`);

        // Validate audio size
        if (audioBlob.size < 1000) { // Less than 1KB
            showError('Recording is too short. Please record for at least 1 second.');
            showStatus('Recording too short', 'error');
            return;
        }

        // Create file from blob
        const audioFile = new File([audioBlob], 'recording' + (isFirefox ? '.ogg' : '.webm'), {
            type: mimeType,
            lastModified: Date.now()
        });
        
        // Show processing UI
        showProcessingUI();
        
        // Send to server
        sendAudioToServer(audioFile);
    }

    function showProcessingUI() {
        textResult.innerHTML = `
            <div class="processing-indicator">
                <div class="processing-spinner"></div>
                <p>Processing your audio...</p>
                <div class="processing-steps">
                    <div class="step active">🎤 Audio captured</div>
                    <div class="step processing">🔄 Converting to text</div>
                    <div class="step">✨ Finalizing results</div>
                </div>
            </div>
        `;
        
        // Add processing animation CSS
        if (!document.getElementById('processing-animation')) {
            const style = document.createElement('style');
            style.id = 'processing-animation';
            style.textContent = `
                .processing-indicator {
                    text-align: center;
                    padding: 2rem;
                }
                .processing-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(102, 126, 234, 0.2);
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                }
                .processing-steps {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 1rem;
                    flex-wrap: wrap;
                }
                .step {
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    background: rgba(102, 126, 234, 0.1);
                    font-size: 0.9rem;
                    opacity: 0.5;
                    transition: all 0.3s ease;
                }
                .step.active {
                    opacity: 1;
                    background: rgba(72, 187, 120, 0.2);
                }
                .step.processing {
                    opacity: 1;
                    background: rgba(237, 137, 54, 0.2);
                    animation: pulse 1.5s ease-in-out infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function sendAudioToServer(audioFile) {
        const formData = new FormData();
        formData.append('audio', audioFile);
        
        // Add language preference
        const language = document.getElementById('recognitionLanguage')?.value || 'en-US';
        formData.append('language', language);
        
        console.log('Sending audio to server...');
        
        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        // Update processing step
        setTimeout(() => {
            const steps = document.querySelectorAll('.step');
            if (steps.length >= 2) {
                steps[1].classList.remove('processing');
                steps[1].classList.add('active');
                if (steps[2]) steps[2].classList.add('processing');
            }
        }, 1000);
        
        fetch('/api/voice-to-text', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        })
        .then(response => {
            console.log('Server response:', response.status);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Audio format not supported or audio quality too low');
                } else if (response.status === 413) {
                    throw new Error('Audio file too large. Please record shorter segments.');
                } else {
                    throw new Error(`Server error (${response.status}): ${response.statusText}`);
                }
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            clearTimeout(timeoutId);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Finalize processing animation
            const steps = document.querySelectorAll('.step');
            if (steps.length >= 3) {
                steps[2].classList.remove('processing');
                steps[2].classList.add('active');
            }
            
            setTimeout(() => {
                displayResult(data.text);
                showStatus(`Transcription completed in ${formatTime(recordingDuration)}`, 'success');
            }, 500);
        })
        .catch(error => {
            console.error('Error:', error);
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                handleTimeout();
            } else {
                handleTranscriptionError(error);
            }
        });
    }

    function handleTimeout() {
        if (recognitionRetries < maxRetries) {
            recognitionRetries++;
            showStatus(`Timeout occurred. Retrying... (${recognitionRetries}/${maxRetries})`, 'warning');
            
            setTimeout(() => {
                // Retry with the same audio
                if (audioChunks.length > 0) {
                    processAudio();
                }
            }, 2000);
        } else {
            showError('Recognition timeout. Please try recording a shorter segment or check your internet connection.');
        }
    }

    function handleTranscriptionError(error) {
        console.error('Transcription error:', error);
        
        if (recognitionRetries < maxRetries) {
            recognitionRetries++;
            showStatus(`Error occurred. Retrying... (${recognitionRetries}/${maxRetries})`, 'warning');
            
            setTimeout(() => {
                processAudio();
            }, 2000);
        } else {
            let errorMessage = 'An error occurred during transcription. ';
            
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection and try again.';
            } else if (error.message.includes('format')) {
                errorMessage += 'Audio format not supported. Please try again.';
            } else {
                errorMessage += error.message;
            }
            
            showError(errorMessage);
        }
    }

    function handleMicrophoneError(error) {
        let errorMessage = '🎤 Could not access your microphone. ';
        let troubleshootingTips = '';
        
        switch(error.name) {
            case 'NotAllowedError':
                errorMessage += 'Please allow microphone access in your browser.';
                troubleshootingTips = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(27, 77, 62, 0.1); border-radius: 8px;">
                        <strong>💡 How to fix:</strong><br>
                        1. Click the 🔒 lock icon in your address bar<br>
                        2. Set Microphone to "Allow"<br>
                        3. Refresh the page and try again
                    </div>
                `;
                break;
            case 'NotFoundError':
                errorMessage += 'No microphone found.';
                troubleshootingTips = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(224, 122, 95, 0.1); border-radius: 8px;">
                        <strong>💡 How to fix:</strong><br>
                        1. Connect a microphone or headset<br>
                        2. Check your computer's audio settings<br>
                        3. Restart your browser
                    </div>
                `;
                break;
            case 'NotReadableError':
                errorMessage += 'Microphone is being used by another application.';
                troubleshootingTips = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(105, 11, 34, 0.1); border-radius: 8px;">
                        <strong>💡 How to fix:</strong><br>
                        1. Close other apps using your microphone (Zoom, Skype, etc.)<br>
                        2. Restart your browser<br>
                        3. Try again
                    </div>
                `;
                break;
            case 'OverconstrainedError':
                errorMessage += 'Microphone does not support the required settings.';
                troubleshootingTips = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(241, 227, 211, 0.2); border-radius: 8px;">
                        <strong>💡 How to fix:</strong><br>
                        1. Try switching to "Standard Quality"<br>
                        2. Use a different microphone<br>
                        3. Update your browser
                    </div>
                `;
                break;
            default:
                errorMessage += 'Please check your microphone and try again.';
                troubleshootingTips = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(241, 227, 211, 0.2); border-radius: 8px;">
                        <strong>💡 General troubleshooting:</strong><br>
                        1. Refresh the page<br>
                        2. Try a different browser (Chrome recommended)<br>
                        3. Check your microphone is working in other apps
                    </div>
                `;
        }
        
        // Update compatibility status instead of transcript area
        const troubleshootingSteps = [
            'Click the 🔒 lock icon in your address bar',
            'Set Microphone to "Allow"',
            'Refresh the page and try again',
            'Check your microphone is connected',
            'Try a different browser if issues persist'
        ];
        
        updateCompatibilityStatus('microphone', false, errorMessage.replace('🎤 Could not access your microphone. ', ''), troubleshootingSteps);
        
        // Only show error in transcript area if it's a real recording attempt failure
        if (mediaRecorder || stream) {
            textResult.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3 style="color: #690B22; margin-bottom: 1rem;">Recording Error</h3>
                    <p style="margin-bottom: 1rem;">${errorMessage}</p>
                    ${troubleshootingTips}
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
        
        showError(errorMessage);
        updateUIForRecording(false);
        
        // Disable start button until issue is resolved
        startRecordingBtn.disabled = true;
    }

    function displayResult(text) {
        if (!text || text.trim() === '') {
            showError('No speech was detected. Please speak more clearly and try again.');
            return;
        }
        
        // Clear any previous error state
        startRecordingBtn.disabled = false;
        
        // Enhanced result display with formatting
        const formattedText = formatTranscriptionResult(text);
        
        textResult.innerHTML = `
            <div class="result-content">
                <div class="result-header">
                    <h4>📝 Transcription Result</h4>
                    <div class="result-stats">
                        <span class="stat">
                            <i class="fas fa-clock"></i>
                            Duration: ${formatTime(recordingDuration)}
                        </span>
                        <span class="stat">
                            <i class="fas fa-comment"></i>
                            Words: ${countWords(text)}
                        </span>
                        <span class="stat">
                            <i class="fas fa-tachometer-alt"></i>
                            WPM: ${calculateWPM(text, recordingDuration)}
                        </span>
                    </div>
                </div>
                <div class="transcription-text">${formattedText}</div>
                <div class="confidence-indicator">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: 85%"></div>
                    </div>
                    <span class="confidence-text">Confidence: High</span>
                </div>
            </div>
        `;
        
        // Enable action buttons
        copyTextBtn.disabled = false;
        downloadTextBtn.disabled = false;
        
        // Add result styling
        addResultStyling();
        
        // Smooth scroll to result
        textResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function formatTranscriptionResult(text) {
        // Basic text formatting
        let formatted = text.trim();
        
        // Capitalize first letter of sentences
        formatted = formatted.replace(/\b\w/g, l => l.toUpperCase());
        
        // Add proper punctuation at the end if missing
        if (!formatted.match(/[.!?]$/)) {
            formatted += '.';
        }
        
        // Highlight key words (optional enhancement)
        return formatted;
    }

    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    function calculateWPM(text, durationSeconds) {
        const words = countWords(text);
        const minutes = durationSeconds / 60;
        return Math.round(words / minutes) || 0;
    }

    function addResultStyling() {
        if (!document.getElementById('result-styling')) {
            const style = document.createElement('style');
            style.id = 'result-styling';
            style.textContent = `
                .result-content {
                    animation: slideInUp 0.5s ease-out;
                }
                .result-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .result-stats {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .stat {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    font-size: 0.9rem;
                    color: #718096;
                    background: rgba(102, 126, 234, 0.1);
                    padding: 0.3rem 0.6rem;
                    border-radius: 6px;
                }
                .transcription-text {
                    font-size: 1.1rem;
                    line-height: 1.8;
                    padding: 1.5rem;
                    background: rgba(248, 250, 252, 0.8);
                    border-radius: 12px;
                    border-left: 4px solid #667eea;
                    margin-bottom: 1rem;
                }
                .confidence-indicator {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .confidence-bar {
                    flex: 1;
                    height: 6px;
                    background: rgba(102, 126, 234, 0.2);
                    border-radius: 3px;
                    overflow: hidden;
                }
                .confidence-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #48bb78, #667eea);
                    transition: width 1s ease;
                    border-radius: 3px;
                }
                .confidence-text {
                    font-size: 0.9rem;
                    color: #718096;
                    font-weight: 600;
                }
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function showStatus(message, type = 'info') {
        recordingStatus.textContent = message;
        
        // Add visual feedback based on type with new color palette
        recordingStatus.className = `status ${type}`;
        
        if (type === 'error') {
            recordingStatus.style.color = '#690B22';  // Maroon
        } else if (type === 'success') {
            recordingStatus.style.color = '#1B4D3E';  // Dark Green
        } else if (type === 'warning') {
            recordingStatus.style.color = '#E07A5F';  // Coral
        } else if (type === 'recording') {
            recordingStatus.style.color = '#690B22';  // Maroon
        } else {
            recordingStatus.style.color = '#6b7280';  // Gray
        }
    }

    function showError(message) {
        textResult.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error</h4>
                <p>${message}</p>
                <button class="btn btn-secondary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
        
        showStatus('Error occurred', 'error');
        
        // Add error styling
        if (!document.getElementById('error-styling')) {
            const style = document.createElement('style');
            style.id = 'error-styling';
            style.textContent = `
                .error-message {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(245, 101, 101, 0.1);
                    border: 2px solid rgba(245, 101, 101, 0.2);
                    border-radius: 12px;
                    animation: shake 0.5s ease-in-out;
                }
                .error-message i {
                    font-size: 2rem;
                    color: #f56565;
                    margin-bottom: 1rem;
                }
                .error-message h4 {
                    color: #f56565;
                    margin-bottom: 0.5rem;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function copyTranscript() {
        const transcriptionText = document.querySelector('.transcription-text');
        if (!transcriptionText) return;
        
        const text = transcriptionText.textContent;
        
        if (copyToClipboard(text)) {
            // Show success feedback
            const originalContent = copyTextBtn.innerHTML;
            copyTextBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyTextBtn.style.background = '#48bb78';
            
            setTimeout(() => {
                copyTextBtn.innerHTML = originalContent;
                copyTextBtn.style.background = '';
            }, 2000);
        }
    }

    function downloadTranscript() {
        const transcriptionText = document.querySelector('.transcription-text');
        if (!transcriptionText) return;
        
        const text = transcriptionText.textContent;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `voice-transcript-${timestamp}.txt`;
        
        if (downloadTextAsFile(text, filename)) {
            // Show success feedback
            const originalContent = downloadTextBtn.innerHTML;
            downloadTextBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
            downloadTextBtn.style.background = '#48bb78';
            
            setTimeout(() => {
                downloadTextBtn.innerHTML = originalContent;
                downloadTextBtn.style.background = '';
            }, 2000);
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function copyToClipboard(text) {
        if (!text) return false;
        
        // Use modern Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
        }
        
        // Fallback to older method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            return successful;
        } catch (err) {
            console.error('Error copying text: ', err);
            document.body.removeChild(textarea);
            return false;
        }
    }

    function downloadTextAsFile(text, filename) {
        if (!text) return false;
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.style.display = 'none';
        a.href = url;
        a.download = filename || 'transcript.txt';
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return true;
    }

    // Initialize idle state visualization
    stopVisualization();
});

// Check HTTPS and show notice if needed
function checkHTTPSRequirement() {
    const isHTTPS = location.protocol === 'https:';
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const httpsNotice = document.getElementById('httpsNotice');
    
    if (!isHTTPS && !isLocalhost) {
        // Show HTTPS notice for external IPs
        if (httpsNotice) {
            httpsNotice.style.display = 'block';
        }
        return false;
    } else if (!isHTTPS && isLocalhost) {
        // For localhost/127.0.0.1 on HTTP, show a less prominent notice
        if (httpsNotice) {
            httpsNotice.style.display = 'block';
            httpsNotice.querySelector('h4').textContent = '🔒 HTTPS Recommended for Best Experience';
            httpsNotice.querySelector('p').textContent = 'For optimal microphone access, we recommend using HTTPS.';
        }
        return false;
    }
    
    return true;
}

// Redirect to HTTPS
function redirectToHTTPS() {
    const currentUrl = window.location.href;
    const httpsUrl = currentUrl.replace('http://', 'https://');
    
    showStatus('🔄 Redirecting to HTTPS...', 'info');
    
    setTimeout(() => {
        window.location.href = httpsUrl;
    }, 1000);
}