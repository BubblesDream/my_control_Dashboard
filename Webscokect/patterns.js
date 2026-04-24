// 全域變數供 app.js 讀取
const toyPatterns = {
    "脈搏": [
        { type:'vibrate', intensity:0.5, duration:500 }, { type:'stop', duration:500 },
        { type:'vibrate', intensity:0.5, duration:500 }, { type:'stop', duration:500 }
    ],
    "海浪": [
        { type:'ramp', start:0.0, end:1.0, duration:2000 },
        { type:'ramp', start:1.0, end:0.0, duration:2000 }
    ],
    "挑逗": [
        { type:'vibrate', intensity:0.1, duration:2000 },
        { type:'vibrate', intensity:1.0, duration:1000 },
        { type:'vibrate', intensity:0.1, duration:2000 }
    ],
    "求救 SOS": [
                { type:'vibrate', intensity:0.8, duration:300 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:0.8, duration:300 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:0.8, duration:300 }, { type:'stop', duration:500 },
                { type:'vibrate', intensity:1.0, duration:800 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:1.0, duration:800 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:1.0, duration:800 }, { type:'stop', duration:500 },
                { type:'vibrate', intensity:0.8, duration:300 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:0.8, duration:300 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:0.8, duration:300 }, { type:'stop', duration:200 }
    ],
    "心跳": [ // 碰、碰... 碰、碰... = 3.6s
                { type:'vibrate', intensity:0.8, duration:200 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:0.8, duration:200 }, { type:'stop', duration:600 },
                { type:'vibrate', intensity:0.8, duration:200 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:0.8, duration:200 }, { type:'stop', duration:600 },
                { type:'vibrate', intensity:0.8, duration:200 }, { type:'stop', duration:200 },
                { type:'vibrate', intensity:0.8, duration:200 }, { type:'stop', duration:600 }
    ],
    "快速漸強(3s)": [ // 0->100 快速漸強 = 3s
                { type:'ramp', start:0.0, end:1.0, duration:3000 }
    ],
   "顫抖3s": [ // 顫抖，連續極短觸發 = ~3s
                { type:'vibrate', intensity:1.0, duration:100 }, { type:'stop', duration:100 },
                { type:'vibrate', intensity:1.0, duration:100 }, { type:'stop', duration:100 },
                { type:'vibrate', intensity:1.0, duration:100 }, { type:'stop', duration:100 },
                { type:'vibrate', intensity:1.0, duration:100 }, { type:'stop', duration:100 },
                { type:'vibrate', intensity:1.0, duration:100 }, { type:'stop', duration:100 },
                { type:'vibrate', intensity:1.0, duration:100 }, { type:'stop', duration:100 }
    ],
    "階段性增強9s": [ // 階段性增強 = 9s
                { type:'vibrate', intensity:0.3, duration:3000 },
                { type:'vibrate', intensity:0.6, duration:3000 },
                { type:'vibrate', intensity:1.0, duration:3000 }
    ],
    "突強然後長嘆息6s": [ // 突強然後長嘆息 = 6s
                { type:'vibrate', intensity:1.0, duration:1000 },
                { type:'ramp', start:1.0, end:0.0, duration:5000 }
    ],
    "隨機(假)": [ // 隨機強弱變化
                { type:'vibrate', intensity: Math.random(), duration: 500 },
                { type:'vibrate', intensity: Math.random(), duration: 500 },
                { type:'vibrate', intensity: Math.random(), duration: 500 },
                { type:'vibrate', intensity: Math.random(), duration: 500 },
                { type:'vibrate', intensity: Math.random(), duration: 500 },
                { type:'vibrate', intensity: Math.random(), duration: 500 },
                { type:'vibrate', intensity: Math.random(), duration: 500 },
                { type:'vibrate', intensity: Math.random(), duration: 500 }
    ]
    // 您可以隨時在這裡加入更多模式...
};