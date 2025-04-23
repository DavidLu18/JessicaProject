// Image to Text functionality for EnglishPro

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

    // Event Listeners
    browseButton.addEventListener('click', () => imageFile.click());
    imageFile.addEventListener('change', handleFileSelect);
    removeImageBtn.addEventListener('click', removeImage);
    
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
    copyTextBtn.addEventListener('click', copyText);
    downloadTextBtn.addEventListener('click', downloadText);
    
    // Format options
    formatOptions.forEach(option => {
        option.addEventListener('change', formatText);
    });

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
            imageFile.files = files;
            handleFileSelect();
        }
    }

    function handleFileSelect() {
        if (imageFile.files.length > 0) {
            const file = imageFile.files[0];
            
            // Check if file is an image
            if (!file.type.match('image.*')) {
                selectedFile.innerHTML = '<p class="error">Please select an image file (PNG, JPG, JPEG).</p>';
                imagePreviewContainer.classList.remove('show');
                extractTextBtn.disabled = true;
                return;
            }
            
            // Display file info
            const fileSize = (file.size / 1024).toFixed(2); // Convert to KB
            selectedFile.innerHTML = `
                <p><strong>${file.name}</strong> (${fileSize} KB)</p>
            `;
            
            // Show image preview
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.add('show');
            };
            reader.readAsDataURL(file);
            
            // Enable extract button
            extractTextBtn.disabled = false;
        }
    }

    function removeImage() {
        imageFile.value = '';
        selectedFile.innerHTML = '<p>No file selected</p>';
        imagePreviewContainer.classList.remove('show');
        extractTextBtn.disabled = true;
    }

    function handleSubmit(e) {
        e.preventDefault();
        
        if (imageFile.files.length === 0) {
            alert('Please select an image file first.');
            return;
        }
        
        const file = imageFile.files[0];
        const formData = new FormData();
        formData.append('image', file);
        
        // Show progress
        conversionProgress.classList.add('show');
        progressFill.style.width = '0%';
        progressStatus.textContent = 'Processing image...';
        extractTextBtn.disabled = true;
        
        // Simulate progress (in a real app, this would be updated based on actual progress)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress > 90) {
                clearInterval(progressInterval);
            }
            progressFill.style.width = `${progress}%`;
        }, 100);
        
        // Send to server
        fetch('/api/image-to-text', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            clearInterval(progressInterval);
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            progressFill.style.width = '100%';
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Hide progress after a short delay
            setTimeout(() => {
                conversionProgress.classList.remove('show');
                extractTextBtn.disabled = false;
            }, 500);
            
            // Store the raw text
            textResult.dataset.rawText = data.text;
            
            // Display result with current format option
            formatText();
        })
        .catch(error => {
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            progressStatus.textContent = 'Error: ' + error.message;
            
            setTimeout(() => {
                conversionProgress.classList.remove('show');
                extractTextBtn.disabled = false;
            }, 2000);
            
            textResult.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            console.error('Error processing image:', error);
        });
    }

    function formatText() {
        const rawText = textResult.dataset.rawText;
        
        if (!rawText) {
            return;
        }
        
        let formattedText = rawText;
        let selectedFormat = 'plain';
        
        // Find selected format option
        formatOptions.forEach(option => {
            if (option.checked) {
                selectedFormat = option.value;
            }
        });
        
        // Apply formatting
        if (selectedFormat === 'paragraphs') {
            // Split by double newlines and filter out empty paragraphs
            const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            
            // Format as paragraphs
            formattedText = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
            textResult.innerHTML = formattedText;
        } else {
            // Plain text
            textResult.textContent = rawText;
        }
        
        // Enable buttons
        copyTextBtn.disabled = false;
        downloadTextBtn.disabled = false;
    }

    function copyText() {
        // Get text in current format
        let text;
        let format = 'plain';
        
        formatOptions.forEach(option => {
            if (option.checked) {
                format = option.value;
            }
        });
        
        if (format === 'paragraphs') {
            // Extract text without HTML tags
            text = textResult.dataset.rawText;
        } else {
            text = textResult.textContent;
        }
        
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

    function downloadText() {
        // Get text in current format
        let text;
        let format = 'plain';
        
        formatOptions.forEach(option => {
            if (option.checked) {
                format = option.value;
            }
        });
        
        if (format === 'paragraphs') {
            // Extract text without HTML tags
            text = textResult.dataset.rawText;
        } else {
            text = textResult.textContent;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `extracted-text-${timestamp}.txt`;
        
        if (!downloadTextAsFile(text, filename)) {
            alert('Failed to download text. Please try again.');
        }
    }
});