// --- ESTADO GENERAL e IDIOMA ---
let lang = 2; // 2 = Español
let voiceLocale = "es-ES";

// --- CONFIGURACIÓN DE ACCESIBILIDAD ---
let tipoAccesibilidad = "tts"; 

// --- VARIABLES DEL JUEGO Y ESTADÍSTICAS ---
let score = 0;
let chance = 1;
let ticker = 180000; 
let initialTicker = 180000;
let safeSequence = []; 
let sequenceIndex = 0; 
let maxDigit = 7; 
let gameMode = "story"; 
let currentLevel = 1; 

// ESTADÍSTICAS DE PARTIDA
let safesOpened = 0; 
let totalAttempts = 0;
let failedAttempts = 0;
let safesLost = 0;
let lastSummaryText = ""; // Guardará el texto para copiar al portapapeles

let playing = false;
let gameInterval = null;
let startFallbackTimer = null; // Guardará el timer de respaldo
let lastTime = 0;
let audioTickCounter = 0;
let currentMusLevel = 0;

// --- SISTEMA DE MENÚS ---
let menuActive = false;
let menuItems = [];
let menuIndex = 0;
let currentMenuType = "config"; 

// --- CONTENEDORES DE AUDIO ---
let audioCtx = null;
let musicAudio = new Audio();
let bgAudio = new Audio();
let policeAudio = new Audio();
let heartAudio = new Audio();

// --- POOL DE AUDIOS DE MUERTE ---
const deathSounds = [
    "g_death11", "g_death12", "g_death13", "g_death14", "g_death15", "g_death16",
    "g_death21", "g_death22", "g_death23", "g_death24", "g_death25", "g_death26"
];

const menuDisplay = document.getElementById('menuDisplay');
const hudText = document.getElementById('hud');
const gameCanvas = document.getElementById('gameCanvas');
const gameTitle = document.getElementById('gameTitle');
const splashScreen = document.getElementById('splashScreen');
const screenReaderBox = document.getElementById('screenReaderBox');
const gameInstructions = document.getElementById('gameInstructions');

// --- ASEGURAR FOCO EN EL CANVAS ---
function ensureCanvasFocus() {
    if (gameCanvas) {
        setTimeout(() => {
            gameCanvas.focus();
        }, 10);
    }
}

// --- SISTEMA DE VOZ SEPARADO Y CORREGIDO ---
function speakText(text, callback = null) {
    window.speechSynthesis.cancel();

    if (tipoAccesibilidad === "reader") {
        screenReaderBox.textContent = "";
        setTimeout(() => {
            screenReaderBox.textContent = text;
            if (callback) callback();
        }, 60);
    } else {
        screenReaderBox.textContent = "";
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceLocale;
        utterance.rate = 1.2; 

        if (callback) {
            utterance.onend = callback;
        }
        window.speechSynthesis.speak(utterance);
    }
}

// --- FUNCIONES DE AUDIO ---
function playSound(file, loop = false, volume = 1.0) {
    let sound = new Audio(`${file}.mp3`);
    sound.loop = loop;
    sound.volume = volume;
    sound.play().catch(e => console.log("Error al reproducir: " + file));
    if (!loop) {
        sound.onended = () => { sound = null; };
    }
    return sound;
}

const esElectron = navigator.userAgent.toLowerCase().includes('electron');

