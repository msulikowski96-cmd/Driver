
// Traffic Map functionality using OpenRouteService
class TrafficMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.trafficLayer = null;
        this.options = {
            center: [52.237049, 21.017532], // Warsaw coordinates
            zoom: 10,
            apiKey: 'YOUR_OPENROUTESERVICE_API_KEY', // Free API key from openrouteservice.org
            ...options
        };
        this.init();
    }

    init() {
        this.createMap();
        this.addTrafficLayer();
        this.addControls();
        this.updateTrafficData();
        
        // Update traffic data every 5 minutes
        setInterval(() => {
            this.updateTrafficData();
        }, 300000);
    }

    createMap() {
        // Using Leaflet for the map
        this.map = L.map(this.containerId, {
            center: this.options.center,
            zoom: this.options.zoom,
            zoomControl: false
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add custom zoom control
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);
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
            
            // Simulate traffic data (replace with actual OpenRouteService API call)
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
        // Simulate traffic data for major Warsaw roads
        // In real implementation, use OpenRouteService Traffic API
        const simulatedTraffic = [
            {
                coords: [[52.2297, 21.0122], [52.2397, 21.0222]],
                level: 'heavy',
                speed: 15,
                name: 'Marszałkowska'
            },
            {
                coords: [[52.2497, 21.0122], [52.2597, 21.0222]],
                level: 'moderate',
                speed: 35,
                name: 'Nowy Świat'
            },
            {
                coords: [[52.2197, 21.0322], [52.2297, 21.0422]],
                level: 'light',
                speed: 50,
                name: 'Krakowskie Przedmieście'
            },
            {
                coords: [[52.2097, 21.0122], [52.2197, 21.0222]],
                level: 'jam',
                speed: 5,
                name: 'Aleje Jerozolimskie'
            }
        ];

        return simulatedTraffic;
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
            trafficLine.bindPopup(`
                <div style="color: #333;">
                    <strong>${traffic.name}</strong><br>
                    Natężenie: ${this.getTrafficLevelName(traffic.level)}<br>
                    Prędkość: ${traffic.speed} km/h
                </div>
            `);
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
