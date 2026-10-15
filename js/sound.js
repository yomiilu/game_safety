// ---------- звуки ----------
// правила: одновременно играет только один звук; звук играет, только пока его экран на месте;
// выключается не резко, а быстрым плавным затуханием.
// исключение — фоновые звуки (темнота, дверь): они звучат поверх остальных и их не глушат

const sound = {
    volume: 0.6,
    isMuted: false,

    // машинка сейчас должна печатать (даже если браузер пока не дал включить звук)
    isTyping: false,
    // кто включил машинку: заголовок или конкретная реплика — выключить может только он
    typewriterOwner: null,

    // каналы: у каждого свой звук и своя громкость внутри (для затухания)
    channels: {}
};

// в начале файла машинки секунда тишины — пропускаем её
const typewriterStartTime = 1;

// за сколько (мс) звук затихает
const soundFadeDuration = 300;



// громкость и «выключено» запоминаем в браузере, чтобы при перезаходе не сбрасывались
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
        // если браузер не даёт сохранять — просто работаем с настройками по умолчанию
    }
}


function saveSoundSettings() {
    try {
        localStorage.setItem("soundVolume", String(sound.volume));
        localStorage.setItem("soundMuted", String(sound.isMuted));
    } catch (error) {
        // ничего страшного, просто не запомнится
    }
}


// isLoop — повторять по кругу; isLayer — фоновый звук: играет поверх остальных, другие его не глушат
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


// включаем канал; все остальные быстро затихают — звуки не накладываются
// (фоновые звуки не глушат других и сами не глушатся)
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

    // некоторые браузеры (Safari) ругаются, если перематывать ещё не загруженный звук — тогда просто играем с начала
    if (fromStart) {
        try {
            channel.audio.currentTime = channel.startTime;
        } catch (error) {
            // перемотать не вышло — не страшно
        }
    }

    // до первого клика браузер звук не включит — тогда просто молчим, ошибки не будет
    channel.audio.play().catch(function () {
        // звук ещё не разрешён
    });
}


// быстрое плавное затухание, потом пауза
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


// ---------- печатная машинка ----------

// owner — кто печатает: "title" (первый экран) или селектор реплики
function startTypewriterSound(owner) {
    sound.isTyping = true;
    sound.typewriterOwner = owner;

    playChannel("typewriter", true);
}


// выключить может только тот, кто включил (чтобы конец одной печати не оборвал другую)
function stopTypewriterSound(owner) {
    if (owner !== sound.typewriterOwner) {
        return;
    }

    sound.isTyping = false;
    sound.typewriterOwner = null;

    fadeOutChannel("typewriter");
}


// ---------- машина ----------

function startCarSound() {
    playChannel("car", true);
}


function stopCarSound() {
    fadeOutChannel("car");
}


// ---------- номер: темнота и дверь ----------

// гул темноты, пока в номере выключен свет
function startDarkSound() {
    if (isChannelPlaying("dark")) {
        return;
    }

    playChannel("dark", true);
}


function stopDarkSound() {
    fadeOutChannel("dark");
}


// дверь открывается — один раз
function playDoorSound() {
    playChannel("door", true);
}


function stopDoorSound() {
    fadeOutChannel("door");
}


// первый клик или клавиша разрешают звук: если машинка как раз печатает — включаем её
function unlockSound() {
    if (sound.isTyping && sound.channels.typewriter.audio.paused) {
        playChannel("typewriter", false);
    }
}


// ---------- кнопка звука и ползунок громкости ----------

function setupSound() {
    const button = document.querySelector(".sound__button");
    const slider = document.querySelector(".sound__slider");

    createChannel("typewriter", "sounds/typewriter.mp3", typewriterStartTime);

    // звук машины во время поездки, повторяется по кругу
    createChannel("car", "sounds/car-ride.m4a", 0);

    // темнота в номере (по кругу) и скрип двери (один раз) — звучат поверх реплик
    createChannel("dark", "sounds/darkness.mp3", 0, true, true);
    createChannel("door", "sounds/door.mp3", 0, false, true);

    loadSoundSettings();
    applyVolume();

    slider.value = Math.round(sound.volume * 100);
    updateSoundControls(button, slider);

    button.addEventListener("click", function () {
        sound.isMuted = !sound.isMuted;

        // если громкость была на нуле, при включении возвращаем её на середину
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

    // закрашенная часть ползунка
    const filled = sound.isMuted ? 0 : slider.value;
    slider.style.setProperty("--filled", filled + "%");
}
