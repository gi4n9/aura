const { spawn } = require("child_process");
const path = require("path");

console.log("\n=======================================================");
echoLauncherHeader();
console.log("=======================================================\n");

function echoLauncherHeader() {
    console.log("🚀 [Aura Launcher] Starting Next.js Dev Server + Local PaddleOCR Service + Gemini Web2API...");
}

const fs = require("fs");

// Đường dẫn tới main.py của PaddleOCR Service
const ocrScriptPath = path.join(__dirname, "../ocr-service/main.py");

// Ưu tiên dùng Python trong venv của ocr-service nếu có
const venvPythonWin = path.join(__dirname, "../ocr-service/venv/Scripts/python.exe");
const venvPythonUnix = path.join(__dirname, "../ocr-service/venv/bin/python");

let pythonCmd = process.platform === "win32" ? "python" : "python3";
if (fs.existsSync(venvPythonWin)) {
    pythonCmd = venvPythonWin;
} else if (fs.existsSync(venvPythonUnix)) {
    pythonCmd = venvPythonUnix;
}

const { execSync } = require("child_process");

// Tự động giải phóng cổng nếu có tiến trình cũ bị treo
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

// 1. Khởi chạy Fast CV Refiner & Table Detection Process
console.log(`🐍 Launching CV Refiner & Table Detection Service (${pythonCmd})...`);
const ocrProcess = spawn(pythonCmd, [ocrScriptPath], {
    stdio: "inherit",
    shell: false,
    cwd: path.join(__dirname, "../ocr-service")
});

ocrProcess.on("error", (err) => {
    console.warn("⚠️ [CV Refiner Warning] Unable to launch Python process:", err.message);
});

// Đường dẫn tới gemini-web2api
const geminiVenvPythonWin = path.join(__dirname, "../gemini-web2api/venv/Scripts/python.exe");
const geminiVenvPythonUnix = path.join(__dirname, "../gemini-web2api/venv/bin/python");

let geminiPythonCmd = process.platform === "win32" ? "python" : "python3";
if (fs.existsSync(geminiVenvPythonWin)) {
    geminiPythonCmd = geminiVenvPythonWin;
} else if (fs.existsSync(geminiVenvPythonUnix)) {
    geminiPythonCmd = geminiVenvPythonUnix;
}

// 2. Khởi chạy Gemini Web2API Process
console.log(`🤖 Launching Gemini Web2API Service (${geminiPythonCmd} -m gemini_web2api)...`);
const geminiProcess = spawn(geminiPythonCmd, ["-m", "gemini_web2api"], {
    stdio: "inherit",
    shell: false,
    cwd: path.join(__dirname, "../gemini-web2api")
});

geminiProcess.on("error", (err) => {
    console.warn("⚠️ [Gemini Web2API Warning] Unable to launch Python process:", err.message);
});

// 3. Khởi chạy Next.js Dev Server
console.log("⚡ Launching Next.js Development Server...");
const nextProcess = spawn("npx", ["next", "dev"], {
    stdio: "inherit",
    shell: true
});

// 4. Xử lý tắt sạch sẽ các tiến trình khi nhấn Ctrl+C
let isShuttingDown = false;

function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log("\n🛑 [Aura Launcher] Stopping Next.js Dev Server, PaddleOCR, and Gemini Web2API...");

    const killProc = (proc, name) => {
        if (!proc || !proc.pid) return;
        try {
            if (process.platform === "win32") {
                // Trên Windows, dùng taskkill /f /t /pid để kill toàn bộ process tree
                spawn("taskkill", ["/pid", proc.pid.toString(), "/f", "/t"], { stdio: "ignore" });
            } else {
                proc.kill("SIGINT");
            }
            console.log(`✅ [Aura Launcher] Stopped ${name}.`);
        } catch (e) {
            // Ignore error if process already exited
        }
    };

    killProc(ocrProcess, "PaddleOCR Service");
    killProc(geminiProcess, "Gemini Web2API Service");
    killProc(nextProcess, "Next.js Dev Server");

    setTimeout(() => {
        process.exit(0);
    }, 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
