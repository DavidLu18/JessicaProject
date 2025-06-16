// Enhanced Main JavaScript for EnglishPro with smooth animations and interactions

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initializePageTransitions();
    initializeLoadingScreen();
    initializeNavigationEffects();
    initializeScrollAnimations();
    initializeParallaxEffects();
    initializeCardHoverEffects();
    initializeTooltips();
    initializeSmootScrolling();
});

// Page Transition System
function initializePageTransitions() {
    const links = document.querySelectorAll('a[href^="/"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's the current page
            if (href === window.location.pathname) {
                e.preventDefault();
                return;
            }
            
            // Only handle internal navigation
            if (href && !href.startsWith('http') && !href.includes('#')) {
                e.preventDefault();
                
                // Add page transition effect
                addPageTransitionEffect();
                
                // Navigate after animation
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            }
        });
    });
}

function addPageTransitionEffect() {
    // Create transition overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        z-index: 9998;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
    `;
    
    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => {
        overlay.style.opacity = '0.9';
    }, 10);
    
    // Add loading spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 50px;
        height: 50px;
        border: 3px solid rgba(255, 255, 255, 0.2);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    `;
    
    overlay.appendChild(spinner);
}

// Enhanced Loading Screen
function initializeLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (loadingScreen) {
        // Add typing effect to loading text
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) {
            animateText(loadingText, 'Loading amazing content...');
        }
        
        // Hide loading screen with enhanced animation
        window.addEventListener('load', function() {
            setTimeout(() => {
                loadingScreen.style.transform = 'scale(1.1)';
                loadingScreen.style.opacity = '0';
                
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    
                    // Add page entrance animation
                    document.body.style.opacity = '0';
                    document.body.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        document.body.style.transition = 'all 0.6s ease';
                        document.body.style.opacity = '1';
                        document.body.style.transform = 'translateY(0)';
                    }, 100);
                }, 300);
            }, 1500);
        });
    }
}

function animateText(element, text) {
    element.textContent = '';
    let i = 0;
    
    function typeChar() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(typeChar, 100);
        }
    }
    
    typeChar();
}

// Navigation Effects
function initializeNavigationEffects() {
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('nav a');
    
    // Add magnetic effect to navigation links
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Header scroll effect
    let lastScrollTop = 0;
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }
        
        // Add glass effect on scroll
        if (scrollTop > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.8)';
            header.style.backdropFilter = 'blur(20px)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.25)';
            header.style.backdropFilter = 'blur(20px)';
        }
        
        lastScrollTop = scrollTop;
    });
}

// Scroll Animations
function initializeScrollAnimations() {
    const animationElements = document.querySelectorAll(
        '.feature-card, .step, .tip-card, .hero-content, .section-title'
    );
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.transition = 'all 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)';
            }
        });
    }, observerOptions);
    
    animationElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        observer.observe(element);
    });
}

// Parallax Effects
function initializeParallaxEffects() {
    const parallaxElements = document.querySelectorAll('.hero::before, .feature-icon');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        parallaxElements.forEach(element => {
            if (element.closest('.hero')) {
                element.style.transform = `translate3d(0, ${rate}px, 0)`;
            }
        });
    });
}

// Enhanced Card Hover Effects
function initializeCardHoverEffects() {
    const cards = document.querySelectorAll('.feature-card, .step, .tip-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Add glow effect
            this.style.boxShadow = '0 30px 60px rgba(102, 126, 234, 0.2)';
            
            // Add slight rotation
            this.style.transform = 'translateY(-15px) scale(1.02) rotateY(2deg)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
            this.style.transform = '';
        });
        
        // Add ripple effect on click
        card.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
                z-index: 1;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add ripple animation CSS
    if (!document.getElementById('ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Tooltip System
function initializeTooltips() {
    const elementsWithTooltips = document.querySelectorAll('[data-tooltip]');
    
    elementsWithTooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            showTooltip(this, this.getAttribute('data-tooltip'));
        });
        
        element.addEventListener('mouseleave', function() {
            hideTooltip();
        });
    });
}

function showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 1000;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
        pointer-events: none;
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    
    setTimeout(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
    }, 10);
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(10px)';
        setTimeout(() => tooltip.remove(), 300);
    }
}

// Smooth Scrolling
function initializeSmootScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Navigation function for feature cards
function navigateTo(url) {
    // Add transition effect
    addPageTransitionEffect();
    
    // Navigate after animation
    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

// Enhanced button interactions
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn')) {
        // Add click animation
        e.target.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            e.target.style.transform = '';
        }, 150);
    }
});

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimize scroll events
const optimizedScrollHandler = debounce(function() {
    // Scroll-based animations go here
}, 16); // ~60fps

window.addEventListener('scroll', optimizedScrollHandler);

// Add custom cursor effect for interactive elements
function initializeCustomCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(102, 126, 234, 0.6) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transition: transform 0.1s ease;
        display: none;
    `;
    
    document.body.appendChild(cursor);
    
    document.addEventListener('mousemove', function(e) {
        cursor.style.left = e.clientX - 10 + 'px';
        cursor.style.top = e.clientY - 10 + 'px';
        cursor.style.display = 'block';
    });
    
    document.addEventListener('mousedown', function() {
        cursor.style.transform = 'scale(0.8)';
    });
    
    document.addEventListener('mouseup', function() {
        cursor.style.transform = 'scale(1)';
    });
    
    // Hide cursor when leaving window
    document.addEventListener('mouseleave', function() {
        cursor.style.display = 'none';
    });
}

// Initialize custom cursor only on desktop
if (window.innerWidth > 768) {
    initializeCustomCursor();
}

// Easter egg: Konami code
let konamiCode = [];
const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.keyCode);
    
    if (konamiCode.length > konami.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.toString() === konami.toString()) {
        // Trigger special effect
        triggerEasterEgg();
        konamiCode = [];
    }
});

function triggerEasterEgg() {
    // Create rainbow background effect
    document.body.style.background = 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)';
    document.body.style.backgroundSize = '200% 200%';
    document.body.style.animation = 'rainbow 2s ease infinite';
    
    // Add rainbow animation CSS if not exists
    if (!document.getElementById('rainbow-animation')) {
        const style = document.createElement('style');
        style.id = 'rainbow-animation';
        style.textContent = `
            @keyframes rainbow {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show congratulations message
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 2rem;
        border-radius: 16px;
        text-align: center;
        z-index: 10000;
        backdrop-filter: blur(20px);
        animation: pulse 2s ease-in-out infinite;
    `;
    message.innerHTML = `
        <h2>🎉 Easter Egg Found! 🎉</h2>
        <p>You discovered the Konami Code!</p>
        <p>Keep exploring EnglishPro!</p>
    `;
    
    document.body.appendChild(message);
    
    // Remove effect after 5 seconds
    setTimeout(() => {
        document.body.style.background = '';
        document.body.style.animation = '';
        message.remove();
    }, 5000);
}