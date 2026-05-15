// ============================================
// ТРЁХПАРАМЕТРИЧЕСКИЙ АНАЛИЗАТОР ЗВУКА
// Центр масс | Спектральный поток | Громкость
// С нормализацией для сбалансированной визуализации
// ============================================

import './style.css';

// ============================================
// КОНСТАНТЫ НАСТРОЙКИ
// ============================================

// Коэффициенты нормализации (деление сырого значения на этот коэффициент даёт 0-1)
const NORMALIZATION = {
    CENTROID: 5000,     // Центр масс (Гц) — типичный максимум 5000 Гц
    FLUX: 1,            // Спектральный поток — типичный максимум 3
    RMS: 0.02            // Громкость (RMS) — типичный максимум 0.5
};

// Границы зелёной зоны (диапазон дрона) в СЫРЫХ значениях
const DRONE_ZONE = {
    CENTROID: { min: 200, max: 800 },     // Гц
    FLUX: { min: 0.2, max: 1.5 },         // относительные единицы
    RMS: { min: 0.03, max: 0.35 }         // относительные единицы
};

// Коэффициенты сглаживания (0-1, чем выше, тем плавнее)
const SMOOTHING = {
    CENTROID: 0.7,
    FLUX: 0.7,
    RMS: 0.7
};

// Параметры FFT
const FFT_CONFIG = {
    SIZE: 2048,
    SMOOTHING_TIME_CONSTANT: 0.5
};

// Параметры отчётов
const REPORT_CONFIG = {
    INTERVAL_MS: 3000,
    MAX_REPORTS: 100
};

// ============================================
// КЛАССИФИКАЦИЯ СОСТОЯНИЙ
// ============================================

const STATES = {
    IDLE: {
        name: 'Состояние покоя',
        icon: '😴',
        color: '#4a90e2',
        description: 'Тишина, фоновый шум отсутствует',
        expected: {
            centroid: { min: 0, max: 250 },
            flux: { min: 0, max: 0.15 },
            rms: { min: 0, max: 0.02 }
        },
        weights: { centroid: 0.3, flux: 0.4, rms: 0.3 }
    },
    WIND: {
        name: 'Сильный ветер',
        icon: '💨',
        color: '#a0c4ff',
        description: 'Низкочастотный шум, хаотичные флуктуации',
        expected: {
            centroid: { min: 250, max: 500 },
            flux: { min: 0.3, max: 1.2 },
            rms: { min: 0.05, max: 0.25 }
        },
        weights: { centroid: 0.2, flux: 0.5, rms: 0.3 }
    },
    PEOPLE: {
        name: 'Говорящие люди',
        icon: '🗣️',
        color: '#f5a623',
        description: 'Речь, средние частоты, переменная громкость',
        expected: {
            centroid: { min: 1250, max: 2500 },
            flux: { min: 0.4, max: 1.8 },
            rms: { min: 0.08, max: 0.4 }
        },
        weights: { centroid: 0.4, flux: 0.3, rms: 0.3 }
    },
    DRONE: {
        name: 'Дрон',
        icon: '🚁',
        color: '#ff6b6b',
        description: 'Стабильный гул, низкие частоты, постоянная громкость',
        expected: {
            centroid: { min: 500, max: 1250 },
            flux: { min: 0.2, max: 1.5 },
            rms: { min: 0.03, max: 0.35 }
        },
        weights: { centroid: 0.4, flux: 0.3, rms: 0.3 }
    }
};

const CONFIDENCE_THRESHOLD = {
    MIN_FOR_DETECTION: 0.6,
    HIGH_CONFIDENCE: 0.8
};

const STATE_HISTORY_CONFIG = {
    SIZE: 10,
    REQUIRED_CONSISTENCY: 0.7
};

// ============================================
// КЛАСС StateClassifier
// ============================================

class StateClassifier {
    constructor() {
        this.currentState = 'IDLE';
        this.stateConfidence = 0;
        this.stateHistory = [];
        this.allStatesConfidence = {
            IDLE: 0,
            WIND: 0,
            PEOPLE: 0,
            DRONE: 0
        };
        this.paramHistory = [];
        this.varHistory = [];
        this.stateTransitionCallbacks = [];
    }
    
    calculateParameterScore(value, min, max, tolerance) {
        if (value >= min && value <= max) return 1;
        if (value < min) return Math.max(0, 1 - ((min - value) / tolerance));
        return Math.max(0, 1 - ((value - max) / tolerance));
    }
    
