// Enhanced Image to Text functionality for EnglishPro with improved error handling

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const imageFile = document.getElementById('imageFile');
    const browseButton = document.getElementById('browseButton');
    const selectedFile = document.getElementById('selectedFile');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImage');
    const extractTextBtn = document.getElementById('extractText');
    const conversionProgress = document.getElementById('conversionProgress');
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const textResult = document.getElementById('textResult');
    const copyTextBtn = document.getElementById('copyText');
    const downloadTextBtn = document.getElementById('downloadText');
    const uploadForm = document.getElementById('imageUploadForm');
    const formatOptions = document.getElementsByName('formatOption');

    // Store extracted text globally
    let extractedText = '';
    let processingAbortController = null;

    // Enhanced Event Listeners with performance optimizations
    browseButton.addEventListener('click', () => imageFile.click());
    imageFile.addEventListener('change', handleFileSelect);
    removeImageBtn.addEventListener('click', removeImage);
    
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
    
    // Copy and download buttons with improved feedback
    copyTextBtn.addEventListener('click', copyText);
    downloadTextBtn.addEventListener('click', downloadText);
    
    // Format options with immediate feedback
    formatOptions.forEach(option => {
        option.addEventListener('change', formatText);
    });

    // Keyboard shortcuts for better UX
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter' && !extractTextBtn.disabled) {
            handleSubmit(e);
        }
        if (e.key === 'Delete' && imagePreviewContainer.classList.contains('show')) {
            removeImage();
        }
    });

    // Functions with enhanced error handling
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
            imageFile.files = files;
            handleFileSelect();
        }
    }

    function handleFileSelect() {
        if (imageFile.files.length > 0) {
            const file = imageFile.files[0];
            
            // Enhanced file validation with more supported formats
            const supportedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp',
                'image/webp', 'image/tiff', 'image/tif', 'image/svg+xml'
            ];
            
            const supportedExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|tiff|tif|svg)$/i;
            
            if (!supportedTypes.includes(file.type) && !supportedExtensions.test(file.name)) {
                selectedFile.innerHTML = `
                    <div class="error-message">
                        <span class="error-icon">❌</span>
                        <p>Unsupported file format. Please select an image file.</p>
                        <small>Supported formats: JPG, PNG, GIF, BMP, WebP, TIFF, SVG</small>
                    </div>
                `;
                imagePreviewContainer.classList.remove('show');
                extractTextBtn.disabled = true;
                return;
            }
            
            // Enhanced file size validation (50MB limit)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                selectedFile.innerHTML = `
                    <div class="error-message">
                        <span class="error-icon">❌</span>
                        <p>File too large. Maximum size is 50MB.</p>
                        <small>Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB</small>
                    </div>
                `;
                imagePreviewContainer.classList.remove('show');
                extractTextBtn.disabled = true;
                return;
            }
            
            // Enhanced file info display
            const fileSize = formatFileSize(file.size);
            const estimatedProcessingTime = estimateProcessingTime(file.size, file.type);
            
            selectedFile.innerHTML = `
                <div class="file-info-enhanced">
                    <div class="file-header">
                        <h4>🖼️ ${file.name}</h4>
                        <span class="file-size">${fileSize}</span>
                    </div>
                    <div class="file-details">
                        <div class="detail-item">
                            <span class="label">📁 Type:</span>
                            <span class="value">${file.type || 'Image File'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">⏱️ Processing Time:</span>
                            <span class="value">${estimatedProcessingTime}</span>
                        </div>
                    </div>
                    <div class="status-indicator">
                        <span class="status-dot ready"></span>
                        <span class="status-text">Ready to extract text</span>
                    </div>
                </div>
            `;
            
            // Enhanced image preview with loading state
            showImagePreview(file);
            
            // Enable extract button with animation
            extractTextBtn.disabled = false;
            extractTextBtn.classList.add('pulse-animation');
            setTimeout(() => extractTextBtn.classList.remove('pulse-animation'), 1000);
        }
    }

    function showImagePreview(file) {
        // Show loading state first
        imagePreview.src = '';
        imagePreview.style.opacity = '0.5';
        imagePreviewContainer.classList.add('show');
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.opacity = '1';
            
            // Add image dimensions info
            const img = new Image();
            img.onload = function() {
                const dimensionsInfo = document.createElement('div');
                dimensionsInfo.className = 'image-dimensions';
                dimensionsInfo.innerHTML = `
                    <small>📐 ${this.width} × ${this.height} pixels</small>
                `;
                
                // Remove existing dimensions info if any
                const existing = imagePreviewContainer.querySelector('.image-dimensions');
                if (existing) existing.remove();
                
                imagePreviewContainer.appendChild(dimensionsInfo);
            };
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            selectedFile.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">❌</span>
                    <p>Failed to read image file.</p>
                    <small>Please try a different image</small>
                </div>
            `;
            imagePreviewContainer.classList.remove('show');
            extractTextBtn.disabled = true;
        };
        
        reader.readAsDataURL(file);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function estimateProcessingTime(fileSize, fileType) {
        // Base processing time estimation
        const sizeMB = fileSize / (1024 * 1024);
        let baseTime = Math.max(5, Math.ceil(sizeMB * 3)); // 3 seconds per MB minimum 5 seconds
        
        // Adjust based on file type (some formats are more complex)
        if (fileType?.includes('tiff') || fileType?.includes('bmp')) {
            baseTime *= 1.5; // TIFF and BMP take longer
        }
        if (fileType?.includes('svg')) {
            baseTime *= 0.8; // SVG is typically faster
        }
        
        return baseTime > 60 ? `${Math.ceil(baseTime / 60)}m` : `${baseTime}s`;
    }

    function removeImage() {
        imageFile.value = '';
        selectedFile.innerHTML = '<p class="placeholder">No file selected</p>';
        imagePreviewContainer.classList.remove('show');
        extractTextBtn.disabled = true;
        
        // Clear any previous results
        extractedText = '';
        textResult.innerHTML = '<p class="placeholder">Extracted text will appear here...</p>';
        copyTextBtn.disabled = true;
        downloadTextBtn.disabled = true;
        
        showNotification('Image removed', 'info');
    }

    function handleSubmit(e) {
        e.preventDefault();
        
        if (imageFile.files.length === 0) {
            showNotification('Please select an image file first.', 'warning');
            return;
        }
        
        const file = imageFile.files[0];
        console.log("🖼️ Processing image:", file.name, "Type:", file.type, "Size:", file.size);
        
        // Cancel any previous processing
        if (processingAbortController) {
            processingAbortController.abort();
        }
        processingAbortController = new AbortController();
        
        const formData = new FormData();
        formData.append('image', file);
        
        // Reset previous results
        extractedText = '';
        
        // Enhanced processing UI
        showEnhancedProcessingState(file);
        
        // Disable buttons during processing
        extractTextBtn.disabled = true;
        copyTextBtn.disabled = true;
        downloadTextBtn.disabled = true;
        
        console.log("📤 Sending request to /api/image-to-text");
        
        // Send to server with enhanced error handling
        fetch('/api/image-to-text', {
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
            handleSuccessfulExtraction(data);
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('🛑 Request was cancelled');
                showNotification('Processing was cancelled', 'info');
            } else {
                console.error('❌ Error processing image:', error);
                handleExtractionError(error);
            }
        })
        .finally(() => {
            // Re-enable extract button
            setTimeout(() => {
                extractTextBtn.disabled = false;
                conversionProgress.classList.remove('show');
            }, 1000);
        });
    }

    function showEnhancedProcessingState(file) {
        conversionProgress.classList.add('show');
        progressFill.style.width = '0%';
        progressStatus.textContent = 'Analyzing image...';
        
        textResult.innerHTML = `
            <div class="processing-indicator">
                <div class="processing-spinner"></div>
                <div class="processing-text">
                    <h4>🖼️ Processing ${file.name}</h4>
                    <p>Extracting text from image... Please wait</p>
                    <small>Using advanced OCR technology</small>
                </div>
            </div>
        `;
        
        // Enhanced progress simulation
        simulateEnhancedProgress();
    }

    function simulateEnhancedProgress() {
        const stages = [
            { progress: 15, text: 'Uploading image...', duration: 800 },
            { progress: 30, text: 'Analyzing image quality...', duration: 1200 },
            { progress: 50, text: 'Detecting text regions...', duration: 1500 },
            { progress: 70, text: 'Running OCR analysis...', duration: 2000 },
            { progress: 85, text: 'Processing text data...', duration: 1000 },
            { progress: 95, text: 'Finalizing results...', duration: 500 }
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

    function handleSuccessfulExtraction(data) {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Complete progress
        progressFill.style.width = '100%';
        progressStatus.textContent = 'Text extraction complete!';
        
        // Store the raw text
        extractedText = data.text || '';
        
        if (!extractedText.trim()) {
            textResult.innerHTML = `
                <div class="no-text-found">
                    <div class="info-icon">ℹ️</div>
                    <h4>No Text Found</h4>
                    <p>No readable text was detected in this image.</p>
                    <small>Try with a clearer image or one containing more text</small>
                </div>
            `;
            
            showNotification('No text found in the image', 'warning');
        } else {
            // Display result with enhanced formatting
            displayEnhancedResult(data);
            
            // Enable action buttons
            copyTextBtn.disabled = false;
            downloadTextBtn.disabled = false;
            
            showNotification('Text successfully extracted from image!', 'success');
        }
        
        // Hide progress after delay
        setTimeout(() => {
            conversionProgress.classList.remove('show');
        }, 2000);
    }

    function handleExtractionError(error) {
        progressFill.style.width = '100%';
        progressFill.style.background = 'linear-gradient(90deg, #e53e3e, #fc8181)';
        progressStatus.textContent = 'Extraction failed';
        
        const errorMessage = getErrorMessage(error);
        
        textResult.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h4>Extraction Failed</h4>
                <p>${errorMessage}</p>
                <div class="error-suggestions">
                    <h5>💡 Try these suggestions:</h5>
                    <ul>
                        <li>Ensure the image contains clear, readable text</li>
                        <li>Try a higher resolution image</li>
                        <li>Check that the text isn't too small or blurry</li>
                        <li>Use a supported image format (JPG, PNG, etc.)</li>
                    </ul>
                </div>
                <button class="retry-btn" onclick="location.reload()">Try Again</button>
            </div>
        `;
        
        showNotification(errorMessage, 'error');
        
        setTimeout(() => {
            conversionProgress.classList.remove('show');
            progressFill.style.background = '';
        }, 3000);
    }

    function getErrorMessage(error) {
        if (error.message.includes('Server error 500')) {
            return 'Server processing error. The image may be corrupted or in an unsupported format.';
        }
        if (error.message.includes('Server error 413')) {
            return 'Image file is too large. Please use a smaller image.';
        }
        if (error.message.includes('Server error 415')) {
            return 'Unsupported image format. Please use JPG, PNG, or other standard formats.';
        }
        if (error.message.includes('timeout')) {
            return 'Processing timed out. Please try with a smaller or simpler image.';
        }
        return `Processing failed: ${error.message}`;
    }

    function displayEnhancedResult(data) {
        // Enhanced result display with metadata
        const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = extractedText.length;
        const estimatedReadingTime = Math.ceil(wordCount / 200);
        
        textResult.innerHTML = `
            <div class="result-header">
                <div class="result-stats">
                    <div class="stat-item">
                        <span class="stat-value">${wordCount}</span>
                        <span class="stat-label">Words</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${charCount}</span>
                        <span class="stat-label">Characters</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${estimatedReadingTime}m</span>
                        <span class="stat-label">Read Time</span>
                    </div>
                </div>
            </div>
            <div class="result-content" data-raw-text="${encodeURIComponent(extractedText)}">
                ${formatTextForDisplay(extractedText)}
            </div>
        `;
        
        // Apply current format option
        formatText();
    }

    function formatText() {
        if (!extractedText) return;
        
        const resultContent = document.querySelector('.result-content');
        if (!resultContent) return;
        
        let selectedFormat = 'plain';
        
        // Get selected format option
        for (const option of formatOptions) {
            if (option.checked) {
                selectedFormat = option.value;
                break;
            }
        }
        
        let formattedText = extractedText;
        
        switch (selectedFormat) {
            case 'paragraphs':
                formattedText = formatTextWithParagraphs(extractedText);
                break;
            case 'lines':
                formattedText = extractedText.split('\n')
                    .filter(line => line.trim())
                    .map(line => `<p class="text-line">${line.trim()}</p>`)
                    .join('');
                break;
            case 'plain':
            default:
                formattedText = `<p class="text-plain">${extractedText.replace(/\n/g, '<br>')}</p>`;
                break;
        }
        
        resultContent.innerHTML = formattedText;
    }

    function formatTextWithParagraphs(text) {
        // Enhanced paragraph formatting
        if (!text || text.trim() === '') return '<p class="placeholder">No text available</p>';
        
        // Clean up the text
        text = text.trim()
            .replace(/\s+/g, ' ')
            .replace(/\.\s*\.\s*/g, '. ');
        
        // Split into paragraphs using various strategies
        let paragraphs = [];
        
        // First try splitting on double line breaks
        const naturalParagraphs = text.split(/\n\s*\n/);
        
        if (naturalParagraphs.length > 1) {
            paragraphs = naturalParagraphs;
        } else {
            // Fallback to sentence-based grouping
            const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
            const targetLength = Math.max(150, text.length / Math.max(3, Math.floor(sentences.length / 3)));
            
            let currentParagraph = '';
            
            sentences.forEach((sentence, index) => {
                currentParagraph += (currentParagraph ? ' ' : '') + sentence;
                
                if (currentParagraph.length >= targetLength || index === sentences.length - 1) {
                    paragraphs.push(currentParagraph.trim());
                    currentParagraph = '';
                }
            });
        }
        
        return paragraphs
            .filter(p => p.trim())
            .map((paragraph, index) => {
                const className = index % 2 === 0 ? 'paragraph-even' : 'paragraph-odd';
                return `<p class="${className}">${paragraph.trim()}</p>`;
            })
            .join('\n');
    }

    function formatTextForDisplay(text) {
        // Default formatting for initial display
        return formatTextWithParagraphs(text);
    }

    function copyText() {
        if (copyToClipboard(extractedText)) {
            showNotification('Text copied to clipboard!', 'success');
            
            // Visual feedback on button
            copyTextBtn.classList.add('copied');
            setTimeout(() => copyTextBtn.classList.remove('copied'), 1000);
        }
    }

    function downloadText() {
        if (extractedText) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `extracted-text-${timestamp}.txt`;
            downloadTextAsFile(extractedText, filename);
            
            showNotification('Text downloaded successfully!', 'success');
        }
    }

    function copyToClipboard(text) {
        if (!text) {
            showNotification('No text to copy', 'warning');
            return false;
        }
        
        // Enhanced clipboard functionality with fallbacks
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(() => {
                return true;
            }).catch(err => {
                console.error('Clipboard API failed:', err);
                return fallbackCopyToClipboard(text);
            });
        } else {
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
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + text], { 
                type: 'text/plain;charset=utf-8' 
            });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            
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
});

// Enhanced CSS styles for Image-to-Text functionality
const imageToTextStyles = `
<style>
/* Enhanced Error Message Styles */
.error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1.5rem;
    background: rgba(229, 62, 62, 0.1);
    border: 2px solid rgba(229, 62, 62, 0.3);
    border-radius: 12px;
    margin: 0.5rem 0;
}

.error-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.error-message p {
    margin: 0 0 0.25rem 0;
    color: #e53e3e;
    font-weight: 600;
}

.error-message small {
    color: #a0aec0;
    font-size: 0.85rem;
}

/* Enhanced File Info Styles (reusing from audio-to-text) */
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

/* Image Preview Enhancements */
.image-dimensions {
    text-align: center;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
}

.image-dimensions small {
    color: #e2e8f0;
    font-weight: 500;
}

/* Processing Indicator Styles */
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

/* No Text Found State */
.no-text-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem;
    background: rgba(237, 137, 54, 0.1);
    border: 2px solid rgba(237, 137, 54, 0.3);
    border-radius: 12px;
}

.info-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.no-text-found h4 {
    color: #ed8936;
    margin-bottom: 0.5rem;
}

.no-text-found p {
    color: #4a5568;
    margin-bottom: 0.25rem;
}

.no-text-found small {
    color: #a0aec0;
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

/* Text Formatting Styles */
.text-plain {
    line-height: 1.6;
    color: #2d3748;
}

.text-line {
    padding: 0.25rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 0.25rem;
}

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

/* Enhanced Error State */
.error-state {
    text-align: center;
    padding: 2rem;
}

.error-state .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.error-state h4 {
    color: #e53e3e;
    margin-bottom: 0.5rem;
}

.error-state p {
    color: #4a5568;
    margin-bottom: 1rem;
}

.error-suggestions {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    text-align: left;
}

.error-suggestions h5 {
    margin: 0 0 0.5rem 0;
    color: #2d3748;
}

.error-suggestions ul {
    margin: 0;
    padding-left: 1.5rem;
}

.error-suggestions li {
    color: #4a5568;
    margin-bottom: 0.25rem;
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

/* Responsive Design */
@media (max-width: 768px) {
    .file-details {
        grid-template-columns: 1fr;
    }
    
    .result-stats {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .notification {
        left: 20px;
        right: 20px;
        min-width: auto;
    }
    
    .error-suggestions {
        text-align: center;
    }
    
    .error-suggestions ul {
        text-align: left;
        display: inline-block;
    }
}
</style>
`;

// Inject enhanced styles
document.head.insertAdjacentHTML('beforeend', imageToTextStyles);