
const sound = {
    volume: 0.6,
    isMuted: false,

    isTyping: false,
    typewriterOwner: null,

    channels: {}
};

const typewriterStartTime = 1;

const soundFadeDuration = 300;


function loadSoundSettings() {
    try {
        const savedVolume = localStorage.getItem("soundVolume");
        const savedMuted = localStorage.getItem("soundMuted");

        if (savedVolume !== null) {
            sound.volume = Number(savedVolume);
        }

        if (savedMuted !== null) {
            sound.isMuted = savedMuted === "true";
        }
    } catch (error) {
    }
}


function saveSoundSettings() {
    try {
        localStorage.setItem("soundVolume", String(sound.volume));
        localStorage.setItem("soundMuted", String(sound.isMuted));
    } catch (error) {
    }
}


function createChannel(name, src, startTime, isLoop, isLayer) {
    const audio = new Audio(src);

    audio.loop = isLoop !== false;
    audio.preload = "auto";

    sound.channels[name] = {
        audio: audio,
        startTime: startTime,
        isLayer: isLayer === true,
        level: 1,
        fadeTimer: null
    };
}


function applyVolume() {
    Object.keys(sound.channels).forEach(function (name) {
        const channel = sound.channels[name];

        channel.audio.volume = sound.volume * channel.level;
        channel.audio.muted = sound.isMuted;
    });
}


function isChannelPlaying(name) {
    const channel = sound.channels[name];

    return !channel.audio.paused && channel.fadeTimer === null;
}


function playChannel(name, fromStart) {
    const channel = sound.channels[name];

    if (!channel.isLayer) {
        Object.keys(sound.channels).forEach(function (otherName) {
            if (otherName !== name && !sound.channels[otherName].isLayer) {
                fadeOutChannel(otherName);
            }
        });
    }

    clearInterval(channel.fadeTimer);
    channel.fadeTimer = null;
    channel.level = 1;
    applyVolume();

    if (fromStart) {
        try {
            channel.audio.currentTime = channel.startTime;
        } catch (error) {
        }
    }

    channel.audio.play().catch(function () {
    });
}


function fadeOutChannel(name) {
    const channel = sound.channels[name];

    if (channel.audio.paused || channel.fadeTimer !== null) {
        return;
    }

    const stepTime = 20;
    const step = stepTime / soundFadeDuration;

    channel.fadeTimer = setInterval(function () {
        channel.level = Math.max(channel.level - step, 0);
        applyVolume();

        if (channel.level <= 0) {
            clearInterval(channel.fadeTimer);
            channel.fadeTimer = null;
            channel.audio.pause();
        }
    }, stepTime);
}


function startTypewriterSound(owner) {
    sound.isTyping = true;
    sound.typewriterOwner = owner;

    playChannel("typewriter", true);
}


function stopTypewriterSound(owner) {
    if (owner !== sound.typewriterOwner) {
        return;
    }

    sound.isTyping = false;
    sound.typewriterOwner = null;

    fadeOutChannel("typewriter");
}


function startCarSound() {
    playChannel("car", true);
}


function stopCarSound() {
    fadeOutChannel("car");
}


function startDarkSound() {
    if (isChannelPlaying("dark")) {
        return;
    }

    playChannel("dark", true);
}


function stopDarkSound() {
    fadeOutChannel("dark");
}


function playDoorSound() {
    playChannel("door", true);
}


function stopDoorSound() {
    fadeOutChannel("door");
}


function playMessageSound() {
    playChannel("message", true);
}


function playChoiceSound() {
    playChannel("choice", true);
}


function playPageFlipSound() {
    playChannel("flip", true);
}


const pencilWriteTime = 1000;
let pencilTimer = null;

function playPencilSound() {
    if (!isChannelPlaying("pencil")) {
        playChannel("pencil", false);
    }

    clearTimeout(pencilTimer);
    pencilTimer = setTimeout(stopPencilSound, pencilWriteTime);
}


function stopPencilSound() {
    clearTimeout(pencilTimer);
    pencilTimer = null;
    fadeOutChannel("pencil");
}


const heartbeatMaxRate = 1.6;

const heartbeat = {
    baseInterval: 900,
    isOn: false
};


function startHeartbeat(interval) {
    heartbeat.baseInterval = interval;
    heartbeat.isOn = true;

    setHeartbeatRate(interval);
    playChannel("heart", true);
}


function setHeartbeatRate(interval) {
    const rate = Math.min(Math.max(heartbeat.baseInterval / interval, 0.5), heartbeatMaxRate);

    sound.channels.heart.audio.playbackRate = rate;
}


function stopHeartbeat() {
    heartbeat.isOn = false;
    fadeOutChannel("heart");
}


function unlockSound() {
    if (sound.isTyping && sound.channels.typewriter.audio.paused) {
        playChannel("typewriter", false);
    }
}


function setupSound() {
    const button = document.querySelector(".sound__button");
    const slider = document.querySelector(".sound__slider");

    createChannel("typewriter", "sounds/typewriter.mp3", typewriterStartTime);

    createChannel("car", "sounds/car-ride.m4a", 0);

    createChannel("dark", "sounds/darkness.mp3", 0, true, true);
    createChannel("door", "sounds/door.mp3", 0, false, true);

    createChannel("heart", "sounds/heartbeat.mp3", 0, true, true);

    createChannel("message", "sounds/message.m4a", 0, false, true);

    createChannel("choice", "sounds/choice.mp3", 0, false, true);

    createChannel("flip", "sounds/page-flip.mp3", 0, false, true);

    createChannel("pencil", "sounds/pencil.mp3", 0, true, true);

    loadSoundSettings();
    applyVolume();

    slider.value = Math.round(sound.volume * 100);
    updateSoundControls(button, slider);

    button.addEventListener("click", function () {
        sound.isMuted = !sound.isMuted;

        if (!sound.isMuted && sound.volume === 0) {
            sound.volume = 0.6;
            slider.value = 60;
        }

        applyVolume();
        saveSoundSettings();
        updateSoundControls(button, slider);
    });

    document.addEventListener("pointerdown", unlockSound);
    document.addEventListener("keydown", unlockSound);

    slider.addEventListener("input", function () {
        sound.volume = slider.value / 100;
        sound.isMuted = sound.volume === 0;

        applyVolume();
        saveSoundSettings();
        updateSoundControls(button, slider);
    });
}


function updateSoundControls(button, slider) {
    button.classList.toggle("sound__button--muted", sound.isMuted);

    if (sound.isMuted) {
        button.setAttribute("aria-label", "Включить звук");
    } else {
        button.setAttribute("aria-label", "Выключить звук");
    }

    const filled = sound.isMuted ? 0 : slider.value;
    slider.style.setProperty("--filled", filled + "%");
}