if (esElectron) {
    window.addEventListener('DOMContentLoaded', () => {
        initAudio();
        if (splashScreen) splashScreen.style.display = 'none';
        initConfigMenu(); 
    });
} else {
    if (splashScreen) {
        splashScreen.addEventListener('click', () => {
            initAudio();
            splashScreen.style.display = 'none';
            initConfigMenu(); 
        });
    }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// --- MENÚ DE CONFIGURACIÓN ---
function initConfigMenu() {
    currentMenuType = "config";
    menuDisplay.innerText = "1: Lector de Pantalla (NVDA/JAWS) / 2: Voz del Sistema (SAPI)";
    ensureCanvasFocus();

    const mensajeInicial = "Configuración de accesibilidad. Presiona 1 para Lector de Pantalla, o 2 para Voz del Sistema.";
    screenReaderBox.textContent = ""; 
    window.speechSynthesis.cancel();
    
    let initialUtterance = new SpeechSynthesisUtterance(mensajeInicial);
    initialUtterance.lang = voiceLocale;
    initialUtterance.rate = 1.1;
    window.speechSynthesis.speak(initialUtterance);
}

// --- MENÚ PRINCIPAL ---
function initMainMenu() {
    currentMenuType = "main";
    menuActive = true;
    playing = false;
    if (gameInterval) clearInterval(gameInterval);
    if (startFallbackTimer) clearTimeout(startFallbackTimer);

    gameTitle.innerText = "¡Código 7!";
    menuItems = ["Modo Historia", "Modo Supervivencia", "Entrenar el Oído", "Salir del Juego"];
    menuIndex = 0;
    
    ensureCanvasFocus(); 
    menuDisplay.innerText = `-> ${menuItems[menuIndex]} <-`;
    
    speakText(`Menú principal. ¡Código 7! Opciones: ${menuItems[menuIndex]}. Usa las flechas para navegar.`);

    musicAudio.pause();
    musicAudio = new Audio("menu_music.mp3");
    musicAudio.loop = true;
    musicAudio.volume = 0.2;
    musicAudio.play().catch(e => {});
}

// --- SUBMENÚ MODO HISTORIA ---
function initStoryMenu() {
    currentMenuType = "story_select";
    menuActive = true;
    menuItems = [
        "1. Banco Pequeño (Llegada patrulla: 3 minutos | Números 1-5)",
        "2. Banco Gran Ciudad (Llegada patrulla: 2 minutos | Números 1-7)",
        "3. La Reserva Federal (Llegada patrulla: 1 minuto | Claves dobles 0-9)",
        "Volver al Menú Principal"
    ];
    menuIndex = 0;
    ensureCanvasFocus();
    menuDisplay.innerText = `-> ${menuItems[menuIndex]} <-`;
    
    speakText(`Selecciona el banco a atracar. Opción actual: ${menuItems[menuIndex]}`);
}

function updateMenuVisual() {
    menuDisplay.innerText = `-> ${menuItems[menuIndex]} <-`;
    speakText(menuItems[menuIndex]);
}

// --- GENERADOR DE COMBINACIONES ---
function generateSafeCode() {
    safeSequence = [];
    sequenceIndex = 0;
    let sequenceLength = (gameMode === "story" && currentLevel === 3) ? 2 : 1;
    let minDigit = (gameMode === "story" && currentLevel === 3) ? 0 : 1;

    for (let i = 0; i < sequenceLength; i++) {
        let num = Math.floor(Math.random() * (maxDigit - minDigit + 1)) + minDigit;
        safeSequence.push(num);
    }
}

// --- LÓGICA DE INICIO Y CINEMÁTICA ---
function startGame(mode = "story", level = 1) {
    menuActive = false;
    playing = false;
    if (gameInterval) clearInterval(gameInterval);
    if (startFallbackTimer) clearTimeout(startFallbackTimer);
    
    window.speechSynthesis.cancel(); 
    stopAtmosphere();
    musicAudio.pause();

    currentMenuType = "intro";
    gameMode = mode;
    currentLevel = level;

    menuDisplay.innerText = "[ Preparando atraco... ]";
    ensureCanvasFocus();

    let startAudio = playSound("g_starting", false, 1.0);

    const startGameplayNow = () => {
        if (playing) return;
        if (startFallbackTimer) {
            clearTimeout(startFallbackTimer);
            startFallbackTimer = null;
        }

        safesOpened = 0;
        totalAttempts = 0;
        failedAttempts = 0;
        safesLost = 0;
        score = 0; 
        chance = 1; 
        currentMusLevel = 0;

        // Configuración de tiempos según nivel de prioridad policial
        if (gameMode === "story") {
            if (currentLevel === 1) {
                maxDigit = 5; 
                ticker = 180000; // 3 Minutos (Prioridad baja)
                if (gameInstructions) gameInstructions.innerHTML = "<strong>Banco Pequeño:</strong> Tienes 3 minutos antes de que llegue la patrulla. Usa números del <strong>1 al 5</strong>.";
            } else if (currentLevel === 2) {
                maxDigit = 7; 
                ticker = 120000; // 2 Minutos (Prioridad media)
                if (gameInstructions) gameInstructions.innerHTML = "<strong>Banco Gran Ciudad:</strong> Tienes 2 minutos antes de que llegue la patrulla. Usa números del <strong>1 al 7</strong>.";
            } else if (currentLevel === 3) {
                maxDigit = 9; 
                ticker = 60000; // 1 Minuto (Prioridad máxima)
                if (gameInstructions) gameInstructions.innerHTML = "<strong>La Reserva Federal:</strong> Tienes 1 minuto antes del despliegue táctico. Clave doble con números del <strong>0 al 9</strong>.";
            }
        } else {
            maxDigit = 7;
            ticker = 120000; // 2 Minutos iniciales en supervivencia
            if (gameInstructions) gameInstructions.innerHTML = "<strong>Modo Supervivencia:</strong> ¡Abre todas las cajas posibles y gana tiempo antes de que llegue la policía!";
        }

        initialTicker = ticker;
        generateSafeCode();

        currentMenuType = "game";
        menuDisplay.innerText = "[ En el atraco ]";
        hudText.style.display = "block";

        policeAudio.pause();
        policeAudio = new Audio("g_police.mp3");
        policeAudio.loop = true;
        policeAudio.volume = 0.0;
        policeAudio.play().catch(e => {});

        heartAudio.pause();
        heartAudio = new Audio("g_heart.mp3");
        heartAudio.loop = true;
        heartAudio.volume = 0.1;
        heartAudio.play().catch(e => {});

        playing = true;
        lastTime = Date.now(); 
        gameInterval = setInterval(gameLoop, 50);
    };

    if (startAudio) {
        startAudio.onended = startGameplayNow;
        startFallbackTimer = setTimeout(() => {
            if (!playing && currentMenuType === "intro") {
                startGameplayNow();
            }
        }, 20000);
    } else {
        startGameplayNow();
    }
}

function gameLoop() {
    if (!playing || currentMenuType !== "game") return;

    let now = Date.now(); 
    let delta = now - lastTime; 
    lastTime = now;
    ticker -= delta;

    if (ticker <= 0) { 
        gameOver(); 
        return; 
    }

    let pctRestante = Math.max(0, ticker / initialTicker); 
    let intensidad = 1 - pctRestante;
    
    // Volumen adaptativo de la policía y ritmo cardíaco
    policeAudio.volume = Math.min(intensidad * 0.5, 1.0);
    heartAudio.volume = Math.min(0.1 + (intensidad * 0.7), 1.0);

    if (ticker <= initialTicker && ticker > (initialTicker * 0.6)) {
        switchMusic("gm1");
    } else if (ticker <= (initialTicker * 0.6) && ticker > (initialTicker * 0.25)) {
        switchMusic("gm2");
    } else if (ticker <= (initialTicker * 0.25)) {
        switchMusic("gm3");
    }

    audioTickCounter += delta;
    let tickSpeed = ticker > 15000 ? 1000 : 350;
    if (audioTickCounter >= tickSpeed) {
        audioTickCounter = 0;
        if (ticker > 10000) {
            playSound("g_tick", false, 0.3);
        } else {
            playSound("g_alarm", false, 0.5);
        }
    }

    let min = Math.floor(ticker / 60000);
    let sec = Math.floor((ticker % 60000) / 1000);
    let timeFormatted = `${min}:${sec < 10 ? '0' : ''}${sec}`;

    hudText.innerText = `Puntuación: ${score} | Cajas: ${safesOpened} | Policía llega en: ${timeFormatted}`;
}

function switchMusic(trackName) {
    if (currentMusLevel === trackName || !playing) return;
    currentMusLevel = trackName;
    bgAudio.pause();
    bgAudio = new Audio(`${trackName}.mp3`);
    bgAudio.loop = true;
    bgAudio.volume = 0.2;
    bgAudio.play().catch(e => {});
}

// --- COPIAR RESULTADOS AL PORTAPAPELES ---
function copySummaryToClipboard() {
    if (!lastSummaryText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastSummaryText).then(() => {
            speakText("Estadísticas copiadas al portapapeles.");
        }).catch(() => {
            fallbackCopy(lastSummaryText);
        });
    } else {
        fallbackCopy(lastSummaryText);
    }
}

