const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("\n=======================================================");
console.log("🚀 [Aura Production Launcher] Starting Next.js Production Server + PaddleOCR + Gemini Web2API...");
console.log("=======================================================\n");

// 1. Python Path cho OCR
const ocrScriptPath = path.join(__dirname, "../ocr-service/main.py");
const ocrVenvWin = path.join(__dirname, "../ocr-service/venv/Scripts/python.exe");
const ocrVenvUnix = path.join(__dirname, "../ocr-service/venv/bin/python");

let ocrPythonCmd = process.platform === "win32" ? "python" : "python3";
if (fs.existsSync(ocrVenvWin)) {
    ocrPythonCmd = ocrVenvWin;
} else if (fs.existsSync(ocrVenvUnix)) {
    ocrPythonCmd = ocrVenvUnix;
}

const { execSync } = require("child_process");

function freePortSync(port) {
    try {
        if (process.platform === "win32") {
            const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
            const lines = out.trim().split("\n");
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(pid) && parseInt(pid) > 0) {
                    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
                }
            }
        } else {
            execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
        }
    } catch (e) {}
}

console.log("🧹 Cleaning up old ports 8000 & 8081 if occupied...");
freePortSync(8000);
freePortSync(8081);

console.log(`🐍 Launching CV Refiner & Table Detection Service (${ocrPythonCmd})...`);
const ocrProcess = spawn(ocrPythonCmd, [ocrScriptPath], {
    stdio: "inherit",
    shell: false,
    cwd: path.join(__dirname, "../ocr-service")
});

ocrProcess.on("error", (err) => {
    console.warn("⚠️ [CV Refiner Warning] Unable to launch Python process:", err.message);
});

// 2. Python Path cho Gemini Web2API
const geminiScriptPath = path.join(__dirname, "../gemini-web2api/gemini_web2api.py");
const geminiVenvWin = path.join(__dirname, "../gemini-web2api/venv/Scripts/python.exe");
const geminiVenvUnix = path.join(__dirname, "../gemini-web2api/venv/bin/python");

let geminiPythonCmd = process.platform === "win32" ? "python" : "python3";
if (fs.existsSync(geminiVenvWin)) {
    geminiPythonCmd = geminiVenvWin;
} else if (fs.existsSync(geminiVenvUnix)) {
    geminiPythonCmd = geminiVenvUnix;
}

console.log(`🤖 Launching Gemini Web2API Service (${geminiPythonCmd} -m gemini_web2api)...`);
const geminiProcess = spawn(geminiPythonCmd, ["-m", "gemini_web2api"], {
    stdio: "inherit",
    shell: false,
    cwd: path.join(__dirname, "../gemini-web2api")
});

geminiProcess.on("error", (err) => {
    console.warn("⚠️ [Gemini Web2API Warning] Unable to launch Python process:", err.message);
});

// 3. Khởi chạy Next.js Production Server
console.log("⚡ Launching Next.js Production Server (next start)...");
const nextProcess = spawn("npx", ["next", "start"], {
    stdio: "inherit",
    shell: true
});

// 4. Xử lý tắt sạch sẽ các tiến trình khi nhấn Ctrl+C
let isShuttingDown = false;

function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log("\n🛑 [Aura Production Launcher] Stopping Next.js Server, PaddleOCR, and Gemini Web2API...");

    const killProc = (proc, name) => {
        if (!proc || !proc.pid) return;
        try {
            if (process.platform === "win32") {
                spawn("taskkill", ["/pid", proc.pid.toString(), "/f", "/t"], { stdio: "ignore" });
            } else {
                proc.kill("SIGINT");
            }
            console.log(`✅ [Aura Production Launcher] Stopped ${name}.`);
        } catch (e) {
            // Ignore error
        }
    };

    killProc(ocrProcess, "PaddleOCR Service");
    killProc(geminiProcess, "Gemini Web2API Service");
    killProc(nextProcess, "Next.js Production Server");

    setTimeout(() => {
        process.exit(0);
    }, 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
