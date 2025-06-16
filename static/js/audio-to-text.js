// Enhanced Audio to Text functionality for EnglishPro with performance optimizations

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
    const expandTextBtn = document.getElementById('expandText');
    const uploadForm = document.getElementById('audioUploadForm');
    
    // Modal elements
    const textModal = document.getElementById('textModal');
    const modalTextContent = document.getElementById('modalTextContent');
    const modalCopyTextBtn = document.getElementById('modalCopyText');
    const modalDownloadTextBtn = document.getElementById('modalDownloadText');
    const closeModal = document.querySelector('.close-modal');
    
    // Store transcribed text globally for access across functions
    let transcribedText = '';
    let processingAbortController = null;

    // Performance optimization: Debounced file validation
    let fileValidationTimeout;
    const debounceFileValidation = (callback, delay) => {
        clearTimeout(fileValidationTimeout);
        fileValidationTimeout = setTimeout(callback, delay);
    };

    // Enhanced Event Listeners with performance optimizations
    browseButton.addEventListener('click', () => audioFile.click());
    audioFile.addEventListener('change', () => debounceFileValidation(handleFileSelect, 100));
    
    // Optimized drag and drop with passive listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, { passive: false });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, { passive: true });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, { passive: true });
    });
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    // Form submission with enhanced error handling
    uploadForm.addEventListener('submit', handleSubmit);
    
    // Buttons for handling text
    copyTextBtn.addEventListener('click', copyTranscript);
    downloadTextBtn.addEventListener('click', downloadTranscript);
    expandTextBtn.addEventListener('click', openTextModal);
    
    // Modal buttons with improved UX
    modalCopyTextBtn.addEventListener('click', copyModalText);
    modalDownloadTextBtn.addEventListener('click', downloadModalText);
    closeModal.addEventListener('click', closeTextModal);
    
    // Enhanced modal interactions
    window.addEventListener('click', (e) => {
        if (e.target === textModal) {
            closeTextModal();
        }
    });

    // Keyboard shortcuts for better UX
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && textModal.classList.contains('show')) {
            closeTextModal();
        }
        if (e.ctrlKey && e.key === 'Enter' && !convertAudioBtn.disabled) {
            handleSubmit(e);
        }
    });

    // Functions with performance optimizations
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
            debounceFileValidation(handleFileSelect, 50);
        }
    }

    function handleFileSelect() {
        if (audioFile.files.length > 0) {
            const file = audioFile.files[0];
            
            // Enhanced file validation with more supported formats
            const supportedTypes = [
                'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
                'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/webm',
                'audio/flac', 'audio/x-flac'
            ];
            
            if (!supportedTypes.some(type => file.type === type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|webm|flac)$/i)) {
                selectedFile.innerHTML = '<p class="error">❌ Please select a supported audio file (MP3, WAV, OGG, M4A, AAC, WebM, FLAC).</p>';
                convertAudioBtn.disabled = true;
                return;
            }
            
            // Enhanced file size validation with dynamic limits
            const maxSize = 200 * 1024 * 1024; // 200MB for better support
            if (file.size > maxSize) {
                selectedFile.innerHTML = `<p class="error">❌ File too large. Maximum size is 200MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.</p>`;
                convertAudioBtn.disabled = true;
                return;
            }
            
            // Enhanced file info display with performance metrics
            const fileSize = (file.size / (1024 * 1024)).toFixed(2);
            const estimatedDuration = estimateAudioDuration(file.size);
            const estimatedProcessingTime = calculateProcessingTime(file.size, file.type);
            
            selectedFile.innerHTML = `
                <div class="file-info-enhanced">
                    <div class="file-header">
                        <h4>📁 ${file.name}</h4>
                        <span class="file-size">${fileSize} MB</span>
                    </div>
                    <div class="file-details">
                        <div class="detail-item">
                            <span class="label">🎵 Type:</span>
                            <span class="value">${file.type || 'Audio File'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">⏱️ Est. Duration:</span>
                            <span class="value">${estimatedDuration}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">🚀 Processing Time:</span>
                            <span class="value">${estimatedProcessingTime}</span>
                        </div>
                    </div>
                    <div class="status-indicator">
                        <span class="status-dot ready"></span>
                        <span class="status-text">Ready to convert</span>
                    </div>
                </div>
            `;
            
            // Enable convert button with smooth animation
            convertAudioBtn.disabled = false;
            convertAudioBtn.classList.add('pulse-animation');
            setTimeout(() => convertAudioBtn.classList.remove('pulse-animation'), 1000);
        }
    }

    // Enhanced estimation functions
    function estimateAudioDuration(fileSize) {
        // Rough estimate: 1MB ≈ 1 minute for MP3 at 128kbps
        const minutes = Math.round(fileSize / (1024 * 1024));
        return minutes > 1 ? `~${minutes} minutes` : '< 1 minute';
    }

    function calculateProcessingTime(fileSize, fileType) {
        // More accurate processing time estimation based on file type and size
        const sizeMB = fileSize / (1024 * 1024);
        let multiplier = 2; // Base multiplier
        
        // Adjust based on file type complexity
        if (fileType?.includes('flac')) multiplier = 1.5; // FLAC is faster
        if (fileType?.includes('wav')) multiplier = 1.8; // WAV is efficient
        if (fileType?.includes('mp3')) multiplier = 2.0; // MP3 standard
        if (fileType?.includes('m4a') || fileType?.includes('aac')) multiplier = 2.2;
        
        const estimatedSeconds = Math.ceil(sizeMB * multiplier);
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = estimatedSeconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    function handleSubmit(e) {
        e.preventDefault();
        
        if (audioFile.files.length === 0) {
            showNotification('Please select an audio file first.', 'warning');
            return;
        }
        
        const file = audioFile.files[0];
        console.log("🎵 Uploading file:", file.name, "Type:", file.type, "Size:", file.size);
        
        // Cancel any previous processing
        if (processingAbortController) {
            processingAbortController.abort();
        }
        processingAbortController = new AbortController();
        
        const formData = new FormData();
        formData.append('audio', file);
        
        // Reset previous results
        transcribedText = '';
        
        // Enhanced processing UI
        showEnhancedProcessingState(file);
        
        // Disable buttons during processing
        convertAudioBtn.disabled = true;
        copyTextBtn.disabled = true;
        downloadTextBtn.disabled = true;
        expandTextBtn.disabled = true;
        
        // Enhanced progress tracking
        const fileSizeMB = file.size / (1024 * 1024);
        const estimatedTimeSeconds = Math.max(15, Math.min(300, fileSizeMB * 4));
        
        console.log("📤 Sending request to /api/audio-to-text");
        
        // Send to server with enhanced error handling
        fetch('/api/audio-to-text', {
            method: 'POST',
            body: formData,
            signal: processingAbortController.signal
        })
        .then(response => {
            console.log("📥 Server response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`Server error ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log("✅ Response data received");
            handleSuccessfulTranscription(data);
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('🛑 Request was cancelled');
                showNotification('Processing was cancelled', 'info');
            } else {
                console.error('❌ Error processing audio:', error);
                handleTranscriptionError(error);
            }
        })
        .finally(() => {
            // Re-enable convert button
            setTimeout(() => {
                convertAudioBtn.disabled = false;
                conversionProgress.classList.remove('show');
            }, 1000);
        });
    }

    function showEnhancedProcessingState(file) {
        conversionProgress.classList.add('show');
        progressFill.style.width = '0%';
        progressStatus.textContent = 'Analyzing audio file...';
        progressStatus.classList.add('processing');
        
        textResult.innerHTML = `
            <div class="processing-indicator">
                <div class="processing-spinner"></div>
                <div class="processing-text">
                    <h4>🎵 Processing ${file.name}</h4>
                    <p>Converting audio to text... Please wait</p>
                    <small>This may take a few minutes for larger files</small>
                </div>
            </div>
        `;
        
        // Enhanced progress simulation with realistic stages
        simulateEnhancedProgress();
    }

    function simulateEnhancedProgress() {
        const stages = [
            { progress: 10, text: 'Uploading audio file...', duration: 1000 },
            { progress: 25, text: 'Analyzing audio format...', duration: 1500 },
            { progress: 40, text: 'Processing audio data...', duration: 2000 },
            { progress: 60, text: 'Running speech recognition...', duration: 3000 },
            { progress: 80, text: 'Optimizing transcription...', duration: 2000 },
            { progress: 95, text: 'Finalizing results...', duration: 1000 }
        ];
        
        let currentStage = 0;
        
        function nextStage() {
            if (currentStage < stages.length) {
                const stage = stages[currentStage];
                progressFill.style.width = `${stage.progress}%`;
                progressStatus.textContent = stage.text;
                
                setTimeout(() => {
                    currentStage++;
                    nextStage();
                }, stage.duration);
            }
        }
        
        nextStage();
    }

    function handleSuccessfulTranscription(data) {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Complete progress
        progressFill.style.width = '100%';
        progressStatus.textContent = 'Transcription complete!';
        progressStatus.classList.remove('processing');
        
        // Store and display result
        transcribedText = data.text;
        displayEnhancedResult(data);
        
        // Enable action buttons
        copyTextBtn.disabled = false;
        downloadTextBtn.disabled = false;
        expandTextBtn.disabled = false;
        
        // Show success notification
        showNotification('Audio successfully converted to text!', 'success');
        
        // Hide progress after delay
        setTimeout(() => {
            conversionProgress.classList.remove('show');
        }, 2000);
    }

    function handleTranscriptionError(error) {
        progressFill.style.width = '100%';
        progressFill.style.background = 'linear-gradient(90deg, #e53e3e, #fc8181)';
        progressStatus.textContent = 'Processing failed';
        progressStatus.classList.remove('processing');
        
        const errorMessage = error.message.includes('Server error') 
            ? 'Server processing error. Please try again or use a smaller file.'
            : `Processing failed: ${error.message}`;
        
        textResult.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h4>Processing Failed</h4>
                <p>${errorMessage}</p>
                <button class="retry-btn" onclick="location.reload()">Try Again</button>
            </div>
        `;
        
        showNotification(errorMessage, 'error');
        
        setTimeout(() => {
            conversionProgress.classList.remove('show');
            progressFill.style.background = '';
        }, 3000);
    }

    function displayEnhancedResult(data) {
        // Enhanced result display with metadata
        const wordCount = transcribedText.split(/\s+/).filter(word => word.length > 0).length;
        const estimatedReadingTime = Math.ceil(wordCount / 200); // Average reading speed
        
        textResult.innerHTML = `
            <div class="result-header">
                <div class="result-stats">
                    <div class="stat-item">
                        <span class="stat-value">${wordCount}</span>
                        <span class="stat-label">Words</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${estimatedReadingTime}m</span>
                        <span class="stat-label">Read Time</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${data.confidence || 'N/A'}%</span>
                        <span class="stat-label">Confidence</span>
                    </div>
                </div>
            </div>
            <div class="result-content">
                ${formatTextWithParagraphs(transcribedText)}
            </div>
        `;
    }

    // Enhanced utility functions
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${getNotificationIcon(type)}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }

    function getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    function formatTextWithParagraphs(text) {
        // Split text into sentences and then into logical paragraphs
        let formattedHtml = '';
        
        // Replace multiple newlines with paragraph breaks
        text = text.replace(/\n{2,}/g, '[PARAGRAPH_BREAK]');
        
        // Add paragraph breaks at sentence endings
        text = text.replace(/([.!?])\s+/g, '$1[SENTENCE_BREAK]');
        
        // Split into paragraphs (roughly every 3-4 sentences)
        const sentences = text.split('[SENTENCE_BREAK]');
        let paragraph = '';
        let sentenceCount = 0;
        
        sentences.forEach(sentence => {
            if (sentence.trim()) {
                paragraph += sentence + ' ';
                sentenceCount++;
                
                // Start a new paragraph every ~3 sentences or at explicit paragraph breaks
                if (sentenceCount >= 3 || sentence.includes('[PARAGRAPH_BREAK]')) {
                    paragraph = paragraph.replace('[PARAGRAPH_BREAK]', '');
                    formattedHtml += `<p>${paragraph.trim()}</p>`;
                    paragraph = '';
                    sentenceCount = 0;
                }
            }
        });
        
        // Add any remaining text as a paragraph
        if (paragraph.trim()) {
            formattedHtml += `<p>${paragraph.trim()}</p>`;
        }
        
        return formattedHtml || `<p>${text}</p>`;
    }

    function copyTranscript() {
        if (copyToClipboard(transcribedText)) {
            // Enhanced feedback with animation
            showNotification('Transcript copied to clipboard!', 'success');
            
            // Visual feedback on button
            copyTextBtn.classList.add('copied');
            setTimeout(() => copyTextBtn.classList.remove('copied'), 1000);
        }
    }

    function downloadTranscript() {
        if (transcribedText) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `transcript-${timestamp}.txt`;
            downloadTextAsFile(transcribedText, filename);
            
            showNotification('Transcript downloaded successfully!', 'success');
        }
    }
    
    function openTextModal() {
        if (!transcribedText) return;
        
        // Enhanced modal with improved content display
        const wordCount = transcribedText.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = transcribedText.length;
        const readingTime = Math.ceil(wordCount / 200);
        
        modalTextContent.innerHTML = `
            <div class="modal-header">
                <div class="modal-stats">
                    <div class="modal-stat">
                        <span class="stat-number">${wordCount}</span>
                        <span class="stat-label">Words</span>
                    </div>
                    <div class="modal-stat">
                        <span class="stat-number">${charCount}</span>
                        <span class="stat-label">Characters</span>
                    </div>
                    <div class="modal-stat">
                        <span class="stat-number">${readingTime}m</span>
                        <span class="stat-label">Read Time</span>
                    </div>
                </div>
            </div>
            <div class="modal-content-text">
                ${formatTextWithParagraphs(transcribedText)}
            </div>
        `;
        
        textModal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Focus management for accessibility
        modalTextContent.focus();
        
        // Add scroll position memory
        modalTextContent.scrollTop = 0;
    }
    
    function closeTextModal() {
        textModal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        // Return focus to expand button
        expandTextBtn.focus();
    }
    
    function copyModalText() {
        if (copyToClipboard(transcribedText)) {
            showNotification('Full transcript copied to clipboard!', 'success');
            
            // Visual feedback
            modalCopyTextBtn.classList.add('copied');
            setTimeout(() => modalCopyTextBtn.classList.remove('copied'), 1000);
        }
    }
    
    function downloadModalText() {
        if (transcribedText) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `full-transcript-${timestamp}.txt`;
            downloadTextAsFile(transcribedText, filename);
            
            showNotification('Full transcript downloaded successfully!', 'success');
        }
    }
    
    // Helper functions
    function copyToClipboard(text) {
        if (!text) {
            showNotification('No text to copy', 'warning');
            return false;
        }
        
        // Enhanced clipboard functionality with fallbacks
        if (navigator.clipboard && window.isSecureContext) {
            // Modern clipboard API
            return navigator.clipboard.writeText(text).then(() => {
                return true;
            }).catch(err => {
                console.error('Clipboard API failed:', err);
                return fallbackCopyToClipboard(text);
            });
        } else {
            // Fallback for older browsers or non-secure contexts
            return fallbackCopyToClipboard(text);
        }
    }
    
    function fallbackCopyToClipboard(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.cssText = `
                position: fixed;
                top: -1000px;
                left: -1000px;
                width: 1px;
                height: 1px;
                opacity: 0;
                pointer-events: none;
            `;
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (!successful) {
                throw new Error('Copy command failed');
            }
            
            return true;
        } catch (err) {
            console.error('Fallback copy failed:', err);
            showNotification('Failed to copy text. Please select and copy manually.', 'error');
            return false;
        }
    }
    
    function downloadTextAsFile(text, filename) {
        try {
            // Enhanced file creation with BOM for better compatibility
            const BOM = '\uFEFF'; // UTF-8 BOM for better encoding support
            const blob = new Blob([BOM + text], { 
                type: 'text/plain;charset=utf-8' 
            });
            
            // Create enhanced download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = 'none';
            
            // Enhanced download process
            document.body.appendChild(link);
            link.click();
            
            // Cleanup with delay to ensure download starts
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Download failed:', error);
            showNotification('Failed to download file. Please try again.', 'error');
            return false;
        }
    }
});

// Add enhanced CSS styles for new features
const enhancedStyles = `
<style>
/* Enhanced File Info Styles */
.file-info-enhanced {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    margin: 0.5rem 0;
}

.file-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.file-header h4 {
    margin: 0;
    color: #2d3748;
    font-size: 1rem;
}

.file-size {
    background: rgba(102, 126, 234, 0.2);
    color: #667eea;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
}

.file-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
}

.detail-item .label {
    font-weight: 500;
    color: #4a5568;
}

.detail-item .value {
    color: #2d3748;
    font-weight: 600;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #48bb78;
}

.status-text {
    color: #48bb78;
    font-weight: 500;
    font-size: 0.9rem;
}

/* Enhanced Processing Indicator */
.processing-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem;
}