function fallbackCopy(text) {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        speakText("Estadísticas copiadas al portapapeles.");
    } catch (err) {
        speakText("No se pudo copiar al portapapeles.");
    }
    document.body.removeChild(textArea);
}

// --- ESCUCHA DE TECLADO UNIFICADA ---
function processInput(event) {
    initAudio();

    if (currentMenuType === "config") {
        if (event.key === '1' || event.key === '2') {
            event.preventDefault();
            tipoAccesibilidad = (event.key === '1') ? "reader" : "tts";
            playSound("menu_select", false, 0.6);
            window.speechSynthesis.cancel();
            initMainMenu();
        }
        return;
    }

    if (currentMenuType === "main" && menuActive) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            menuIndex = (menuIndex + 1) % menuItems.length;
            playSound("menu_move", false, 0.5);
            updateMenuVisual();
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
            playSound("menu_move", false, 0.5);
            updateMenuVisual();
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            playSound("menu_select", false, 0.6);
            if (menuIndex === 0) {
                initStoryMenu();
            } else if (menuIndex === 1) {
                startGame("survival", 2);
            } else if (menuIndex === 2) {
                runLearnMode();
            } else if (menuIndex === 3) {
                exitGame();
            }
        }
        return;
    }

    if (currentMenuType === "story_select" && menuActive) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            menuIndex = (menuIndex + 1) % menuItems.length;
            playSound("menu_move", false, 0.5);
            updateMenuVisual();
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
            playSound("menu_move", false, 0.5);
            updateMenuVisual();
        }
        else if (event.key === 'Escape') {
            event.preventDefault();
            initMainMenu();
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            playSound("menu_select", false, 0.6);
            if (menuIndex === 0) startGame("story", 1);
            else if (menuIndex === 1) startGame("story", 2);
            else if (menuIndex === 2) startGame("story", 3);
            else if (menuIndex === 3) initMainMenu();
        }
        return;
    }

    if (currentMenuType === "summary") {
        if (event.key === 'c' || event.key === 'C') {
            event.preventDefault();
            copySummaryToClipboard();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            speakText(lastSummaryText);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            initMainMenu();
        }
        return;
    }

    if (currentMenuType === "learn") {
        if (['1','2','3','Escape'].includes(event.key)) {
            event.preventDefault();
        }
        if (event.key === '1') playSound("g_higher");
        if (event.key === '2') playSound("g_lower");
        if (event.key === '3') playSound("g_plose");
        if (event.key === 'Escape') {
            initMainMenu();
        }
        return;
    }

    if (currentMenuType === "game" && playing) {
        if (event.key === 'Escape') {
            event.preventDefault();
            abortGame();
            return;
        }

        let num = parseInt(event.key);
        let minAllowed = (gameMode === "story" && currentLevel === 3) ? 0 : 1;
        
        if (!isNaN(num) && num >= minAllowed && num <= maxDigit) {
            event.preventDefault();
            check(num);
        }
    }
}

