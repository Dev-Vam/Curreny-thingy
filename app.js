// ===== Simple Mobile Converter =====
const app = {
    // API
    apiKey: '38b44d9fd2765204c0abd06e',
    apiUrl: 'https://v6.exchangerate-api.com/v6',
    
    // Time units (in seconds)
    timeUnits: {
        seconds: 1,
        minutes: 60,
        hours: 3600,
        days: 86400,
        weeks: 604800,
        months: 2592000,
        years: 31536000
    },
    
    // Currencies with flags
    currencies: {
        USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
        CAD: '🇨🇦', AUD: '🇦🇺', CNY: '🇨🇳', INR: '🇮🇳'
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
        this.fetchRates();
        
        // Set theme
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
    },

    // ===== LOAD SAVED DATA =====
    loadData: function() {
        // Load history
        const saved = localStorage.getItem('history');
        if (saved) this.history = JSON.parse(saved);
        
        // Load cached rates
        const cached = localStorage.getItem('rates');
        const timestamp = localStorage.getItem('ratesTime');
        
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
        
        // History
        document.getElementById('clearHistory').onclick = () => this.clearHistory();
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
        
        document.getElementById('timeOutput').value = result.toFixed(4);
        
        // Update comparisons
        this.updateComparisons(seconds);
        
        // Save to history
        this.addToHistory('time', `${input} ${from} → ${result.toFixed(2)} ${to}`);
    },

    updateComparisons: function(seconds) {
        // CPU cycles (3GHz)
        document.getElementById('cpuCycles').textContent = this.formatNumber(seconds * 3e9);
        
        // Heartbeats (72 bpm)
        document.getElementById('heartbeats').textContent = this.formatNumber(seconds * 72 / 60);
        
        // Movies (2 hours)
        document.getElementById('movies').textContent = (seconds / 7200).toFixed(2);
        
        // Lifespan (79 years)
        const lifespan = 79 * 365 * 24 * 3600;
        document.getElementById('lifespan').textContent = ((seconds / lifespan) * 100).toFixed(4) + '%';
    },

    formatNumber: function(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return Math.round(n).toString();
    },

    swapTime: function() {
        const from = document.getElementById('timeFrom');
        const to = document.getElementById('timeTo');
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
        this.updateTime();
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
                localStorage.setItem('rates', JSON.stringify(this.rates));
                localStorage.setItem('ratesTime', Date.now().toString());
                
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
            
            document.getElementById('moneyOutput').value = result.toFixed(2);
            
            // Update rate display
            const rate = this.rates[to] / this.rates[from];
            document.getElementById('exchangeRate').textContent = 
                `1 ${from} = ${rate.toFixed(4)} ${to}`;
            
            // Save to history
            this.addToHistory('money', `${input} ${from} → ${result.toFixed(2)} ${to}`);
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
        const popular = ['EUR', 'GBP', 'JPY', 'CAD'];
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

    // ===== HISTORY =====
    addToHistory: function(type, text) {
        this.history.unshift({
            type,
            text,
            time: new Date().toLocaleTimeString()
        });
        
        if (this.history.length > 20) this.history.pop();
        
        localStorage.setItem('history', JSON.stringify(this.history));
        this.updateHistory();
    },

    updateHistory: function() {
        const list = document.getElementById('historyList');
        
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
            html += `
                <div class="history-item">
                    <i class="fas fa-${item.type === 'time' ? 'clock' : 'coins'}"></i>
                    <div class="conversion">${item.text}</div>
                    <div class="time">${item.time}</div>
                </div>
            `;
        });
        
        list.innerHTML = html;
    },

    clearHistory: function() {
        this.history = [];
        localStorage.removeItem('history');
        this.updateHistory();
        this.showToast('History cleared');
    },

    // ===== UI HELPERS =====
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
