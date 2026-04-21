document.addEventListener('DOMContentLoaded', () => {
    // ─── Elements ───────────────────────────────────────────────
    const timerDisplay    = document.getElementById('timer-display');
    const statusBadge     = document.getElementById('status-badge');
    const startBtn        = document.getElementById('start-btn');
    const stopBtn         = document.getElementById('stop-btn');
    const resetBtn        = document.getElementById('reset-btn');
    const holdingBtn      = document.getElementById('holding-toggle');

    const inputHrs        = document.getElementById('input-hours');
    const inputMin        = document.getElementById('input-minutes');
    const inputSec        = document.getElementById('input-seconds');

    const holdingInput    = document.getElementById('holding-input');
    const holdingText     = document.getElementById('holding-text');
    const holdingSubtext  = document.getElementById('holding-subtext');
    const holdingClearBtn = document.getElementById('holding-clear-text-btn');
    const holdingTextBlock= document.getElementById('holding-text-block');

    const audioUpload     = document.getElementById('audio-upload');
    const alarmAudio      = document.getElementById('alarm-audio');

    const timerContent    = document.getElementById('timer-content');
    const holdingOverlay  = document.getElementById('holding-overlay');
    const timeUpOverlay   = document.getElementById('time-up-overlay');
    const broadcastBtn    = document.getElementById('broadcast-btn');
    const holdingImage    = document.getElementById('holding-image');
    const imageUpload     = document.getElementById('image-upload');
    const clearImageBtn   = document.getElementById('clear-image-btn');

    const pushMsgInput    = document.getElementById('push-msg-input');
    const pushMsgBtn      = document.getElementById('push-msg-btn');
    const clearPushBtn    = document.getElementById('clear-push-btn');
    const pushTicker      = document.getElementById('push-ticker');
    const pushTickerText  = document.getElementById('push-ticker-text');

    // ─── Sync Channel ────────────────────────────────────────────
    const bc = new BroadcastChannel('timer_sync');

    // Handle SYNC_REQUEST from newly opened broadcast window
    bc.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_REQUEST') {
            // Send current state to broadcast window
            bc.postMessage({
                type: 'TICK',
                data: { display: timerDisplay.textContent, isTimeUp: totalSeconds <= 0 && !isRunning }
            });
            bc.postMessage({
                type: 'IMAGE',
                data: { src: holdingImageDataUrl, color: holdingText.style.color || '#ffffff' }
            });
            bc.postMessage({
                type: 'HOLDING',
                data: { active: isHolding, text: holdingInput.value, subtext: '' }
            });
            bc.postMessage({
                type: 'PUSH_MSG',
                data: { text: pushMsgInput.value }
            });
        }
    };

    // ─── Variables ───────────────────────────────────────────────
    let countdown;
    let totalSeconds = 300;
    let isRunning    = false;
    let isHolding    = false;
    let holdingImageDataUrl = null;

    // ─── Audio Upload ─────────────────────────────────────────────
    audioUpload.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            alarmAudio.src = URL.createObjectURL(file);
        }
    });

    // ─── Image Upload + Dominant Color Extraction ─────────────────
    imageUpload.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            holdingImageDataUrl = e.target.result;
            holdingImage.src = holdingImageDataUrl;
            holdingImage.classList.remove('hidden');

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 100; canvas.height = 56;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 100, 56);
                const imageData = ctx.getImageData(0, 0, 100, 56).data;
                let bestColor = null, bestScore = -1;
                for (let i = 0; i < imageData.length; i += 16) {
                    const r = imageData[i], g = imageData[i+1], b = imageData[i+2], a = imageData[i+3];
                    if (a < 128) continue;
                    const max = Math.max(r,g,b)/255, min = Math.min(r,g,b)/255;
                    const lightness = (max + min) / 2;
                    const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2*lightness-1));
                    const score = saturation * (1 - Math.abs(lightness - 0.55));
                    if (score > bestScore) { bestScore = score; bestColor = `rgb(${r},${g},${b})`; }
                }
                const finalColor = bestColor || '#ffffff';
                holdingText.style.color = finalColor;
                holdingSubtext.style.color = finalColor;
                bc.postMessage({ type: 'IMAGE', data: { src: holdingImageDataUrl, color: finalColor } });
            };
            img.src = holdingImageDataUrl;
        };
        reader.readAsDataURL(file);
    });

    // ─── Clear Image ───────────────────────────────────────────────
    clearImageBtn.addEventListener('click', () => {
        holdingImageDataUrl = null;
        holdingImage.src = '';
        holdingImage.classList.add('hidden');
        imageUpload.value = '';
        holdingText.style.color = '#ffffff';
        holdingSubtext.style.color = 'rgba(255,255,255,0.85)';
        bc.postMessage({ type: 'IMAGE', data: { src: null, color: '#ffffff' } });
    });

    // ─── Timer Logic ───────────────────────────────────────────────
    function updateDisplay(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        timerDisplay.textContent = h > 0
            ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
            : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        document.title = `${timerDisplay.textContent} — Videowaves Timer`;
        bc.postMessage({ type: 'TICK', data: { display: timerDisplay.textContent, isTimeUp: totalSeconds <= 0 && !isRunning } });
    }

    function startTimer() {
        if (isRunning) return;
        if (totalSeconds === 0 || !countdown) {
            const h = parseInt(inputHrs.value) || 0;
            const m = parseInt(inputMin.value) || 0;
            const s = parseInt(inputSec.value) || 0;
            totalSeconds = (h * 3600) + (m * 60) + s;
            if (totalSeconds > 3600) { totalSeconds = 3600; inputHrs.value = 1; inputMin.value = 0; inputSec.value = 0; }
        }
        if (totalSeconds <= 0) return;
        isRunning = true;
        statusBadge.textContent = '● LIVE';
        statusBadge.classList.add('active');
        countdown = setInterval(() => {
            totalSeconds--;
            updateDisplay(totalSeconds);
            if (totalSeconds <= 0) {
                clearInterval(countdown);
                isRunning = false;
                statusBadge.textContent = '';
                statusBadge.classList.remove('active');
                timeUpOverlay.classList.remove('hidden');
                playAlarm();
                updateDisplay(0);
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(countdown);
        isRunning = false;
        statusBadge.textContent = 'PAUSED';
        statusBadge.classList.remove('active');
    }

    function resetTimer() {
        stopTimer();
        totalSeconds = (parseInt(inputHrs.value)||0)*3600 + (parseInt(inputMin.value)||0)*60 + (parseInt(inputSec.value)||0);
        updateDisplay(totalSeconds);
        statusBadge.textContent = 'STANDBY';
        timeUpOverlay.classList.add('hidden');
        bc.postMessage({ type: 'RESET', data: { display: timerDisplay.textContent } });
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }

    function playAlarm() {
        if (alarmAudio.src) alarmAudio.play().catch(e => console.error('Audio play failed:', e));
    }

    // ─── Holding Mode ──────────────────────────────────────────────
    function syncHoldingText() {
        const text = holdingInput.value || '';
        holdingText.textContent = text;
        holdingSubtext.textContent = '';
        if (text.trim() !== '') {
            holdingTextBlock.classList.remove('hidden');
        } else {
            holdingTextBlock.classList.add('hidden');
        }
    }

    holdingBtn.addEventListener('click', () => {
        isHolding = !isHolding;
        if (isHolding) {
            holdingBtn.classList.add('active');
            holdingBtn.textContent = '🔵 SHOW TIMER';
            holdingBtn.style.background = '#ff9500';
            holdingOverlay.classList.remove('hidden');
            timerContent.classList.add('hidden');
            syncHoldingText();
        } else {
            holdingBtn.classList.remove('active');
            holdingBtn.textContent = 'HOLDING MODE';
            holdingBtn.style.background = '';
            holdingOverlay.classList.add('hidden');
            timerContent.classList.remove('hidden');
        }
        bc.postMessage({ type: 'HOLDING', data: { active: isHolding, text: holdingInput.value, subtext: '' } });
    });

    holdingInput.addEventListener('input', () => {
        syncHoldingText();
        if (isHolding) {
            bc.postMessage({ type: 'HOLDING', data: { active: true, text: holdingInput.value, subtext: '' } });
        }
    });

    holdingClearBtn.addEventListener('click', () => {
        holdingInput.value = '';
        syncHoldingText();
        if (isHolding) {
            bc.postMessage({ type: 'HOLDING', data: { active: true, text: '', subtext: '' } });
        }
    });

    // ─── Push Message to Broadcast Screen ──────────────────────────
    function pushMessage() {
        const msg = pushMsgInput.value.trim();
        if (msg !== '') {
            pushTickerText.textContent = msg;
            pushTicker.classList.remove('hidden');
        }
        bc.postMessage({ type: 'PUSH_MSG', data: { text: msg } });
    }

    function clearPushMessage() {
        pushMsgInput.value = '';
        pushTicker.classList.add('hidden');
        pushTickerText.textContent = '';
        bc.postMessage({ type: 'PUSH_MSG', data: { text: '' } });
    }

    pushMsgBtn.addEventListener('click', pushMessage);
    clearPushBtn.addEventListener('click', clearPushMessage);
    pushMsgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') pushMessage(); });

    // ─── Quick Timer Presets ────────────────────────────────────────
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const minutes = parseInt(e.target.getAttribute('data-min'));
            inputHrs.value = 0;
            inputMin.value = minutes;
            inputSec.value = 0;
            resetTimer();
        });
    });

    // ─── Core Listeners ────────────────────────────────────────────
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);
    resetBtn.addEventListener('click', resetTimer);

    broadcastBtn.addEventListener('click', () => {
        if (window.electronAPI) {
            window.electronAPI.openBroadcastWindow();
        } else {
            window.open('broadcast.html', 'BroadcastWindow', 'width=1280,height=720');
        }
    });

    // ─── Initial State ──────────────────────────────────────────────
    updateDisplay(totalSeconds);

    // ─── OSC Listener ───────────────────────────────────────────────
    if (window.electronAPI && window.electronAPI.onOscCommand) {
        window.electronAPI.onOscCommand((data) => {
            const { address, args } = data;
            console.log('Handling OSC Command:', address, args);

            switch (address) {
                case '/timer/start':
                    startTimer();
                    break;
                case '/timer/stop':
                    stopTimer();
                    break;
                case '/timer/reset':
                    resetTimer();
                    break;
                case '/timer/set':
                    // Expects minutes as first argument
                    if (args && args.length > 0) {
                        const mins = parseInt(args[0]);
                        if (!isNaN(mins)) {
                            inputHrs.value = 0;
                            inputMin.value = Math.min(mins, 60);
                            inputSec.value = 0;
                            resetTimer();
                        }
                    }
                    break;
            }
        });
    }
});
