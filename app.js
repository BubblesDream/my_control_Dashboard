// ====== UI 與系統日誌 ======
const log = (msg) => {
    const box = document.getElementById('logBox');
    box.innerHTML += `[${new Date().toLocaleTimeString()}] ${msg}<br>`;
    box.scrollTop = box.scrollHeight;
};

// ====== 全域變數 ======
let client = null;
let deviceMap = new Map();
let abortController = null; // 🌟 這是解決強制停止 Bug 的關鍵武器

// ====== 🌟 核心引擎：可中斷的睡眠函數 ======
function interruptibleSleep(ms) {
    return new Promise(resolve => {
        const timer = setTimeout(resolve, ms);
        // 如果在此期間按下了停止，就立刻清除倒數計時並醒來
        if (abortController) {
            abortController.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                resolve(); 
            }, { once: true });
        }
    });
}

// ====== 🌟 核心引擎：序列執行器 ======
async function executeSequence(device, sequence) {
    // 如果有舊的序列在跑，先強制砍掉
    if (abortController) abortController.abort();
    
    // 建立一個新的中斷控制器
    abortController = new AbortController();
    const signal = abortController.signal;

    try {
        for (let block of sequence) {
            if (signal.aborted) break; // 每個積木執行前檢查是否被中止

            if (block.type === 'vibrate') {
                await device.vibrate(block.intensity);
                await interruptibleSleep(block.duration);
            } 
            else if (block.type === 'stop') {
                await device.vibrate(0);
                await interruptibleSleep(block.duration);
            } 
            else if (block.type === 'ramp') {
                const steps = 20;
                const stepTime = block.duration / steps;
                const stepIntensity = (block.end - block.start) / steps;
                for (let i = 0; i <= steps; i++) {
                    if (signal.aborted) break;
                    await device.vibrate(block.start + (stepIntensity * i));
                    await interruptibleSleep(stepTime);
                }
            }
        }
    } catch (err) {
        log(`執行錯誤：${err.message}`);
    } finally {
        // 無論是正常跑完還是被強制中斷，最後一定會發送停止指令
        if (device) await device.vibrate(0);
        abortController = null;
    }
}

// ====== 玩具操作邏輯 ======
function getSelectedDevice() {
    return deviceMap.get(parseInt(document.getElementById('deviceSelect').value));
}

async function stopDevice() {
    if (abortController) {
        abortController.abort(); // 觸發中斷，立刻叫醒 sleep()
    }
    const device = getSelectedDevice();
    if (device) await device.vibrate(0); // 雙重保險，直接送出停止指令
    log("⏹ 已強制停止所有動作。");
}

async function playPattern(pattern) {
    const device = getSelectedDevice();
    if (!device) return;
    log("▶ 開始執行模式...");
    await executeSequence(device, pattern);
    log("⏹ 模式執行完畢。");
}

// ====== 連線與初始化 ======
async function connectWS() {
    const url = document.getElementById('wsUrl').value;
    const connectBtn = document.getElementById('connectBtn');
    connectBtn.disabled = true;

    try {
        client = new Buttplug.ButtplugClient("Web Platform V3");
        
        client.addListener("deviceadded", (device) => {
            log(`🎉 偵測到設備：${device.name}`);
            deviceMap.set(device.index, device);
            updateUI();
        });

        client.addListener("deviceremoved", (device) => {
            log(`❌ 設備斷線：${device.name}`);
            deviceMap.delete(device.index);
            updateUI();
        });

        log(`連線中：${url}...`);
        const connector = new Buttplug.ButtplugBrowserWebsocketClientConnector(url);
        await client.connect(connector);
        log("✅ 連線成功！");
        
        document.getElementById('disconnectBtn').disabled = false;
        connectBtn.innerText = "已連線";

    } catch (error) {
        log(`❌ 連線失敗：${error.message}`);
        connectBtn.disabled = false;
    }
}

async function disconnectWS() {
    if (client && client.connected) {
        await stopDevice(); // 斷線前先讓玩具停下來
        await client.disconnect();
        log("🔌 已中斷 WebSocket 連線。");
        
        deviceMap.clear();
        updateUI();
        
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.disabled = false;
        connectBtn.innerText = "連線";
        document.getElementById('disconnectBtn').disabled = true;
    }
}

// ====== UI 更新與事件綁定 ======
function updateUI() {
    const hasDevice = deviceMap.size > 0;
    const select = document.getElementById('deviceSelect');
    
    // 更新下拉選單
    select.innerHTML = hasDevice ? '' : '<option value="">請先連線...</option>';
    select.disabled = !hasDevice;
    deviceMap.forEach((device, index) => {
        select.innerHTML += `<option value="${index}">${device.name}</option>`;
    });

    // 解鎖所有按鈕
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = !hasDevice);
}

// 當網頁載入完成後，綁定所有按鈕事件
window.onload = () => {
    document.getElementById('connectBtn').onclick = connectWS;
    document.getElementById('disconnectBtn').onclick = disconnectWS;
    document.getElementById('stopBtn').onclick = stopDevice;
    
    // 單次震動按鈕
    document.getElementById('customPlayBtn').onclick = () => {
        const int = parseInt(document.getElementById('customInt').value) / 100;
        const dur = parseInt(document.getElementById('customDur').value) * 1000;
        playPattern([{ type: 'vibrate', intensity: int, duration: dur }]);
    };

    // 複合積木按鈕
    document.getElementById('demoBtn').onclick = () => {
        playPattern([
            { type: 'vibrate', intensity: 0.1, duration: 3000 },
            { type: 'stop', duration: 3000 },
            { type: 'vibrate', intensity: 0.7, duration: 10000 },
            { type: 'ramp', start: 0.1, end: 0.5, duration: 10000 }
        ]);
    };

    // 自動讀取 patterns.js 並生成按鈕
    const patternContainer = document.getElementById('patternButtons');
    for (const [name, blocks] of Object.entries(toyPatterns)) {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.innerText = name;
        btn.disabled = true; // 預設鎖定，直到連線成功
        btn.onclick = () => playPattern(blocks);
        patternContainer.appendChild(btn);
    }
};