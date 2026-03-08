// ===== Pro Mobile Converter =====
const app = {
    // API
    apiKey: '38b44d9fd2765204c0abd06e',
    apiUrl: 'https://v6.exchangerate-api.com/v6',
    
    // Time units (in seconds)
    timeUnits: {
        nanoseconds: 1e-9,
        microseconds: 1e-6,
        milliseconds: 0.001,
        seconds: 1,
        minutes: 60,
        hours: 3600,
        days: 86400,
        weeks: 604800,
        months: 2592000,
        years: 31536000,
        decades: 315360000,
        centuries: 3153600000
    },
    
    // Length units (in meters)
    lengthUnits: {
        mm: 0.001,
        cm: 0.01,
        m: 1,
        km: 1000,
        in: 0.0254,
        ft: 0.3048,
        yd: 0.9144,
        mi: 1609.344,
        nmi: 1852,
        ly: 9.461e15,
        au: 1.496e11
    },
    
    // Weight units (in kg)
    weightUnits: {
        mg: 0.000001,
        g: 0.001,
        kg: 1,
        t: 1000,
        oz: 0.0283495,
        lb: 0.453592,
        st: 6.35029,
        lt: 1016.05,
        ct: 0.0002,
        earth: 5.972e24,
        sun: 1.989e30
    },
    
    // All currencies with flags (25+ currencies)
    currencies: {
        USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
        CAD: '🇨🇦', AUD: '🇦🇺', CHF: '🇨🇭', CNY: '🇨🇳',
        INR: '🇮🇳', ZAR: '🇿🇦', BRL: '🇧🇷', MXN: '🇲🇽',
        SGD: '🇸🇬', NZD: '🇳🇿', HKD: '🇭🇰', SEK: '🇸🇪',
        NOK: '🇳🇴', DKK: '🇩🇰', PLN: '🇵🇱', TRY: '🇹🇷',
        RUB: '🇷🇺', KRW: '🇰🇷', AED: '🇦🇪', SAR: '🇸🇦',
        THB: '🇹🇭'
    },
    
    // Currency names for display
    currencyNames: {
        USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
        JPY: 'Japanese Yen', CAD: 'Canadian Dollar',
        AUD: 'Australian Dollar', CHF: 'Swiss Franc',
        CNY: 'Chinese Yuan', INR: 'Indian Rupee',
        ZAR: 'South African Rand', BRL: 'Brazilian Real',
        MXN: 'Mexican Peso', SGD: 'Singapore Dollar',
        NZD: 'New Zealand Dollar', HKD: 'Hong Kong Dollar',
        SEK: 'Swedish Krona', NOK: 'Norwegian Krone',
        DKK: 'Danish Krone', PLN: 'Polish Złoty',
        TRY: 'Turkish Lira', RUB: 'Russian Ruble',
        KRW: 'South Korean Won', AED: 'UAE Dirham',
        SAR: 'Saudi Riyal', THB: 'Thai Baht'
    },
    
    // Exchange rates cache
    rates: {},
    lastUpdate: null,
    callsLeft: 1500,
    
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
        this.setupPresets();
        
        // Set theme
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
    },

    // ===== LOAD SAVED DATA =====
    loadData: function() {
        // Load history
        const saved = localStorage.getItem('proHistory');
        if (saved) {
            this.history = JSON.parse(saved);
            this.updateHistory();
        }
        
        // Load favorites
        const favorites = localStorage.getItem('favoritePairs');
        if (favorites) {
            // Could restore favorite pairs
        }
        
        // Load cached rates
        const cached = localStorage.getItem('proRates');
        const timestamp = localStorage.getItem('proRatesTime');
        
        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age < 3600000) { // 1 hour
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
        const input = parseFloat(document.getElementById('timeInput').value) || 0;
        const from = document.getElementById('timeFrom').value;
        const to = document.getElementById('timeTo').value;
        
        const seconds = input * this.timeUnits[from];
        const result = seconds / this.timeUnits[to];
        
        document.getElementById('timeOutput').value = this.formatDecimal(result);
        
        // Update comparisons
        this.updateTimeComparisons(seconds);
        
        // Save to history
        this.addToHistory('time', `${input} ${from} → ${this.formatDecimal(result)} ${to}`);
    },

    updateTimeComparisons: function(seconds) {
        // CPU cycles (3GHz)
        document.getElementById('cpuCycles').textContent = this.formatNumber(seconds * 3e9);
        
        // Heartbeats (72 bpm)
        document.getElementById('heartbeats').textContent = this.formatNumber(seconds * 72 / 60);
        
        // Movies (2 hours)
        document.getElementById('movies').textContent = (seconds / 7200).toFixed(2);
        
        // Lifespan (79 years)
        const lifespan = 79 * 365 * 24 * 3600;
        document.getElementById('lifespan').textContent = ((seconds / lifespan) * 100).toFixed(4) + '%';
        
        // Earth rotations
        document.getElementById('earthRotations').textContent = (seconds / 86164).toFixed(4);
        
        // Light seconds
        document.getElementById('lightSeconds').textContent = (seconds / 299792458).toFixed(8);
    },

    // ===== LENGTH CONVERSION =====
    updateLength: function() {
        const input = parseFloat(document.getElementById('lengthInput').value) || 0;
        const from = document.getElementById('lengthFrom').value;
        const to = document.getElementById('lengthTo').value;
        
        const meters = input * this.lengthUnits[from];
        const result = meters / this.lengthUnits[to];
        
        document.getElementById('lengthOutput').value = this.formatDecimal(result);
        
        // Update comparisons
        this.updateLengthComparisons(meters);
        
        // Save to history
        this.addToHistory('length', `${input} ${from} → ${this.formatDecimal(result)} ${to}`);
    },

    updateLengthComparisons: function(meters) {
        // Football fields (100m)
        document.getElementById('footballFields').textContent = (meters / 100).toFixed(2);
        
        // Empire State Building (443m)
        document.getElementById('empireState').textContent = (meters / 443).toFixed(2);
        
        // Boeing 747 (70m)
        document.getElementById('planeLength').textContent = (meters / 70).toFixed(2);
        
        // Earth circumference (40,075,000m)
        document.getElementById('earthCirc').textContent = (meters / 40075000 * 100).toFixed(6) + '%';
    },

    // ===== WEIGHT CONVERSION =====
    updateWeight: function() {
        const input = parseFloat(document.getElementById('weightInput').value) || 0;
        const from = document.getElementById('weightFrom').value;
        const to = document.getElementById('weightTo').value;
        
        const kg = input * this.weightUnits[from];
        const result = kg / this.weightUnits[to];
        
        document.getElementById('weightOutput').value = this.formatDecimal(result);
        
        // Update comparisons
        this.updateWeightComparisons(kg);
        
        // Save to history
        this.addToHistory('weight', `${input} ${from} → ${this.formatDecimal(result)} ${to}`);
    },

    updateWeightComparisons: function(kg) {
        // Apples (0.2kg)
        document.getElementById('apples').textContent = this.formatNumber(kg / 0.2);
        
        // Olympic bar (20kg)
        document.getElementById('olympicBar').textContent = (kg / 20).toFixed(1);
        
        // Elephant (5000kg)
        document.getElementById('elephants').textContent = (kg / 5000).toFixed(2);
        
        // Car (1500kg)
        document.getElementById('cars').textContent = (kg / 1500).toFixed(2);
    },

    // ===== MONEY CONVERSION =====
    fetchRates: async function() {
        const btn = document.getElementById('refreshRates');
        btn.innerHTML = '<i class="fas fa-spinner"></i>';
        
        try {
            const res = await fetch(`${this.apiUrl}/${this.apiKey}/latest/USD`);
            const data = await res.json();
            
            if (data.result === 'success') {
                this.rates = data.conversion_rates;
                this.lastUpdate = new Date();
                this.callsLeft = data.rate_limit?.remaining || 1499;
                
                // Cache
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
        const input = parseFloat(document.getElementById('moneyInput').value) || 0;
        const from = document.getElementById('moneyFrom').value;
        const to = document.getElementById('moneyTo').value;
        
        if (this.rates[from] && this.rates[to]) {
            const inUSD = input / this.rates[from];
            const result = inUSD * this.rates[to];
            
            document.getElementById('moneyOutput').value = result.toFixed(4);
            
            // Update rate display
            const rate = this.rates[to] / this.rates[from];
            document.getElementById('exchangeRate').textContent = 
                `1 ${from} = ${rate.toFixed(4)} ${to}`;
            
            // Update purchasing power
            this.updatePurchasingPower(input, from, result, to);
            
            // Save to history
            this.addToHistory('money', `${input} ${from} → ${result.toFixed(2)} ${to}`);
        }
    },

    updatePurchasingPower: function(amount, from, result, to) {
        const powerText = document.getElementById('powerText');
        
        // Common items in local currency
        const items = {
            USD: { coffee: 4.50, bread: 3.00, meal: 15.00 },
            EUR: { coffee: 3.50, bread: 2.50, meal: 12.00 },
            GBP: { coffee: 3.00, bread: 2.00, meal: 10.00 },
            ZAR: { coffee: 35, bread: 18, meal: 120 }
        };
        
        const fromItems = items[from] || items.USD;
        const toItems = items[to] || items.USD;
        
        powerText.innerHTML = `
            In ${from}: ${amount} buys ${(amount / fromItems.coffee).toFixed(1)} coffees<br>
            In ${to}: ${result.toFixed(2)} buys ${(result / toItems.coffee).toFixed(1)} coffees
        `;
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
        const popular = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'ZAR'];
        const from = document.getElementById('moneyFrom').value;
        
        let html = '';
        popular.forEach(code => {
            if (this.rates[from] && this.rates[code]) {
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

    // ===== PRESETS =====
    setupPresets: function() {
        // Time presets
        document.querySelectorAll('[data-time]').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('timeInput').value = btn.dataset.time;
                this.updateTime();
            };
        });
        
        // Length presets
        document.querySelectorAll('[data-length]').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('lengthInput').value = btn.dataset.length;
                this.updateLength();
            };
        });
        
        // Weight presets
        document.querySelectorAll('[data-weight]').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('weightInput').value = btn.dataset.weight;
                this.updateWeight();
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
        if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return Math.round(n).toString();
    },

    formatDecimal: function(n) {
        if (n > 1e6 || n < 1e-6) return n.toExponential(4);
        return n.toFixed(6);
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
        document.getElementById('statusDot').style.background = 
            text.includes('Live') ? 'var(--success)' : 'var(--warning)';
    }
};

// Start app
app.init();
