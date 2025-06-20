// Enhanced Image to Text functionality for EnglishPro with improved error handling

document.addEventListener('DOMContentLoaded', function() {
    console.log('🖼️ EnglishPro Image-to-Text initialized');
    
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
    const progressPercentage = document.getElementById('progressPercentage');
    const textResult = document.getElementById('textResult');
    const copyTextBtn = document.getElementById('copyText');
    const downloadTextBtn = document.getElementById('downloadText');
    const retryExtractionBtn = document.getElementById('retryExtraction');
    const uploadForm = document.getElementById('imageUploadForm');
    const formatOptions = document.getElementsByName('formatOption');
    const systemStatus = document.getElementById('systemStatus');
    const imageInfo = document.getElementById('imageInfo');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const confidenceLevel = document.getElementById('confidenceLevel');
    const confidenceIndicator = document.getElementById('confidenceIndicator');

    // Store extracted text and processing data
    let extractedText = '';
    let processingAbortController = null;
    let currentImageFile = null;
    let ocrData = null;

    // Initialize the application
    initializeImageToText();

    function initializeImageToText() {
        checkSystemStatus();
        setupEventListeners();
        setupDragAndDrop();
        resetUI();
    }

    async function checkSystemStatus() {
        try {
            const statusIcon = systemStatus.querySelector('.status-icon');
            const statusText = systemStatus.querySelector('.status-text');
            
            statusIcon.textContent = '🔄';
            statusIcon.className = 'status-icon checking';
            statusText.textContent = 'Checking OCR service...';
            
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (data.status === 'healthy' && data.services.image_processing === 'active') {
                statusIcon.textContent = '✅';
                statusIcon.className = 'status-icon ready';
                statusText.textContent = 'OCR service ready';
                
                setTimeout(() => {
                    systemStatus.style.opacity = '0';
                    setTimeout(() => systemStatus.style.display = 'none', 300);
                }, 2000);
            } else {
                throw new Error('Service not healthy');
            }
        } catch (error) {
            const statusIcon = systemStatus.querySelector('.status-icon');
            const statusText = systemStatus.querySelector('.status-text');
            
            statusIcon.textContent = '❌';
            statusIcon.className = 'status-icon error';
            statusText.innerHTML = `
                OCR service unavailable. 
                <button onclick="location.reload()" style="margin-left: 10px; padding: 4px 8px; border: 1px solid; border-radius: 4px; background: transparent; color: inherit; cursor: pointer;">
                    🔄 Retry
                </button>
            `;
            
            // Disable extraction button
            extractTextBtn.disabled = true;
            extractTextBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Service Unavailable';
        }
    }

    function setupEventListeners() {
        browseButton.addEventListener('click', () => imageFile.click());
        imageFile.addEventListener('change', handleFileSelect);
        removeImageBtn.addEventListener('click', removeImage);
        uploadForm.addEventListener('submit', handleSubmit);
        copyTextBtn.addEventListener('click', copyText);
        downloadTextBtn.addEventListener('click', downloadText);
        retryExtractionBtn.addEventListener('click', retryExtraction);
        
        // Format options
        formatOptions.forEach(option => {
            option.addEventListener('change', formatText);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter' && !extractTextBtn.disabled) {
                handleSubmit(e);
            }
            if (e.key === 'Delete' && imagePreviewContainer.style.display !== 'none') {
                removeImage();
            }
            if (e.ctrlKey && e.key === 'c' && extractedText) {
                copyText();
            }
        });
    }

    function setupDragAndDrop() {
        // Enhanced drag and drop with better visual feedback
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
    }

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
            currentImageFile = file;
            
            // Enhanced file validation
            const validationResult = validateImageFile(file);
            if (!validationResult.valid) {
                showFileError(validationResult.error, validationResult.suggestions);
                return;
            }
            
            // Show enhanced file info
            displayFileInfo(file);
            
            // Show image preview
            showImagePreview(file);
            
            // Enable extract button
            enableExtractionButton();
        }
    }

    function validateImageFile(file) {
        const supportedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp',
            'image/webp', 'image/tiff', 'image/tif', 'image/svg+xml'
        ];
        
        const supportedExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|tiff|tif|svg)$/i;
        
        // Check file type
        if (!supportedTypes.includes(file.type) && !supportedExtensions.test(file.name)) {
            return {
                valid: false,
                error: 'Unsupported file format',
                suggestions: [
                    'Please select an image file',
                    'Supported formats: JPG, PNG, GIF, BMP, WebP, TIFF, SVG',
                    'Try converting your file to one of these formats'
                ]
            };
        }
        
        // Check file size (50MB limit)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File too large (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
                suggestions: [
                    'Maximum file size is 50MB',
                    'Try compressing your image',
                    'Use a lower resolution version',
                    'Crop the image to include only the text area'
                ]
            };
        }
        
        // Check minimum size
        if (file.size < 1000) {
            return {
                valid: false,
                error: 'File too small or corrupted',
                suggestions: [
                    'The file appears to be corrupted or incomplete',
                    'Try uploading a different image',
                    'Make sure the file downloaded completely'
                ]
            };
        }
        
        return { valid: true };
    }

    function showFileError(error, suggestions = []) {
        selectedFile.innerHTML = `
            <div class="error-message">
                <div class="error-header">
                    <span class="error-icon">❌</span>
                    <h4>${error}</h4>
                </div>
                ${suggestions.length > 0 ? `
                    <div class="error-suggestions">
                        <h5>💡 Suggestions:</h5>
                        <ul>
                            ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('imageFile').value = ''; document.getElementById('selectedFile').innerHTML = '<p>No file selected</p>';">
                    <i class="fas fa-undo"></i> Try Again
                </button>
            </div>
        `;
        
        imagePreviewContainer.style.display = 'none';
        extractTextBtn.disabled = true;
    }

    function displayFileInfo(file) {
        const fileSize = formatFileSize(file.size);
        const estimatedTime = estimateProcessingTime(file.size, file.type);
        
        selectedFile.innerHTML = `
            <div class="file-info-enhanced">
                <div class="file-header">
                    <div class="file-icon">🖼️</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <div class="file-meta">
                            <span class="file-size">📏 ${fileSize}</span>
                            <span class="file-type">📁 ${file.type || 'Image File'}</span>
                            <span class="processing-time">⏱️ ~${estimatedTime}</span>
                        </div>
                    </div>
                </div>
                <div class="file-status">
                    <div class="status-indicator ready">
                        <span class="status-dot"></span>
                        <span class="status-text">Ready for processing</span>
                    </div>
                </div>
            </div>
        `;
    }

    function showImagePreview(file) {
        // Reset preview
        imagePreview.src = '';
        imagePreview.style.opacity = '0.5';
        imageInfo.innerHTML = '<div class="loading-info">Loading preview...</div>';
        imagePreviewContainer.style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.opacity = '1';
            
            // Get image dimensions
            const img = new Image();
            img.onload = function() {
                imageInfo.innerHTML = `
                    <div class="image-details">
                        <div class="detail-item">
                            <i class="fas fa-expand-arrows-alt"></i>
                            <span>${this.width} × ${this.height} pixels</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-palette"></i>
                            <span>${getImageColorInfo(this)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-compress-arrows-alt"></i>
                            <span>Aspect ratio: ${(this.width / this.height).toFixed(2)}:1</span>
                        </div>
                    </div>
                `;
            };
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            showFileError('Could not read image file', ['The file may be corrupted', 'Try a different image']);
        };
        
        reader.readAsDataURL(file);
    }

    function getImageColorInfo(img) {
        // Simple color detection based on image properties
        if (img.width * img.height > 1000000) {
            return 'High resolution';
        } else if (img.width * img.height > 100000) {
            return 'Medium resolution';
        } else {
            return 'Low resolution';
        }
    }

    function enableExtractionButton() {
        extractTextBtn.disabled = false;
        extractTextBtn.innerHTML = '<i class="fas fa-magic"></i> Extract Text';
        extractTextBtn.classList.add('pulse-animation');
        setTimeout(() => extractTextBtn.classList.remove('pulse-animation'), 1000);
    }

    function removeImage() {
        imageFile.value = '';
        currentImageFile = null;
        ocrData = null;
        
        selectedFile.innerHTML = '<p>No file selected</p>';
        imagePreviewContainer.style.display = 'none';
        
        extractTextBtn.disabled = true;
        extractTextBtn.innerHTML = '<i class="fas fa-magic"></i> Extract Text';
        
        resetResults();
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!currentImageFile || extractTextBtn.disabled) {
            return;
        }
        
        // Abort any ongoing processing
        if (processingAbortController) {
            processingAbortController.abort();
        }
        
        processingAbortController = new AbortController();
        
        try {
            showProcessingState();
            const result = await processImage(currentImageFile);
            handleSuccessfulExtraction(result);
        } catch (error) {
            if (error.name !== 'AbortError') {
                handleExtractionError(error);
            }
        } finally {
            hideProcessingState();
        }
    }

    function showProcessingState() {
        conversionProgress.style.display = 'block';
        extractTextBtn.disabled = true;
        extractTextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Reset progress
        progressFill.style.width = '0%';
        progressPercentage.textContent = '0%';
        
        // Simulate progress with steps
        simulateProgress();
    }

    function simulateProgress() {
        const steps = document.querySelectorAll('.progress-steps .step');
        let currentStep = 0;
        let progress = 0;
        
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15 + 5; // Random progress increment
            
            if (progress > 100) progress = 100;
            
            progressFill.style.width = progress + '%';
            progressPercentage.textContent = Math.round(progress) + '%';
            
            // Update steps
            if (progress > 25 && currentStep < 1) {
                steps[0].classList.add('completed');
                steps[1].classList.add('active');
                currentStep = 1;
                progressStatus.textContent = 'Analyzing image content...';
            } else if (progress > 50 && currentStep < 2) {
                steps[1].classList.add('completed');
                steps[2].classList.add('active');
                currentStep = 2;
                progressStatus.textContent = 'Extracting text using OCR...';
            } else if (progress > 80 && currentStep < 3) {
                steps[2].classList.add('completed');
                steps[3].classList.add('active');
                currentStep = 3;
                progressStatus.textContent = 'Finalizing results...';
            }
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                setTimeout(() => {
                    steps[3].classList.add('completed');
                    progressStatus.textContent = 'Processing complete!';
                }, 500);
            }
        }, 200);
    }

    async function processImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        // Add processing options
        const enhanceImage = document.getElementById('enhanceImage')?.checked;
        const preprocessImage = document.getElementById('preprocessImage')?.checked;
        
        if (enhanceImage) formData.append('enhance', 'true');
        if (preprocessImage) formData.append('preprocess', 'true');
        
        const response = await fetch('/api/image-to-text', {
            method: 'POST',
            body: formData,
            signal: processingAbortController.signal
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error (${response.status})`);
        }
        
        return await response.json();
    }

    function handleSuccessfulExtraction(data) {
        extractedText = data.text || '';
        ocrData = data;
        
        if (!extractedText.trim()) {
            throw new Error('No text could be extracted from this image');
        }
        
        displayResult(data);
        updateStats(data);
        enableResultActions();
        
        showNotification('✅ Text extraction completed successfully!', 'success');
    }

    function handleExtractionError(error) {
        console.error('Extraction error:', error);
        
        const errorMessage = getDetailedErrorMessage(error);
        
        textResult.innerHTML = `
            <div class="error-result">
                <div class="error-icon">❌</div>
                <h4>Extraction Failed</h4>
                <p class="error-main">${errorMessage.main}</p>
                ${errorMessage.suggestions.length > 0 ? `
                    <div class="error-suggestions">
                        <h5>💡 Try these solutions:</h5>
                        <ul>
                            ${errorMessage.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="document.getElementById('retryExtraction').click()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    <button class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Reload Page
                    </button>
                </div>
            </div>
        `;
        
        retryExtractionBtn.disabled = false;
        showNotification('❌ Text extraction failed', 'error');
    }

    function getDetailedErrorMessage(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('tesseract') || message.includes('ocr service')) {
            return {
                main: 'OCR service is not available',
                suggestions: [
                    'The OCR engine (Tesseract) is not installed or configured properly',
                    'Please contact the system administrator',
                    'Try refreshing the page and attempting again',
                    'Check if the server is running properly'
                ]
            };
        } else if (message.includes('network') || message.includes('fetch')) {
            return {
                main: 'Network connection error',
                suggestions: [
                    'Check your internet connection',
                    'Verify the server is running',
                    'Try refreshing the page',
                    'Wait a moment and try again'
                ]
            };
        } else if (message.includes('no text') || message.includes('detect')) {
            return {
                main: 'No text could be detected in this image',
                suggestions: [
                    'Make sure the image contains clear, readable text',
                    'Try using a higher resolution image',
                    'Ensure the text is not too small or blurry',
                    'Check that the image is not rotated or heavily skewed',
                    'Try enhancing the image quality before upload'
                ]
            };
        } else if (message.includes('format') || message.includes('corrupted')) {
            return {
                main: 'Image format or quality issue',
                suggestions: [
                    'The image file may be corrupted',
                    'Try uploading the image in a different format (PNG, JPG)',
                    'Make sure the image file is complete and not damaged',
                    'Try using a different image'
                ]
            };
        } else {
            return {
                main: error.message || 'An unexpected error occurred',
                suggestions: [
                    'Try refreshing the page',
                    'Upload a different image',
                    'Check your internet connection',
                    'Contact support if the problem persists'
                ]
            };
        }
    }

    function displayResult(data) {
        const formattedText = formatTextForDisplay(data.text);
        
        textResult.innerHTML = `
            <div class="result-content">
                <div class="result-text" id="resultText">${formattedText}</div>
                ${data.processing_method ? `
                    <div class="processing-info">
                        <small><i class="fas fa-info-circle"></i> Processed using: ${data.processing_method}</small>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Apply current format
        formatText();
    }

    function updateStats(data) {
        charCount.textContent = data.character_count || data.text.length;
        wordCount.textContent = data.word_count || data.text.split(/\s+/).filter(w => w.length > 0).length;
        
        const confidence = data.confidence || 'medium';
        confidenceLevel.textContent = confidence.charAt(0).toUpperCase() + confidence.slice(1);
        
        // Update confidence indicator color
        confidenceIndicator.className = `stat confidence-indicator confidence-${confidence}`;
    }

    function enableResultActions() {
        copyTextBtn.disabled = false;
        downloadTextBtn.disabled = false;
        retryExtractionBtn.disabled = false;
    }

    function resetResults() {
        extractedText = '';
        ocrData = null;
        
        textResult.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-icon">
                    <i class="fas fa-image"></i>
                </div>
                <h4>Ready to Extract Text</h4>
                <p>Upload an image containing text to get started. The extracted text will appear here.</p>
                <div class="supported-text-types">
                    <div class="text-type">
                        <i class="fas fa-book"></i>
                        <span>Documents</span>
                    </div>
                    <div class="text-type">
                        <i class="fas fa-newspaper"></i>
                        <span>Articles</span>
                    </div>
                    <div class="text-type">
                        <i class="fas fa-sticky-note"></i>
                        <span>Notes</span>
                    </div>
                    <div class="text-type">
                        <i class="fas fa-clipboard-list"></i>
                        <span>Forms</span>
                    </div>
                </div>
            </div>
        `;
        
        charCount.textContent = '0';
        wordCount.textContent = '0';
        confidenceLevel.textContent = '-';
        confidenceIndicator.className = 'stat confidence-indicator';
        
        copyTextBtn.disabled = true;
        downloadTextBtn.disabled = true;
        retryExtractionBtn.disabled = true;
    }

    function hideProcessingState() {
        conversionProgress.style.display = 'none';
        extractTextBtn.disabled = false;
        extractTextBtn.innerHTML = '<i class="fas fa-magic"></i> Extract Text';
        
        // Reset progress steps
        const steps = document.querySelectorAll('.progress-steps .step');
        steps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }

    function formatText() {
        if (!extractedText) return;
        
        const selectedFormat = document.querySelector('input[name="formatOption"]:checked')?.value || 'plain';
        const resultText = document.getElementById('resultText');
        
        if (!resultText) return;
        
        if (selectedFormat === 'paragraphs') {
            resultText.innerHTML = formatTextWithParagraphs(extractedText);
        } else {
            resultText.innerHTML = formatTextForDisplay(extractedText);
        }
    }

    function formatTextWithParagraphs(text) {
        return text
            .split(/\n\s*\n/)
            .filter(paragraph => paragraph.trim())
            .map(paragraph => `<p>${paragraph.trim().replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    function formatTextForDisplay(text) {
        return text.replace(/\n/g, '<br>');
    }

    function retryExtraction() {
        if (currentImageFile) {
            handleSubmit({ preventDefault: () => {} });
        }
    }

    function copyText() {
        if (!extractedText) return;
        
        if (copyToClipboard(extractedText)) {
            showButtonFeedback(copyTextBtn, '<i class="fas fa-check"></i> Copied!', '#48bb78');
            showNotification('📋 Text copied to clipboard!', 'success');
        } else {
            showNotification('❌ Failed to copy text', 'error');
        }
    }

    function downloadText() {
        if (!extractedText) return;
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `extracted-text-${timestamp}.txt`;
        
        if (downloadTextAsFile(extractedText, filename)) {
            showButtonFeedback(downloadTextBtn, '<i class="fas fa-check"></i> Downloaded!', '#48bb78');
            showNotification('💾 Text file downloaded!', 'success');
        } else {
            showNotification('❌ Failed to download text', 'error');
        }
    }

    function showButtonFeedback(button, content, color) {
        const originalContent = button.innerHTML;
        const originalBackground = button.style.backgroundColor;
        
        button.innerHTML = content;
        button.style.backgroundColor = color;
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.style.backgroundColor = originalBackground;
        }, 2000);
    }

    function resetUI() {
        selectedFile.innerHTML = '<p>No file selected</p>';
        imagePreviewContainer.style.display = 'none';
        conversionProgress.style.display = 'none';
        resetResults();
    }

    // Utility functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function estimateProcessingTime(fileSize, fileType) {
        const sizeMB = fileSize / (1024 * 1024);
        if (sizeMB < 1) return '1-2 seconds';
        if (sizeMB < 5) return '2-5 seconds';
        if (sizeMB < 15) return '5-10 seconds';
        return '10-20 seconds';
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
        }
        
        // Fallback method
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
            console.error('Error copying text:', err);
            document.body.removeChild(textarea);
            return false;
        }
    }

    function downloadTextAsFile(text, filename) {
        try {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return true;
        } catch (err) {
            console.error('Error downloading file:', err);
            return false;
        }
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-content">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
    }

    // Initialize idle state
    resetUI();
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