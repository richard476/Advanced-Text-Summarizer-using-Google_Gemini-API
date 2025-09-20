// frontend/static/js/script.js

// --- Three.js 3D Background (Morphing Crystalline Structure) ---
let scene, camera, renderer, crystal, points, grain;
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();

function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3.5;

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create the Crystalline Structure
    const geometry = new THREE.IcosahedronGeometry(1, 5);
    geometry.setAttribute('a_original_position', new THREE.BufferAttribute(geometry.attributes.position.clone().array, 3));

    const wireframeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8888ff,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    crystal = new THREE.Mesh(geometry, wireframeMaterial);
    scene.add(crystal);

    const pointsMaterial = new THREE.PointsMaterial({
        color: 0xaaaaff,
        size: 0.03,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });
    points = new THREE.Points(geometry, pointsMaterial);
    scene.add(points);

    // Create the white grain effect
    const grainGeometry = new THREE.BufferGeometry();
    const grainVertices = [];
    for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;
        grainVertices.push(x, y, z);
    }
    grainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grainVertices, 3));
    const grainMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.01,
        transparent: true,
        opacity: 0.5
    });
    grain = new THREE.Points(grainGeometry, grainMaterial);
    scene.add(grain);

    animate3D();
}

function animate3D() {
    const elapsedTime = clock.getElapsedTime();

    // Morphing animation for the crystal
    const positions = crystal.geometry.attributes.position.array;
    const originalPositions = crystal.geometry.attributes.a_original_position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const ox = originalPositions[i];
        const oy = originalPositions[i + 1];
        const oz = originalPositions[i + 2];
        const displacement = 
            Math.sin(ox * 2.0 + elapsedTime * 1.5) * 0.05 +
            Math.cos(oy * 3.0 + elapsedTime * 2.0) * 0.05 +
            Math.sin(oz * 2.5 + elapsedTime * 1.0) * 0.05;
        positions[i] = ox + (ox * displacement);
        positions[i + 1] = oy + (oy * displacement);
        positions[i + 2] = oz + (oz * displacement);
    }
    crystal.geometry.attributes.position.needsUpdate = true;

    // Make the camera and grain react to mouse movement
    camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    grain.position.x = mouse.x * 0.2;
    grain.position.y = -mouse.y * 0.2;

    // Rotate the entire scene slowly
    scene.rotation.y += 0.0005;
    scene.rotation.x += 0.0005;

    renderer.render(scene, camera);
    requestAnimationFrame(animate3D);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
}

// -------------------------
// Extra canvases & effects
// -------------------------

// We'll use fxCanvas for background animations (matrix/aurora/stars)
// and wordCloudCanvas for the floating keyword cloud.
let fxCtx = null;
let fxCanvasWidth = 0;
let fxCanvasHeight = 0;
let fxAnimationFrame = null;
let fxActive = null; // 'matrix' | 'aurora' | 'stars' | null

let wordCloudCtx = null;
let wordCloudCanvas = null;
let wordCloudParticles = [];
let wordCloudAnimFrame = null;

// --- Helper: throttle/responsive canvas size
function resizeFxCanvas() {
    const fxCanvas = document.getElementById('fx-canvas');
    if (!fxCanvas) return;
    fxCanvas.width = window.innerWidth;
    fxCanvas.height = window.innerHeight;
    fxCtx = fxCanvas.getContext('2d');
    fxCanvasWidth = fxCanvas.width;
    fxCanvasHeight = fxCanvas.height;
}

function resizeWordCloudCanvas() {
    wordCloudCanvas = document.getElementById('word-cloud');
    if (!wordCloudCanvas) return;
    wordCloudCanvas.width = Math.min(window.innerWidth, 800);
    wordCloudCanvas.height = 260;
    wordCloudCanvas.style.position = "fixed";
    wordCloudCanvas.style.right = "20px";
    wordCloudCanvas.style.top = "20px";
    wordCloudCanvas.style.zIndex = "9998";
    wordCloudCanvas.style.pointerEvents = "auto"; // allow clicking
    wordCloudCtx = wordCloudCanvas.getContext('2d');
}

