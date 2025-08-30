
class IconManager {
    constructor() {
        this.loadCustomIcons();
    }

    // Load custom icons from SVG sprite
    loadCustomIcons() {
        // Check if icons are already loaded
        if (document.querySelector('#custom-icons-sprite')) {
            return;
        }

        // Load SVG sprite
        fetch('/static/icons/custom-icons.svg')
            .then(response => response.text())
            .then(data => {
                const div = document.createElement('div');
                div.innerHTML = data;
                div.id = 'custom-icons-sprite';
                div.style.display = 'none';
                document.body.insertBefore(div, document.body.firstChild);
            })
            .catch(error => {
                console.error('Error loading custom icons:', error);
            });
    }

    // Create icon element
    createIcon(iconName, classes = '') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('custom-icon');
        if (classes) {
            svg.classList.add(...classes.split(' '));
        }
        
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#icon-${iconName}`);
        
        svg.appendChild(use);
        return svg;
    }

    // Replace FontAwesome icons with custom icons
    replaceIcons() {
        const iconMappings = {
            'fa-user': 'driver',
            'fa-car': 'vehicle',
            'fa-star': 'rating',
            'fa-comment': 'comment',
            'fa-exclamation-triangle': 'warning',
            'fa-search': 'search',
            'fa-chart-bar': 'stats',
            'fa-trophy': 'ranking',
            'fa-shield-alt': 'admin',
            'fa-user-circle': 'profile',
            'fa-sign-in-alt': 'login',
            'fa-user-plus': 'register',
            'fa-map': 'map',
            'fa-tachometer-alt': 'dashboard',
            'fa-ban': 'block',
            'fa-check-circle': 'success'
        };

        Object.entries(iconMappings).forEach(([faClass, iconName]) => {
            const faIcons = document.querySelectorAll(`.${faClass}`);
            faIcons.forEach(icon => {
                const customIcon = this.createIcon(iconName, icon.className.replace(faClass, '').replace('fas', '').trim());
                icon.parentNode.replaceChild(customIcon, icon);
            });
        });
    }

    // Initialize icon system
    init() {
        // Load icons when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.replaceIcons(), 100);
            });
        } else {
            setTimeout(() => this.replaceIcons(), 100);
        }
    }
}

// Initialize icon manager
const iconManager = new IconManager();
iconManager.init();

// Export for global use
window.IconManager = IconManager;
window.iconManager = iconManager;
