// --- ESTADO GENERAL e IDIOMA ---
let lang = 2; // 2 = Español
let voiceLocale = "es-ES";

// --- CONFIGURACIÓN DE ACCESIBILIDAD ---
let tipoAccesibilidad = "tts"; 

// --- VARIABLES DEL JUEGO ---
let score = 0;
let chance = 1;
let ticker = 60000; 
let safe = 0;
let playing = false;
let gameInterval = null;
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

// --- POOL DE AUDIOS DE MUERTE (DERROTA FINAL) ---
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

// --- SISTEMA DE VOZ INTELIGENTE ---
function speakText(text, callback = null) {
    window.speechSynthesis.cancel();
    screenReaderBox.innerText = "";

    if (tipoAccesibilidad === "reader") {
        setTimeout(() => {
            screenReaderBox.innerText = text;
        }, 50);
        if (callback) callback();
    } else {
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.rate = 1.2; 

        if (callback) {
            utterance.onend = callback;
        }
        window.speechSynthesis.speak(utterance);
    }
}

// --- FUNCIONES DE AUDIO PARA EFECTOS ---
function playSound(file, loop = false, volume = 1.0) {
    let sound = new Audio(`${file}.mp3`);
    sound.loop = loop;
    sound.volume = volume;
    sound.play().catch(e => console.log("Error al reproducir: " + file));
    return sound;
}

// Arranque según el entorno
const esElectron = navigator.userAgent.toLowerCase().includes('electron');

if (esElectron) {
    window.addEventListener('DOMContentLoaded', () => {
        initAudio();
        if (splashScreen) splashScreen.style.display = 'none';
        initConfigMenu(); 
    });
} else {
    splashScreen.addEventListener('click', () => {
        initAudio();
        splashScreen.style.display = 'none';
        initConfigMenu(); 
    });
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// --- REPARADO: MENÚ DE CONFIGURACIÓN CON MENSAJE INTELIGENTE HÍBRIDO ---
function initConfigMenu() {
    currentMenuType = "config";
    
    // El texto del cartel visual ahora indica claramente qué hacer en ambos casos
    menuDisplay.innerText = "1: Lector de Pantalla (NVDA/JAWS) / 2: Voz del Sistema (SAPI)";
    
    // Clavamos el foco para capturar el teclado al instante
    gameCanvas.focus();
    
    const mensajeInicial = "Configuración de accesibilidad. Si usas NVDA o JAWS, pulsa uno para activar el lector de pantalla. Si no tienes un lector activo, pulsa dos para usar la voz del sistema.";
    
    // Canal 1: Inyección directa en el aria-live (Lo va a leer NVDA o JAWS si están encendidos)
    screenReaderBox.innerText = mensajeInicial;
    
    // Canal 2: Forzamos la voz del sistema (Garantiza que suene por altavoz si el usuario está a ciegas y sin lector)
    window.speechSynthesis.cancel();
    let initialUtterance = new SpeechSynthesisUtterance(mensajeInicial);
    initialUtterance.lang = "es-ES";
    initialUtterance.rate = 1.1;
    window.speechSynthesis.speak(initialUtterance);
}

// --- MENÚ PRINCIPAL ---
function initMainMenu() {
    currentMenuType = "main";
    menuActive = true;
    playing = false;
    
    gameTitle.innerText = "¡Código 7!";
    menuItems = ["Iniciar Atraco", "Entrenar el Oído", "Salir del Juego"];
    menuDisplay.innerText = `-> ${menuItems[menuIndex]} <-`;
    gameCanvas.focus(); 
    
    speakText("Menú principal. ¡Código 7! Usa las flechas arriba y abajo para navegar.", () => {
        if (menuActive) updateMenuVisual();
    });

    musicAudio.pause();
    musicAudio = new Audio("menu_music.mp3");
    musicAudio.loop = true;
    musicAudio.volume = 0.2;
    musicAudio.play().catch(e => {});

    menuIndex = 0;
}

function updateMenuVisual() {
    menuDisplay.innerText = `-> ${menuItems[menuIndex]} <-`;
    speakText(menuItems[menuIndex]);
}

// --- LÓGICA DEL JUEGO CENTRAL ---
function startGame() {
    menuActive = false;
    window.speechSynthesis.cancel(); 
    score = 0; chance = 1; ticker = 60000; currentMusLevel = 0;
    safe = Math.floor(Math.random() * 7) + 1;
    
    musicAudio.pause(); 
    let startingSound = playSound("g_starting", false, 1.0);
    
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

    setTimeout(() => {
        playing = true;
        lastTime = Date.now();
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 50);
    }, 2500);
}