if (gameCanvas) {
    gameCanvas.addEventListener('keydown', processInput);
} else {
    window.addEventListener('keydown', processInput);
}

function check(num) {
    totalAttempts++; 
    let currentTarget = safeSequence[sequenceIndex];

    if (num === currentTarget) {
        sequenceIndex++;

        if (sequenceIndex >= safeSequence.length) {
            safesOpened++;
            
            if (chance === 1) { 
                playSound("g_right1"); score += 10; 
            } else if (chance === 2) { 
                playSound("g_right2"); score += 8; 
            } else { 
                playSound("g_right3"); score += 5; 
            }

            // Bono de tiempo de escape al abrir una caja con éxito
            if (gameMode === "survival") {
                ticker += 10000; // 10 segundos extra en supervivencia
            } else {
                ticker += 5000;  // 5 segundos extra en modo historia
            }

            chance = 1;
            generateSafeCode();
        } else {
            playSound("g_right1", false, 0.6);
            speakText("Siguiente dígito");
        }
    } else {
        failedAttempts++; 
        chance++;
        if (chance > 3) {
            safesLost++;
            playSound("g_plose"); 
            score = Math.max(0, score - 1); 
            ticker -= 5000; // Penalización por reventar la caja
            chance = 1;
            generateSafeCode();
        } else {
            ticker -= 1500; // Penalización menor por digito incorrecto
            let distance = currentTarget - num;
            if (distance > 0) {
                playSound("g_higher");
            } else {
                playSound("g_lower");
            }
        }
    }
}

