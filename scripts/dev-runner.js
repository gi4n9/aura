const { spawn } = require("child_process");
const path = require("path");

console.log("\n=======================================================");
echoLauncherHeader();
console.log("=======================================================\n");

function echoLauncherHeader() {
    console.log("🚀 [Aura Launcher] Starting Next.js Dev Server + Local PaddleOCR Service...");
}

const fs = require("fs");

// Đường dẫn tới main.py của PaddleOCR Service
const ocrScriptPath = path.join(__dirname, "../ocr-service/main.py");

// Ưu tiên dùng Python trong venv của ocr-service nếu có
const venvPythonWin = path.join(__dirname, "../ocr-service/venv/Scripts/python.exe");
const venvPythonUnix = path.join(__dirname, "../ocr-service/venv/bin/python");

let pythonCmd = "python";
if (fs.existsSync(venvPythonWin)) {
    pythonCmd = `"${venvPythonWin}"`;
} else if (fs.existsSync(venvPythonUnix)) {
    pythonCmd = `"${venvPythonUnix}"`;
}

// 1. Khởi chạy PaddleOCR Python Process
console.log(`🐍 Launching PaddleOCR Local Service (${pythonCmd})...`);
const ocrProcess = spawn(pythonCmd, [ocrScriptPath], {
    stdio: "inherit",
    shell: true
});

ocrProcess.on("error", (err) => {
    console.warn("⚠️ [PaddleOCR Warning] Unable to launch Python process:", err.message);
    console.warn("👉 Next.js will continue to run with Tesseract.js fallback mode.");
});

// 2. Khởi chạy Next.js Dev Server
console.log("⚡ Launching Next.js Development Server...");
const nextProcess = spawn("npx", ["next", "dev"], {
    stdio: "inherit",
    shell: true
});

// 3. Xử lý tắt sạch sẽ cả 2 tiến trình khi nhấn Ctrl+C
let isShuttingDown = false;

function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log("\n🛑 [Aura Launcher] Stopping Next.js Dev Server and PaddleOCR Service...");

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
    killProc(nextProcess, "Next.js Dev Server");

    setTimeout(() => {
        process.exit(0);
    }, 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
