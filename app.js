// ===== Pro Mobile Converter with WorldTimeAPI =====
const app = {
    // ExchangeRate-API config
    exchangeApiKey: '38b44d9fd2765204c0abd06e',
    exchangeApiUrl: 'https://v6.exchangerate-api.com/v6',
    
    // WorldTimeAPI (no key needed)
    worldTimeUrl: 'https://time.now/developer/api',
    
    // Time units in seconds (accurate)
    timeUnits: {
        seconds: 1,
        minutes: 60,
        hours: 3600,
        days: 86400,
        weeks: 604800,
        months: 2629746, // Average Gregorian month
        years: 31556952  // Average Gregorian year
    },
    
    // Length units in meters (accurate)
    lengthUnits: {
        mm: 0.001,
        cm: 0.01,
        m: 1,
        km: 1000,
        in: 0.0254,
        ft: 0.3048,
        yd: 0.9144,
        mi: 1609.344
    },
    
    // Weight units in kg (accurate)
    weightUnits: {
        g: 0.001,
        kg: 1,
        t: 1000,
        oz: 0.028349523125,
        lb: 0.45359237,
        st: 6.35029318
    },
    
    // Currencies with flags
    currencies: {
        USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
        CAD: '🇨🇦', AUD: '🇦🇺', CHF: '🇨🇭', CNY: '🇨🇳',
        INR: '🇮🇳', ZAR: '🇿🇦', BRL: '🇧🇷', MXN: '🇲🇽',
        SGD: '🇸🇬', NZD: '🇳🇿'
    },
    
    currencyNames: {
        USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
        CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CHF: 'Swiss Franc',
        CNY: 'Chinese Yuan', INR: 'Indian Rupee', ZAR: 'South African Rand',
        BRL: 'Brazilian Real', MXN: 'Mexican Peso', SGD: 'Singapore Dollar',
        NZD: 'New Zealand Dollar'
    },
    
    // Exchange rates cache
    rates: {},
    lastUpdate: null,
    callsLeft: 1500,
    
    // Timezone list cache
    timezones: [],
    
    // History
    history: [],

    // ===== INIT =====
    init: function() {
        this.loadData();
        this.setupListeners();
        this.updateTime();
        this.updateLength();
        this.updateWeight();
        this.fetchRates();
        this.fetchLocalTime();
        this.loadTimezones();
        this.setupPresets();
        
        // Set theme
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
        
        // Attribution footer for WorldTimeAPI
        console.log('Using World Time API by Time.Now - https://time.now');
    },

    // ===== LOAD SAVED DATA =====
    loadData: function() {
        const saved = localStorage.getItem('proHistory');
        if (saved) {
            this.history = JSON.parse(saved);
            this.updateHistory();
        }
        
        const cached = localStorage.getItem('proRates');
        const timestamp = localStorage.getItem('proRatesTime');
        
        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age < 3600000) {
                this.rates = JSON.parse(cached);
                this.lastUpdate = new Date(parseInt(timestamp));
                this.updateMoney();
                this.showStatus('Using cached rates');
            }
        }
    },

    // ===== EVENT LISTENERS =====
    setupListeners: function() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });
        
        // Theme
        document.getElementById('themeToggle').onclick = () => this.toggleTheme();
        
        // Time
        document.getElementById('timeInput').oninput = () => this.updateTime();
        document.getElementById('timeFrom').onchange = () => this.updateTime();
        document.getElementById('timeTo').onchange = () => this.updateTime();
        document.getElementById('timeSwap').onclick = () => this.swapTime();
        
        // Money
        document.getElementById('moneyInput').oninput = () => this.updateMoney();
        document.getElementById('moneyFrom').onchange = () => this.updateMoneyUI();
        document.getElementById('moneyTo').onchange = () => this.updateMoneyUI();
        document.getElementById('moneySwap').onclick = () => this.swapMoney();
        document.getElementById('refreshRates').onclick = () => this.fetchRates();
        
        // Length
        document.getElementById('lengthInput').oninput = () => this.updateLength();
        document.getElementById('lengthFrom').onchange = () => this.updateLength();
        document.getElementById('lengthTo').onchange = () => this.updateLength();
        document.getElementById('lengthSwap').onclick = () => this.swapLength();
        
        // Weight
        document.getElementById('weightInput').oninput = () => this.updateWeight();
        document.getElementById('weightFrom').onchange = () => this.updateWeight();
        document.getElementById('weightTo').onchange = () => this.updateWeight();
        document.getElementById('weightSwap').onclick = () => this.swapWeight();
        
        // History
        document.getElementById('clearHistory').onclick = () => this.clearHistory();
        document.getElementById('exportHistory').onclick = () => this.exportHistory();
        
        // World Time
        document.getElementById('refreshLocation').onclick = () => this.fetchLocalTime();
        document.getElementById('closeSelected').onclick = () => {
            document.getElementById('selectedTimeBox').style.display = 'none';
        };
        document.getElementById('timezoneSearch').oninput = (e) => this.searchTimezones(e.target.value);
        
        // City buttons
        document.querySelectorAll('.city-btn').forEach(btn => {
            btn.onclick = () => this.fetchTimezoneTime(btn.dataset.tz);
        });
        
        // Favorite pairs
        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.onclick = () => {
                const [from, to] = btn.dataset.pair.split(',');
                document.getElementById('moneyFrom').value = from;
                document.getElementById('moneyTo').value = to;
                this.updateMoneyUI();
            };
        });
    },

    // ===== TAB SWITCHING =====
    switchTab: function(tab) {
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === tab + 'Tab');
        });
        
        // Refresh world time when tab is opened
        if (tab === 'worldtime') {
            this.fetchLocalTime();
        }
    },

    // ===== THEME =====
    toggleTheme: function() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
    },

    // ===== TIME CONVERSION =====
    updateTime: function() {
        const input = parseFloat(document.getElementById('timeInput').value);
        if (isNaN(input)) {
            document.getElementById('timeOutput').value = '';
            return;
        }
        
        const from = document.getElementById('timeFrom').value;
        const to = document.getElementById('timeTo').value;
        
        const seconds = input * this.timeUnits[from];
        const result = seconds / this.timeUnits[to];
        
        document.getElementById('timeOutput').value = this.formatDecimal(result);
        
        this.updateTimeComparisons(seconds);
        this.addToHistory('time', `${this.formatNumber(input)} ${from} → ${this.formatDecimal(result)} ${to}`);
    },

    updateTimeComparisons: function(seconds) {
        // Accurate comparisons
        const cpuCycles = seconds * 3e9;
        document.getElementById('cpuCycles').textContent = this.formatNumber(cpuCycles);
        
        const heartbeats = seconds * 72 / 60;
        document.getElementById('heartbeats').textContent = this.formatNumber(heartbeats);
        
        const movies = seconds / 7200;
        document.getElementById('movies').textContent = movies.toFixed(2);
        
        const lifespanPercent = (seconds / 2491344000) * 100; // 79 years in seconds
        document.getElementById('lifespan').textContent = lifespanPercent.toFixed(6) + '%';
    },

    // ===== LENGTH CONVERSION =====
    updateLength: function() {
        const input = parseFloat(document.getElementById('lengthInput').value);
        if (isNaN(input)) {
            document.getElementById('lengthOutput').value = '';
            return;
        }
        
        const from = document.getElementById('lengthFrom').value;
        const to = document.getElementById('lengthTo').value;
        
        const meters = input * this.lengthUnits[from];
        const result = meters / this.lengthUnits[to];
        
        document.getElementById('lengthOutput').value = this.formatDecimal(result);
        
        this.updateLengthComparisons(meters);
        this.addToHistory('length', `${this.formatNumber(input)} ${from} → ${this.formatDecimal(result)} ${to}`);
    },

    updateLengthComparisons: function(meters) {
        document.getElementById('footballFields').textContent = (meters / 100).toFixed(2);
        document.getElementById('empireState').textContent = (meters / 443).toFixed(2);
        document.getElementById('planeLength').textContent = (meters / 70).toFixed(2);
        
        const earthPercent = (meters / 40075000) * 100;
        document.getElementById('earthCirc').textContent = earthPercent.toFixed(6) + '%';
    },

    // ===== WEIGHT CONVERSION =====
    updateWeight: function() {
        const input = parseFloat(document.getElementById('weightInput').value);
        if (isNaN(input)) {
            document.getElementById('weightOutput').value = '';
            return;
        }
        
        const from = document.getElementById('weightFrom').value;
        const to = document.getElementById('weightTo').value;
        
        const kg = input * this.weightUnits[from];
        const result = kg / this.weightUnits[to];
        
        document.getElementById('weightOutput').value = this.formatDecimal(result);
        
        this.updateWeightComparisons(kg);
        this.addToHistory('weight', `${this.formatNumber(input)} ${from} → ${this.formatDecimal(result)} ${to}`);
    },

    updateWeightComparisons: function(kg) {
        document.getElementById('apples').textContent = this.formatNumber(kg / 0.15);
        document.getElementById('olympicBar').textContent = (kg / 20).toFixed(1);
        document.getElementById('elephants').textContent = (kg / 5000).toFixed(2);
        document.getElementById('cars').textContent = (kg / 1500).toFixed(2);
    },

    // ===== MONEY CONVERSION =====
    fetchRates: async function() {
        const btn = document.getElementById('refreshRates');
        btn.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const res = await fetch(`${this.exchangeApiUrl}/${this.exchangeApiKey}/latest/USD`);
            const data = await res.json();
            
            if (data.result === 'success') {
                this.rates = data.conversion_rates;
                this.lastUpdate = new Date();
                this.callsLeft = data.rate_limit?.remaining || 1499;
                
                localStorage.setItem('proRates', JSON.stringify(this.rates));
                localStorage.setItem('proRatesTime', Date.now().toString());
                
                this.updateMoneyUI();
                this.showToast('Rates updated!');
                this.showStatus('Live rates');
            }
        } catch (err) {
            this.showToast('Using cached rates', 'warning');
            this.showStatus('Offline mode');
        }
        
        btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        document.getElementById('rateInfo').textContent = `${this.callsLeft} calls left`;
    },

    updateMoney: function() {
        const input = parseFloat(document.getElementById('moneyInput').value);
        if (isNaN(input) || Object.keys(this.rates).length === 0) {
            document.getElementById('moneyOutput').value = '';
            return;
        }
        
        const from = document.getElementById('moneyFrom').value;
        const to = document.getElementById('moneyTo').value;
        
        if (this.rates[from] && this.rates[to]) {
            const inUSD = input / this.rates[from];
            const result = inUSD * this.rates[to];
            
            document.getElementById('moneyOutput').value = result.toFixed(4);
            
            const rate = this.rates[to] / this.rates[from];
            document.getElementById('exchangeRate').textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
            
            this.addToHistory('money', `${this.formatNumber(input)} ${from} → ${result.toFixed(2)} ${to}`);
        }
    },

    updateMoneyUI: function() {
        const from = document.getElementById('moneyFrom').value;
        const to = document.getElementById('moneyTo').value;
        
        document.getElementById('fromFlag').textContent = this.currencies[from] || '🏳️';
        document.getElementById('toFlag').textContent = this.currencies[to] || '🏳️';
        
        this.updateMoney();
        this.updatePopularRates();
    },

    updatePopularRates: function() {
        const list = document.getElementById('popularList');
        const popular = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'ZAR'];
        const from = document.getElementById('moneyFrom').value;
        
        if (Object.keys(this.rates).length === 0) {
            list.innerHTML = '<div class="popular-item">Loading rates...</div>';
            return;
        }
        
        let html = '';
        popular.forEach(code => {
            if (this.rates[from] && this.rates[code] && code !== from) {
                const rate = this.rates[code] / this.rates[from];
                html += `
                    <div class="popular-item" onclick="app.selectCurrency('${code}')">
                        <span class="flag">${this.currencies[code] || '🏳️'}</span>
                        <span class="code">${code}</span>
                        <span class="value">${rate.toFixed(4)}</span>
                    </div>
                `;
            }
        });
        
        list.innerHTML = html;
    },

    selectCurrency: function(code) {
        document.getElementById('moneyTo').value = code;
        this.updateMoneyUI();
    },

    swapMoney: function() {
        const from = document.getElementById('moneyFrom');
        const to = document.getElementById('moneyTo');
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
        this.updateMoneyUI();
    },

    swapTime: function() {
        const from = document.getElementById('timeFrom');
        const to = document.getElementById('timeTo');
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
        this.updateTime();
    },

    swapLength: function() {
        const from = document.getElementById('lengthFrom');
        const to = document.getElementById('lengthTo');
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
        this.updateLength();
    },

    swapWeight: function() {
        const from = document.getElementById('weightFrom');
        const to = document.getElementById('weightTo');
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
        this.updateWeight();
    },

    // ===== WORLD TIME API =====
    fetchLocalTime: async function() {
        try {
            const response = await fetch(`${this.worldTimeUrl}/ip`);
            const data = await response.json();
            
            this.displayTime(data, 'currentTimeBox', 'localTime', 'localTimezone', 'localDst');
            
            // Add conversion hint
            const localTimeDisplay = document.getElementById('localTime');
            const localTimeValue = new Date(data.datetime);
            const utcTime = new Date(data.utc_datetime);
            const diffHours = (localTimeValue - utcTime) / 3600000;
            
            const hint = document.getElementById('conversionHint');
            if (hint) {
                hint.innerHTML = `UTC offset: ${diffHours >= 0 ? '+' : ''}${diffHours.toFixed(1)} hours`;
            }
            
        } catch (err) {
            console.error('Error fetching local time:', err);
            document.getElementById('localTime').textContent = 'Unable to fetch';
            document.getElementById('localTimezone').textContent = 'Check internet connection';
        }
    },

    fetchTimezoneTime: async function(timezone) {
        const tzPath = timezone.replace('/', '/');
        try {
            const response = await fetch(`${this.worldTimeUrl}/timezone/${tzPath}`);
            const data = await response.json();
            
            this.displayTime(data, 'selectedTimeBox', 'selectedTime', 'selectedTimezone');
            document.getElementById('selectedLocation').textContent = data.timezone.split('/').pop().replace('_', ' ');
            document.getElementById('selectedTimeBox').style.display = 'block';
            
        } catch (err) {
            this.showToast('Timezone not found', 'warning');
        }
    },

    displayTime: function(data, boxId, timeId, tzId, dstId = null) {
        const timeDisplay = document.getElementById(timeId);
        const tzDisplay = document.getElementById(tzId);
        
        if (data.datetime) {
            const date = new Date(data.datetime);
            timeDisplay.textContent = date.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            
            tzDisplay.textContent = `${data.timezone.split('/').pop().replace('_', ' ')} • ${dateStr}`;
            
            if (dstId && document.getElementById(dstId)) {
                document.getElementById(dstId).textContent = data.dst ? '🕐 DST active' : '';
            }
        }
    },

    loadTimezones: async function() {
        try {
            const response = await fetch(`${this.worldTimeUrl}/timezone`);
            this.timezones = await response.json();
        } catch (err) {
            console.error('Error loading timezones:', err);
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
            const city = tz.split('/').pop().replace('_', ' ');
            html += `<div class="suggestion-item" onclick="app.fetchTimezoneTime('${tz}')">${city} (${tz})</div>`;
        });
        
        suggestions.innerHTML = html;
    },

    // ===== PRESETS =====
    setupPresets: function() {
        document.querySelectorAll('[data-time]').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('timeInput').value = btn.dataset.time;
                this.updateTime();
            };
        });
    },

    // ===== HISTORY =====
    addToHistory: function(type, text) {
        this.history.unshift({
            type,
            text,
            time: new Date().toLocaleTimeString(),
            date: new Date().toLocaleDateString()
        });
        
        if (this.history.length > 30) this.history.pop();
        
        localStorage.setItem('proHistory', JSON.stringify(this.history));
        this.updateHistory();
    },

    updateHistory: function() {
        const list = document.getElementById('historyList');
        const stats = document.getElementById('historyStats');
        
        stats.textContent = `Total: ${this.history.length} conversions`;
        
        if (this.history.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No conversions yet</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        this.history.forEach(item => {
            const icon = {
                time: 'fa-clock',
                money: 'fa-coins',
                length: 'fa-ruler',
                weight: 'fa-weight-scale'
            }[item.type] || 'fa-exchange-alt';
            
            html += `
                <div class="history-item">
                    <i class="fas ${icon}"></i>
                    <div class="conversion">${item.text}</div>
                    <div class="time">${item.time}</div>
                </div>
            `;
        });
        
        list.innerHTML = html;
    },

    clearHistory: function() {
        this.history = [];
        localStorage.removeItem('proHistory');
        this.updateHistory();
        this.showToast('History cleared');
    },

    exportHistory: function() {
        const data = JSON.stringify(this.history, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `converter-history-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('History exported');
    },

    // ===== UI HELPERS =====
    formatNumber: function(n) {
        if (isNaN(n)) return '0';
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toFixed(2).replace(/\.0+$/, '');
    },

    formatDecimal: function(n) {
        if (isNaN(n)) return '';
        if (n > 1e6 || (n < 1e-4 && n !== 0)) return n.toExponential(4);
        return n.toFixed(6).replace(/\.?0+$/, '');
    },

    showToast: function(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    },

    showStatus: function(text) {
        document.getElementById('statusText').textContent = text;
    }
};

// Start app
app.init();