// -------------------------
// Progressive Typing Logic
// -------------------------
function typeSummary(text, msgTextEl, speed = 18) {
    // msgTextEl is the element with class "msg-text"
    // We append character by character with basic preserving of line breaks.
    msgTextEl.innerHTML = ""; // start empty
    let i = 0;
    function typingStep() {
        if (i >= text.length) return;
        // Add one character (escaping HTML)
        const ch = text.charAt(i);
        if (ch === '\n') {
            msgTextEl.innerHTML += '<br>';
        } else {
            // naive escape for < and >
            if (ch === '<') msgTextEl.innerHTML += '&lt;';
            else if (ch === '>') msgTextEl.innerHTML += '&gt;';
            else msgTextEl.innerHTML += ch;
        }
        i++;
        msgTextEl.parentElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setTimeout(typingStep, speed + Math.random() * 10);
    }
    typingStep();
}

// -------------------------
// Keyword extraction & word cloud
// -------------------------
function extractTopKeywords(text, max = 12) {
    if (!text) return [];
    const words = text
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .map(w => w.toLowerCase())
        .filter(w => w.length > 2);
    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    const sorted = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0, max);
    return sorted.map(s => ({ word: s[0], count: s[1] }));
}

function buildWordCloudParticles(keywords) {
    // reset
    wordCloudParticles = [];
    if (!wordCloudCtx || !keywords || keywords.length === 0) return;
    const w = wordCloudCanvas.width;
    const h = wordCloudCanvas.height;
    for (let i = 0; i < keywords.length; i++) {
        const k = keywords[i];
        const size = 16 + Math.min(36, k.count * 8);
        const x = Math.random() * (w - 100) + 50;
        const y = Math.random() * (h - 60) + 30;
        const vx = (Math.random() - 0.5) * 0.4;
        const vy = (Math.random() - 0.5) * 0.4;
        const alpha = 0.6 + Math.random() * 0.4;
        wordCloudParticles.push({
            word: k.word,
            x, y, vx, vy, size, alpha, baseSize: size
        });
    }
}

