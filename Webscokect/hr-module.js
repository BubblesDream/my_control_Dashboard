// ====== 心率連動模組 (HR Module V2) ======

let hrDevice = null;
let currentBPM = 0;
let isHRPaused = false;         // 因高心率導致的暫停狀態
let hrRecoveryTimer = null;     // 恢復計時器
let sessionTimeout = null;      // 總執行時間計時器 (5分鐘)
let sessionInterval = null;     // 總執行時間畫面積分
let countdownInterval = null;   // 恢復倒數計分

// 1. 藍牙連線與斷線處理 (保持原樣，僅增加狀態顯示)
async function connectHR() {
    try {
        log("🔍 正在請求藍牙心率設備...");
        hrDevice = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
        hrDevice.addEventListener('gattserverdisconnected', onHRDisconnected);
        const server = await hrDevice.gatt.connect();
        await new Promise(r => setTimeout(r, 500));
        const service = await server.getPrimaryService('heart_rate');
        const characteristic = await service.getCharacteristic('heart_rate_measurement');
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleHRUpdate);
        
        document.getElementById('hrStatus').innerText = `狀態：已連線 (${hrDevice.name})`;
        document.getElementById('hrStatus').style.color = "#4af626";
        document.getElementById('connectHRBtn').disabled = true;
        log(`💖 心率設備連線成功！`);
    } catch (error) {
        log(`❌ 連線失敗：${error.message}`);
    }
}

function onHRDisconnected() {
    log(`💔 心率設備斷線！`);
    stopAutoSession();
    document.getElementById('hrStatus').innerText = "狀態：已斷線";
    document.getElementById('connectHRBtn').disabled = false;
}

// 2. 勾選框變化監聽
function handleAutoToggleChange() {
    const isChecked = document.getElementById('hrAutoToggle').checked;
    
    if (isChecked) {
        startAutoSession();
    } else {
        stopAutoSession();
    }
}

// 3. 啟動自動控制會話
function startAutoSession() {
    const mins = parseInt(document.getElementById('autoSessionMins').value) || 5;
    log(`🚀 啟動自動控制模式，預計執行 ${mins} 分鐘。`);
    
    // 初始化狀態
    isHRPaused = false;
    
    // 設定總時間倒數
    let totalSeconds = mins * 60;
    document.getElementById('sessionCountdown').innerText = `(剩餘: ${mins}:00)`;
    
    sessionInterval = setInterval(() => {
        totalSeconds--;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        document.getElementById('sessionCountdown').innerText = `(剩餘: ${m}:${s.toString().padStart(2, '0')})`;
        if (totalSeconds <= 0) stopAutoSession();
    }, 1000);

    // 立即執行一次狀態判斷
    checkHRRules();
}

// 4. 停止自動控制會話
async function stopAutoSession() {
    log("⏹ 自動控制模式結束或關閉。");
    document.getElementById('hrAutoToggle').checked = false;
    document.getElementById('sessionCountdown').innerText = "";
    
    clearInterval(sessionInterval);
    clearRecoveryTimers();
    
    // 停止玩具
    if (typeof stopDevice === 'function') await stopDevice();
}

// 5. 處理心率數據更新
function handleHRUpdate(event) {
    const value = event.target.value;
    const flags = value.getUint8(0);
    currentBPM = (flags & 0x1) ? value.getUint16(1, true) : value.getUint8(1);
    document.getElementById('currentBPM').innerText = currentBPM + " BPM";
    
    // 如果自動控制開關是打開的，持續檢查規則
    if (document.getElementById('hrAutoToggle').checked) {
        checkHRRules();
    }
}

// 6. 核心自動判斷邏輯
async function checkHRRules() {
    const device = typeof getSelectedDevice === 'function' ? getSelectedDevice() : null;
    if (!device) return;

    const highLimit = parseInt(document.getElementById('hrHigh').value);
    const lowLimit = parseInt(document.getElementById('hrLow').value);
    const recoverySec = parseInt(document.getElementById('hrRecoveryTime').value);

    // 狀態 A：心率飆高 -> 觸發緊急停止
    if (currentBPM >= highLimit) {
        if (!isHRPaused) {
            log(`🚨 心率 ${currentBPM} >= 閾值 ${highLimit}！停止震動並鎖定。`);
            isHRPaused = true;
            clearRecoveryTimers();
            await device.vibrate(0);
        }
        return;
    }

    // 狀態 B：心率低於恢復閾值 且 處於暫停鎖定中 -> 開始恢復計時
    if (currentBPM <= lowLimit && isHRPaused) {
        if (!hrRecoveryTimer) {
            log(`📉 心率降至 ${currentBPM}，需穩定維持 ${recoverySec} 秒以恢復...`);
            let remain = recoverySec;
            document.getElementById('hrCountdown').innerText = `⏳ 恢復中: ${remain}s`;
            
            countdownInterval = setInterval(() => {
                remain--;
                document.getElementById('hrCountdown').innerText = `⏳ 恢復中: ${remain}s`;
            }, 1000);

            hrRecoveryTimer = setTimeout(async () => {
                log("✅ 心率已穩定，恢復常態震動。");
                isHRPaused = false;
                clearRecoveryTimers();
                await device.vibrate(0.05); // 恢復 5% 震動
            }, recoverySec * 1000);
        }
        return;
    }

    // 狀態 C：心率不夠低，無法觸發恢復 (在低閾值與高閾值之間掙扎)
    if (isHRPaused && currentBPM > lowLimit) {
        if (hrRecoveryTimer) {
            log(`⚠️ 心率回升至 ${currentBPM}，恢復倒數中斷。`);
            clearRecoveryTimers();
            document.getElementById('hrCountdown').innerText = "❌ 恢復中斷";
        }
        return;
    }

    // 狀態 D：正常狀態 (未被鎖定) -> 確保維持 5% 震動
    if (!isHRPaused) {
        // 這裡可以檢查目前震動強度，如果不是 5% 則設定為 5%
        // Buttplug 協定通常可以直接重發指令，我們每秒心率更新時確保一次
        await device.vibrate(0.05);
        document.getElementById('hrCountdown').innerText = "✨ 正常運作中 (5%)";
    }
}

function clearRecoveryTimers() {
    if (hrRecoveryTimer) clearTimeout(hrRecoveryTimer);
    if (countdownInterval) clearInterval(countdownInterval);
    hrRecoveryTimer = null;
    countdownInterval = null;
}

// 綁定事件
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectHRBtn').addEventListener('click', connectHR);
    document.getElementById('hrAutoToggle').addEventListener('change', handleAutoToggleChange);
});