function gameLoop() {
    if (!playing) return;
    let now = Date.now(); let delta = now - lastTime; lastTime = now;
    ticker -= delta;

    if (ticker <= 0) { gameOver(); return; }

    let pctRestante = (ticker / 60000); 
    let intensidad = 1 - pctRestante;
    
    policeAudio.volume = Math.min(intensidad * 0.4, 1.0);
    heartAudio.volume = Math.min(0.1 + (intensidad * 0.6), 1.0);

    if (ticker <= 60000 && ticker > 40000) {
        switchMusic("gm1");
    } else if (ticker <= 40000 && ticker > 15000) {
        switchMusic("gm2");
    } else if (ticker <= 15000) {
        switchMusic("gm3");
    }

    audioTickCounter += delta;
    let tickSpeed = ticker > 15000 ? 1000 : 400;
    if (audioTickCounter >= tickSpeed) {
        audioTickCounter = 0;
        if (ticker > 5000) {
            playSound("g_tick", false, 0.3);
        } else {
            playSound("g_alarm", false, 0.4);
        }
    }
    hudText.innerText = "Puntuación: " + score + ` | T: ${(ticker/1000).toFixed(1)}s`;
}

function switchMusic(trackName) {
    if (currentMusLevel === trackName) return;
    currentMusLevel = trackName;
    bgAudio.pause();
    bgAudio = new Audio(`${trackName}.mp3`);
    bgAudio.loop = true;
    bgAudio.volume = 0.2;
    bgAudio.play().catch(e => {});
}

// --- ESCUCHA DE TECLADO ÚNICA ---
gameCanvas.addEventListener('keydown', (event) => {
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

    if (menuActive) {
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
                startGame();
            } else if (menuIndex === 1) {
                menuActive = false;
                runLearnMode();
            } else if (menuIndex === 2) {
                speakText("Saliendo del juego. Hasta la próxima.");
                menuDisplay.innerText = "Juego Cerrado";
                setTimeout(() => {
                    window.close();
                    document.body.innerHTML = `
                        <div style="background:#000; color:#888; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                            <p style="font-size: 1.5rem;">Has salido del juego.</p>
                        </div>
                    `;
                }, 1500);
            }
        }
        return;
    }

    if (playing) {
        if ((event.key >= '1' && event.key <= '7') || event.key === 'Escape') {
            event.preventDefault();
        }
        if (event.key >= '1' && event.key <= '7') {
            check(parseInt(event.key));
        }
        if (event.key === 'Escape') {
            abortGame();
        }
    }
});

function check(num) {
    if (num === safe) {
        safe = Math.floor(Math.random() * 7) + 1;
        if (chance === 1) { 
            playSound("g_right1"); score += 10; ticker += 3000; 
        } else if (chance === 2) { 
            playSound("g_right2"); score += 8; ticker += 1500; 
        } else { 
            playSound("g_right3"); score += 5; ticker += 800; 
        }
        chance = 1;
    } else {
        chance++;
        if (chance > 3) {
            safe = Math.floor(Math.random() * 7) + 1;
            playSound("g_plose"); 
            score -= 1; ticker -= 300; chance = 1;
        } else {
            ticker -= 200;
            let distance = safe - num;
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
    speakText("Modo entrenamiento. Presiona uno para sonido más alto, dos para más bajo, tres para caja perdida. Sal con escape.");
    menuDisplay.innerText = "[ Entrenando Oído ]";
    
    const learnHandler = (e) => {
        if (e.key === '1') { playSound("g_higher"); }
        if (e.key === '2') { playSound("g_lower"); }
        if (e.key === '3') { playSound("g_plose"); }
        if (e.key === 'Escape') {
            window.removeEventListener('keydown', learnHandler);
            initMainMenu();
        }
    };
    window.addEventListener('keydown', learnHandler);
}

function abortGame() {
    playing = false; clearInterval(gameInterval); stopAtmosphere();
    initMainMenu();
}

function gameOver() {
    playing = false; 
    clearInterval(gameInterval); 
    stopAtmosphere();
    
    const randomDeathIndex = Math.floor(Math.random() * deathSounds.length);
    const chosenDeathSound = deathSounds[randomDeathIndex];
    
    let finalBoom = playSound(chosenDeathSound, false, 1.0); 
    
    setTimeout(() => {
        let statsMsg = `Fin del atraco. Tu puntuación final es de ${score} puntos.`;
        speakText(statsMsg, () => {
            initMainMenu();
        });
    }, 2000); 
}

function stopAtmosphere() {
    bgAudio.pause();
    policeAudio.pause();
    heartAudio.pause();
}