function drawWordCloud() {
    if (!wordCloudCtx) return;
    const ctx = wordCloudCtx;
    const w = wordCloudCanvas.width;
    const h = wordCloudCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    wordCloudParticles.forEach(p => {
        ctx.font = `${p.size}px Nunito, sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.textAlign = "center";
        ctx.fillText(p.word, p.x, p.y);
    });
    ctx.restore();
}

function animateWordCloud() {
    if (!wordCloudCtx) return;
    const w = wordCloudCanvas.width;
    const h = wordCloudCanvas.height;
    wordCloudParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        // slight pulsing
        p.size = p.baseSize + Math.sin(Date.now() / 1000 + p.x) * 1.5;
        // wrap
        if (p.x < -50) p.x = w + 50;
        if (p.x > w + 50) p.x = -50;
        if (p.y < -50) p.y = h + 50;
        if (p.y > h + 50) p.y = -50;
    });
    drawWordCloud();
    wordCloudAnimFrame = requestAnimationFrame(animateWordCloud);
}

function startWordCloud(keywords) {
    if (!document.getElementById('word-cloud')) return;
    resizeWordCloudCanvas();
    buildWordCloudParticles(keywords);
    if (wordCloudAnimFrame) cancelAnimationFrame(wordCloudAnimFrame);
    animateWordCloud();
    // allow clicking on words to re-summarize focusing on that word
    wordCloudCanvas.onclick = function(e) {
        const rect = wordCloudCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // find nearest particle
        let nearest = null;
        let minDist = 99999;
        wordCloudParticles.forEach(p => {
            const d = Math.hypot(p.x - x, p.y - y);
            if (d < minDist) {
                minDist = d;
                nearest = p;
            }
        });
        if (nearest && minDist < 60) {
            // put the word into textarea and trigger summarization for focused keyword
            const textInput = document.getElementById('text-input');
            if (textInput) {
                textInput.value = textInput.value + `\n\nFocus: ${nearest.word}`;
                // simulate pressing Summarize (call backend)
                const geminiBtn = document.getElementById('gemini-btn');
                if (geminiBtn) geminiBtn.click();
            }
        }
    };
}

function stopWordCloud() {
    if (wordCloudAnimFrame) cancelAnimationFrame(wordCloudAnimFrame);
    if (wordCloudCanvas) {
        const ctx = wordCloudCtx;
        if (ctx) ctx.clearRect(0, 0, wordCloudCanvas.width, wordCloudCanvas.height);
        wordCloudCanvas.onclick = null;
    }
}

// -------------------------
// Background Effects: Matrix, Aurora, Stars
// -------------------------
let matrixInterval = null;
let matrixDrops = [];
let matrixCols = 0;

function startMatrixEffect() {
    stopExtraFX();
    fxActive = 'matrix';
    resizeFxCanvas();
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%";
    matrixCols = Math.floor(fxCanvasWidth / 16);
    matrixDrops = new Array(matrixCols).fill(1);
    const ctx = fxCtx;
    if (!ctx) return;

    function drawMatrix() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, fxCanvasWidth, fxCanvasHeight);
        ctx.fillStyle = "#0F0";
        ctx.font = "14px monospace";
        for (let i = 0; i < matrixCols; i++) {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            const x = i * 16;
            ctx.fillText(text, x, matrixDrops[i] * 16);
            if (matrixDrops[i] * 16 > fxCanvasHeight && Math.random() > 0.975) {
                matrixDrops[i] = 0;
            }
            matrixDrops[i]++;
        }
    }

    function loop() {
        if (fxActive !== 'matrix') return;
        drawMatrix();
        fxAnimationFrame = requestAnimationFrame(loop);
    }
    loop();
}

let auroraStart = 0;
function startAuroraEffect() {
    stopExtraFX();
    fxActive = 'aurora';
    resizeFxCanvas();
    const ctx = fxCtx;
    if (!ctx) return;

    function drawAurora() {
        const t = Date.now() * 0.0003;
        ctx.clearRect(0, 0, fxCanvasWidth, fxCanvasHeight);
        const gradient = ctx.createLinearGradient(0, 0, fxCanvasWidth, fxCanvasHeight);
        const r1 = Math.sin(t) * 0.5 + 0.5;
        const r2 = Math.cos(t * 0.7) * 0.5 + 0.5;
        gradient.addColorStop(0, `rgba(${50 + 200 * r1}, ${120 + 80 * r2}, 200, 0.12)`);
        gradient.addColorStop(0.5, `rgba(${120 + 140 * r2}, ${60 + 120 * r1}, ${160 + 40 * r2}, 0.14)`);
        gradient.addColorStop(1, `rgba(100, 180, 220, 0.1)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fxCanvasWidth, fxCanvasHeight);

        // soft waving lines
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const y = fxCanvasHeight * (i + 0.5) / 6;
            ctx.moveTo(0, y);
            for (let x = 0; x < fxCanvasWidth; x += 30) {
                const yy = y + Math.sin((x + t * 200) * 0.01 + i) * 30 * Math.sin(t + i);
                ctx.lineTo(x, yy);
            }
            ctx.strokeStyle = `rgba(180, 220, 255, ${0.02 + Math.abs(Math.sin(t + i)) * 0.05})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    }

    function loop() {
        if (fxActive !== 'aurora') return;
        drawAurora();
        fxAnimationFrame = requestAnimationFrame(loop);
    }
    loop();
}

let starParticles = [];
function startStarEffect() {
    stopExtraFX();
    fxActive = 'stars';
    resizeFxCanvas();
    const ctx = fxCtx;
    if (!ctx) return;

    // init stars
    starParticles = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
        starParticles.push({
            x: Math.random() * fxCanvasWidth,
            y: Math.random() * fxCanvasHeight,
            r: Math.random() * 1.6 + 0.4,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            blink: Math.random() * 1.5
        });
    }

    function drawStars() {
        ctx.clearRect(0, 0, fxCanvasWidth, fxCanvasHeight);
        ctx.fillStyle = "#001022";
        ctx.fillRect(0, 0, fxCanvasWidth, fxCanvasHeight);
        starParticles.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
            s.blink += 0.02;
            const alpha = 0.5 + Math.abs(Math.sin(s.blink)) * 0.5;
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();

            // wrap around
            if (s.x < 0) s.x = fxCanvasWidth;
            if (s.x > fxCanvasWidth) s.x = 0;
            if (s.y < 0) s.y = fxCanvasHeight;
            if (s.y > fxCanvasHeight) s.y = 0;
        });

        // occasional meteor
        if (Math.random() < 0.01) {
            const sx = Math.random() * fxCanvasWidth;
            const sy = 0;
            const ex = sx + Math.random() * 300 + 200;
            const ey = fxCanvasHeight;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = 'rgba(255,255,200,0.08)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    }

    function loop() {
        if (fxActive !== 'stars') return;
        drawStars();
        fxAnimationFrame = requestAnimationFrame(loop);
    }
    loop();
}

function stopExtraFX() {
    // stop fx animations
    fxActive = null;
    if (fxAnimationFrame) cancelAnimationFrame(fxAnimationFrame);
    fxAnimationFrame = null;
    // clear fx canvas
    const fxCanvas = document.getElementById('fx-canvas');
    if (fxCanvas && fxCanvas.getContext) {
        const ctx = fxCanvas.getContext('2d');
        ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    }
    // stop word cloud
    stopWordCloud();
}

// -------------------------
// Main Application Logic
// -------------------------
document.addEventListener('DOMContentLoaded', () => {
    init3D();

    // Resize fx & word cloud canvases initially
    resizeFxCanvas();
    resizeWordCloudCanvas();

    window.addEventListener('resize', () => {
        onWindowResize();
        resizeFxCanvas();
        resizeWordCloudCanvas();
    }, false);

    window.addEventListener('mousemove', onMouseMove);

    const textInput = document.getElementById('text-input');
    const summaryOutput = document.getElementById('summary-output'); // Chat container
    const loader = document.getElementById('loader');
    const buttonGroup = document.getElementById('button-group');
    const buttons = buttonGroup.querySelectorAll('.btn');
    const pdfBtn = document.getElementById('pdf-btn');
    const clearBtn = document.getElementById('clear-btn');

    // ✅ NEW export buttons
    const txtBtn = document.getElementById('txt-btn');
    const docxBtn = document.getElementById('docx-btn');
    const copyBtn = document.getElementById('copy-btn');

    // 🎤 NEW mic button
    const micBtn = document.getElementById('mic-btn');

    // canvas refs
    const confettiCanvas = document.getElementById("confetti-canvas");
    const fxCanvas = document.getElementById("fx-canvas");
    const wordCanvas = document.getElementById("word-cloud");

    // try to get fxCtx & word cloud ctx
    fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;
    wordCloudCanvas = wordCanvas;
    wordCloudCtx = wordCloudCanvas ? wordCloudCanvas.getContext('2d') : null;

    // 🎨 NEW Theme Selector Dropdown
    const themeSelector = document.getElementById('theme');
    if (themeSelector) {
        const applyTheme = (theme) => {
            document.body.className = ""; // reset
            document.body.classList.add(`${theme}-theme`);
            localStorage.setItem("theme", theme);

            // Theme-specific FX: keep old behavior plus allow bg-theme selection to control fx
            if (theme === "cyberpunk") {
                document.body.style.animation = "flicker 1.5s infinite alternate";
            } else if (theme === "hacker") {
                // keep matrix effect optional via bg-theme
            } else if (theme === "pastel") {
                startBubbleEffect();
            } else {
                document.body.style.animation = "none";
                stopExtraFX();
            }
        };

        // Load saved theme
        const savedTheme = localStorage.getItem("theme") || "dark";
        applyTheme(savedTheme);
        themeSelector.value = savedTheme;

        themeSelector.addEventListener("change", (e) => {
            applyTheme(e.target.value);
        });
    }

    // ⭐ ADDED: Background Animation Selector (bg-theme)
    const bgThemeSelector = document.getElementById('bg-theme');
    if (bgThemeSelector) {
        // restore saved bg-theme if any
        const savedBg = localStorage.getItem("bg-theme") || "none";
        bgThemeSelector.value = savedBg;
        if (savedBg === 'matrix') startMatrixEffect();
        if (savedBg === 'aurora') startAuroraEffect();
        if (savedBg === 'stars') startStarEffect && startStarEffect();

        bgThemeSelector.addEventListener('change', (e) => {
            const val = e.target.value;
            localStorage.setItem("bg-theme", val);
            stopExtraFX();
            if (val === 'matrix') startMatrixEffect();
            else if (val === 'aurora') startAuroraEffect();
            else if (val === 'stars') startStarEffect();
            else stopExtraFX();
        });
    }

    // --- 💾 Auto-Save Draft ---
    const savedDraft = localStorage.getItem("draftText");
    if (savedDraft) {
        textInput.value = savedDraft;
    }
    textInput.addEventListener("input", () => {
        localStorage.setItem("draftText", textInput.value);
    });

    const memoryToggle = document.getElementById("memory-toggle");
    const summaryMode = document.getElementById("summary-mode");
    const deleteDraftBtn = document.getElementById("delete-draft-btn");

    if (deleteDraftBtn) {
        deleteDraftBtn.addEventListener("click", () => {
            localStorage.removeItem("draftText");
            textInput.value = "";
            addMessage("bot", "🗑️ Draft deleted.");
        });
    }

    // --- 🕘 History Elements ---
    const historyPanel = document.getElementById("history-panel");
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    const historySearch = document.getElementById("history-search");
    const toggleHistoryBtn = document.getElementById("toggle-history");

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem("summaryHistory") || "[]");
        historyPanel.innerHTML = "";
        if (history.length === 0) {
            historyPanel.innerHTML = `<p class="text-slate-500">No history yet.</p>`;
            return;
        }
        history.forEach((item, idx) => {
            const entry = document.createElement("div");
            entry.className = "p-2 mb-1 bg-black/30 rounded cursor-pointer hover:bg-slate-700";
            entry.textContent = item.slice(0, 100) + (item.length > 100 ? "..." : "");
            entry.addEventListener("click", () => {
                summaryOutput.innerHTML = "";
                // show typed summary when clicking history
                const msgDiv = addMessage("bot", "");
                const msgTextEl = msgDiv.querySelector('.msg-text');
                typeSummary(item, msgTextEl, 12);
                // start word cloud for this entry
                const kws = extractTopKeywords(item, 12);
                startWordCloud(kws);
            });
            historyPanel.appendChild(entry);
        });
    }

    function saveToHistory(summary) {
        let history = JSON.parse(localStorage.getItem("summaryHistory") || "[]");
        history.unshift(summary);
        if (history.length > 40) history = history.slice(0, 40); // keep max 40
        localStorage.setItem("summaryHistory", JSON.stringify(history));
        renderHistory();
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", () => {
            localStorage.removeItem("summaryHistory");
            renderHistory();
        });
    }

    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener("click", () => {
            const sidebar = document.querySelector(".history-sidebar");
            if (sidebar) sidebar.classList.toggle("hidden");
        });
    }

    if (historySearch) {
        historySearch.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const entries = historyPanel.querySelectorAll("div");
            entries.forEach(entry => {
                entry.style.display = entry.textContent.toLowerCase().includes(query) ? "" : "none";
            });
        });
    }

    renderHistory(); // load on page start

    let typingIndicator = null;

    const addMessage = (sender, text, isTyping = false) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message', sender === 'user' ? 'user-msg' : 'bot-msg');

        const msgText = document.createElement('div');
        msgText.classList.add('msg-text');
        msgText.innerHTML = text.replace(/\n/g, '<br>');

        if (!isTyping) {
            const msgTime = document.createElement('div');
            msgTime.classList.add('msg-time');
            const now = new Date();
            msgTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            msgDiv.appendChild(msgText);
            msgDiv.appendChild(msgTime);
        } else {
            msgDiv.appendChild(msgText);
        }

        summaryOutput.appendChild(msgDiv);
        summaryOutput.scrollTop = summaryOutput.scrollHeight;

        return msgDiv;
    };

    const showTyping = () => {
        if (!typingIndicator) {
            typingIndicator = addMessage("bot", "Gemini is typing<span class='dots'>...</span>", true);
            animateDots(typingIndicator.querySelector(".dots"));
        }
    };

    const hideTyping = () => {
        if (typingIndicator) {
            summaryOutput.removeChild(typingIndicator);
            typingIndicator = null;
        }
    };

    const animateDots = (dotsEl) => {
        let dots = 0;
        setInterval(() => {
            dots = (dots + 1) % 4;
            dotsEl.textContent = ".".repeat(dots);
        }, 500);
    };

    // -------------------------
    // Backend API calls & display
    // -------------------------
    const callBackendAPI = async (endpoint) => {
        const text = textInput.value.trim();
        if (!text) {
            addMessage("bot", "⚠️ Please enter some text first.");
            return;
        }

        loader.classList.remove('hidden');
        pdfBtn.disabled = true;
        txtBtn.disabled = true;
        docxBtn.disabled = true;
        copyBtn.disabled = true;
        if (ttsBtn) ttsBtn.disabled = true;
        if (stopTtsBtn) stopTtsBtn.disabled = true;

        try {
            const apiUrl = `http://127.0.0.1:5000/${endpoint}`;
            const response = fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    language: document.getElementById("language").value,
                    // 🔥 NEW: send extra options
                    memory: memoryToggle?.checked || false,
                    mode: summaryMode?.value || "medium"
                })
            });

            if (endpoint === "ask-gemini") {
                addMessage("user", text);
                showTyping();
            }

            const res = await response;
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || `API request failed`);

            hideTyping();

            if (result.summary) {
                // Instead of directly dumping the summary, type it progressively
                if (endpoint === "ask-gemini") {
                    // add an empty bot message and type into it
                    const msgDiv = addMessage("bot", "");
                    const msgTextEl = msgDiv.querySelector('.msg-text');
                    typeSummary(result.summary, msgTextEl, 14);
                } else {
                    summaryOutput.innerHTML = "";
                    const msgDiv = addMessage("bot", "");
                    const msgTextEl = msgDiv.querySelector('.msg-text');
                    typeSummary(result.summary, msgTextEl, 14);
                }

                // Save to history and start word cloud
                saveToHistory(result.summary);

                // create word cloud based on summary keywords
                const kws = extractTopKeywords(result.summary, 16);
                startWordCloud(kws);

                pdfBtn.disabled = false;
                txtBtn.disabled = false;
                docxBtn.disabled = false;
                copyBtn.disabled = false;
                if (ttsBtn) ttsBtn.disabled = false;
                if (stopTtsBtn) stopTtsBtn.disabled = false;
            } else {
                addMessage("bot", "❌ Could not retrieve a result. " + (result.error || ''));
            }
        } catch (error) {
            hideTyping();
            addMessage("bot", `❌ Error: ${error.message}`);
        } finally {
            loader.classList.add('hidden');
            textInput.value = "";
            textInput.focus();
        }
    };

    buttonGroup.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.btn');
        if (!clickedButton) return;
        buttons.forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
        clickedButton.classList.replace('btn-secondary', 'btn-primary');
        
        const endpointMap = {
            'gemini-btn': 'summarize-gemini',
            'bullets-btn': 'summarize-gemini-bullets',
            'takeaways-btn': 'summarize-gemini-takeaways',
            'links-btn': 'extract-links',
            'ask-btn': 'ask-gemini'
        };
        const endpoint = endpointMap[clickedButton.id];
        if (endpoint) callBackendAPI(endpoint);
    });

    // ✅ Enter-to-send support
    textInput.addEventListener('keydown', (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            callBackendAPI("ask-gemini");
        }
    });

    // ✅ Clear memory button
    clearBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/clear-memory', { method: 'POST' });
            if (response.ok) {
                summaryOutput.innerHTML = "";
                addMessage("bot", "🗑️ Memory cleared. Start a new conversation.");
                textInput.value = "";
                textInput.focus();
            }
        } catch (error) {
            addMessage("bot", "❌ Error clearing memory.");
        }
    });

    // ✅ Export Features
    copyBtn.addEventListener("click", () => {
        const summary = summaryOutput.innerText.trim();
        if (!summary) return;
        navigator.clipboard.writeText(summary).then(() => {
            addMessage("bot", "✅ Summary copied to clipboard!");
            // small confetti on copy
            launchConfetti();
        });
    });

    txtBtn.addEventListener("click", () => {
        const summary = summaryOutput.innerText.trim();
        if (!summary) return;
        const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "summary.txt";
        link.click();
        launchConfetti();
    });

    docxBtn.addEventListener("click", () => {
        const summary = summaryOutput.innerText.trim();
        if (!summary) return;
        const header = `Summary Document\n\n====================\n\n`;
        const content = header + summary;
        const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "summary.docx";
        link.click();
        launchConfetti();
    });

    // 🎵 Play beep utility
    function playBeep(frequency = 600, duration = 0.15) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    }

    // ✅ Speech-to-Text Mic Button
    if (micBtn && 'webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        micBtn.addEventListener("click", () => {
            playBeep(800, 0.12); // 🔔 start listening beep
            recognition.start();
            micBtn.classList.add("listening");
            micBtn.style.animation = "pulse 1s infinite";
        });

        recognition.onresult = (event) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            textInput.value = transcript;
        };

        recognition.onerror = () => {
            addMessage("bot", "❌ Voice recognition error.");
        };

        recognition.onend = () => {
            playBeep(400, 0.12); // 🔔 stop listening beep
            micBtn.classList.remove("listening");
            micBtn.style.animation = "none";
        };
    }

    // ✅ Text-to-Speech (TTS) Buttons
    const ttsBtn = document.getElementById("tts-btn");
    const stopTtsBtn = document.getElementById("stop-tts-btn");
    const voiceSelect = document.getElementById("voice-select");

    if (voiceSelect) {
        function loadVoices() {
            const voices = speechSynthesis.getVoices();
            voiceSelect.innerHTML = "";
            voices.forEach(v=>{
                const opt=document.createElement("option");
                opt.value=v.name; opt.textContent=v.name + (v.lang ? ` (${v.lang})` : '');
                voiceSelect.appendChild(opt);
            });
        }
        speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }

    if (ttsBtn && stopTtsBtn) {
        ttsBtn.addEventListener("click", () => {
            const summary = summaryOutput.innerText.trim();
            if (!summary) return;

            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(summary);
            const selectedVoice = speechSynthesis.getVoices().find(v => v.name === (voiceSelect?.value || ""));
            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.lang = document.getElementById("language").value === "auto" ? "en-US" : document.getElementById("language").value;
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;
            speechSynthesis.speak(utterance);

            stopTtsBtn.disabled = false;
            launchConfetti();
        });

        stopTtsBtn.addEventListener("click", () => {
            speechSynthesis.cancel();
            stopTtsBtn.disabled = true;
        });
    }

    // ✅ Focus input on page load
    textInput.focus();

    // --- 📂 Drag & Drop Uploads ---
    const dropZone = document.querySelector(".drop-zone");
    if (dropZone) {
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("dragover");
        });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            const file = e.dataTransfer.files[0];
            if (!file) return;

            if (file.type === "text/plain") {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    textInput.value = ev.target.result;
                };
                reader.readAsText(file);
            } else if (file.type === "application/pdf") {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const pdfData = new Uint8Array(ev.target.result);
                    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                    let extracted = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        extracted += textContent.items.map((s) => s.str).join(" ") + "\n";
                    }
                    textInput.value = extracted;
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert("❌ Only .txt and .pdf files are supported.");
            }
        });
    }

    // --- 📂 Browse Button Uploads ---
    const browseBtn = document.getElementById("browse-btn");
    const fileInput = document.getElementById("file-input");
    if (browseBtn && fileInput) {
        browseBtn.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.type === "text/plain") {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    textInput.value = ev.target.result;
                };
                reader.readAsText(file);
            } else if (file.type === "application/pdf") {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const pdfData = new Uint8Array(ev.target.result);
                    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                    let extracted = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        extracted += textContent.items.map((s) => s.str).join(" ") + "\n";
                    }
                    textInput.value = extracted;
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert("❌ Only .txt and .pdf files are supported.");
            }
        });
    }

    // --- Rephrase buttons (use existing backend summarizer for variations) ---
    document.querySelectorAll(".rephrase").forEach(btn => {
        btn.addEventListener("click", async () => {
            const tone = btn.dataset.tone;
            const summary = summaryOutput.innerText.trim();
            if (!summary) return;
            try {
                const apiUrl = `http://127.0.0.1:5000/summarize-gemini`;
                const res = await fetch(apiUrl, {
                    method: "POST",
                    headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({ text: summary, language: document.getElementById("language").value })
                });
                const result = await res.json();
                if (result.summary) {
                    summaryOutput.innerHTML = "";
                    const msgDiv = addMessage("bot", "");
                    const msgTextEl = msgDiv.querySelector('.msg-text');
                    typeSummary(result.summary, msgTextEl, 12);
                    saveToHistory(result.summary);

                    // update word cloud for rephrased summary
                    const kws = extractTopKeywords(result.summary, 16);
                    startWordCloud(kws);
                }
            } catch (e) {
                addMessage("bot", "❌ Rephrase failed.");
            }
        });
    });

    // --- Confetti FX ---
    function launchConfetti() {
        if (!confettiCanvas) return;
        const ctx = confettiCanvas.getContext("2d");
        const pieces = [];
        for (let i = 0; i < 150; i++) {
            pieces.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight - window.innerHeight,
                size: Math.random() * 8 + 4,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                speed: Math.random() * 3 + 2,
                rotation: Math.random() * 360
            });
        }
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;

        function draw() {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            pieces.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
                ctx.restore();
                p.y += p.speed;
                p.rotation += 0.1;
            });
        }
        let frame = 0;
        function animate() {
            frame++;
            draw();
            if (frame < 150) requestAnimationFrame(animate);
            else ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
        animate();
    }

    // trigger confetti on export buttons
    [pdfBtn, txtBtn, docxBtn, copyBtn, ttsBtn].forEach(btn=>{
        if (btn) btn.addEventListener("click", () => {
            // small delay so UI state updates before confetti
            setTimeout(launchConfetti, 80);
        });
    });

}); // end DOMContentLoaded

