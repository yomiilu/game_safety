// ---------- прелоадер ----------
// полоса из нескольких шкал заполняется, пока грузятся картинки, шрифт и звук.
// когда всё готово — появляется кнопка «начать». клик по ней разрешает звук и запускает сайт.

// прелоадер показывается минимум столько (мс), чтобы полоса не мелькнула за долю секунды
const preloaderMinDuration = 1500;

// если звук долго не грузится — не ждём его дольше этого (мс)
const audioWaitLimit = 5000;

const preloader = {
    element: null,
    fills: [],
    percent: null,
    startButton: null,
    total: 0,
    loaded: 0,
    shown: 0,
    lastTime: 0,
    isReady: false
};


function setupPreloader(onStart) {
    preloader.element = document.querySelector(".preloader");
    preloader.fills = document.querySelectorAll(".preloader__fill");
    preloader.percent = document.querySelector(".preloader__percent");
    preloader.startButton = document.querySelector(".preloader__start");

    // пока прелоадер на экране, страницу не листаем
    document.body.classList.add("is-loading");

    trackImages();
    trackFont();
    trackAudio();

    preloader.startButton.addEventListener("click", function () {
        preloader.element.classList.add("preloader--hidden");
        document.body.classList.remove("is-loading");

        onStart();
    }, { once: true });

    preloader.lastTime = performance.now();
    requestAnimationFrame(updatePreloader);
}


// ---------- что ждём ----------

function addTask() {
    preloader.total = preloader.total + 1;
}


function finishTask() {
    preloader.loaded = preloader.loaded + 1;
}


function trackImages() {
    const images = document.querySelectorAll("img");

    images.forEach(function (image) {
        addTask();

        if (image.complete) {
            finishTask();
            return;
        }

        // ошибка загрузки тоже считается — иначе полоса застрянет
        image.addEventListener("load", finishTask, { once: true });
        image.addEventListener("error", finishTask, { once: true });
    });
}


function trackFont() {
    addTask();

    document.fonts.load("1em \"Kom Post\"").then(finishTask, finishTask);
}


function trackAudio() {
    addTask();

    let isDone = false;

    function done() {
        if (!isDone) {
            isDone = true;
            finishTask();
        }
    }

    if (sound.typewriter.readyState >= 4) {
        done();
        return;
    }

    sound.typewriter.addEventListener("canplaythrough", done, { once: true });
    sound.typewriter.addEventListener("error", done, { once: true });

    setTimeout(done, audioWaitLimit);
}


// ---------- полоса ----------

function updatePreloader(now) {
    const delta = now - preloader.lastTime;
    preloader.lastTime = now;

    const actual = preloader.total > 0 ? preloader.loaded / preloader.total : 1;

    // полоса догоняет реальную загрузку, но не быстрее, чем за preloaderMinDuration
    const maxStep = delta / preloaderMinDuration;
    preloader.shown = preloader.shown + Math.min(actual - preloader.shown, maxStep);

    setPreloaderProgress(preloader.shown);

    if (preloader.shown >= 1) {
        showStartButton();
        return;
    }

    requestAnimationFrame(updatePreloader);
}


// каждая шкала заполняется своей частью: сначала первая, потом вторая и так далее
function setPreloaderProgress(progress) {
    const count = preloader.fills.length;

    preloader.fills.forEach(function (fill, index) {
        const level = Math.min(Math.max(progress * count - index, 0), 1);

        fill.style.setProperty("--level", (level * 100).toFixed(1) + "%");
    });

    preloader.percent.textContent = Math.round(progress * 100) + "%";
}


function showStartButton() {
    if (preloader.isReady) {
        return;
    }

    preloader.isReady = true;
    preloader.element.classList.add("preloader--loaded");
}
