// ===== Pro Mobile Converter with Accurate WorldTimeAPI =====
const app = {
    // ExchangeRate-API config
    exchangeApiKey: '38b44d9fd2765204c0abd06e',
    exchangeApiUrl: 'https://v6.exchangerate-api.com/v6',
    
    // WorldTimeAPI (CORRECT endpoints - includes /developer)
    worldTimeUrl: 'https://time.now/developer/api',
    
    // ... rest of the app remains the same ...
    
    // ===== WORLD TIME API (ACCURATE - CORRECT ENDPOINTS) =====
    fetchLocalTime: async function() {
        const timeDisplay = document.getElementById('localTime');
        const tzDisplay = document.getElementById('localTimezone');
        const dstDisplay = document.getElementById('localDst');
        
        timeDisplay.innerHTML = '<i class="fas fa-spinner"></i> Loading...';
        
        try {
            // CORRECT endpoint: /api/ip (includes /developer)
            const response = await fetch(`${this.worldTimeUrl}/ip`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.datetime) {
                const localDate = new Date(data.datetime);
                
                const formattedTime = localDate.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                const formattedDate = localDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                timeDisplay.innerHTML = `
                    <div style="font-size: 42px; font-weight: 700;">${formattedTime}</div>
                    <div style="font-size: 16px; margin-top: 4px;">${formattedDate}</div>
                `;
                
                const cityName = data.timezone ? data.timezone.split('/').pop().replace(/_/g, ' ') : 'Unknown';
                tzDisplay.innerHTML = `
                    <i class="fas fa-map-marker-alt"></i> ${cityName}<br>
                    <span style="font-size: 12px;">${data.timezone || 'Unknown'}</span>
                `;
                
                if (data.dst !== undefined) {
                    dstDisplay.innerHTML = data.dst ? 
                        '<i class="fas fa-sun"></i> Daylight Saving Time active' : 
                        '<i class="fas fa-moon"></i> Standard time';
                }
                
                if (data.utc_offset) {
                    const offsetElem = document.getElementById('conversionHint');
                    if (offsetElem) {
                        offsetElem.innerHTML = `UTC ${data.utc_offset}`;
                    }
                }
                
                this.showToast('Location detected successfully');
                
            } else {
                throw new Error('Invalid response format');
            }
            
        } catch (err) {
            console.error('Error fetching local time:', err);
            timeDisplay.innerHTML = '<span style="color: var(--warning)">⚠️ Unable to fetch</span>';
            tzDisplay.innerHTML = 'Check internet connection';
            this.showToast('Could not detect location', 'warning');
        }
    },

    fetchTimezoneTime: async function(timezone) {
        const selectedBox = document.getElementById('selectedTimeBox');
        const timeDisplay = document.getElementById('selectedTime');
        const tzDisplay = document.getElementById('selectedTimezone');
        const locationSpan = document.getElementById('selectedLocation');
        
        selectedBox.style.display = 'block';
        timeDisplay.innerHTML = '<i class="fas fa-spinner"></i> Loading...';
        
        try {
            // CORRECT endpoint: /api/timezone/Region/City
            const response = await fetch(`${this.worldTimeUrl}/timezone/${timezone}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.datetime) {
                const localDate = new Date(data.datetime);
                
                const formattedTime = localDate.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                const formattedDate = localDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                
                timeDisplay.innerHTML = `
                    <div style="font-size: 36px; font-weight: 700;">${formattedTime}</div>
                    <div style="font-size: 14px; margin-top: 4px;">${formattedDate}</div>
                `;
                
                const cityName = data.timezone.split('/').pop().replace(/_/g, ' ');
                locationSpan.textContent = cityName;
                
                tzDisplay.innerHTML = `
                    <i class="fas fa-globe"></i> ${data.timezone}<br>
                    <span style="font-size: 12px;">UTC ${data.utc_offset || '?'}</span>
                    ${data.dst ? '<span style="font-size: 12px; margin-left: 8px;">🕐 DST</span>' : ''}
                `;
                
                this.calculateTimeDifference(data.datetime);
                
            } else {
                throw new Error('Invalid response');
            }
            
        } catch (err) {
            console.error('Error fetching timezone time:', err);
            timeDisplay.innerHTML = '<span style="color: var(--warning)">⚠️ Timezone not found</span>';
            tzDisplay.innerHTML = 'Try another city';
            this.showToast('Timezone not found', 'warning');
        }
    },

    loadTimezones: async function() {
        try {
            // CORRECT endpoint: /api/timezone (lists all)
            const response = await fetch(`${this.worldTimeUrl}/timezone`);
            if (response.ok) {
                this.timezones = await response.json();
                console.log(`Loaded ${this.timezones.length} timezones`);
            } else {
                // Fallback common timezones
                this.timezones = [
                    'Europe/London', 'America/New_York', 'Asia/Tokyo', 
                    'Australia/Sydney', 'Africa/Johannesburg', 'Europe/Paris',
                    'Asia/Dubai', 'America/Los_Angeles', 'Asia/Singapore',
                    'Europe/Berlin', 'America/Chicago', 'Asia/Shanghai',
                    'Africa/Cairo', 'America/Sao_Paulo', 'Asia/Kolkata'
                ];
            }
        } catch (err) {
            console.error('Error loading timezones:', err);
            this.timezones = [
                'Europe/London', 'America/New_York', 'Asia/Tokyo', 
                'Australia/Sydney', 'Africa/Johannesburg', 'Europe/Paris'
            ];
        }
    },
    
    calculateTimeDifference: function(targetDateTime) {
        const targetDate = new Date(targetDateTime);
        const localDate = new Date();
        
        const diffMs = targetDate - localDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffMinutes = Math.abs(diffMs / (1000 * 60)) % 60;
        
        const hintElem = document.getElementById('conversionHint');
        if (hintElem && !isNaN(diffHours)) {
            const absHours = Math.abs(diffHours);
            const sign = diffHours >= 0 ? 'ahead' : 'behind';
            hintElem.innerHTML = `${Math.floor(absHours)}h ${Math.round(diffMinutes)}m ${sign} your time`;
        }
    },

    searchTimezones: function(query) {
        const suggestions = document.getElementById('suggestions');
        if (!query || query.length < 2) {
            suggestions.innerHTML = '';
            return;
        }
        
        const filtered = this.timezones.filter(tz => 
            tz.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8);
        
        if (filtered.length === 0) {
            suggestions.innerHTML = '<div class="suggestion-item">No results</div>';
            return;
        }
        
        let html = '';
        filtered.forEach(tz => {
            const city = tz.split('/').pop().replace(/_/g, ' ');
            const region = tz.split('/')[0];
            html += `
                <div class="suggestion-item" onclick="app.fetchTimezoneTime('${tz}')">
                    <strong>${city}</strong><br>
                    <small style="font-size: 11px;">${region}</small>
                </div>
            `;
        });
        
        suggestions.innerHTML = html;
    },
    
    // ... rest of the app remains the same ...
};