    calculateStability(values, tolerance) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const maxDeviation = Math.max(...values.map(v => Math.abs(v - mean)));
        return Math.max(0, 1 - (maxDeviation / tolerance));
    }
    
    calculateCV(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        if (mean === 0) return 0;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance) / mean;
    }
    
    isStable(params) {
        this.paramHistory.push({
            centroid: params.centroid,
            flux: params.flux,
            rms: params.rms,
            timestamp: Date.now()
        });
        
        while (this.paramHistory.length > 20) this.paramHistory.shift();
        if (this.paramHistory.length < 10) return false;
        
        const centroids = this.paramHistory.map(p => p.centroid);
        const fluxs = this.paramHistory.map(p => p.flux);
        const rmss = this.paramHistory.map(p => p.rms);
        
        const centroidStability = this.calculateStability(centroids, 50);
        const fluxStability = this.calculateStability(fluxs, 0.2);
        const rmsStability = this.calculateStability(rmss, 0.05);
        
        return (centroidStability + fluxStability + rmsStability) / 3 > 0.7;
    }
    
    isVariable(params) {
        this.varHistory.push({
            centroid: params.centroid,
            flux: params.flux,
            timestamp: Date.now()
        });
        
        while (this.varHistory.length > 30) this.varHistory.shift();
        if (this.varHistory.length < 15) return false;
        
        const centroids = this.varHistory.map(p => p.centroid);
        const fluxs = this.varHistory.map(p => p.flux);
        
        const cvCentroid = this.calculateCV(centroids);
        const cvFlux = this.calculateCV(fluxs);
        
        return cvCentroid > 0.3 || cvFlux > 0.4;
    }
    
    calculateStateConfidence(params, stateKey) {
        const state = STATES[stateKey];
        if (!state) return 0;
        
        const centroidScore = this.calculateParameterScore(
            params.centroid, state.expected.centroid.min, state.expected.centroid.max, 200
        );
        const fluxScore = this.calculateParameterScore(
            params.flux, state.expected.flux.min, state.expected.flux.max, 0.5
        );
        const rmsScore = this.calculateParameterScore(
            params.rms, state.expected.rms.min, state.expected.rms.max, 0.1
        );
        
        let confidence = (centroidScore * state.weights.centroid) +
                        (fluxScore * state.weights.flux) +
                        (rmsScore * state.weights.rms);
        
        if (stateKey === 'WIND' && params.flux > 0.8 && params.rms > 0.1) confidence += 0.15;
        if (stateKey === 'DRONE' && this.isStable(params)) confidence += 0.2;
        if (stateKey === 'PEOPLE' && this.isVariable(params)) confidence += 0.15;
        
        return Math.min(1, confidence);
    }
    
    classify(params) {
        const confidences = {};
        let maxConfidence = 0;
        let probableState = 'IDLE';
        
        for (const stateKey of Object.keys(STATES)) {
            const confidence = this.calculateStateConfidence(params, stateKey);
            confidences[stateKey] = confidence;
            this.allStatesConfidence[stateKey] = confidence;
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                probableState = stateKey;
            }
        }
        
        this.stateConfidence = maxConfidence;
        this.stateHistory.push(probableState);
        while (this.stateHistory.length > STATE_HISTORY_CONFIG.SIZE) this.stateHistory.shift();
        
        const stateCounts = {};
        for (const state of this.stateHistory) stateCounts[state] = (stateCounts[state] || 0) + 1;
        
        let consensusState = 'IDLE';
        let maxCount = 0;
        for (const [state, count] of Object.entries(stateCounts)) {
            if (count > maxCount) {
                maxCount = count;
                consensusState = state;
            }
        }
        
        const consistency = maxCount / this.stateHistory.length;
        
        if (maxConfidence >= CONFIDENCE_THRESHOLD.MIN_FOR_DETECTION && 
            consistency >= STATE_HISTORY_CONFIG.REQUIRED_CONSISTENCY) {
            if (consensusState !== this.currentState) {
                this.currentState = consensusState;
                this.notifyStateChange();
            }
        }
        
        return {
            state: this.currentState,
            confidence: this.stateConfidence,
            details: confidences,
            isHighConfidence: maxConfidence >= CONFIDENCE_THRESHOLD.HIGH_CONFIDENCE
        };
    }
    
    getCurrentStateInfo() {
        return {
            ...STATES[this.currentState],
            confidence: this.stateConfidence,
            allConfidences: this.allStatesConfidence
        };
    }
    
    onStateChange(callback) {
        this.stateTransitionCallbacks.push(callback);
    }
    
    notifyStateChange() {
        this.stateTransitionCallbacks.forEach(callback => callback(this.getCurrentStateInfo()));
    }
    
    getRecommendations() {
        const recommendations = {
            IDLE: '🔇 Нет активных звуков. Можно начинать мониторинг.',
            WIND: '💨 Обнаружен сильный ветер. Учитывайте при анализе.',
            PEOPLE: '🗣️ Слышны голоса. Возможны помехи для детекции дрона.',
            DRONE: '🚨 ВНИМАНИЕ! Обнаружен дрон! Проверьте визуально.'
        };
        return recommendations[this.currentState];
    }
}

// ============================================
// ОСНОВНОЙ КЛАСС ThreeParamAnalyzer
// ============================================

class ThreeParamAnalyzer {
    constructor() {
        // Аудио компоненты
        this.audioContext = null;
        this.sourceNode = null;
        this.analyserNode = null;
        this.stream = null;
        this.currentDeviceId = null;
        
        // Состояние
        this.isRunning = false;
        this.intervalId = null;
        
        // Данные
        this.reports = [];
        this.currentParams = { centroid: 0, flux: 0, rms: 0 };
        this.normalizedParams = { centroid: 0, flux: 0, rms: 0 };
        this.previousSpectrum = null;
        this.fluxHistory = new Array(200).fill(0);
        
        // Параметры FFT
        this.FFT_SIZE = FFT_CONFIG.SIZE;
        
        // Классификатор состояний
        this.stateClassifier = new StateClassifier();
        
        // Показатели качества звука
        this.qualityMetrics = {
            snr: 0,
            clarity: 0,
            dynamics: 0,
            peakLevel: 0,
            rmsHistory: [],
            noiseFloor: 0.01
        };
        
        // Справочная информация для модального окна
        this.paramsHelp = {
            centroid: {
                name: 'Центр масс',
                description: 'Средневзвешенная частота спектра. Показывает, где сосредоточена основная энергия сигнала.',
                droneRange: `${DRONE_ZONE.CENTROID.min}-${DRONE_ZONE.CENTROID.max} Гц`,
                unit: 'Гц',
                icon: '🎯',
                color: '#ff6b6b',
                divisor: NORMALIZATION.CENTROID
            },
            flux: {
                name: 'Спектральный поток',
                description: 'Скорость изменения спектра между последовательными кадрами. Характеризует резкость и импульсность звука.',
                droneRange: `${DRONE_ZONE.FLUX.min}-${DRONE_ZONE.FLUX.max}`,
                unit: 'отн.',
                icon: '🌊',
                color: '#4d96ff',
                divisor: NORMALIZATION.FLUX
            },
            rms: {
                name: 'Громкость (RMS)',
                description: 'Среднеквадратичная амплитуда сигнала. Отражает общую энергию звука.',
                droneRange: `${DRONE_ZONE.RMS.min}-${DRONE_ZONE.RMS.max}`,
                unit: 'отн.',
                icon: '🔊',
                color: '#6bcb77',
                divisor: NORMALIZATION.RMS
            }
        };
        
        // Инициализация
        this.init();
    }
    
    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================
    
    init() {
        this.initUI();
        this.bindEvents();
        this.initCanvas();
        this.initHelpModal();
        this.initDeviceControls();
        this.updateDroneZoneIndicators();
        
        // Подписка на смену состояния
        this.stateClassifier.onStateChange((stateInfo) => {
            this.showStateNotification(stateInfo);
        });
    }
    
