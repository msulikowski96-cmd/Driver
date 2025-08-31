
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

    init() {
        this.getUserLocation().then(() => {
            this.createMap();
            this.addTrafficLayer();
            this.addControls();
            this.updateTrafficData();
            
            // Update traffic data every 5 minutes
            setInterval(() => {
                this.updateTrafficData();
            }, 300000);
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

    createMap() {
        // Using Leaflet for the map
        this.map = L.map(this.containerId, {
            center: this.options.center,
            zoom: this.options.zoom,
            zoomControl: false
        });

        // Add TomTom map tiles with proper API endpoint
        // Using the Maps API v1 with custom style
        const tomtomApiKey = '34RIQppvhaUXhkjB4a3TF4Q3vG77ow5K';
        
        // Try the standard TomTom raster tiles first
        L.tileLayer(`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomtomApiKey}`, {
            attribution: '© TomTom',
            maxZoom: 22
        }).addTo(this.map);

        // Add custom zoom control
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        // Add user location marker if available
        if (this.userLocation) {
            const userMarker = L.marker(this.userLocation, {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <circle cx="12" cy="12" r="8" fill="#007bff" stroke="#fff" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" fill="#fff"/>
                        </svg>
                    `),
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(this.map);
            
            userMarker.bindPopup('Twoja lokalizacja');
        }
    }

    addTrafficLayer() {
        // Create traffic layer group
        this.trafficLayer = L.layerGroup().addTo(this.map);
        
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
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'traffic-legend');
            div.style.backgroundColor = 'rgba(31, 31, 31, 0.9)';
            div.style.color = 'white';
            div.style.padding = '8px';
            div.style.fontSize = '12px';
            div.style.borderRadius = '4px';
            div.style.border = '1px solid #333';
            
            div.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">Natężenie ruchu</div>
                <div><span style="color: #28a745;">●</span> Płynny</div>
                <div><span style="color: #ffc107;">●</span> Umiarkowany</div>
                <div><span style="color: #fd7e14;">●</span> Intensywny</div>
                <div><span style="color: #dc3545;">●</span> Korek</div>
            `;
            
            return div;
        };
        
        legend.addTo(this.map);
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
                return this.processTomTomTrafficData(data);
            } else {
                console.log('TomTom API response error:', response.status);
                return this.getSimulatedTrafficData(bounds);
            }
        } catch (error) {
            console.log('TomTom API error:', error);
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
        trafficData.forEach(traffic => {
            const color = this.getTrafficColor(traffic.level);
            const weight = this.getTrafficWeight(traffic.level);
            
            // Add traffic line
            const trafficLine = L.polyline(traffic.coords, {
                color: color,
                weight: weight,
                opacity: 0.8
            }).addTo(this.trafficLayer);
            
            // Add popup with traffic info
            const popupContent = `
                <div style="color: #333;">
                    <strong>${traffic.name}</strong><br>
                    Natężenie: ${this.getTrafficLevelName(traffic.level)}<br>
                    Aktualna prędkość: ${traffic.speed} km/h<br>
                    ${traffic.freeFlowSpeed ? `Prędkość bez korków: ${traffic.freeFlowSpeed} km/h<br>` : ''}
                    ${traffic.confidence ? `Pewność danych: ${traffic.confidence}%<br>` : ''}
                    ${traffic.speedRatio ? `Płynność ruchu: ${traffic.speedRatio}%` : ''}
                </div>
            `;
            trafficLine.bindPopup(popupContent);
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
    const trafficMapContainer = document.getElementById('traffic-map');
    if (trafficMapContainer) {
        window.trafficMap = new TrafficMap('traffic-map');
    }
});

// CSS styles for traffic map
const trafficStyles = `
    .traffic-map-container {
        position: relative;
        height: 300px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #333;
    }
    
    .traffic-legend {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .leaflet-control-custom {
        background: #1f1f1f !important;
        border: 1px solid #333 !important;
    }
    
    .leaflet-control-custom:hover {
        background: #333 !important;
    }
    
    .leaflet-popup-content-wrapper {
        background: #fff;
        color: #333;
        border-radius: 8px;
    }
    
    .leaflet-popup-tip {
        background: #fff;
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
