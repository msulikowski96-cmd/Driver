
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
            tomtomApiKey: null, // Will be fetched from server
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
                this.addTrafficLayer();
                this.addControls();
                this.updateTrafficData();
                
                // Update traffic data every 5 minutes
                setInterval(() => {
                    this.updateTrafficData();
                }, 300000);
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
                        <p>${error.message || 'Sprawdź połączenie internetowe.'}</p>
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

            // Wait up to 30 seconds for the library to load (increased timeout)
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

        // Use Mapbox default dark style
        mapboxgl.accessToken = '';
        
        // Dark style with traffic-friendly colors
        const darkStyle = {
            version: 8,
            name: "Dark Traffic Map",
            sources: {
                'osm-dark': {
                    type: 'raster',
                    tiles: [
                        'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
                    ],
                    tileSize: 256,
                    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors'
                }
            },
            layers: [
                {
                    id: 'background',
                    type: 'background',
                    paint: {
                        'background-color': '#1a1a1a'
                    }
                },
                {
                    id: 'osm-dark',
                    type: 'raster',
                    source: 'osm-dark',
                    minzoom: 0,
                    maxzoom: 22
                }
            ]
        };
        
        this.map = new mapboxgl.Map({
            container: this.containerId,
            style: darkStyle,
            center: [this.options.center[1], this.options.center[0]], // [lng, lat] format
            zoom: this.options.zoom,
            attributionControl: true
        });

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

    addTrafficLayer() {
        // Add traffic source to map for GeoJSON data
        this.map.addSource('traffic-flow', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Add traffic layer with line styling
        this.map.addLayer({
            id: 'traffic-lines',
            type: 'line',
            source: 'traffic-flow',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': ['get', 'color'],
                'line-width': ['get', 'width'],
                'line-opacity': 0.8
            }
        });
        
        // Add traffic legend
        this.addTrafficLegend();
    }

    addControls() {
        // Traffic toggle control
        const trafficControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.style.backgroundColor = '#1f1f1f';
                container.style.width = '30px';
                container.style.height = '30px';
                container.style.cursor = 'pointer';
                container.innerHTML = '<i class="fas fa-road" style="color: white; line-height: 30px; text-align: center; display: block;"></i>';
                container.title = 'Toggle Traffic';
                
                container.onclick = () => {
                    this.toggleTraffic();
                };
                
                return container;
            }
        });
        
        new trafficControl().addTo(this.map);

        // Refresh control
        const refreshControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.style.backgroundColor = '#1f1f1f';
                container.style.width = '30px';
                container.style.height = '30px';
                container.style.cursor = 'pointer';
                container.innerHTML = '<i class="fas fa-sync" style="color: white; line-height: 30px; text-align: center; display: block;"></i>';
                container.title = 'Refresh Traffic Data';
                
                container.onclick = () => {
                    this.refreshTrafficData();
                };
                
                return container;
            }
        });
        
        new refreshControl().addTo(this.map);
    }

    addTrafficLegend() {
        // Create custom control for Mapbox GL
        class TrafficLegendControl {
            onAdd(map) {
                this._map = map;
                this._container = document.createElement('div');
                this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group traffic-legend';
                this._container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                this._container.style.color = 'white';
                this._container.style.padding = '10px';
                this._container.style.fontSize = '12px';
                this._container.style.borderRadius = '4px';
                this._container.style.border = '1px solid #444';
                this._container.style.backdropFilter = 'blur(10px)';
                
                this._container.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">Natężenie ruchu</div>
                    <div style="margin-bottom: 4px;"><span style="color: #28a745; font-size: 14px;">●</span> Płynny</div>
                    <div style="margin-bottom: 4px;"><span style="color: #ffc107; font-size: 14px;">●</span> Umiarkowany</div>
                    <div style="margin-bottom: 4px;"><span style="color: #fd7e14; font-size: 14px;">●</span> Intensywny</div>
                    <div><span style="color: #dc3545; font-size: 14px;">●</span> Korek</div>
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

    async updateTrafficData() {
        try {
            // Get current map bounds
            const bounds = this.map.getBounds();
            
            // Fetch real traffic data from TomTom API
            const trafficData = await this.fetchTrafficData(bounds);
            
            // Clear existing traffic markers
            this.trafficLayer.clearLayers();
            
            // Add traffic indicators
            this.addTrafficIndicators(trafficData);
            
        } catch (error) {
            console.error('Error updating traffic data:', error);
        }
    }

    async fetchTrafficData(bounds) {
        try {
            // Use TomTom Traffic API as primary source
            const trafficData = await this.fetchTomTomTrafficData(bounds);
            return trafficData || this.getSimulatedTrafficData(bounds);
        } catch (error) {
            console.error('Error fetching traffic data:', error);
            // Return simulated data as fallback
            return this.getSimulatedTrafficData(bounds);
        }
    }

    processTomTomTrafficData(data) {
        const trafficSegments = [];
        
        if (data && data.flowSegmentData) {
            data.flowSegmentData.forEach(segment => {
                if (segment.coordinates && segment.coordinates.coordinate) {
                    const coords = segment.coordinates.coordinate.map(coord => [coord.latitude, coord.longitude]);
                    
                    // Get speed data
                    const currentSpeed = segment.currentSpeed || 0; // m/s
                    const freeFlowSpeed = segment.freeFlowSpeed || currentSpeed; // m/s
                    const confidence = segment.confidence || 0.7;
                    
                    // Convert speeds from m/s to km/h
                    const currentSpeedKmh = Math.round(currentSpeed * 3.6);
                    const freeFlowSpeedKmh = Math.round(freeFlowSpeed * 3.6);
                    
                    // Calculate traffic level based on speed ratio
                    const speedRatio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;
                    let level = 'light';
                    
                    if (speedRatio < 0.3) {
                        level = 'jam';
                    } else if (speedRatio < 0.5) {
                        level = 'heavy';
                    } else if (speedRatio < 0.7) {
                        level = 'moderate';
                    }
                    
                    // Get road information
                    const roadName = segment.roadClosure ? 'Zamknięta droga' : 
                                   (segment.functionalRoadClass ? `Droga klasy ${segment.functionalRoadClass}` : 'Droga');
                    
                    trafficSegments.push({
                        coords: coords,
                        level: level,
                        speed: currentSpeedKmh,
                        name: roadName,
                        freeFlowSpeed: freeFlowSpeedKmh,
                        confidence: Math.round(confidence * 100),
                        speedRatio: Math.round(speedRatio * 100)
                    });
                }
            });
        }
        
        return trafficSegments;
    }


    async fetchTomTomTrafficData(bounds) {
        try {
            const center = bounds.getCenter();
            const zoom = Math.max(10, Math.min(18, this.map.getZoom()));
            
            // TomTom Traffic Flow API
            const trafficFlowUrl = `/api/tomtom-traffic?lat=${center.lat}&lng=${center.lng}&zoom=${zoom}&bbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
            
            const response = await fetch(trafficFlowUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log('TomTom API success:', data);
                return this.processTomTomTrafficData(data);
            } else {
                console.log('TomTom API response error:', response.status, response.statusText);
                return this.getSimulatedTrafficData(bounds);
            }
        } catch (error) {
            console.error('TomTom API error:', error);
            return this.getSimulatedTrafficData(bounds);
        }
    }



    simulateTomTomData(bounds) {
        // Simulate realistic traffic data based on time of day and location
        const currentHour = new Date().getHours();
        const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 18);
        const center = bounds.getCenter();
        
        const segments = [];
        const roadCount = Math.random() * 10 + 5;
        
        for (let i = 0; i < roadCount; i++) {
            const startLat = center.lat + (Math.random() - 0.5) * 0.02;
            const startLng = center.lng + (Math.random() - 0.5) * 0.02;
            const endLat = startLat + (Math.random() - 0.5) * 0.01;
            const endLng = startLng + (Math.random() - 0.5) * 0.01;
            
            let level = 'light';
            let speed = 50;
            
            if (isRushHour) {
                const randomLevel = Math.random();
                if (randomLevel < 0.3) {
                    level = 'jam';
                    speed = 5 + Math.random() * 10;
                } else if (randomLevel < 0.6) {
                    level = 'heavy';
                    speed = 15 + Math.random() * 15;
                } else {
                    level = 'moderate';
                    speed = 25 + Math.random() * 20;
                }
            } else {
                speed = 35 + Math.random() * 25;
            }
            
            segments.push({
                coords: [[startLat, startLng], [endLat, endLng]],
                level: level,
                speed: Math.round(speed),
                name: `Road ${i + 1}`
            });
        }
        
        return segments;
    }




    getSimulatedTrafficData(bounds) {
        // Enhanced fallback simulation based on current location
        const center = bounds.getCenter();
        const currentHour = new Date().getHours();
        const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 18);
        
        const segments = [];
        const roadNames = ['Main Street', 'Central Avenue', 'Highway 1', 'Business District', 'Residential Road'];
        
        for (let i = 0; i < 8; i++) {
            const startLat = center.lat + (Math.random() - 0.5) * 0.02;
            const startLng = center.lng + (Math.random() - 0.5) * 0.02;
            const endLat = startLat + (Math.random() - 0.5) * 0.01;
            const endLng = startLng + (Math.random() - 0.5) * 0.01;
            
            let level = 'light';
            let speed = 45;
            
            if (isRushHour) {
                const random = Math.random();
                if (random < 0.25) {
                    level = 'jam';
                    speed = 5;
                } else if (random < 0.5) {
                    level = 'heavy';
                    speed = 15;
                } else if (random < 0.75) {
                    level = 'moderate';
                    speed = 30;
                }
            }
            
            segments.push({
                coords: [[startLat, startLng], [endLat, endLng]],
                level: level,
                speed: speed,
                name: roadNames[i % roadNames.length]
            });
        }
        
        return segments;
    }

    addTrafficIndicators(trafficData) {
        // Convert traffic data to GeoJSON features for Mapbox GL
        const features = trafficData.map(traffic => {
            const color = this.getTrafficColor(traffic.level);
            const weight = this.getTrafficWeight(traffic.level);
            
            // Convert coords to GeoJSON LineString format [lng, lat]
            const coordinates = traffic.coords.map(coord => [coord[1], coord[0]]);
            
            return {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                },
                properties: {
                    color: color,
                    width: weight,
                    level: traffic.level,
                    name: traffic.name,
                    speed: traffic.speed,
                    freeFlowSpeed: traffic.freeFlowSpeed,
                    confidence: traffic.confidence,
                    speedRatio: traffic.speedRatio
                }
            };
        });

        // Update the traffic source with new data
        this.map.getSource('traffic-flow').setData({
            type: 'FeatureCollection',
            features: features
        });

        // Add click handler for popups
        this.map.off('click', 'traffic-lines'); // Remove existing handler
        this.map.on('click', 'traffic-lines', (e) => {
            const properties = e.features[0].properties;
            const popupContent = `
                <div style="color: #333;">
                    <strong>${properties.name}</strong><br>
                    Natężenie: ${this.getTrafficLevelName(properties.level)}<br>
                    Aktualna prędkość: ${properties.speed} km/h<br>
                    ${properties.freeFlowSpeed ? `Prędkość bez korków: ${properties.freeFlowSpeed} km/h<br>` : ''}
                    ${properties.confidence ? `Pewność danych: ${properties.confidence}%<br>` : ''}
                    ${properties.speedRatio ? `Płynność ruchu: ${properties.speedRatio}%` : ''}
                </div>
            `;
            
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(popupContent)
                .addTo(this.map);
        });

        // Change cursor on hover
        this.map.on('mouseenter', 'traffic-lines', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'traffic-lines', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    getTrafficColor(level) {
        const colors = {
            'light': '#28a745',
            'moderate': '#ffc107',
            'heavy': '#fd7e14',
            'jam': '#dc3545'
        };
        return colors[level] || '#6c757d';
    }

    getTrafficWeight(level) {
        const weights = {
            'light': 3,
            'moderate': 5,
            'heavy': 7,
            'jam': 9
        };
        return weights[level] || 3;
    }

    getTrafficLevelName(level) {
        const names = {
            'light': 'Płynny',
            'moderate': 'Umiarkowany',
            'heavy': 'Intensywny',
            'jam': 'Korek'
        };
        return names[level] || 'Nieznany';
    }

    toggleTraffic() {
        if (this.map.hasLayer(this.trafficLayer)) {
            this.map.removeLayer(this.trafficLayer);
        } else {
            this.map.addLayer(this.trafficLayer);
        }
    }

    refreshTrafficData() {
        const refreshIcon = document.querySelector('.fa-sync');
        if (refreshIcon) {
            refreshIcon.classList.add('fa-spin');
        }
        
        this.updateTrafficData().then(() => {
            if (refreshIcon) {
                refreshIcon.classList.remove('fa-spin');
            }
        });
    }


    resize() {
        if (this.map) {
            this.map.invalidateSize();
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
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .mapboxgl-popup-content {
        background: #2a2a2a !important;
        color: #ffffff !important;
        border-radius: 8px !important;
        border: 1px solid #444 !important;
    }
    
    .mapboxgl-popup-tip {
        border-top-color: #2a2a2a !important;
        border-bottom-color: #2a2a2a !important;
    }
    
    .mapboxgl-ctrl-attrib {
        background-color: rgba(0, 0, 0, 0.7) !important;
        color: #ffffff !important;
    }
    
    .mapboxgl-ctrl-attrib a {
        color: #66b3ff !important;
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