    initUI() {
        // Обновляем подзаголовок
        const subtitle = document.getElementById('subtitle');
        if (subtitle) {
            subtitle.innerHTML = `Центр масс (÷${NORMALIZATION.CENTROID}) | Спектральный поток (÷${NORMALIZATION.FLUX}) | Громкость (÷${NORMALIZATION.RMS}) — визуализация в реальном времени`;
        }
        
        // Кэшируем элементы
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearReportsBtn = document.getElementById('clearReportsBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.statusLed = document.getElementById('statusLed');
        this.statusText = document.getElementById('statusText');
        this.sampleRateSpan = document.getElementById('sampleRate');
        this.reportCountSpan = document.getElementById('reportCount');
        this.reportCountBadge = document.getElementById('reportCountBadge');
        this.reportsList = document.getElementById('reportsList');
        
        this.centroidValueSpan = document.getElementById('centroidValue');
        this.fluxValueSpan = document.getElementById('fluxValue');
        this.rmsValueSpan = document.getElementById('rmsValue');
        this.centroidBar = document.getElementById('centroidBar');
        this.fluxBar = document.getElementById('fluxBar');
        this.rmsBar = document.getElementById('rmsBar');
        this.centroidNormSpan = document.getElementById('centroidNorm');
        this.fluxNormSpan = document.getElementById('fluxNorm');
        this.rmsNormSpan = document.getElementById('rmsNorm');
        this.centroidWarningSpan = document.getElementById('centroidWarning');
        this.fluxWarningSpan = document.getElementById('fluxWarning');
        this.rmsWarningSpan = document.getElementById('rmsWarning');
        this.droneResultSpan = document.getElementById('droneResult');
        this.droneConfidenceFill = document.querySelector('.confidence-fill');
        
        this.centroidRawSpan = document.getElementById('centroidRaw');
        this.fluxRawSpan = document.getElementById('fluxRaw');
        this.rmsRawSpan = document.getElementById('rmsRaw');
        
        // Кнопки режимов визуализации
        this.vizModeRadar = document.getElementById('vizModeRadar');
        this.vizModeGauge = document.getElementById('vizModeGauge');
        this.vizModeTriangle = document.getElementById('vizModeTriangle');
        
        // Интервал отчётов
        const intervalSpan = document.getElementById('interval');
        if (intervalSpan) intervalSpan.textContent = REPORT_CONFIG.INTERVAL_MS;
    }
    
    bindEvents() {
        if (this.startBtn) this.startBtn.onclick = () => this.start();
        if (this.stopBtn) this.stopBtn.onclick = () => this.stop();
        if (this.clearReportsBtn) this.clearReportsBtn.onclick = () => this.clearReports();
    }
    
    initCanvas() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.ctx = this.mainCanvas.getContext('2d');
        this.fluxCanvas = document.getElementById('fluxCanvas');
        this.fluxCtx = this.fluxCanvas.getContext('2d');
        
        const resizeCanvas = () => {
            const container = this.mainCanvas.parentElement;
            const width = Math.min(container.clientWidth - 40, 800);
            this.mainCanvas.width = width;
            this.mainCanvas.height = 400;
            this.fluxCanvas.width = width;
            this.fluxCanvas.height = 100;
        };
        
        resizeCanvas();
        window.addEventListener('resize', () => resizeCanvas());
        
        this.vizMode = 'radar';
        if (this.vizModeRadar) {
            this.vizModeRadar.onclick = () => { this.vizMode = 'radar'; this.updateModeButtons(); };
            this.vizModeGauge.onclick = () => { this.vizMode = 'gauge'; this.updateModeButtons(); };
            this.vizModeTriangle.onclick = () => { this.vizMode = 'triangle'; this.updateModeButtons(); };
        }
        
        this.startVisualization();
    }
    
    updateModeButtons() {
        if (this.vizModeRadar) {
            this.vizModeRadar.classList.toggle('active', this.vizMode === 'radar');
            this.vizModeGauge.classList.toggle('active', this.vizMode === 'gauge');
            this.vizModeTriangle.classList.toggle('active', this.vizMode === 'triangle');
        }
    }
    