function runLearnMode() {
    currentMenuType = "learn";
    menuActive = false;
    speakText("Modo entrenamiento. Presiona uno para sonido más alto, dos para más bajo, tres para caja perdida. Sal con escape.");
    menuDisplay.innerText = "[ Entrenando Oído ]";
    ensureCanvasFocus();
}

function abortGame() {
    playing = false; 
    if (gameInterval) clearInterval(gameInterval); 
    stopAtmosphere();
    initMainMenu();
}

// --- PANTALLA DE FIN DE JUEGO ---
function gameOver() {
    playing = false; 
    currentMenuType = "summary";

    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    
    stopAtmosphere();

    const randomDeathIndex = Math.floor(Math.random() * deathSounds.length);
    const chosenDeathSound = deathSounds[randomDeathIndex];
    let deathAudio = playSound(chosenDeathSound, false, 1.0); 

    menuDisplay.innerText = "¡Llegó la policía!";

    const displayAndSpeakResults = () => {
        let resultStatus = safesOpened > 0 ? "¡Fin del tiempo! La policía rodeó el edificio y has sido arrestado." : "¡Atraco fallido! La policía llegó al lugar antes de que pudieras abrir alguna caja.";
        
        lastSummaryText = `${resultStatus} Estadísticas de la partida: Puntuación total: ${score} puntos. Cajas fuertes abiertas: ${safesOpened}. Cajas perdidas: ${safesLost}. Intentos totales: ${totalAttempts}. Intentos fallidos: ${failedAttempts}. Presiona C para copiar las estadísticas al portapapeles, Enter para volver a escucharlas, o Escape para ir al menú principal.`;

        menuDisplay.innerText = `[ Fin de la Partida ]\nPuntuación: ${score} | Cajas: ${safesOpened}\n(Presiona C para copiar / Escape para salir)`;

        speakText(lastSummaryText);
    };

    if (deathAudio) {
        deathAudio.onended = displayAndSpeakResults;
    } else {
        displayAndSpeakResults();
    }
}

function stopAtmosphere() {
    if (bgAudio) { bgAudio.pause(); bgAudio.currentTime = 0; }
    if (policeAudio) { policeAudio.pause(); policeAudio.currentTime = 0; }
    if (heartAudio) { heartAudio.pause(); heartAudio.currentTime = 0; }
    currentMusLevel = 0;
}

function exitGame() {
    speakText("Saliendo del juego. Hasta la próxima.");
    menuDisplay.innerText = "Juego Cerrado";
    setTimeout(() => {
        if (esElectron) {
            window.close();
        } else {
            document.body.innerHTML = `
                <div style="background:#000; color:#888; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                    <p style="font-size: 1.5rem;">Has salido del juego. Puedes cerrar esta pestaña.</p>
                </div>
            `;
        }
    }, 1500);
}