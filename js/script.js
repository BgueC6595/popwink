const img1 = "assets/img/hoodC.png"; 

const img2 = "assets/img/hoodO.png"; 

const regularSounds = [
	'assets/sound/sound1.mp3', 
	'assets/sound/sound2.mp3', 
	'assets/sound/sound3.mp3',
	'assets/sound/sound4.mp3'
]; 

const secretSounds = [
	'assets/sound/secret1.mp3', 
	'assets/sound/secret2.mp3', 
	'assets/sound/secret3.mp3'
];

const soundFiles = [...regularSounds, ...secretSounds];

const secretChanceBase = 0.01; 

let currentSecretChance = secretChanceBase;
let hasMenuBeenOpened = false; 

const backgroundPool = [
    { url: 'assets/img/background1.jpg', weight: 0.8 },
    { url: 'assets/img/background2.jpg', weight: 0.19 },
    { url: 'assets/img/background3.jpg', weight: 0.01 }
];

const counterDisplay = document.getElementById('counter');
const mainImage = document.getElementById('main-image');
const bgContainer = document.querySelector('.background-container');
const bgMenu = document.getElementById('bg-menu');
const bgOptionsContainer = document.querySelector('.bg-options');
const fileInput = document.getElementById('custom-bg-upload');

const preloadImage = new Image();
preloadImage.src = img2;

function setBackground(url) {
    const styleUrl = url.startsWith('data:') ? url : url;
    bgContainer.style.background = `url('${styleUrl}') no-repeat center center`;
    bgContainer.style.backgroundSize = "cover";
}

function getWeightedBackground() {
    const definedItems = backgroundPool.filter(bg => bg.weight !== undefined);
    const undefinedItems = backgroundPool.filter(bg => bg.weight === undefined);
    const sumDefined = definedItems.reduce((sum, bg) => sum + bg.weight, 0);

    let itemsWithWeights;
    if (sumDefined < 1 && undefinedItems.length > 0) {
        const remaining = 1 - sumDefined;
        const splitWeight = remaining / undefinedItems.length;
        itemsWithWeights = backgroundPool.map(bg => ({
            ...bg,
            calcWeight: bg.weight !== undefined ? bg.weight : splitWeight
        }));
    } else {
        itemsWithWeights = backgroundPool.map(bg => ({
            ...bg,
            calcWeight: bg.weight !== undefined ? bg.weight : 1
        }));
    }

    const totalWeight = itemsWithWeights.reduce((sum, bg) => sum + bg.calcWeight, 0);
    let random = Math.random() * totalWeight;

    for (const bg of itemsWithWeights) {
        if (random < bg.calcWeight) return bg.url;
        random -= bg.calcWeight;
    }
    return backgroundPool[0].url;
}

function initBackground() {
    const randomBgUrl = getWeightedBackground();
    setBackground(randomBgUrl);

    bgOptionsContainer.innerHTML = ''; 
    backgroundPool.forEach(bg => {
        const btn = document.createElement('div');
        btn.className = 'bg-thumb';
        btn.style.backgroundImage = `url('${bg.url}')`;
        btn.title = "Select this background";
        btn.onclick = () => setBackground(bg.url);
        bgOptionsContainer.appendChild(btn);
    });
}

function applySecretBonus() {
    if (!hasMenuBeenOpened) {
        currentSecretChance = secretChanceBase * 2;
        hasMenuBeenOpened = true;
    }
}

const headerElement = document.querySelector('header');
let tapCount = 0;
let tapTimer;

function handleSecretTrigger(e) {
    e.stopPropagation(); 
    tapCount++;

    if (tapCount >= 5) {
        bgMenu.classList.remove('hidden');
        applySecretBonus();
        tapCount = 0;
    }

    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 500); 
}

headerElement.addEventListener('touchstart', handleSecretTrigger, { passive: false });
headerElement.addEventListener('mousedown', handleSecretTrigger);

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setBackground(event.target.result);
            bgMenu.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

initBackground();

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let soundBuffers = [];

async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

async function initAudio() {
    try {
        const loadedBuffers = await Promise.all(soundFiles.map(url => loadSound(url)));
        soundBuffers = loadedBuffers;
        console.log("All sounds loaded in correct order!");
    } catch (e) {
        console.error("Audio loading failed:", e);
    }
}

initAudio();

function playSound(isSecret = false) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (soundBuffers.length === 0) return;

    let buffer;
    const source = audioCtx.createBufferSource();

    if (isSecret) {

        const startIndex = regularSounds.length;
        const randomIndex = startIndex + Math.floor(Math.random() * secretSounds.length);
        buffer = soundBuffers[randomIndex];

        source.playbackRate.value = 1.0; 
    } else {

        const randomIndex = Math.floor(Math.random() * regularSounds.length);
        buffer = soundBuffers[randomIndex];

        source.playbackRate.value = 0.9 + Math.random() * 0.2;
    }

    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
}

let count = localStorage.getItem('userCount') ? parseInt(localStorage.getItem('userCount')) : 0;
counterDisplay.innerText = count;

let isPressed = false;

function increment() {
    if (isPressed) return; 
    isPressed = true;

    count++;
    counterDisplay.innerText = count;
    localStorage.setItem('userCount', count);

    mainImage.src = img2;

    const randomRot = Math.floor(Math.random() * 20) - 10;
    counterDisplay.style.setProperty('--rotation', `${randomRot}deg`);
    counterDisplay.classList.add('pop');

    const roll = Math.random();
    if (roll < currentSecretChance) {
        playSound(true);
    } else {
        playSound(false);
    }
}

function resetState() {
    isPressed = false;
    mainImage.src = img1;
    counterDisplay.classList.remove('pop');
}

window.addEventListener('mousedown', (e) => {
    if (bgMenu.contains(e.target) && !bgMenu.classList.contains('hidden')) return;
    increment();
});
window.addEventListener('mouseup', resetState);

window.addEventListener('touchstart', (e) => {
    if (bgMenu.contains(e.target)) return;
    e.preventDefault(); 
    increment();
}, { passive: false });
window.addEventListener('touchend', resetState);

window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "Enter") increment();
    if (e.code === 'KeyB') {
        bgMenu.classList.toggle('hidden');
        if (!bgMenu.classList.contains('hidden')) applySecretBonus();
    }
    if (e.code === 'Escape') bgMenu.classList.add('hidden');
});


window.addEventListener('keyup', resetState);
