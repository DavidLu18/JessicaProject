// Voice to Text functionality for EnglishPro

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startRecordingBtn = document.getElementById('startRecording');
    const stopRecordingBtn = document.getElementById('stopRecording');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTimer = document.getElementById('recordingTimer');
    const textResult = document.getElementById('textResult');
    const copyTextBtn = document.getElementById('copyText');
    const downloadTextBtn = document.getElementById('downloadText');

    // Variables
    let mediaRecorder;
    let audioChunks = [];
    let startTime;
    let timerInterval;
    let recordingDuration = 0;
    
    // Check for browser compatibility issues
    const isEdgeChromium = navigator.userAgent.indexOf("Edg/") !== -1;
    const isChrome = navigator.userAgent.indexOf("Chrome") !== -1 && !isEdgeChromium;
    const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
    
    // Set optimal audio format based on browser
    let mimeType = 'audio/webm';
    if (isFirefox) {
        mimeType = 'audio/ogg';
    }

    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.');
        startRecordingBtn.disabled = true;
        return;
    }

    // Event Listeners
    startRecordingBtn.addEventListener('click', startRecording);
    stopRecordingBtn.addEventListener('click', stopRecording);
    copyTextBtn.addEventListener('click', copyTranscript);
    downloadTextBtn.addEventListener('click', downloadTranscript);

    // Functions
    async function startRecording() {
        audioChunks = [];
        try {
            // Get microphone access with explicit constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
            
            console.log('Microphone access granted, setting up MediaRecorder');
            
            // Create MediaRecorder instance with appropriate options
            const options = { mimeType: mimeType };
            
            try {
                mediaRecorder = new MediaRecorder(stream, options);
                console.log('MediaRecorder initialized with options:', options);
            } catch (e) {
                console.warn("Specified audio format not supported, using browser default");
                mediaRecorder = new MediaRecorder(stream);
            }
            
            // When data is available, add it to our array
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0) {
                    console.log(`Received audio chunk: ${event.data.size} bytes`);
                    audioChunks.push(event.data);
                }
            });
            
            // When recording stops, create audio blob and send to server
            mediaRecorder.addEventListener('stop', () => {
                console.log('MediaRecorder stopped, processing audio...');
                clearInterval(timerInterval);
                processAudio();
            });
            
            // Log any errors that occur during recording
            mediaRecorder.addEventListener('error', (e) => {
                console.error('MediaRecorder error:', e);
                recordingStatus.textContent = 'Recording error occurred';
            });
            
            // Start recording with small timeslices for better quality
            mediaRecorder.start(1000); // Collect data every second
            console.log('MediaRecorder started');
            
            // Update UI
            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            recordingIndicator.classList.add('recording');
            recordingStatus.textContent = 'Recording...';
            
            // Start timer
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
            updateTimer();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing microphone: ' + error.message);
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            console.log('Stopping MediaRecorder...');
            mediaRecorder.stop();
            
            // Stop all audio tracks
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            // Update UI
            startRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = true;
            recordingIndicator.classList.remove('recording');
            recordingStatus.textContent = 'Processing audio...';
        }
    }

    function updateTimer() {
        recordingDuration = Math.floor((Date.now() - startTime) / 1000);
        recordingTimer.textContent = formatTime(recordingDuration);
    }

    function processAudio() {
        console.log(`Processing ${audioChunks.length} audio chunks`);
        if (audioChunks.length === 0) {
            textResult.innerHTML = '<p class="error">No audio recorded. Please try again.</p>';
            recordingStatus.textContent = 'No audio recorded';
            return;
        }
        
        // Create blob with the correct MIME type
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log(`Created audio blob of size: ${audioBlob.size} bytes`);
        
        // Debug: Play back the audio to verify it's working
        // const audioUrl = URL.createObjectURL(audioBlob);
        // const audio = new Audio(audioUrl);
        // audio.play();
        
        // Create form data to send to server
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording' + (isFirefox ? '.ogg' : '.webm'));
        
        // Show processing state
        textResult.innerHTML = '<p class="placeholder">Processing your audio...</p>';
        
        console.log('Sending audio to server...');
        // Send to server
        fetch('/api/voice-to-text', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Server response:', response.status);
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Audio format not supported');
                } else {
                    throw new Error(`Server error (${response.status}): ${response.statusText}`);
                }
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display result
            displayResult(data.text);
            recordingStatus.textContent = 'Ready to record';
        })
        .catch(error => {
            console.error('Error processing audio:', error);
            textResult.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            recordingStatus.textContent = 'Error occurred. Try again.';
        });
    }

    function displayResult(text) {
        if (!text || text.trim() === '') {
            textResult.innerHTML = '<p class="placeholder">No speech detected. Please try again.</p>';
            copyTextBtn.disabled = true;
            downloadTextBtn.disabled = true;
            return;
        }
        
        textResult.textContent = text;
        copyTextBtn.disabled = false;
        downloadTextBtn.disabled = false;
    }

    function copyTranscript() {
        const text = textResult.textContent;
        
        if (copyToClipboard(text)) {
            // Show copied feedback
            const originalText = copyTextBtn.innerHTML;
            copyTextBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            
            setTimeout(() => {
                copyTextBtn.innerHTML = originalText;
            }, 2000);
        } else {
            alert('Failed to copy text. Please try again.');
        }
    }

    function downloadTranscript() {
        const text = textResult.textContent;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `voice-transcript-${timestamp}.txt`;
        
        if (!downloadTextAsFile(text, filename)) {
            alert('Failed to download transcript. Please try again.');
        }
    }
});