// --- 🎆 Extra FX Functions (already defined earlier but keep as safe defaults) ---
function startMatrixEffect() {
    // placeholder (will be replaced at DOMContentLoaded if bg-theme chosen)
    // real implementation exists above inside main block for scoping reasons
    if (typeof window !== 'undefined') {
        // Try to call top-level implementation (already assigned)
        try {
            // nothing here; actual impl lives in scope above
        } catch (e) {}
    }
}
function startBubbleEffect() {
    // small bubble-like overlay; keep minimal to avoid heavy CPU
    const fxCanvas = document.getElementById('fx-canvas');
    if (!fxCanvas) return;
    const ctx = fxCanvas.getContext('2d');
    let particles = [];
    const w = fxCanvas.width = window.innerWidth;
    const h = fxCanvas.height = window.innerHeight;
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 12 + 6,
            vy: -0.2 - Math.random() * 0.8,
            alpha: 0.02 + Math.random() * 0.08
        });
    }
    function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
            p.y += p.vy;
            if (p.y < -50) p.y = h + 50;
        });
    }
    let anim = requestAnimationFrame(function loop(){
        draw();
        anim = requestAnimationFrame(loop);
    });
    // clear after 12s
    setTimeout(() => {
        cancelAnimationFrame(anim);
        ctx.clearRect(0, 0, w, h);
    }, 12000);
}
function stopExtraFX() {
    // top-level stop: inside main we defined a more thorough implementation
    // this is a minimal fallback
    const fxCanvas = document.getElementById('fx-canvas');
    if (fxCanvas && fxCanvas.getContext) {
        const ctx = fxCanvas.getContext('2d');
        ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    }
    const wc = document.getElementById('word-cloud');
    if (wc && wc.getContext) {
        const ctx = wc.getContext('2d');
        ctx.clearRect(0, 0, wc.width, wc.height);
    }
}

// END OF FILE

