// ---------- звук печатной машинки ----------

const sound = {
    typewriter: null,
    volume: 0.6,
    isMuted: false,
    // машинка сейчас печатает (даже если браузер пока не дал включить звук)
    isTyping: false
};

// в начале файла секунда тишины — пропускаем её
const typewriterStartTime = 1;


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


function applyVolume() {
    sound.typewriter.volume = sound.volume;
    sound.typewriter.muted = sound.isMuted;
}


// начинаем стучать по клавишам
// до первого клика браузер звук не включит — тогда просто молчим, ошибки не будет
function startTypewriterSound() {
    sound.isTyping = true;
    sound.typewriter.currentTime = typewriterStartTime;

    sound.typewriter.play().catch(function () {
        // звук ещё не разрешён — подхватим после первого клика
    });
}


// машинка замолкает
function stopTypewriterSound() {
    sound.isTyping = false;
    sound.typewriter.pause();
}


// первый клик или клавиша разрешают звук: если машинка как раз печатает — включаем её
function unlockSound() {
    if (sound.isTyping && sound.typewriter.paused) {
        sound.typewriter.play().catch(function () {
            // не вышло — попробуем при следующем клике
        });
    }
}


// ---------- кнопка звука и ползунок громкости ----------

function setupSound() {
    const button = document.querySelector(".sound__button");
    const slider = document.querySelector(".sound__slider");

    sound.typewriter = new Audio("sounds/typewriter.mp3");
    sound.typewriter.loop = true;
    sound.typewriter.preload = "auto";

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
