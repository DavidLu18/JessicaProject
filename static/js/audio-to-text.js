// Audio to Text functionality for EnglishPro

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const audioFile = document.getElementById('audioFile');
    const browseButton = document.getElementById('browseButton');
    const selectedFile = document.getElementById('selectedFile');
    const convertAudioBtn = document.getElementById('convertAudio');
    const conversionProgress = document.getElementById('conversionProgress');
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const textResult = document.getElementById('textResult');
    const copyTextBtn = document.getElementById('copyText');
    const downloadTextBtn = document.getElementById('downloadText');
    const uploadForm = document.getElementById('audioUploadForm');

    // Event Listeners
    browseButton.addEventListener('click', () => audioFile.click());
    audioFile.addEventListener('change', handleFileSelect);
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    // Form submission
    uploadForm.addEventListener('submit', handleSubmit);
    
    // Copy and download buttons
    copyTextBtn.addEventListener('click', copyTranscript);
    downloadTextBtn.addEventListener('click', downloadTranscript);

    // Functions
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('dragging');
    }

    function unhighlight() {
        dropArea.classList.remove('dragging');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            audioFile.files = files;
            handleFileSelect();
        }
    }

    function handleFileSelect() {
        if (audioFile.files.length > 0) {
            const file = audioFile.files[0];
            
            // Check if file is an audio file
            if (!file.type.match('audio.*')) {
                selectedFile.innerHTML = '<p class="error">Please select an audio file (MP3 or WAV).</p>';
                convertAudioBtn.disabled = true;
                return;
            }
            
            // Display file info
            const fileSize = (file.size / (1024 * 1024)).toFixed(2); // Convert to MB
            selectedFile.innerHTML = `
                <p><strong>${file.name}</strong> (${fileSize} MB)</p>
                <p class="file-type">Type: ${file.type}</p>
            `;
            
            // Enable convert button
            convertAudioBtn.disabled = false;
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        
        if (audioFile.files.length === 0) {
            alert('Please select an audio file first.');
            return;
        }
        
        const file = audioFile.files[0];
        console.log("Uploading file:", file.name, "Type:", file.type, "Size:", file.size);
        
        const formData = new FormData();
        formData.append('audio', file);
        
        // Show processing state
        conversionProgress.classList.add('show');
        progressFill.style.width = '0%';
        progressStatus.textContent = 'Processing audio...';
        convertAudioBtn.disabled = true;
        textResult.innerHTML = '<p class="placeholder">Processing your audio...</p>';
        
        // Simulate progress (in a real app, this would be updated based on actual progress)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress > 90) {
                clearInterval(progressInterval);
            }
            progressFill.style.width = `${progress}%`;
        }, 200);
        
        console.log("Sending request to /api/audio-to-text");
        
        // Send to server with timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        fetch('/api/audio-to-text', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        })
        .then(response => {
            clearInterval(progressInterval);
            clearTimeout(timeoutId);
            
            console.log("Server response status:", response.status);
            
            if (!response.ok) {
                progressFill.style.width = '100%';
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            progressFill.style.width = '100%';
            return response.json();
        })
        .then(data => {
            console.log("Response data:", data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Hide progress after a short delay
            setTimeout(() => {
                conversionProgress.classList.remove('show');
                convertAudioBtn.disabled = false;
            }, 500);
            
            // Display result
            displayResult(data.text);
        })
        .catch(error => {
            clearInterval(progressInterval);
            clearTimeout(timeoutId);
            
            console.error('Error processing audio:', error);
            
            progressFill.style.width = '100%';
            progressStatus.textContent = 'Error: ' + error.message;
            
            setTimeout(() => {
                conversionProgress.classList.remove('show');
                convertAudioBtn.disabled = false;
            }, 2000);
            
            textResult.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        });
    }

    function displayResult(text) {
        if (!text || text.trim() === '') {
            textResult.innerHTML = '<p class="placeholder">No speech detected in the audio. Please try another file.</p>';
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
        const filename = `audio-transcript-${timestamp}.txt`;
        
        if (!downloadTextAsFile(text, filename)) {
            alert('Failed to download transcript. Please try again.');
        }
    }
});