// Main JavaScript file for EnglishPro

// Handle loading screen
document.addEventListener('DOMContentLoaded', function() {
    // Simulate loading time (remove in production)
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('hidden');
        
        // Remove loading screen from DOM after transition is complete
        loadingScreen.addEventListener('transitionend', function() {
            loadingScreen.style.display = 'none';
        });
    }, 1000);
});

// Navigation page transition
function navigateTo(url) {
    // Show loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.remove('hidden');
    loadingScreen.style.display = 'flex';
    
    // Navigate to the URL after a short delay
    setTimeout(() => {
        window.location.href = url;
    }, 400);
}

// Add clickable behavior to navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to all navigation links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (!this.getAttribute('href').startsWith('http')) {
                e.preventDefault();
                navigateTo(this.getAttribute('href'));
            }
        });
    });

    // Add event listeners to feature cards on homepage
    document.querySelectorAll('.feature-card').forEach(card => {
        if (card.hasAttribute('onclick')) {
            const url = card.getAttribute('onclick').match(/navigateTo\('(.*)'\)/)[1];
            card.addEventListener('click', function() {
                navigateTo(url);
            });
        }
    });
});

// Helper functions

// Copy text to clipboard
function copyToClipboard(text) {
    if (!text) return false;
    
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        // Execute copy command
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
    } catch (err) {
        console.error('Error copying text: ', err);
        document.body.removeChild(textarea);
        return false;
    }
}

// Download text as file
function downloadTextAsFile(text, filename) {
    if (!text) return false;
    
    const blob = new Blob([text], { type: 'text/plain' });
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

// Format timestamp
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}