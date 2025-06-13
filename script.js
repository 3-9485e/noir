// Video and page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Waitlist Progress Counter System
    class WaitlistProgressSystem {
        constructor() {
            this.currentCount = 68;
            this.maxCount = 100;
            this.progressButton = document.querySelector('.waitlist-progress-button');
            this.counterElement = document.querySelector('.progress-counter');
            this.init();
        }
        
        init() {
            this.addClickHandler();
            this.startPeriodicUpdate();
        }
        
        addClickHandler() {
            if (this.progressButton) {
                this.progressButton.addEventListener('click', () => {
                    // Scroll to waitlist section
                    const waitlistSection = document.getElementById('waitlist');
                    if (waitlistSection) {
                        waitlistSection.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            }
        }
        
        startPeriodicUpdate() {
            // Simulate occasional counter updates (every 30-60 seconds)
            setInterval(() => {
                if (this.currentCount < this.maxCount && Math.random() < 0.3) {
                    this.incrementCounter();
                }
            }, Math.random() * 30000 + 30000); // 30-60 seconds
        }
        
        incrementCounter() {
            if (this.currentCount < this.maxCount) {
                this.currentCount++;
                this.updateCounterDisplay();
                
                // Add visual feedback
                if (this.counterElement) {
                    this.counterElement.style.transform = 'scale(1.1)';
                    this.counterElement.style.transition = 'transform 0.2s ease';
                    
                    setTimeout(() => {
                        this.counterElement.style.transform = 'scale(1)';
                    }, 200);
                }
            }
        }
        
        updateCounterDisplay() {
            if (this.counterElement) {
                this.counterElement.textContent = `${this.currentCount}/${this.maxCount}`;
            }
        }
    }
    
    // Initialize Waitlist Progress System
    new WaitlistProgressSystem();
    
    // Initialize Burger Menu System
    new BurgerMenuSystem();

    // Dynamic KPI System with Ant Loss
    class DynamicKPISystem {
        constructor() {
            this.maxAnts = 684;
            this.maxCoverage = 15;
            this.kpiData = {
                ants: { current: 684, target: 684, min: 620, max: 684, suffix: '' },
                coverage: { current: 15, target: 15, min: 13.6, max: 15, suffix: '%' }
            };
            this.updateInterval = 4000; // Update every 4 seconds
            this.init();
        }
        
        init() {
            this.startKPIUpdates();
            this.addKPIInteractions();
        }
        
        startKPIUpdates() {
            setInterval(() => {
                this.simulateAntLoss();
            }, this.updateInterval);
        }
        
        simulateAntLoss() {
            // Random ant loss between 0-64 ants (0-10% loss)
            const antLoss = Math.floor(Math.random() * 65);
            const newAntCount = this.maxAnts - antLoss;
            
            // Calculate proportional coverage loss
            const antRatio = newAntCount / this.maxAnts;
            const newCoverage = parseFloat((this.maxCoverage * antRatio).toFixed(1));
            
            // Update indicators BEFORE changing the values
            this.updateIndicator('ants', this.kpiData.ants.current, newAntCount);
            this.updateIndicator('coverage', this.kpiData.coverage.current, newCoverage);
            
            // Update ant count
            this.kpiData.ants.target = newAntCount;
            this.animateKPIValue('ants', this.kpiData.ants.current, newAntCount, '');
            this.kpiData.ants.current = newAntCount;
            
            // Update coverage proportionally
            this.kpiData.coverage.target = newCoverage;
            this.animateKPIValue('coverage', this.kpiData.coverage.current, newCoverage, '%');
            this.kpiData.coverage.current = newCoverage;
        }
        
        updateIndicator(type, oldValue, newValue) {
            const indicator = document.getElementById(`${type}-indicator`);
            if (!indicator) return;
            
            // Clear existing classes
            indicator.className = 'kpi-indicator';
            
            if (type === 'ants' && newValue === 684) {
                // At max ants (684) - show green circle
                indicator.textContent = '●';
                indicator.classList.add('max');
            } else if (newValue < oldValue) {
                // Decreasing - red triangle down
                indicator.textContent = '▼';
                indicator.classList.add('down');
            } else if (newValue > oldValue) {
                // Increasing - green triangle up
                indicator.textContent = '▲';
                indicator.classList.add('up');
            } else {
                // No change - keep current symbol
                if (type === 'ants' && newValue === 684) {
                    indicator.textContent = '●';
                    indicator.classList.add('max');
                } else {
                    indicator.textContent = '▲';
                    indicator.classList.add('up');
                }
            }
        }
        
        animateKPIValue(kpiKey, from, to, suffix) {
            const kpiNumbers = document.querySelectorAll('.kpi-number');
            let targetElement;
            
            // Map KPI keys to DOM elements
            switch(kpiKey) {
                case 'ants':
                    targetElement = kpiNumbers[0];
                    break;
                case 'coverage':
                    targetElement = kpiNumbers[1];
                    break;
            }
            
            if (!targetElement) return;
            
            // Add visual feedback
            const kpiItem = targetElement.closest('.kpi-item');
            kpiItem.classList.add('updating');
            
            // Animate the number change
            const duration = 1200;
            const start = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function for smooth animation
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                const currentValue = from + (to - from) * easeOutCubic;
                
                // Format the display value
                let displayValue;
                if (suffix === '%') {
                    displayValue = currentValue.toFixed(1) + suffix;
                } else if (suffix === ' GB') {
                    displayValue = Math.round(currentValue) + suffix;
                } else {
                    displayValue = Math.round(currentValue) + suffix;
                }
                
                targetElement.textContent = displayValue;
                targetElement.classList.add('counting');
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Animation complete
                    setTimeout(() => {
                        kpiItem.classList.remove('updating');
                        targetElement.classList.remove('counting');
                    }, 200);
                }
            };
            
            requestAnimationFrame(animate);
        }
        
        addKPIInteractions() {
            const kpiItems = document.querySelectorAll('.kpi-item');
            
            kpiItems.forEach((item, index) => {
                item.addEventListener('mouseenter', () => {
                    item.classList.add('active');
                });
                
                item.addEventListener('mouseleave', () => {
                    item.classList.remove('active');
                });
                
                // Click to trigger manual update
                item.addEventListener('click', () => {
                    const kpiKeys = Object.keys(this.kpiData);
                    const kpiKey = kpiKeys[index];
                    if (kpiKey) {
                        this.updateSpecificKPI(kpiKey);
                    }
                });
            });
        }
        
        updateSpecificKPI(kpiKey) {
            const kpiInfo = this.kpiData[kpiKey];
            const newTarget = Math.floor(Math.random() * (kpiInfo.max - kpiInfo.min + 1)) + kpiInfo.min;
            
            this.animateKPIValue(kpiKey, kpiInfo.current, newTarget, kpiInfo.suffix);
            kpiInfo.current = newTarget;
        }
    }
    
    // Initialize Dynamic KPI System when globe section is visible
    const globeSection = document.querySelector('.globe-footer');
    if (globeSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    new DynamicKPISystem();
                    observer.unobserve(entry.target); // Only initialize once
                }
            });
        }, { threshold: 0.3 });
        
        observer.observe(globeSection);
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add scroll effect to header and logo switching
    const header = document.querySelector('.header');
    const scrollMarquee = document.getElementById('scrollMarquee');

    window.addEventListener('scroll', function() {
        let scrollTop = window.scrollY || document.documentElement.scrollTop;

        // Header consolidation and logo switching based on scroll position
        if (scrollTop > 50) {
            header.classList.add('scrolled');
            // Show marquee when scrolled
            if (scrollMarquee) {
                scrollMarquee.style.opacity = '1';
                scrollMarquee.style.visibility = 'visible';
            }
        } else {
            header.classList.remove('scrolled');
            // Hide marquee when at top
            if (scrollMarquee) {
                scrollMarquee.style.opacity = '0';
                scrollMarquee.style.visibility = 'hidden';
            }
        }
    });

    
    // Feature animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });
    
    // Add hover effects to buttons
    document.querySelectorAll('.cta-button, .explore-button').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
    
    // Add click effect to buttons
    document.querySelectorAll('.cta-button, .explore-button').forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Form submission handling
    const waitlistForm = document.getElementById('waitlistForm');
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const interest = document.getElementById('interest').value;
            
            // Show success message
            waitlistForm.innerHTML = `
                <div class="success-message fadeIn">
                    <div class="success-icon">✓</div>
                    <h3 class="success-title">Thank you, ${name}!</h3>
                    <p class="success-text">You've been added to our waitlist. We'll notify you when early access becomes available.</p>
                </div>
            `;

            // In a real-world scenario, you would send this data to a server
            console.log('Form submitted with:', { name, email, interest });
        });
    }
    
    // Add animation to explore button
    const exploreButton = document.querySelector('.explore-button');
    if (exploreButton) {
        exploreButton.addEventListener('click', function() {
            // Scroll to features section
            const featuresSection = document.querySelector('.features');
            if (featuresSection) {
                featuresSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
    
    // Header navigation - Join the Waitlist button
    const headerCTA = document.querySelector('.header .cta-button');
    if (headerCTA) {
        headerCTA.addEventListener('click', function() {
            // Scroll to waitlist section
            const waitlistSection = document.getElementById('waitlist');
            if (waitlistSection) {
                waitlistSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
    
    // Burger Menu System
    class BurgerMenuSystem {
        constructor() {
            this.burgerMenu = document.getElementById('burgerMenu');
            this.nav = document.getElementById('nav');
            this.overlay = document.getElementById('mobileMenuOverlay');
            this.isOpen = false;
            this.init();
        }
        
        init() {
            if (this.burgerMenu && this.nav) {
                // Add click event to burger menu
                this.burgerMenu.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMenu();
                });
                
                // Close menu when clicking nav links
                const navLinks = this.nav.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        this.closeMenu();
                    });
                });
                
                // Close menu when clicking CTA button
                const ctaButton = this.nav.querySelector('.cta-button');
                if (ctaButton) {
                    ctaButton.addEventListener('click', () => {
                        this.closeMenu();
                    });
                }
                
                // Close menu when clicking overlay
                if (this.overlay) {
                    this.overlay.addEventListener('click', () => {
                        this.closeMenu();
                    });
                }
                
                // Close menu on window resize if desktop
                window.addEventListener('resize', () => {
                    if (window.innerWidth > 768) {
                        this.closeMenu();
                    }
                });
                
                // Close menu on escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.isOpen) {
                        this.closeMenu();
                    }
                });
            }
        }
        
        toggleMenu() {
            if (this.isOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        }
        
        openMenu() {
            this.isOpen = true;
            this.burgerMenu.classList.add('active');
            this.nav.classList.add('active');
            
            if (this.overlay) {
                this.overlay.classList.add('active');
            }
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = 'hidden';
        }
        
        closeMenu() {
            this.isOpen = false;
            this.burgerMenu.classList.remove('active');
            this.nav.classList.remove('active');
            
            if (this.overlay) {
                this.overlay.classList.remove('active');
            }
            
            document.body.style.overflow = '';
        }
    }

    // Initialize Burger Menu System
    new BurgerMenuSystem();
});

// Global function for burger menu (backup)
function toggleMobileMenu() {
    const burger = document.getElementById('burgerMenu');
    const nav = document.getElementById('nav');
    const overlay = document.getElementById('mobileMenuOverlay');
    
    if (burger && nav) {
        burger.classList.toggle('active');
        nav.classList.toggle('active');
        
        if (overlay) {
            overlay.classList.toggle('active');
        }
        
        // Prevent body scroll when menu is open
        if (nav.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Add CSS for ripple effect and success message
const style = document.createElement('style');
style.textContent = `
    .cta-button, .explore-button {
        position: relative;
        overflow: hidden;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .ripple {
        position: absolute;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .success-message {
        text-align: center;
        padding: 40px 0;
    }
    
    .success-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        background: #4caf50;
        color: white;
        font-size: 24px;
        border-radius: 50%;
        margin-bottom: 20px;
        animation: pulseGlow 2s infinite;
    }
    
    .success-title {
        font-size: 24px;
        margin-bottom: 16px;
        color: white;
    }
    
    .success-text {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.8);
        max-width: 80%;
        margin: 0 auto;
    }
`;
document.head.appendChild(style);