.processing-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(102, 126, 234, 0.2);
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.processing-text h4 {
    margin: 0 0 0.5rem 0;
    color: #2d3748;
}

.processing-text p {
    margin: 0 0 0.25rem 0;
    color: #4a5568;
}

.processing-text small {
    color: #718096;
}

/* Enhanced Result Display */
.result-header {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.result-stats {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
}

.stat-item {
    text-align: center;
    flex: 1;
}

.stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #667eea;
    margin-bottom: 0.25rem;
}

.stat-label {
    font-size: 0.85rem;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Enhanced Paragraph Styles */
.paragraph-even {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 0.5rem;
}

.paragraph-odd {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
}

/* Enhanced Modal Styles */
.modal-header {
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 12px 12px 0 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-stats {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
}

.modal-stat {
    text-align: center;
    flex: 1;
}

.modal-content-text {
    max-height: 60vh;
    overflow-y: auto;
    padding: 1rem;
    line-height: 1.8;
}

/* Enhanced Button States */
.pulse-animation {
    animation: pulse 1s ease-in-out;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.copied {
    background: linear-gradient(135deg, #48bb78, #68d391) !important;
    transform: scale(0.95);
    transition: all 0.2s ease;
}

/* Enhanced Notifications */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    min-width: 300px;
    padding: 1rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    transform: translateX(100%);
    transition: transform 0.3s ease;
}

.notification.show {
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.notification-icon {
    font-size: 1.25rem;
}

.notification-text {
    flex: 1;
    font-weight: 500;
    color: #2d3748;
}

.notification-success {
    border-left: 4px solid #48bb78;
}

.notification-error {
    border-left: 4px solid #e53e3e;
}

.notification-warning {
    border-left: 4px solid #ed8936;
}

.notification-info {
    border-left: 4px solid #667eea;
}

/* Enhanced Error State */
.error-state {
    text-align: center;
    padding: 2rem;
}

.error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.error-state h4 {
    color: #e53e3e;
    margin-bottom: 0.5rem;
}

.retry-btn {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 1rem;
    transition: transform 0.2s ease;
}

.retry-btn:hover {
    transform: translateY(-2px);
}

/* Modal Accessibility */
.modal-open {
    overflow: hidden;
}

/* Responsive Design */
@media (max-width: 768px) {
    .file-details {
        grid-template-columns: 1fr;
    }
    
    .result-stats,
    .modal-stats {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .notification {
        left: 20px;
        right: 20px;
        min-width: auto;
    }
}
</style>
`;

// Inject enhanced styles
document.head.insertAdjacentHTML('beforeend', enhancedStyles);