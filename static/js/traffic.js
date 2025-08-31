// Traffic Map functionality using TomTom API
class TrafficMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.trafficLayer = null;
        this.userLocation = null;
        this.options = {
            center: [52.237049, 21.017532], // Warsaw coordinates (fallback)
            zoom: 10,
            tomtomApiKey: '34RIQppvhaUXhkjB4a3TF4Q3vG77ow5K',
            ...options
        };
        this.init();
    }

    async init() {
        try {
            // Wait for Mapbox GL JS to load
            await this.waitForMapboxGL();

            await this.getUserLocation();
            await this.createMap();

            this.map.on('load', () => {
                this.addControls();
                this.addTrafficLegend();
            });
        } catch (error) {
            console.error('Failed to initialize traffic map:', error);
            // Show error message to user
            const container = document.getElementById(this.containerId);
            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Nie udało się załadować mapy ruchu.</p>
                        <p>Problem z ładowaniem biblioteki map. Spróbuj ponownie.</p>
                        <button class="btn btn-primary btn-sm" onclick="location.reload()">
                            <i class="fas fa-sync me-1"></i>Odśwież stronę
                        </button>
                    </div>
                `;
            }
        }
    }

    waitForMapboxGL() {
        return new Promise((resolve, reject) => {
            // If already loaded, resolve immediately
            if (typeof mapboxgl !== 'undefined') {
                console.log('Mapbox GL JS already available');
                resolve();
                return;
            }

            // Wait up to 30 seconds for the library to load
            let attempts = 0;
            const maxAttempts = 300; // 30 seconds with 100ms intervals

            const checkInterval = setInterval(() => {
                attempts++;

                if (typeof mapboxgl !== 'undefined') {
                    console.log('Mapbox GL JS loaded after', attempts * 100, 'ms');
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    reject(new Error('Mapbox GL JS failed to load within 30 seconds'));
                }
            }, 100);
        });
    }

    async getUserLocation() {
        try {
            if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000 // 5 minutes
                    });
                });

                this.userLocation = [position.coords.latitude, position.coords.longitude];
                this.options.center = this.userLocation;
                this.options.zoom = 13;

                console.log('User location obtained:', this.userLocation);
            } else {
                console.log('Geolocation not supported, using default location');
            }
        } catch (error) {
            console.error('Error getting user location:', error);
            console.log('Using default location (Warsaw)');
        }
    }

    async createMap() {
        // Check if mapboxgl is available
        if (typeof mapboxgl === 'undefined') {
            console.error('Mapbox GL JS library not loaded. Please check the script tags.');
            throw new Error('Mapbox GL JS library not loaded');
        }

        // Use the provided TomTom dark style with traffic
        mapboxgl.accessToken = '';

        // Use the provided style URL directly
        const tomtomStyleUrl = `https://api.tomtom.com/style/2/custom/style/dG9tdG9tQEBAMW05d2F1aUpER1NIRDB6Mjv9LlaaC6BA3KT0t09ForSm/drafts/0.json?key=${this.options.tomtomApiKey}`;

        this.map = new mapboxgl.Map({
            container: this.containerId,
            style: tomtomStyleUrl,
            center: [this.options.center[1], this.options.center[0]], // [lng, lat] format
            zoom: this.options.zoom,
            attributionControl: true
        });

        console.log('TomTom dark style with traffic loaded successfully');

        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add user location marker if available
        if (this.userLocation) {
            const marker = new mapboxgl.Marker({
                color: '#007bff'
            })
            .setLngLat([this.userLocation[1], this.userLocation[0]])
            .setPopup(new mapboxgl.Popup().setText('Twoja lokalizacja'))
            .addTo(this.map);
        }
    }

    addControls() {
        // Create custom traffic toggle control for Mapbox GL
        class TrafficToggleControl {
            constructor(trafficMap) {
                this.trafficMap = trafficMap;
            }

            onAdd(map) {
                this._map = map;
                this._container = document.createElement('div');
                this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
                this._container.style.background = '#1f1f1f';

                this._button = document.createElement('button');
                this._button.className = 'mapboxgl-ctrl-icon';
                this._button.type = 'button';
                this._button.innerHTML = '<i class="fas fa-road" style="color: white;"></i>';
                this._button.title = 'Toggle Traffic';
                this._button.style.background = 'transparent';
                this._button.style.border = 'none';
                this._button.style.padding = '8px';
                this._button.style.cursor = 'pointer';

                this._button.addEventListener('click', () => {
                    this.trafficMap.toggleTraffic();
                });

                this._container.appendChild(this._button);
                return this._container;
            }

            onRemove() {
                this._container.parentNode.removeChild(this._container);
                this._map = undefined;
            }
        }

        this.map.addControl(new TrafficToggleControl(this), 'top-left');
    }

    addTrafficLegend() {
        // Create custom control for Mapbox GL
        class TrafficLegendControl {
            onAdd(map) {
                this._map = map;
                this._container = document.createElement('div');
                this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group traffic-legend';
                this._container.style.backgroundColor = 'rgba(26, 26, 26, 0.95)';
                this._container.style.color = '#ffffff';
                this._container.style.padding = '12px';
                this._container.style.fontSize = '12px';
                this._container.style.borderRadius = '6px';
                this._container.style.border = '1px solid #444';
                this._container.style.backdropFilter = 'blur(10px)';
                this._container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';

                this._container.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px; color: #ffffff;">Natężenie ruchu</div>
                    <div style="margin-bottom: 6px; display: flex; align-items: center;">
                        <span style="color: #28a745; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #e0e0e0;">Płynny</span>
                    </div>
                    <div style="margin-bottom: 6px; display: flex; align-items: center;">
                        <span style="color: #ffc107; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #e0e0e0;">Umiarkowany</span>
                    </div>
                    <div style="margin-bottom: 6px; display: flex; align-items: center;">
                        <span style="color: #fd7e14; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #e0e0e0;">Intensywny</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="color: #dc3545; font-size: 16px; margin-right: 8px;">●</span>
                        <span style="color: #e0e0e0;">Korek</span>
                    </div>
                `;

                return this._container;
            }

            onRemove() {
                this._container.parentNode.removeChild(this._container);
                this._map = undefined;
            }
        }

        this.map.addControl(new TrafficLegendControl(), 'bottom-right');
    }

    toggleTraffic() {
        // Toggle visibility of traffic flow layers
        const trafficLayers = [
            'Traffic - Free flow outline',
            'Traffic - Free flow pattern',
            'Traffic - Slow flow outline', 
            'Traffic - Slow flow pattern',
            'Traffic - Queueing flow outline',
            'Traffic - Queueing flow pattern',
            'Traffic - Stationary flow outline',
            'Traffic - Stationary flow pattern',
            'Traffic - Closed roads outline',
            'Traffic - Closed roads pattern'
        ];

        trafficLayers.forEach(layerId => {
            const layer = this.map.getLayer(layerId);
            if (layer) {
                const visibility = this.map.getLayoutProperty(layerId, 'visibility');
                if (visibility === 'visible' || visibility === undefined) {
                    this.map.setLayoutProperty(layerId, 'visibility', 'none');
                } else {
                    this.map.setLayoutProperty(layerId, 'visibility', 'visible');
                }
            }
        });
    }

    resize() {
        if (this.map) {
            this.map.resize();
        }
    }
}

// Initialize traffic map when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit longer for all scripts to load
    setTimeout(() => {
        const trafficMapContainer = document.getElementById('traffic-map');
        const mainTrafficMapContainer = document.getElementById('main-traffic-map');

        if (trafficMapContainer) {
            window.trafficMap = new TrafficMap('traffic-map');
        }

        if (mainTrafficMapContainer) {
            window.mainTrafficMap = new TrafficMap('main-traffic-map', { zoom: 12 });
        }
    }, 1000); // Wait 1 second for scripts to fully load
});

// CSS styles for traffic map
const trafficStyles = `
    .traffic-map-container {
        position: relative;
        height: 300px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #444;
        background-color: #1a1a1a;
    }

    .traffic-legend {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    }

    .mapboxgl-popup-content {
        background: rgba(26, 26, 26, 0.95) !important;
        color: #ffffff !important;
        border-radius: 8px !important;
        border: 1px solid #555 !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
    }

    .mapboxgl-popup-tip {
        border-top-color: rgba(26, 26, 26, 0.95) !important;
        border-bottom-color: rgba(26, 26, 26, 0.95) !important;
    }

    .mapboxgl-ctrl-attrib {
        background-color: rgba(26, 26, 26, 0.8) !important;
        color: #ffffff !important;
        border-radius: 4px !important;
    }

    .mapboxgl-ctrl-attrib a {
        color: #66b3ff !important;
    }

    .mapboxgl-ctrl {
        background-color: rgba(26, 26, 26, 0.9) !important;
        border: 1px solid #444 !important;
    }

    .mapboxgl-ctrl button {
        background-color: transparent !important;
        color: #ffffff !important;
    }

    .mapboxgl-ctrl button:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .fa-spin {
        animation: spin 1s linear infinite;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = trafficStyles;
document.head.appendChild(styleSheet);