    startVisualization() {
        const animate = () => {
            this.drawVisualization();
            this.drawFluxHistory();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }
    
    initHelpModal() {
        const modal = document.getElementById('helpModal');
        const closeBtn = modal?.querySelector('.modal-close');
        const helpGrid = document.getElementById('helpGrid');
        const helpNormList = document.getElementById('helpNormalizationList');
        
        if (helpNormList) {
            helpNormList.innerHTML = `
                <li>🎯 Центр масс: <strong>÷ ${NORMALIZATION.CENTROID}</strong> (типичный диапазон 0-${NORMALIZATION.CENTROID} Гц)</li>
                <li>🌊 Спектральный поток: <strong>÷ ${NORMALIZATION.FLUX}</strong> (типичный диапазон 0-${NORMALIZATION.FLUX})</li>
                <li>🔊 Громкость: <strong>÷ ${NORMALIZATION.RMS}</strong> (типичный диапазон 0-${NORMALIZATION.RMS})</li>
            `;
        }
        
        if (helpGrid) {
            helpGrid.innerHTML = Object.entries(this.paramsHelp).map(([key, data]) => `
                <div class="help-card">
                    <div class="help-card-header">
                        <span class="help-card-icon">${data.icon}</span>
                        <span class="help-card-index">${data.name}</span>
                    </div>
                    <div class="help-card-desc">${data.description}</div>
                    <div class="help-card-detail" style="border-left-color: ${data.color}">
                        <strong>🚁 Для дрона:</strong> ${data.droneRange} ${data.unit}
                    </div>
                    <div class="help-card-detail">
                        <strong>📊 Нормализация:</strong> ÷ ${data.divisor} → 0-1
                    </div>
                </div>
            `).join('');
        }
        
        if (this.helpBtn) this.helpBtn.onclick = () => modal.style.display = 'flex';
        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }
    
    initDeviceControls() {
        const refreshBtn = document.getElementById('refreshDevicesBtn');
        const applyBtn = document.getElementById('applyDeviceBtn');
        const deviceSelect = document.getElementById('audioSource');
        
        if (refreshBtn) refreshBtn.onclick = () => this.enumerateAudioDevices();
        if (applyBtn && deviceSelect) applyBtn.onclick = () => this.applyDevice(deviceSelect.value);
        
        this.enumerateAudioDevices();
        
        if (navigator.mediaDevices) {
            navigator.mediaDevices.addEventListener('devicechange', () => this.enumerateAudioDevices());
        }
    }
    
    updateDroneZoneIndicators() {
        const centroidZoneStart = (DRONE_ZONE.CENTROID.min / NORMALIZATION.CENTROID) * 100;
        const centroidZoneEnd = (DRONE_ZONE.CENTROID.max / NORMALIZATION.CENTROID) * 100;
        const fluxZoneStart = (DRONE_ZONE.FLUX.min / NORMALIZATION.FLUX) * 100;
        const fluxZoneEnd = (DRONE_ZONE.FLUX.max / NORMALIZATION.FLUX) * 100;
        const rmsZoneStart = (DRONE_ZONE.RMS.min / NORMALIZATION.RMS) * 100;
        const rmsZoneEnd = (DRONE_ZONE.RMS.max / NORMALIZATION.RMS) * 100;
        
        const centroidZone = document.getElementById('centroidZone');
        const fluxZone = document.getElementById('fluxZone');
        const rmsZone = document.getElementById('rmsZone');
        
        if (centroidZone) {
            centroidZone.style.left = `${centroidZoneStart}%`;
            centroidZone.style.width = `${centroidZoneEnd - centroidZoneStart}%`;
        }
        if (fluxZone) {
            fluxZone.style.left = `${fluxZoneStart}%`;
            fluxZone.style.width = `${fluxZoneEnd - fluxZoneStart}%`;
        }
        if (rmsZone) {
            rmsZone.style.left = `${rmsZoneStart}%`;
            rmsZone.style.width = `${rmsZoneEnd - rmsZoneStart}%`;
        }
    }
    
    // ============================================
    // УПРАВЛЕНИЕ АУДИОУСТРОЙСТВАМИ
    // ============================================
    
    async enumerateAudioDevices() {
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            const deviceSelect = document.getElementById('audioSource');
            if (deviceSelect) {
                deviceSelect.innerHTML = '<option value="">-- Выберите устройство --</option>';
                audioInputs.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Микрофон ${index + 1}`;
                    if (this.currentDeviceId === device.deviceId) option.selected = true;
                    deviceSelect.appendChild(option);
                });
                deviceSelect.disabled = false;
            }
            
            const applyBtn = document.getElementById('applyDeviceBtn');
            if (applyBtn) applyBtn.disabled = false;
            
            console.log(`[Devices] Найдено ${audioInputs.length} устройств`);
        } catch (error) {
            console.error('[Devices] Ошибка:', error);
        }
    }
    
    async applyDevice(deviceId) {
        if (!deviceId) return;
        
        const wasRunning = this.isRunning;
        if (wasRunning) await this.stop();
        
        this.currentDeviceId = deviceId;
        
        try {
            const constraints = {
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const selectedDevice = (await navigator.mediaDevices.enumerateDevices())
                .find(d => d.deviceId === deviceId);
            const deviceName = selectedDevice?.label || 'Неизвестное устройство';
            
            const activeDeviceSpan = document.getElementById('activeDeviceName');
            if (activeDeviceSpan) activeDeviceSpan.textContent = deviceName;
            
            if (wasRunning) {
                await this.startWithStream(stream);
            } else {
                this.stream = stream;
            }
            
            console.log(`[Devices] Применено устройство: ${deviceName}`);
            this.showNotification(`Переключено на: ${deviceName}`, 'info');
        } catch (error) {
            console.error('[Devices] Ошибка:', error);
            this.showNotification('Ошибка подключения к микрофону', 'error');
        }
    }
    
    // ============================================
    // ОСНОВНЫЕ МЕТОДЫ
    // ============================================
    
    async start() {
        if (this.isRunning) return;
        
        try {
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            };
            
            if (this.currentDeviceId) constraints.audio.deviceId = { exact: this.currentDeviceId };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            await this.startWithStream(this.stream);
            
            // Обновляем информацию об активном устройстве
            const devices = await navigator.mediaDevices.enumerateDevices();
            const activeDevice = devices.find(d => d.deviceId === this.stream.getAudioTracks()[0]?.getSettings().deviceId);
            const activeDeviceSpan = document.getElementById('activeDeviceName');
            if (activeDeviceSpan && activeDevice) {
                activeDeviceSpan.textContent = activeDevice.label || 'Активное устройство';
            }
            
            console.log('[Analyzer] Запущен');
        } catch (error) {
            console.error(error);
            if (this.statusText) this.statusText.textContent = '❌ Ошибка доступа к микрофону';
            this.showNotification('Ошибка доступа к микрофону', 'error');
        }
    }
    
    async startWithStream(stream) {
        if (this.audioContext) await this.audioContext.close();
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = this.FFT_SIZE;
        this.analyserNode.smoothingTimeConstant = FFT_CONFIG.SMOOTHING_TIME_CONSTANT;
        
        this.sourceNode.connect(this.analyserNode);
        await this.audioContext.resume();
        
        if (this.sampleRateSpan) this.sampleRateSpan.textContent = this.audioContext.sampleRate;
        
        this.isRunning = true;
        this.updateUI();
        
        this.startAnalysisLoop();
        this.startReporting();
    }
    
    startAnalysisLoop() {
        const frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
        const timeData = new Uint8Array(this.analyserNode.fftSize);
        
        const analyze = () => {
            if (!this.isRunning) return;
            
            this.analyserNode.getByteFrequencyData(frequencyData);
            this.analyserNode.getByteTimeDomainData(timeData);
            
            const sampleRate = this.audioContext.sampleRate;
            const centroid = this.computeSpectralCentroid(frequencyData, sampleRate);
            const rms = this.computeRMS(timeData);
            const flux = this.computeSpectralFlux(frequencyData);
            
            this.currentParams.centroid = this.currentParams.centroid * SMOOTHING.CENTROID + centroid * (1 - SMOOTHING.CENTROID);
            this.currentParams.rms = this.currentParams.rms * SMOOTHING.RMS + rms * (1 - SMOOTHING.RMS);
            this.currentParams.flux = this.currentParams.flux * SMOOTHING.FLUX + flux * (1 - SMOOTHING.FLUX);
            
            this.updateNormalizedParams();
            
            this.fluxHistory.push(this.normalizedParams.flux);
            if (this.fluxHistory.length > 200) this.fluxHistory.shift();
            
            this.updateParamDisplay();
            this.updateDroneIndicator();
            this.updateStateDisplay();
            this.updateSoundQuality();
            
            requestAnimationFrame(analyze);
        };
        
        analyze();
    }
    
    computeSpectralCentroid(frequencyData, sampleRate) {
        let weightedSum = 0;
        let totalEnergy = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const freq = (i * sampleRate) / this.FFT_SIZE;
            weightedSum += freq * frequencyData[i];
            totalEnergy += frequencyData[i];
        }
        
        return totalEnergy > 0 ? weightedSum / totalEnergy : 0;
    }
    
    computeRMS(timeData) {
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
            const sample = (timeData[i] - 128) / 128;
            sum += sample * sample;
        }
        return Math.sqrt(sum / timeData.length);
    }
    
    computeSpectralFlux(frequencyData) {
        if (!this.previousSpectrum) {
            this.previousSpectrum = new Uint8Array(frequencyData);
            return 0;
        }
        
        let flux = 0;
        for (let i = 0; i < frequencyData.length; i++) {
            const diff = frequencyData[i] - this.previousSpectrum[i];
            flux += diff * diff;
        }
        
        flux = Math.sqrt(flux / frequencyData.length) / 10;
        this.previousSpectrum = new Uint8Array(frequencyData);
        
        return Math.min(NORMALIZATION.FLUX, flux);
    }
    
    updateNormalizedParams() {
        this.normalizedParams.centroid = this.currentParams.centroid / NORMALIZATION.CENTROID;
        this.normalizedParams.flux = this.currentParams.flux / NORMALIZATION.FLUX;
        this.normalizedParams.rms = this.currentParams.rms / NORMALIZATION.RMS;
    }
    
    isInDroneZone(value, paramType) {
        const zone = DRONE_ZONE[paramType];
        return value >= zone.min && value <= zone.max;
    }
    
    isDroneDetected() {
        return this.isInDroneZone(this.currentParams.centroid, 'CENTROID') &&
               this.isInDroneZone(this.currentParams.flux, 'FLUX') &&
               this.isInDroneZone(this.currentParams.rms, 'RMS');
    }
    
    calculateConfidence() {
        let score = 0;
        if (this.isInDroneZone(this.currentParams.centroid, 'CENTROID')) score += 0.4;
        if (this.isInDroneZone(this.currentParams.flux, 'FLUX')) score += 0.3;
        if (this.isInDroneZone(this.currentParams.rms, 'RMS')) score += 0.3;
        return Math.min(1, score);
    }
    
    // ============================================
    // ОБНОВЛЕНИЕ UI
    // ============================================
    
    updateParamDisplay() {
        // Сырые значения
        if (this.centroidValueSpan) this.centroidValueSpan.textContent = Math.round(this.currentParams.centroid);
        if (this.fluxValueSpan) this.fluxValueSpan.textContent = this.currentParams.flux.toFixed(3);
        if (this.rmsValueSpan) this.rmsValueSpan.textContent = this.currentParams.rms.toFixed(4);
        
        if (this.centroidRawSpan) this.centroidRawSpan.textContent = Math.round(this.currentParams.centroid);
        if (this.fluxRawSpan) this.fluxRawSpan.textContent = this.currentParams.flux.toFixed(3);
        if (this.rmsRawSpan) this.rmsRawSpan.textContent = this.currentParams.rms.toFixed(4);
        
        // Проценты нормализации
        const centroidPercent = Math.min(100, (this.currentParams.centroid / NORMALIZATION.CENTROID) * 100);
        const fluxPercent = Math.min(100, (this.currentParams.flux / NORMALIZATION.FLUX) * 100);
        const rmsPercent = Math.min(100, (this.currentParams.rms / NORMALIZATION.RMS) * 100);
        
        if (this.centroidNormSpan) this.centroidNormSpan.textContent = `${centroidPercent.toFixed(1)}%`;
        if (this.fluxNormSpan) this.fluxNormSpan.textContent = `${fluxPercent.toFixed(1)}%`;
        if (this.rmsNormSpan) this.rmsNormSpan.textContent = `${rmsPercent.toFixed(1)}%`;
        
        // Предупреждения
        if (this.centroidWarningSpan) {
            this.centroidWarningSpan.textContent = this.currentParams.centroid > NORMALIZATION.CENTROID ? `⚠️ >${NORMALIZATION.CENTROID}Гц` : '';
        }
        if (this.fluxWarningSpan) {
            this.fluxWarningSpan.textContent = this.currentParams.flux > NORMALIZATION.FLUX ? `⚠️ >${NORMALIZATION.FLUX}` : '';
        }
        if (this.rmsWarningSpan) {
            this.rmsWarningSpan.textContent = this.currentParams.rms > NORMALIZATION.RMS ? `⚠️ >${NORMALIZATION.RMS}` : '';
        }
        
        // Прогресс-бары
        if (this.centroidBar) {
            this.centroidBar.style.width = `${centroidPercent}%`;
            this.centroidBar.style.background = this.currentParams.centroid > NORMALIZATION.CENTROID ? '#ff0000' : 
                (this.isInDroneZone(this.currentParams.centroid, 'CENTROID') ? '#6bcb77' : '#ff6b6b');
        }
        if (this.fluxBar) {
            this.fluxBar.style.width = `${fluxPercent}%`;
            this.fluxBar.style.background = this.currentParams.flux > NORMALIZATION.FLUX ? '#ff0000' : 
                (this.isInDroneZone(this.currentParams.flux, 'FLUX') ? '#6bcb77' : '#4d96ff');
        }
        if (this.rmsBar) {
            this.rmsBar.style.width = `${rmsPercent}%`;
            this.rmsBar.style.background = this.currentParams.rms > NORMALIZATION.RMS ? '#ff0000' : 
                (this.isInDroneZone(this.currentParams.rms, 'RMS') ? '#6bcb77' : '#ffa64d');
        }
    }
    
    updateDroneIndicator() {
        const isDrone = this.isDroneDetected();
        const confidence = this.calculateConfidence() * 100;
        
        if (this.droneConfidenceFill) this.droneConfidenceFill.style.width = `${confidence}%`;
        
        if (this.droneResultSpan) {
            if (isDrone) {
                this.droneResultSpan.textContent = '🚁 ДРОН ОБНАРУЖЕН';
                this.droneResultSpan.style.color = '#ff6b6b';
                if (this.droneConfidenceFill) this.droneConfidenceFill.style.background = '#6bcb77';
            } else {
                this.droneResultSpan.textContent = '✅ НЕТ ДРОНА';
                this.droneResultSpan.style.color = '#6bcb77';
                if (this.droneConfidenceFill) this.droneConfidenceFill.style.background = '#ff6b6b';
            }
        }
    }
    
    updateStateDisplay() {
        this.stateClassifier.classify(this.currentParams);
        const stateInfo = this.stateClassifier.getCurrentStateInfo();
        const recommendations = this.stateClassifier.getRecommendations();
        
        const currentStateDiv = document.getElementById('currentState');
        if (currentStateDiv) {
            currentStateDiv.innerHTML = `
                <div class="state-card" style="border-left: 4px solid ${stateInfo.color}">
                    <div class="state-header">
                        <span class="state-icon">${stateInfo.icon}</span>
                        <span class="state-name">${stateInfo.name}</span>
                        <span class="state-confidence">${Math.round(stateInfo.confidence * 100)}%</span>
                    </div>
                    <div class="state-description">${stateInfo.description}</div>
                    <div class="state-recommendation">${recommendations}</div>
                    <div class="state-details">
                        ${Object.entries(stateInfo.allConfidences).map(([key, val]) => `
                            <div class="state-detail-item">
                                <span>${STATES[key].icon}</span>
                                <span>${STATES[key].name}</span>
                                <div class="confidence-bar">
                                    <div style="width: ${val * 100}%; background: ${STATES[key].color}"></div>
                                </div>
                                <span>${Math.round(val * 100)}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    showStateNotification(stateInfo) {
        const notification = document.createElement('div');
        notification.className = 'state-notification';
        notification.style.cssText = `
            background: ${stateInfo.color}20;
            backdrop-filter: blur(10px);
            border: 1px solid ${stateInfo.color};
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            animation: slideIn 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">${stateInfo.icon}</span>
                <div style="flex: 1;">
                    <strong style="color: ${stateInfo.color};">${stateInfo.name}</strong>
                    <div style="font-size: 11px; opacity: 0.8;">${stateInfo.description}</div>
                </div>
                <span style="font-size: 12px; background: ${stateInfo.color}20; padding: 2px 6px; border-radius: 12px;">
                    ${Math.round(stateInfo.confidence * 100)}%
                </span>
            </div>
        `;
        
        const container = document.getElementById('stateNotifications');
        if (container) {
            container.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }
    }
    
    // ============================================
    // КАЧЕСТВО ЗВУКА
    // ============================================
    
    updateSoundQuality() {
        this.qualityMetrics.rmsHistory.push(this.currentParams.rms);
        while (this.qualityMetrics.rmsHistory.length > 100) this.qualityMetrics.rmsHistory.shift();
        
        // SNR
        const signalRMS = this.currentParams.rms;
        const noiseEstimate = this.estimateNoiseFloor();
        const snr = signalRMS > 0 ? 20 * Math.log10(signalRMS / noiseEstimate) : 0;
        this.qualityMetrics.snr = Math.min(60, Math.max(0, snr));
        
        // Clarity
        this.qualityMetrics.clarity = this.calculateClarity();
        
        // Dynamics
        this.qualityMetrics.dynamics = this.calculateDynamics();
        
        // Peak level
        this.qualityMetrics.peakLevel = this.calculatePeakLevel();
        
        this.updateQualityUI();
    }
    
    estimateNoiseFloor() {
        if (this.qualityMetrics.rmsHistory.length < 20) return 0.01;
        const sorted = [...this.qualityMetrics.rmsHistory].sort((a, b) => a - b);
        const bottom10 = sorted.slice(0, Math.floor(sorted.length * 0.1));
        return Math.max(0.005, bottom10.reduce((a, b) => a + b, 0) / bottom10.length);
    }
    
    calculateClarity() {
        let score = 0;
        if (this.currentParams.centroid >= 300 && this.currentParams.centroid <= 2000) score += 0.5;
        else if (this.currentParams.centroid < 300) score += 0.2;
        else score += 0.3;
        
        if (this.currentParams.flux >= 0.3 && this.currentParams.flux <= 1.5) score += 0.5;
        else if (this.currentParams.flux < 0.3) score += 0.3;
        else score += 0.2;
        
        return score * 100;
    }
    
    calculateDynamics() {
        if (this.qualityMetrics.rmsHistory.length < 20) return 50;
        const maxRMS = Math.max(...this.qualityMetrics.rmsHistory);
        const minRMS = Math.min(...this.qualityMetrics.rmsHistory);
        if (maxRMS === 0) return 0;
        const dynamicRange = 20 * Math.log10(maxRMS / minRMS);
        return Math.min(100, Math.max(0, (dynamicRange / 40) * 100));
    }
    
    calculatePeakLevel() {
        const peak = Math.max(...this.qualityMetrics.rmsHistory.slice(-50));
        const maxPossible = NORMALIZATION.RMS;
        if (peak === 0) return -60;
        const peakDB = 20 * Math.log10(peak / maxPossible);
        return Math.max(-60, Math.min(0, peakDB));
    }
    
    calculateOverallQuality() {
        const snrScore = Math.min(100, (this.qualityMetrics.snr / 40) * 100);
        return Math.min(100, Math.max(0,
            snrScore * 0.3 +
            this.qualityMetrics.clarity * 0.3 +
            this.qualityMetrics.dynamics * 0.2 +
            (this.currentParams.rms > NORMALIZATION.RMS ? 0 : 100) * 0.2
        ));
    }
    
    updateQualityUI() {
        const overallQuality = this.calculateOverallQuality();
        
        const qualityFill = document.getElementById('qualityFill');
        if (qualityFill) {
            qualityFill.style.width = `${overallQuality}%`;
            let color;
            if (overallQuality >= 80) color = '#00ff00';
            else if (overallQuality >= 60) color = '#88ff00';
            else if (overallQuality >= 40) color = '#ffcc00';
            else if (overallQuality >= 20) color = '#ff6600';
            else color = '#ff0000';
            qualityFill.style.background = color;
        }
        
        const qualityBadge = document.getElementById('qualityBadge');
        if (qualityBadge) {
            let text, cls;
            if (overallQuality >= 80) { text = '🌟 Отличное'; cls = 'excellent'; }
            else if (overallQuality >= 60) { text = '👍 Хорошее'; cls = 'good'; }
            else if (overallQuality >= 40) { text = '⚠️ Удовлетворительное'; cls = 'fair'; }
            else if (overallQuality >= 20) { text = '🔴 Плохое'; cls = 'poor'; }
            else { text = '💀 Очень плохое'; cls = 'bad'; }
            qualityBadge.textContent = text;
            qualityBadge.className = `quality-badge ${cls}`;
        }
        
        const snrSpan = document.getElementById('snrValue');
        if (snrSpan) snrSpan.textContent = `${this.qualityMetrics.snr.toFixed(1)} dB`;
        
        const claritySpan = document.getElementById('clarityValue');
        if (claritySpan) claritySpan.textContent = `${this.qualityMetrics.clarity.toFixed(1)}%`;
        
        const dynamicsSpan = document.getElementById('dynamicsValue');
        if (dynamicsSpan) dynamicsSpan.textContent = `${this.qualityMetrics.dynamics.toFixed(1)}%`;
        
        const peakSpan = document.getElementById('peakValue');
        if (peakSpan) peakSpan.textContent = `${this.qualityMetrics.peakLevel.toFixed(1)} dB`;
        
        const qualityMessage = document.getElementById('qualityMessage');
        if (qualityMessage) {
            let msg = '';
            if (this.currentParams.rms > NORMALIZATION.RMS) {
                msg = '⚠️ ВНИМАНИЕ: Уровень сигнала слишком высокий! Уменьшите громкость.';
            } else if (this.qualityMetrics.snr < 15) {
                msg = '⚠️ Низкое отношение сигнал/шум. Возможны помехи.';
            } else if (this.qualityMetrics.clarity < 40) {
                msg = 'ℹ️ Низкая чёткость звука. Проверьте положение микрофона.';
            } else if (overallQuality >= 80) {
                msg = '✅ Отличное качество звука!';
            } else if (overallQuality >= 60) {
                msg = '👍 Хорошее качество звука для анализа.';
            } else if (overallQuality >= 40) {
                msg = '⚡ Удовлетворительное качество. Возможны погрешности.';
            } else {
                msg = '🔴 Плохое качество звука. Проверьте микрофон и обстановку.';
            }
            qualityMessage.textContent = msg;
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff0000' : '#0f0'}20;
            backdrop-filter: blur(10px);
            border: 1px solid ${type === 'error' ? '#ff0000' : '#0f0'};
            color: ${type === 'error' ? '#ff0000' : '#0f0'};
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 2000;
            animation: slideIn 0.3s ease;
            font-size: 0.85rem;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    // ============================================
    // ОТЧЁТЫ
    // ============================================
    
    startReporting() {
        this.intervalId = setInterval(() => {
            if (this.isRunning) this.generateReport();
        }, REPORT_CONFIG.INTERVAL_MS);
    }
    
    generateReport() {
        const report = {
            id: Date.now(),
            timestamp: new Date(),
            centroid: this.currentParams.centroid,
            flux: this.currentParams.flux,
            rms: this.currentParams.rms,
            centroidNorm: this.normalizedParams.centroid,
            fluxNorm: this.normalizedParams.flux,
            rmsNorm: this.normalizedParams.rms,
            isDrone: this.isDroneDetected(),
            detectedState: this.stateClassifier.getCurrentStateInfo()
        };
        
        this.reports.unshift(report);
        while (this.reports.length > REPORT_CONFIG.MAX_REPORTS) this.reports.pop();
        this.updateReportsUI();
    }
    
    updateReportsUI() {
        const count = this.reports.length;
        if (this.reportCountSpan) this.reportCountSpan.textContent = count;
        if (this.reportCountBadge) this.reportCountBadge.textContent = count;
        
        if (!this.reportsList) return;
        
        if (count === 0) {
            this.reportsList.innerHTML = '<div class="empty-state">▶ Нажмите СТАРТ, чтобы начать анализ</div>';
            return;
        }
        
        this.reportsList.innerHTML = this.reports.map(report => `
            <div class="report-item" style="${report.isDrone ? 'border-left-color: #f00; background: #1a0a0a;' : ''}">
                <div class="report-header">
                    <div>
                        <span class="report-time">🕐 ${report.timestamp.toLocaleTimeString('ru-RU')}</span>
                        ${report.isDrone ? '<span class="drone-badge">🚁 ДРОН</span>' : ''}
                        ${report.detectedState ? `<span class="drone-badge" style="background: ${report.detectedState.color};">${report.detectedState.icon} ${report.detectedState.name}</span>` : ''}
                    </div>
                </div>
                <div class="three-params">
                    <div class="param-row">
                        <span class="param-icon">🎯</span> 
                        Центр масс: <strong>${Math.round(report.centroid)} Гц</strong>
                        <span class="norm-info">норм: ${Math.round(report.centroidNorm * 100)}%</span>
                        ${report.centroid >= DRONE_ZONE.CENTROID.min && report.centroid <= DRONE_ZONE.CENTROID.max ? '✅' : '❌'}
                    </div>
                    <div class="param-row">
                        <span class="param-icon">🌊</span> 
                        Поток: <strong>${report.flux.toFixed(3)}</strong>
                        <span class="norm-info">норм: ${Math.round(report.fluxNorm * 100)}%</span>
                        ${report.flux >= DRONE_ZONE.FLUX.min && report.flux <= DRONE_ZONE.FLUX.max ? '✅' : '❌'}
                    </div>
                    <div class="param-row">
                        <span class="param-icon">🔊</span> 
                        Громкость: <strong>${report.rms.toFixed(4)}</strong>
                        <span class="norm-info">норм: ${Math.round(report.rmsNorm * 100)}%</span>
                        ${report.rms >= DRONE_ZONE.RMS.min && report.rms <= DRONE_ZONE.RMS.max ? '✅' : '❌'}
                    </div>
                </div>
                ${report.centroid > NORMALIZATION.CENTROID || report.flux > NORMALIZATION.FLUX || report.rms > NORMALIZATION.RMS ? 
                    '<div class="warning-note">⚠️ Выход за пределы нормализованного диапазона</div>' : ''}
            </div>
        `).join('');
        
        this.reportsList.scrollTop = 0;
    }
    
    clearReports() {
        this.reports = [];
        this.updateReportsUI();
    }
    
    // ============================================
    // ВИЗУАЛИЗАЦИЯ
    // ============================================
    
    drawVisualization() {
        if (!this.ctx) return;
        
        const width = this.mainCanvas.width;
        const height = this.mainCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, width, height);
        
        if (this.vizMode === 'radar') this.drawRadar(centerX, centerY);
        else if (this.vizMode === 'gauge') this.drawGauges(width, height);
        else if (this.vizMode === 'triangle') this.drawTriangle(centerX, centerY);
    }
    
    drawRadar(centerX, centerY) {
        const radius = Math.min(centerX, centerY) - 60;
        const values = [
            Math.min(1, this.normalizedParams.centroid),
            Math.min(1, this.normalizedParams.flux),
            Math.min(1, this.normalizedParams.rms)
        ];
        const angles = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6];
        const labels = ['Центр масс', 'Поток', 'Громкость'];
        const colors = ['#ff6b6b', '#4d96ff', '#6bcb77'];
        
        // Сетка
        for (let level = 1; level <= 4; level++) {
            const r = radius * level / 4;
            this.ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const x = centerX + Math.cos(angles[i]) * r;
                const y = centerY + Math.sin(angles[i]) * r;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.stroke();
        }
        
        // Оси
        for (let i = 0; i < 3; i++) {
            const x = centerX + Math.cos(angles[i]) * radius;
            const y = centerY + Math.sin(angles[i]) * radius;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(x, y);
            this.ctx.strokeStyle = '#333';
            this.ctx.stroke();
            this.ctx.fillStyle = colors[i];
            this.ctx.font = '10px monospace';
            this.ctx.fillText(labels[i], x + 5, y - 5);
        }
        
        // Зелёная зона
        const droneZoneCentroid = { min: DRONE_ZONE.CENTROID.min / NORMALIZATION.CENTROID, max: DRONE_ZONE.CENTROID.max / NORMALIZATION.CENTROID };
        const droneZoneFlux = { min: DRONE_ZONE.FLUX.min / NORMALIZATION.FLUX, max: DRONE_ZONE.FLUX.max / NORMALIZATION.FLUX };
        const droneZoneRms = { min: DRONE_ZONE.RMS.min / NORMALIZATION.RMS, max: DRONE_ZONE.RMS.max / NORMALIZATION.RMS };
        
        this.ctx.beginPath();
        const droneValues = [
            (droneZoneCentroid.min + droneZoneCentroid.max) / 2,
            (droneZoneFlux.min + droneZoneFlux.max) / 2,
            (droneZoneRms.min + droneZoneRms.max) / 2
        ];
        for (let i = 0; i < 3; i++) {
            const r = radius * droneValues[i];
            const x = centerX + Math.cos(angles[i]) * r;
            const y = centerY + Math.sin(angles[i]) * r;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.fill();
        
        // Текущее состояние
        this.ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const r = radius * values[i];
            const x = centerX + Math.cos(angles[i]) * r;
            const y = centerY + Math.sin(angles[i]) * r;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Центр тяжести
        let sumX = 0, sumY = 0;
        for (let i = 0; i < 3; i++) {
            const r = radius * values[i];
            sumX += centerX + Math.cos(angles[i]) * r;
            sumY += centerY + Math.sin(angles[i]) * r;
        }
        const avgX = sumX / 3;
        const avgY = sumY / 3;
        
        this.ctx.beginPath();
        this.ctx.arc(avgX, avgY, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#0f0';
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(avgX, avgY, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
    }
    
    drawGauges(width, height) {
        const gaugeWidth = width / 3 - 20;
        const startX = 10;
        const params = [
            { name: 'Центр масс', value: this.currentParams.centroid, max: NORMALIZATION.CENTROID, unit: 'Гц', color: '#ff6b6b', norm: this.normalizedParams.centroid },
            { name: 'Поток', value: this.currentParams.flux, max: NORMALIZATION.FLUX, unit: '', color: '#4d96ff', norm: this.normalizedParams.flux },
            { name: 'Громкость', value: this.currentParams.rms, max: NORMALIZATION.RMS, unit: '', color: '#6bcb77', norm: this.normalizedParams.rms }
        ];
        
        for (let i = 0; i < 3; i++) {
            const x = startX + i * gaugeWidth + i * 10;
            const p = params[i];
            const barHeight = 150;
            const barY = height - barHeight - 50;
            
            this.ctx.strokeStyle = p.color;
            this.ctx.fillStyle = '#0a0a0a';
            this.ctx.fillRect(x, barY, gaugeWidth - 10, barHeight);
            this.ctx.strokeRect(x, barY, gaugeWidth - 10, barHeight);
            
            const fillHeight = barHeight * Math.min(1, p.norm);
            const fillColor = p.norm > 1 ? '#ff0000' : p.color;
            this.ctx.fillStyle = fillColor;
            this.ctx.fillRect(x, barY + barHeight - fillHeight, gaugeWidth - 10, fillHeight);
            
            if (p.norm > 1) {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.font = 'bold 8px monospace';
                this.ctx.fillText('!', x + gaugeWidth - 20, barY + 10);
            }
            
            this.ctx.fillStyle = p.color;
            this.ctx.font = 'bold 10px monospace';
            this.ctx.fillText(p.name, x + 5, barY - 5);
            
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = '12px monospace';
            const displayValue = p.name === 'Центр масс' ? p.value.toFixed(0) : p.value.toFixed(2);
            this.ctx.fillText(`${displayValue} ${p.unit}`, x + 5, barY + barHeight + 15);
            
            const normPercent = Math.min(100, p.norm * 100);
            const normColor = p.norm > 1 ? '#ff0000' : '#888';
            this.ctx.fillStyle = normColor;
            this.ctx.font = '9px monospace';
            this.ctx.fillText(`${normPercent.toFixed(0)}%`, x + gaugeWidth - 35, barY - 5);
        }
    }
    
    drawTriangle(centerX, centerY) {
        const size = 200;
        const points = [
            { x: centerX, y: centerY - size, param: 'rms' },
            { x: centerX + size * 0.866, y: centerY + size * 0.5, param: 'centroid' },
            { x: centerX - size * 0.866, y: centerY + size * 0.5, param: 'flux' }
        ];
        
        const weights = [
            Math.min(1, this.normalizedParams.rms),
            Math.min(1, this.normalizedParams.centroid),
            Math.min(1, this.normalizedParams.flux)
        ];
        
        const point = this.barycentricToPoint(points, weights);
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        this.ctx.lineTo(points[1].x, points[1].y);
        this.ctx.lineTo(points[2].x, points[2].y);
        this.ctx.closePath();
        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
        this.ctx.fill();
        
        const droneWeights = [
            (DRONE_ZONE.RMS.min / NORMALIZATION.RMS + DRONE_ZONE.RMS.max / NORMALIZATION.RMS) / 2,
            (DRONE_ZONE.CENTROID.min / NORMALIZATION.CENTROID + DRONE_ZONE.CENTROID.max / NORMALIZATION.CENTROID) / 2,
            (DRONE_ZONE.FLUX.min / NORMALIZATION.FLUX + DRONE_ZONE.FLUX.max / NORMALIZATION.FLUX) / 2
        ];
        const dronePoint = this.barycentricToPoint(points, droneWeights);
        this.ctx.beginPath();
        this.ctx.arc(dronePoint.x, dronePoint.y, 40, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        this.ctx.fill();
        
        this.ctx.fillStyle = '#6bcb77';
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Громкость', points[0].x - 25, points[0].y - 10);
        this.ctx.fillStyle = '#4d96ff';
        this.ctx.fillText('Поток', points[2].x - 30, points[2].y + 15);
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillText('Центр масс', points[1].x + 10, points[1].y + 15);
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#0f0';
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        
        if (this.normalizedParams.centroid > 1 || this.normalizedParams.flux > 1 || this.normalizedParams.rms > 1) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '8px monospace';
            this.ctx.fillText('⚠️ Некоторые параметры за пределами шкалы', centerX - 100, centerY + size + 20);
        }
    }
    
    barycentricToPoint(points, weights) {
        let x = 0, y = 0;
        for (let i = 0; i < 3; i++) {
            x += points[i].x * weights[i];
            y += points[i].y * weights[i];
        }
        return { x, y };
    }
    
    drawFluxHistory() {
        if (!this.fluxCtx) return;
        
        const width = this.fluxCanvas.width;
        const height = this.fluxCanvas.height;
        
        this.fluxCtx.clearRect(0, 0, width, height);
        this.fluxCtx.fillStyle = '#050505';
        this.fluxCtx.fillRect(0, 0, width, height);
        
        for (let i = 0; i <= 4; i++) {
            const y = height - (i * height / 4);
            this.fluxCtx.beginPath();
            this.fluxCtx.moveTo(0, y);
            this.fluxCtx.lineTo(width, y);
            this.fluxCtx.strokeStyle = '#1a1a1a';
            this.fluxCtx.stroke();
        }
        
        const droneZoneMin = DRONE_ZONE.FLUX.min / NORMALIZATION.FLUX;
        const droneZoneMax = DRONE_ZONE.FLUX.max / NORMALIZATION.FLUX;
        const zoneY1 = height - droneZoneMin * height;
        const zoneY2 = height - droneZoneMax * height;
        this.fluxCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.fluxCtx.fillRect(0, zoneY2, width, zoneY1 - zoneY2);
        
        this.fluxCtx.beginPath();
        this.fluxCtx.strokeStyle = '#4d96ff';
        this.fluxCtx.lineWidth = 1.5;
        
        for (let i = 0; i < this.fluxHistory.length; i++) {
            const x = i * (width / this.fluxHistory.length);
            const y = height - Math.min(1, this.fluxHistory[i]) * height;
            if (i === 0) this.fluxCtx.moveTo(x, y);
            else this.fluxCtx.lineTo(x, y);
        }
        this.fluxCtx.stroke();
        
        this.fluxCtx.beginPath();
        for (let i = 0; i < this.fluxHistory.length; i++) {
            const x = i * (width / this.fluxHistory.length);
            const y = height - Math.min(1, this.fluxHistory[i]) * height;
            if (i === 0) this.fluxCtx.moveTo(x, y);
            else this.fluxCtx.lineTo(x, y);
        }
        this.fluxCtx.lineTo(width, height);
        this.fluxCtx.lineTo(0, height);
        this.fluxCtx.closePath();
        this.fluxCtx.fillStyle = 'rgba(77, 150, 255, 0.1)';
        this.fluxCtx.fill();
        
        this.fluxCtx.fillStyle = '#888';
        this.fluxCtx.font = '8px monospace';
        this.fluxCtx.fillText(`Спектральный поток (история) — зелёная зона = диапазон дрона (${DRONE_ZONE.FLUX.min}-${DRONE_ZONE.FLUX.max})`, 10, 10);
    }
    
    // ============================================
    // УПРАВЛЕНИЕ СОСТОЯНИЕМ
    // ============================================
    
    updateUI() {
        if (this.startBtn) this.startBtn.disabled = this.isRunning;
        if (this.stopBtn) this.stopBtn.disabled = !this.isRunning;
        if (this.statusLed) this.statusLed.classList.toggle('active', this.isRunning);
        if (this.statusText) this.statusText.textContent = this.isRunning ? '● АКТИВЕН — анализ' : '● Не активен';
    }
    
    async stop() {
        if (!this.isRunning) return;
        
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.audioContext) await this.audioContext.close();
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        
        this.isRunning = false;
        this.updateUI();
    }
}

// ============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================

const app = new ThreeParamAnalyzer();