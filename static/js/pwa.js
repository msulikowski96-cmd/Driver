
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.handleInstallPrompt();
        this.addInstallButton();
        this.handleNetworkStatus();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/static/sw.js');
                console.log('Service Worker registered successfully:', registration.scope);
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallButton();
            this.deferredPrompt = null;
        });
    }

    addInstallButton() {
        // Create install button
        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.className = 'btn btn-primary position-fixed';
        installBtn.style.cssText = `
            bottom: 20px;
            right: 20px;
            border-radius: 50px;
            padding: 12px 20px;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        installBtn.innerHTML = '<i class="fas fa-download me-2"></i>Zainstaluj aplikację';
        
        installBtn.addEventListener('click', () => {
            this.installApp();
        });

        document.body.appendChild(installBtn);
    }

    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'block';
        }
    }

    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const result = await this.deferredPrompt.userChoice;
            console.log('User response to the install prompt:', result);
            this.deferredPrompt = null;
            this.hideInstallButton();
        }
    }

    handleNetworkStatus() {
        window.addEventListener('online', () => {
            console.log('Back online');
            this.showNetworkStatus('Połączenie przywrócone', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('Gone offline');
            this.showNetworkStatus('Brak połączenia internetowego', 'warning');
        });
    }

    showNetworkStatus(message, type) {
        // Remove existing network status
        const existing = document.querySelector('.network-status');
        if (existing) {
            existing.remove();
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed network-status`;
        alertDiv.style.cssText = `
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1050;
            min-width: 300px;
        `;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    showUpdateNotification() {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-info alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = `
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1050;
            min-width: 300px;
        `;
        alertDiv.innerHTML = `
            Dostępna jest nowa wersja aplikacji. Odśwież stronę aby zaktualizować.
            <button type="button" class="btn btn-sm btn-info ms-2" onclick="window.location.reload()">
                Odśwież
            </button>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);
    }
}

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PWAManager();
});

// Export for use in other scripts
window.PWAManager = PWAManager;
