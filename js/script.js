// ---------- глаза следят за курсором ----------

// все числа — в пикселях макета (как в svg-файлах глаза)
// width — ширина глаза
// centerX, centerY — центр зрачка в спокойном положении
// rangeX, rangeY — насколько далеко зрачок может уйти от центра
const eyeTypes = {
    a: {
        width: 373,
        centerX: 180,
        centerY: 132,
        rangeX: 55,
        rangeY: 14
    },
    b: {
        width: 318,
        centerX: 146,
        centerY: 152,
        rangeX: 40,
        rangeY: 14
    },
    c: {
        width: 265,
        centerX: 152,
        centerY: 82,
        rangeX: 40,
        rangeY: 6
    }
};

// расстояние от глаза до курсора (в px экрана), на котором зрачок уходит до упора
const fullLookDistance = 300;

// плавность: чем меньше число, тем медленнее догоняет
const smoothness = 0.12;

// мелкое дрожание зрачков (в пикселях макета) и как часто оно меняется (мс)
const tremorSize = 1.2;
const tremorInterval = 120;

const eyes = [];

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;


// «один vw макета» в пикселях — то же, что --u в css: min(1vw, 1.6vh)
function getDesignUnit() {
    return Math.min(window.innerWidth, window.innerHeight * 1.6) / 100;
}


function setupEyes() {
    const eyeElements = document.querySelectorAll(".eye");

    eyeElements.forEach(function (eyeElement) {
        const type = eyeTypes[eyeElement.dataset.type];

        eyes.push({
            element: eyeElement,
            pupil: eyeElement.querySelector(".eye__pupil"),
            type: type,
            isMirror: eyeElement.classList.contains("eye--mirror"),
            // глаза на экране выбора всегда открыты — по скроллу не закрываются
            isAlwaysOpen: eyeElement.classList.contains("eye--always-open"),
            // глаза в номере стоят на месте — только следят зрачками
            isStill: eyeElement.classList.contains("eye--still"),
            currentX: 0,
            currentY: 0,
            tremorX: 0,
            tremorY: 0,
            lastTremor: 0,
            scrollClose: 0,
            fleeX: 0,
            fleeY: 0
        });
    });
}


function updatePupil(eye, now) {
    const rect = eye.element.getBoundingClientRect();
    const scale = rect.width / eye.type.width;

    // центр зрачка на экране (у отражённого глаза центр тоже отражается)
    let centerX = eye.type.centerX * scale;

    if (eye.isMirror) {
        centerX = rect.width - centerX;
    }

    const pupilCenterX = rect.left + centerX;
    const pupilCenterY = rect.top + eye.type.centerY * scale;

    const dx = mouseX - pupilCenterX;
    const dy = mouseY - pupilCenterY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const strength = Math.min(distance / fullLookDistance, 1);

    // зрачок двигается по эллипсу, поэтому не выходит за свои границы
    let targetX = Math.cos(angle) * eye.type.rangeX * strength * scale;
    let targetY = Math.sin(angle) * eye.type.rangeY * strength * scale;

    // внутри отражённого глаза ось x перевёрнута
    if (eye.isMirror) {
        targetX = -targetX;
    }

    // нервное дрожание: время от времени зрачок чуть-чуть сдвигается
    if (now - eye.lastTremor > tremorInterval) {
        eye.tremorX = (Math.random() * 2 - 1) * tremorSize;
        eye.tremorY = (Math.random() * 2 - 1) * tremorSize * 0.5;
        eye.lastTremor = now;
    }

    targetX = targetX + eye.tremorX * scale;
    targetY = targetY + eye.tremorY * scale;

    eye.currentX = eye.currentX + (targetX - eye.currentX) * smoothness;
    eye.currentY = eye.currentY + (targetY - eye.currentY) * smoothness;

    eye.pupil.style.transform = "translate(" + eye.currentX + "px, " + eye.currentY + "px)";
}


// ---------- глаз убегает от курсора ----------

// запас вокруг глаза (в «vw макета», как --u в css), ближе которого курсор подойти не может
const fleeMargin = 2;

// как резко глаз отскакивает и как медленно возвращается на место
const fleeSpeed = 0.6;
const returnSpeed = 0.03;


// курсор внутри овала вокруг глаза? возвращает «расстояние» (меньше 1 — внутри)
function getOvalDistance(dx, dy, radiusX, radiusY) {
    const nx = dx / radiusX;
    const ny = dy / radiusY;

    return Math.sqrt(nx * nx + ny * ny);
}


function updateFlee(eye) {
    const rect = eye.element.getBoundingClientRect();
    const margin = getDesignUnit() * fleeMargin;

    const radiusX = rect.width / 2 + margin;
    const radiusY = rect.height / 2 + margin;

    // где центр глаза сейчас и где его родное место
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const homeX = centerX - eye.fleeX;
    const homeY = centerY - eye.fleeY;

    const dx = centerX - mouseX;
    const dy = centerY - mouseY;
    const distance = getOvalDistance(dx, dy, radiusX, radiusY);

    if (distance < 1) {
        // курсор слишком близко — отталкиваем глаз от него на край овала
        let pushX = dx;
        let pushY = dy;

        // если курсор прямо в центре — убегаем в случайную сторону
        if (distance < 0.01) {
            pushX = Math.random() - 0.5;
            pushY = Math.random() - 0.5;
        }

        const pushDistance = getOvalDistance(pushX, pushY, radiusX, radiusY);
        const targetX = mouseX + pushX / pushDistance;
        const targetY = mouseY + pushY / pushDistance;

        eye.fleeX = eye.fleeX + (targetX - centerX) * fleeSpeed;
        eye.fleeY = eye.fleeY + (targetY - centerY) * fleeSpeed;
    } else {
        // курсор далеко — потихоньку возвращаемся, но только если дома курсора нет
        const homeDistance = getOvalDistance(homeX - mouseX, homeY - mouseY, radiusX, radiusY);

        if (homeDistance > 1) {
            eye.fleeX = eye.fleeX * (1 - returnSpeed);
            eye.fleeY = eye.fleeY * (1 - returnSpeed);
        }
    }

    // глаз не уезжает за края экрана
    const minX = rect.width / 2 - homeX;
    const maxX = window.innerWidth - rect.width / 2 - homeX;
    const minY = rect.height / 2 - homeY;
    const maxY = window.innerHeight - rect.height / 2 - homeY;

    eye.fleeX = Math.min(Math.max(eye.fleeX, minX), maxX);
    eye.fleeY = Math.min(Math.max(eye.fleeY, minY), maxY);

    eye.element.style.translate = eye.fleeX + "px " + eye.fleeY + "px";
}


// ---------- глаза закрываются по скроллу ----------

// ВСЕ отметки прокрутки дальше — в «экранах»: 1 = прокрутили на одну высоту окна

// на каком отрезке прокрутки глаза закрываются
const closeStart = 0.16;
const closeEnd = 0.44;

// каждый следующий глаз закрывается чуть позже предыдущего
const closeStagger = 0.03;

// плавность закрывания
const closeSmoothness = 0.2;

let hero = null;


// сколько экранов прокрутили внутри первой секции
function getScrollProgress() {
    const rect = hero.getBoundingClientRect();
    const scrollLength = hero.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), scrollLength);

    return scrolled / window.innerHeight;
}


// плавный переход от 0 к 1 между from и to
function smoothStep(from, to, value) {
    const t = Math.min(Math.max((value - from) / (to - from), 0), 1);

    return t * t * (3 - 2 * t);
}


function updateEyeClose(eye, index, progress) {
    const start = closeStart + index * closeStagger;
    const end = closeEnd + index * closeStagger;
    const target = smoothStep(start, end, progress);

    eye.scrollClose = eye.scrollClose + (target - eye.scrollClose) * closeSmoothness;

    eye.element.style.setProperty("--close", eye.scrollClose.toFixed(3));
}


// ---------- пятно света за курсором ----------

const light = {
    element: null,
    currentX: mouseX,
    currentY: mouseY
};

// свет тянется за курсором медленнее, чем зрачки — так жутче
const lightSmoothness = 0.04;


function updateLight() {
    if (light.element === null) {
        return;
    }

    const rect = light.element.getBoundingClientRect();

    light.currentX = light.currentX + (mouseX - light.currentX) * lightSmoothness;
    light.currentY = light.currentY + (mouseY - light.currentY) * lightSmoothness;

    light.element.style.setProperty("--light-x", (light.currentX - rect.left) + "px");
    light.element.style.setProperty("--light-y", (light.currentY - rect.top) + "px");
}


// ---------- моргание лампы ----------

// пауза между морганиями — случайная, от 1.2 до 4 секунд
const flickerMinDelay = 1200;
const flickerMaxDelay = 4000;
const flickerDuration = 450;

// шанс, что вместе с морганием текст ещё и дёрнется цветным двоением
const glitchChance = 0.3;


function scheduleFlicker() {
    const delay = flickerMinDelay + Math.random() * (flickerMaxDelay - flickerMinDelay);

    setTimeout(function () {
        const withGlitch = Math.random() < glitchChance;

        hero.classList.add("hero--flicker");

        if (withGlitch) {
            hero.classList.add("hero--glitch");
        }

        setTimeout(function () {
            hero.classList.remove("hero--flicker");
            hero.classList.remove("hero--glitch");
            scheduleFlicker();
        }, flickerDuration);
    }, delay);
}


// ---------- текст печатается как на печатной машинке ----------

// задержка перед началом печати
const typingStartDelay = 500;

// скорость: случайная пауза между буквами, от и до (мс)
const typingMinDelay = 25;
const typingMaxDelay = 65;

// дополнительная пауза после пробела и в конце строки
const typingSpacePause = 40;
const typingLinePause = 250;

// скорость стирания (мс на букву)
const erasingDelay = 15;

// на какой части прокрутки меняется предложение
// (два числа, чтобы текст не дёргался туда-сюда на границе)
const nextTextFrom = 1;
const prevTextFrom = 0.8;

const typewriter = {
    isTyping: false,
    title: null,
    cursor: null,
    sentences: [],
    chars: [],
    shownSentence: -1,
    runId: 0
};


// текст из html: строки разделены <br>
function readLines(html) {
    return html.split("<br>").map(function (line) {
        return line.trim();
    });
}


// раскладываем предложение на отдельные буквы, пока невидимые
// место под весь текст занято сразу, поэтому строчки не прыгают
function buildChars(lines) {
    const title = typewriter.title;

    title.innerHTML = "";
    title.appendChild(typewriter.cursor);

    typewriter.chars = [];

    lines.forEach(function (line, lineIndex) {
        for (let i = 0; i < line.length; i++) {
            const char = document.createElement("span");

            char.className = "hero__char";
            char.textContent = line[i];
            title.appendChild(char);

            typewriter.chars.push({
                element: char,
                isSpace: line[i] === " ",
                isLineEnd: i === line.length - 1
            });
        }

        if (lineIndex < lines.length - 1) {
            title.appendChild(document.createElement("br"));
        }
    });
}


function setupTypewriter() {
    typewriter.title = document.querySelector(".hero__title");

    typewriter.cursor = document.createElement("span");
    typewriter.cursor.className = "hero__cursor";

    typewriter.sentences = [
        readLines(typewriter.title.innerHTML),
        readLines(document.querySelector(".hero__next-text").innerHTML)
    ];

    buildChars(typewriter.sentences[0]);
}


// стираем то, что напечатано, и печатаем нужное предложение
function showSentence(sentenceIndex) {
    if (typewriter.shownSentence === sentenceIndex) {
        return;
    }

    typewriter.shownSentence = sentenceIndex;

    // если предыдущая печать ещё идёт — она остановится, увидев новый номер
    typewriter.runId = typewriter.runId + 1;

    const runId = typewriter.runId;
    const cursor = typewriter.cursor;

    cursor.classList.remove("hero__cursor--done");
    typewriter.isTyping = true;

    if (isTitleOnScreen()) {
        startTypewriterSound("title");
    }

    function eraseNextChar() {
        if (runId !== typewriter.runId) {
            return;
        }

        const visibleChars = typewriter.chars.filter(function (char) {
            return char.element.classList.contains("hero__char--visible");
        });

        if (visibleChars.length === 0) {
            buildChars(typewriter.sentences[sentenceIndex]);
            typeNextChar(0);
            return;
        }

        const lastChar = visibleChars[visibleChars.length - 1];

        lastChar.element.classList.remove("hero__char--visible");
        lastChar.element.before(cursor);

        setTimeout(eraseNextChar, erasingDelay);
    }

    function typeNextChar(index) {
        if (runId !== typewriter.runId) {
            return;
        }

        if (index >= typewriter.chars.length) {
            cursor.classList.add("hero__cursor--done");
            typewriter.isTyping = false;
            stopTypewriterSound("title");
            return;
        }

        const char = typewriter.chars[index];

        char.element.classList.add("hero__char--visible");

        // курсор встаёт сразу после напечатанной буквы
        char.element.after(cursor);

        let delay = typingMinDelay + Math.random() * (typingMaxDelay - typingMinDelay);

        if (char.isSpace) {
            delay = delay + typingSpacePause;
        }

        if (char.isLineEnd) {
            delay = delay + typingLinePause;
        }

        setTimeout(function () {
            typeNextChar(index + 1);
        }, delay);
    }

    eraseNextChar();
}


// заголовок первого экрана виден, пока экран не начал уходить в черноту
function isTitleOnScreen() {
    return getScrollProgress() < darkStart;
}


function updateText(progress) {
    // звук печати заголовка — только пока заголовок на экране
    if (typewriter.isTyping) {
        const isOnScreen = progress < darkStart;

        if (!isOnScreen && sound.typewriterOwner === "title") {
            stopTypewriterSound("title");
        }

        if (isOnScreen && !sound.isTyping) {
            startTypewriterSound("title");
        }
    }

    if (typewriter.shownSentence === -1) {
        return;
    }

    if (progress > nextTextFrom) {
        showSentence(1);
    }

    if (progress < prevTextFrom) {
        showSentence(0);
    }
}


// ---------- старт печати ----------

function startIntroText() {
    setTimeout(function () {
        showSentence(0);
    }, typingStartDelay);
}


// ---------- экран уходит в черноту ----------

// на каком отрезке прокрутки экран темнеет полностью
const darkStart = 1.6;
const darkEnd = 2.4;

// на каком отрезке из темноты проявляется игровой экран с шапкой
const gameStart = 2.72;
const gameEnd = 3.4;


function updateDarkness(progress) {
    const dark = smoothStep(darkStart, darkEnd, progress);
    const game = smoothStep(gameStart, gameEnd, progress);

    light.element.style.setProperty("--dark", dark.toFixed(3));

    // шапка стоит вне первого экрана, поэтому --game ставим на всю страницу
    document.body.style.setProperty("--game", game.toFixed(3));

    updateCursorLight(dark * (1 - game));

    // шапка «активна» (по ней можно кликать), когда она полностью видна
    const isLightsOut = document.body.classList.contains("is-lights-out");
    const isHeaderActive = ((game > 0.9 && !document.body.classList.contains("is-choosing")) || document.body.classList.contains("is-hotel")) && !isLightsOut;

    document.body.classList.toggle("is-header-active", isHeaderActive);

    if (!isHeaderActive && chaptersMenu.isOpen) {
        setChaptersMenuOpen(false);
    }
}


// ---------- переход к главе из меню ----------
// предисловие — первый экран с глазами, глава 1 — начало игры в аэропорту

function goToChapter(chapter) {
    if (chapter === "2") {
        goToHotel();
        return;
    }

    if (chapter === "3") {
        goToWalk();
        return;
    }

    let screens = 0;

    if (chapter === "1") {
        screens = gameEnd;
    }

    window.scrollTo(0, hero.offsetTop + screens * window.innerHeight);
}


// глава 2 начинается в отеле. если игрок ещё не выбирал такси — выбор делается за него
// («поехать с мужчиной»)
function goToHotel() {
    // реплики аэропорта считаем прочитанными — иначе реплики отеля будут их ждать
    lines.forEach(function (line) {
        if (line.scene === "airport") {
            line.isFinished = true;
            setLineCharsVisible(line, true);
        }
    });

    if (!drive.isActive) {
        if (!choice.isShown) {
            showChoice();
        }

        const driverOption = choice.element.querySelector('[data-choice="driver"]');

        selectChoice(driverOption, true);
    }

    // удар по цифрам после поездки считаем уже случившимся
    const ride = getRideOutcome();

    if (!ride.isStatsDone) {
        ride.isShown = true;
        ride.isTextFinished = true;
        ride.isStatsPlayed = true;
        ride.isStatsDone = true;

        setGameHeader({
            money: ride.to.money,
            safety: ride.to.safety
        });
    }

    // поездка уже позади — машина не едет и не шумит
    drive.current = 1;

    const base = getHotelBase();

    window.scrollTo(0, hero.offsetTop + base * window.innerHeight);
}


// свет от курсора виден на любом чёрном экране:
// первая темнота перед аэропортом, экран выбора и чёрный экран после поездки
function updateCursorLight(firstDarkness) {
    let level = firstDarkness;

    const isChoiceBlack = choice.isShown && !document.body.classList.contains("is-street");

    if (isChoiceBlack) {
        level = 1;
    }

    if (drive.isActive) {
        level = Math.max(level, drive.blackout);
    }

    // отель уже не чёрный экран — свет гаснет вместе с его появлением
    level = level * (1 - hotel.level);

    // выбор в отеле — снова чёрный экран (пока поверх не проявился номер или кафе)
    if (hotelChoice.isShown && !room.isShown && !cafe.isShown) {
        level = 1;
    }

    // в номере погас свет: пока нет фонарика — обычный свет от курсора, с фонариком — только он
    if (room.isDark) {
        level = room.isFlashlight ? 0 : 1;
    }

    if (cafe.isDark) {
        level = cafe.isFlashlight ? 0 : 1;
    }

    // чёрный экран итога кафе или доставки
    if (cafeOutcome.isShown || roomOutcome.isShown) {
        level = 1;
    }

    // улица уже не чёрный экран — свет гаснет вместе с её появлением
    level = level * (1 - walk.level);

    // выбор пути — снова чёрный экран (пока поверх не проявился переулок)
    if (walkChoice.isShown && !alley.isShown) {
        level = 1;
    }

    // в переулке резко стемнело, потом — чёрный экран итога
    if (alley.isDark || alleyOutcome.isShown) {
        level = 1;
    }

    light.element.style.setProperty("--light-level", level.toFixed(3));
}


// ---------- персонажи выходят из-за края экрана ----------

// selector — какой персонаж
// start, end — на каком отрезке прокрутки он выходит
// side — из-за какого края экрана выходит: "left" или "right"
// scene: "hotel" — start/end считаются от момента, когда отель полностью проявился (необязательно)
// scene: "walk" — от момента, когда полностью проявилась улица (необязательно)
// waitForLine — не выходит, пока эта реплика не допечатана (необязательно)
const characterSettings = [
    {
        selector: ".game__character--boy",
        start: 3.5,
        end: 4.5,
        side: "left"
    },
    {
        selector: ".game__character--taxi",
        start: 5.04,
        end: 6.09,
        side: "right",
        waitForLine: ".speech--boy-1"
    },
    {
        selector: ".hotel__boy",
        scene: "hotel",
        start: 0.1,
        end: 1,
        side: "left"
    },
    {
        selector: ".walk__grandpa",
        scene: "walk",
        start: 1.8,
        end: 2.8,
        side: "right",
        waitForLine: ".speech--walk-2"
    }
];

// сколько шагов делает персонаж, пока выходит, и насколько подпрыгивает на каждом (в % своей высоты)
const walkSteps = 6;
const walkBounce = 1.2;

// плавность ходьбы: если персонаж ждал и его «отпустили», он не прыгает, а доходит
const walkSmoothness = 0.08;

const characters = [];


function setupCharacters() {
    characterSettings.forEach(function (settings) {
        characters.push({
            selector: settings.selector,
            element: document.querySelector(settings.selector),
            start: settings.start,
            end: settings.end,
            side: settings.side,
            scene: settings.scene,
            waitForLine: settings.waitForLine,
            walk: 0
        });
    });
}


function findCharacter(selector) {
    return characters.find(function (character) {
        return character.selector === selector;
    });
}


function updateCharacter(character, progress) {
    let start = character.start;
    let end = character.end;

    // в отеле (на улице) отметки считаются от момента, когда отель (улица) полностью проявился
    if (character.scene === "hotel" || character.scene === "walk") {
        const base = character.scene === "hotel" ? getHotelBase() : getWalkBase();

        if (base === null) {
            start = Infinity;
            end = Infinity;
        } else {
            start = base + start;
            end = base + end;
        }
    }

    let target = Math.min(Math.max((progress - start) / (end - start), 0), 1);

    if (isNaN(target)) {
        target = 0;
    }

    // ждём, пока допечатается чужая реплика
    if (character.waitForLine) {
        const line = findLine(character.waitForLine);

        if (!line.isFinished) {
            target = 0;
        }
    }

    character.walk = character.walk + (target - character.walk) * walkSmoothness;

    if (Math.abs(target - character.walk) < 0.001) {
        character.walk = target;
    }

    const raw = character.walk;

    // в конце пути — мягкое торможение
    const walk = 1 - (1 - raw) * (1 - raw);

    // откуда выходит: ровно из-за края экрана (на любом мониторе), с небольшим запасом
    const element = character.element;
    const screenWidth = element.parentElement.offsetWidth;
    const reserve = element.offsetWidth * 0.2;

    let startX = screenWidth - element.offsetLeft + reserve;

    if (character.side === "left") {
        startX = -(element.offsetLeft + element.offsetWidth + reserve);
    }

    const x = startX * (1 - walk);

    // подпрыгивание и лёгкое покачивание на каждом шаге, к концу затихает
    const step = Math.sin(raw * Math.PI * walkSteps);
    const fade = 1 - raw;
    const y = -Math.abs(step) * walkBounce * fade;
    const tilt = step * 1.5 * fade;

    character.element.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(2) + "%) rotate(" + tilt.toFixed(2) + "deg)";
}


// ---------- диалог: реплики в плашках по очереди ----------

// реплики идут строго по порядку: следующая появляется, только когда
// докрутили до её отметки И предыдущая уже допечатана. на экране всегда одна плашка.
//
// selector — какая плашка
// from — с какой отметки прокрутки она может появиться
// speed — скорость печати (2 — в два раза быстрее обычной)
// waitForCharacter — ещё и ждёт, пока этот персонаж дойдёт до места (необязательно)
// pose — какую позу принимает мальчик на этой реплике (необязательно)
// waitFor — функция: реплика ждёт, пока она не вернёт true (необязательно)
// scene: "hotel" — from считается от момента, когда отель полностью проявился (необязательно)
// scene: "room" — from считается от выбора в отеле (номер появляется сразу после него)

// когда в номере гаснет свет (в экранах прокрутки от выбора в отеле)
const roomDarkFrom = 1;

// в кафе: когда выезжает девочка с пиццей и когда гаснет свет (в экранах прокрутки от выбора в отеле)
const cafeGirlFrom = 1;
const cafeDarkFrom = 2.2;

// в переулке: когда резко темнеет (в экранах прокрутки от выбора пути)
const alleyDarkFrom = 2.9;

const dialogue = [
    {
        selector: ".speech--boy-1",
        from: 4.55,
        speed: 2
    },
    {
        selector: ".speech--taxi-1",
        from: 6.23,
        speed: 1,
        waitForCharacter: ".game__character--taxi"
    },
    {
        selector: ".speech--taxi-2",
        from: 7,
        speed: 1
    },
    {
        selector: ".speech--boy-2",
        from: 7.8,
        speed: 1,
        pose: 2
    },
    {
        selector: ".speech--boy-3",
        scene: "hotel",
        from: 1.1,
        speed: 1,
        waitForCharacter: ".hotel__boy"
    },
    {
        selector: ".speech--boy-4",
        scene: "hotel",
        from: 1.8,
        speed: 1
    },
    {
        selector: ".speech--receptionist-1",
        scene: "hotel",
        from: 3.2,
        speed: 1
    },
    {
        selector: ".speech--receptionist-2",
        scene: "hotel",
        from: 3.9,
        speed: 1
    },
    {
        selector: ".speech--room-1",
        scene: "room",
        from: 0.3,
        speed: 1
    },
    {
        selector: ".speech--room-2",
        scene: "room",
        from: roomDarkFrom,
        speed: 1
    },
    {
        selector: ".speech--cafe-1",
        scene: "cafe",
        from: 0.3,
        speed: 1
    },
    {
        selector: ".speech--cafe-2",
        scene: "cafe",
        from: cafeGirlFrom,
        speed: 1,
        // девочка заговорит, когда доедет до своего места
        waitFor: function () {
            return cafe.isGirlReady;
        }
    },
    {
        selector: ".speech--cafe-3",
        scene: "cafe",
        from: cafeGirlFrom + 0.5,
        speed: 1
    },
    {
        selector: ".speech--cafe-4",
        scene: "cafe",
        from: cafeDarkFrom,
        speed: 1,
        // в темноте (и после неё — когда свет уже снова включили)
        waitFor: function () {
            return cafe.isDark || cafe.isLit;
        }
    },
    {
        selector: ".speech--cafe-5",
        scene: "cafe",
        from: cafeDarkFrom,
        speed: 1
    },
    {
        selector: ".speech--cafe-6",
        scene: "cafe",
        from: cafeDarkFrom,
        speed: 1,
        // после того как «преступника» нашли — свет снова есть
        waitFor: function () {
            return cafe.isLit;
        }
    },
    {
        selector: ".speech--girl-1",
        scene: "room",
        from: roomDarkFrom,
        speed: 1,
        // девочка заговорит, только когда включили свет
        waitFor: function () {
            return room.isLit;
        }
    },
    // глава 3: улица (отсчёт — от момента, когда улица полностью проявилась)
    {
        selector: ".speech--walk-1",
        scene: "walk",
        from: 0.3,
        speed: 1
    },
    {
        selector: ".speech--walk-2",
        scene: "walk",
        from: 1,
        speed: 1
    },
    {
        selector: ".speech--walk-3",
        scene: "walk",
        from: 2.9,
        speed: 1,
        waitForCharacter: ".walk__grandpa"
    },
    // переулок: мальчик проговаривает повороты (отсчёт — от выбора пути)
    {
        selector: ".speech--alley-1",
        scene: "alley",
        from: 0.3,
        speed: 1
    },
    {
        selector: ".speech--alley-2",
        scene: "alley",
        from: 0.8,
        speed: 1
    },
    {
        selector: ".speech--alley-3",
        scene: "alley",
        from: 1.3,
        speed: 1
    },
    {
        selector: ".speech--alley-4",
        scene: "alley",
        from: 1.8,
        speed: 1
    },
    // мальчик сам себе объясняет, как бежать обратно
    {
        selector: ".speech--alley-tip",
        scene: "alley",
        from: 2.3,
        speed: 1
    },
    {
        selector: ".speech--alley-5",
        scene: "alley",
        from: alleyDarkFrom,
        speed: 1.5,
        // в темноте, когда заколотилось сердце
        waitFor: function () {
            return alley.isDark;
        }
    }
];

// пауза между появлением плашки и началом печати (мс)
const speechTypingDelay = 400;

// запас (в экранах), чтобы реплика не мигала, если остановиться ровно на отметке
const speechGap = 0.07;

const lines = [];

// какая реплика сейчас на экране (-1 — никакая)
let currentLine = -1;

let boyPoses = null;


// раскладываем каждую фразу на невидимые буквы — место под текст занято сразу
function setupDialogue() {
    dialogue.forEach(function (settings) {
        const element = document.querySelector(settings.selector);
        const textElement = element.querySelector(".speech__inner");
        const text = readSpeechText(textElement);

        const line = {
            selector: settings.selector,
            element: element,
            from: settings.from,
            speed: settings.speed,
            waitForCharacter: settings.waitForCharacter,
            waitFor: settings.waitFor,
            scene: settings.scene || "airport",
            pose: settings.pose || 1,
            chars: [],
            isFinished: false,
            runId: 0
        };

        textElement.innerHTML = "";

        for (let i = 0; i < text.length; i++) {
            const char = document.createElement("span");

            char.className = "speech__char";
            char.textContent = text[i].char;

            // самое важное в реплике — чёрным
            if (text[i].isKey) {
                char.classList.add("speech__char--key");
            }

            textElement.appendChild(char);

            line.chars.push({
                element: char,
                isSpace: text[i].char === " "
            });
        }

        lines.push(line);
    });

    boyPoses = document.querySelector(".game__character--boy");
}


// текст реплики по буквам: у каждой буквы помечено, важная ли она (в html — внутри <b class="speech__key">)
function readSpeechText(textElement) {
    const letters = [];

    textElement.childNodes.forEach(function (node) {
        const isKey = node.nodeType === 1 && node.classList.contains("speech__key");
        const part = node.textContent.replace(/\s+/g, " ");

        for (let i = 0; i < part.length; i++) {
            letters.push({
                char: part[i],
                isKey: isKey
            });
        }
    });

    // пробелы по краям (от переносов строк в html) не нужны
    while (letters.length && letters[0].char === " ") {
        letters.shift();
    }

    while (letters.length && letters[letters.length - 1].char === " ") {
        letters.pop();
    }

    return letters;
}


function findLine(selector) {
    return lines.find(function (line) {
        return line.selector === selector;
    });
}


function setLineCharsVisible(line, isVisible) {
    line.chars.forEach(function (char) {
        char.element.classList.toggle("speech__char--visible", isVisible);
    });
}


function showLine(line) {
    line.runId = line.runId + 1;

    const runId = line.runId;

    line.element.classList.add("speech--visible");

    // реплика уже была допечатана (её просто ненадолго прятали) — показываем целиком
    if (line.isFinished) {
        setLineCharsVisible(line, true);
        return;
    }

    setLineCharsVisible(line, false);

    function typeNextChar(index) {
        if (runId !== line.runId) {
            return;
        }

        if (index >= line.chars.length) {
            line.isFinished = true;
            stopTypewriterSound(line.selector);
            return;
        }

        const char = line.chars[index];

        char.element.classList.add("speech__char--visible");

        let delay = typingMinDelay + Math.random() * (typingMaxDelay - typingMinDelay);

        if (char.isSpace) {
            delay = delay + typingSpacePause;
        }

        setTimeout(function () {
            typeNextChar(index + 1);
        }, delay / line.speed);
    }

    setTimeout(function () {
        if (runId !== line.runId) {
            return;
        }

        startTypewriterSound(line.selector);
        typeNextChar(0);
    }, speechTypingDelay);
}


function hideLine(line) {
    // если реплику прервали посреди печати — потом начнём её заново
    if (!line.isFinished) {
        setLineCharsVisible(line, false);
        stopTypewriterSound(line.selector);
    }

    line.runId = line.runId + 1;
    line.element.classList.remove("speech--visible");
}


// может ли реплика с этим номером быть на экране
// с какой отметки прокрутки реплика может появиться
function getLineFrom(line) {
    if (line.scene === "hotel") {
        const base = getHotelBase();

        return base === null ? Infinity : base + line.from;
    }

    if (line.scene === "cafe") {
        const base = getCafeBase();

        return base === null ? Infinity : base + line.from;
    }

    if (line.scene === "room") {
        const base = getRoomBase();

        return base === null ? Infinity : base + line.from;
    }

    if (line.scene === "walk") {
        const base = getWalkBase();

        return base === null ? Infinity : base + line.from;
    }

    if (line.scene === "alley") {
        const base = getAlleyBase();

        return base === null ? Infinity : base + line.from;
    }

    return line.from;
}


// у номера и кафе — свои ветки реплик: реплика ждёт предыдущую только из общей части или своей ветки
function getLineBranch(line) {
    if (line.scene === "room" || line.scene === "cafe") {
        return line.scene;
    }

    return "main";
}


function findPreviousLine(index) {
    const branch = getLineBranch(lines[index]);

    for (let i = index - 1; i >= 0; i--) {
        const candidate = getLineBranch(lines[i]);

        if (candidate === "main" || candidate === branch) {
            return lines[i];
        }
    }

    return null;
}


function canShowLine(index, progress) {
    const line = lines[index];

    if (progress < getLineFrom(line)) {
        return false;
    }

    const previous = findPreviousLine(index);

    if (previous && !previous.isFinished) {
        return false;
    }

    if (line.waitForCharacter && findCharacter(line.waitForCharacter).walk < 0.99) {
        return false;
    }

    if (line.waitFor && !line.waitFor()) {
        return false;
    }

    return true;
}


function updateDialogue(progress) {
    // если прокрутили назад, выше отметки реплики — забываем, что она была допечатана
    lines.forEach(function (line) {
        if (progress < getLineFrom(line) - speechGap) {
            line.isFinished = false;
        }
    });

    // идём по порядку, пока реплики разрешены — последняя разрешённая и будет на экране
    let target = -1;

    for (let i = 0; i < lines.length; i++) {
        if (!canShowLine(i, progress)) {
            // реплики сцены, которой сейчас нет (другая ветка выбора), просто пропускаем
            if (getLineFrom(lines[i]) === Infinity) {
                continue;
            }

            break;
        }

        target = i;
    }

    // чтобы не мигало на отметке: назад уходим, только когда отъехали от неё с запасом
    if (target < currentLine && currentLine >= 0 && progress >= getLineFrom(lines[currentLine]) - speechGap) {
        target = currentLine;
    }

    // во время выбора и на улице плашек аэропорта на экране нет (реплики в отеле и номере — можно)
    if (choice.isShown && (target < 0 || lines[target].scene === "airport")) {
        target = -1;
    }

    if (target !== currentLine) {
        if (currentLine >= 0) {
            hideLine(lines[currentLine]);
        }

        if (target >= 0) {
            showLine(lines[target]);
        }

        currentLine = target;
    }

    // поза мальчика зависит от того, какая реплика на экране (во время выбора — задумчивая)
    let pose = currentLine >= 0 ? lines[currentLine].pose : 1;

    if (choice.isShown) {
        pose = 2;
    }

    boyPoses.classList.toggle("game__character--pose-2", pose === 2);
}


// ---------- ВРЕМЕННО: пропуск текста по клику ----------
// клик в любом месте (кроме кнопок, ползунка и экрана выбора) сразу допечатывает
// то, что сейчас печатается: заголовок первого экрана, реплику или текст на чёрном экране.
// чтобы убрать — поставь false
const allowClickSkip = true;


function skipCurrentLine() {
    if (currentLine < 0) {
        return;
    }

    const line = lines[currentLine];

    if (line.isFinished) {
        return;
    }

    // останавливаем печать и показываем фразу целиком
    line.runId = line.runId + 1;
    line.isFinished = true;

    setLineCharsVisible(line, true);
    stopTypewriterSound(line.selector);
}


// заголовок первого экрана: сразу показываем нужное предложение целиком
// (даже если старое ещё стиралось)
function skipTitle() {
    if (!typewriter.isTyping) {
        return;
    }

    typewriter.runId = typewriter.runId + 1;
    typewriter.isTyping = false;

    buildChars(typewriter.sentences[typewriter.shownSentence]);

    typewriter.chars.forEach(function (char) {
        char.element.classList.add("hero__char--visible");
    });

    typewriter.title.appendChild(typewriter.cursor);
    typewriter.cursor.classList.add("hero__cursor--done");

    stopTypewriterSound("title");
}


// текст на чёрных экранах-итогах (после такси, после кафе)
function skipOutcomeText() {
    [outcome, driverOutcome, cafeOutcome, roomOutcome, alleyOutcome].forEach(function (o) {
        if (!o.isShown || o.isTextFinished) {
            return;
        }

        o.runId = o.runId + 1;
        o.isTextFinished = true;

        o.chars.forEach(function (char) {
            char.element.classList.add("outcome__char--visible");
        });

        stopTypewriterSound(o.soundOwner);
    });
}


function setupClickSkip() {
    if (!allowClickSkip) {
        return;
    }

    document.addEventListener("click", function (event) {
        if (event.target.closest("button, input, .choice, .preloader")) {
            return;
        }

        skipTitle();
        skipCurrentLine();
        skipOutcomeText();
    });
}


// ---------- выбор игрока ----------

// с какой отметки прокрутки появляется выбор (и только когда последняя реплика допечатана)
const choiceFrom = 8.4;

// через сколько (мс) варианты успевают выехать
const choiceReadyDelay = 1400;

// через сколько (мс) после выбора появляется следующая сцена
const streetDelay = 900;

const choice = {
    element: null,
    game: null,
    options: [],
    isShown: false,
    // что выбрал игрок: "driver" — частник, "official" — официальное такси, null — ещё не выбрал
    selected: null
};


function setupChoice() {
    choice.element = document.querySelector(".game .choice");
    choice.game = document.querySelector(".game");
    choice.options = choice.element.querySelectorAll(".choice__option");
    street = document.querySelector(".street");

    choice.options.forEach(function (option) {
        option.addEventListener("click", function () {
            selectChoice(option);
        });
    });
}


// isInstant — улица появляется сразу, без паузы (переход по меню глав)
function selectChoice(option, isInstant) {
    choice.selected = option.dataset.choice;

    choice.options.forEach(function (otherOption) {
        otherOption.classList.toggle("choice__option--selected", otherOption === option);
    });

    choice.element.classList.add("choice--ready");
    choice.element.classList.add("choice--made");

    // сообщаем остальному коду, что выбор сделан (пригодится для следующих сцен)
    document.dispatchEvent(new CustomEvent("player-choice", {
        detail: {
            choice: choice.selected
        }
    }));

    const selected = choice.selected;

    if (isInstant) {
        choice.element.classList.add("choice--ready");
        showStreet(selected);
        return;
    }

    setTimeout(function () {
        // за это время игрок мог прокрутить назад и передумать
        if (choice.isShown && choice.selected === selected) {
            showStreet(selected);
        }
    }, streetDelay);
}


// ---------- сцена 2: улица ----------

let street = null;


function showStreet(selected) {
    street.classList.remove("street--official", "street--driver");
    street.classList.add("street--" + selected);
    street.classList.add("street--visible");

    document.body.classList.add("is-street");

    // поездка начинается с того места, где сделан выбор; дальше можно листать
    drive.start = getScrollProgress();
    drive.isActive = true;

    startCarSound();
    drive.isSoundOn = true;
    document.body.classList.remove("is-choice-locked");
}


function hideStreet() {
    street.classList.remove("street--visible");
    document.body.classList.remove("is-street");

    drive.isActive = false;
    drive.current = 0;
    drive.blackout = 0;
    streetBlackout.style.opacity = 0;

    stopCarSound();
    drive.isSoundOn = false;
}


// ---------- поездка по улице ----------
// машина медленно едет к нам, деревья уезжают вдаль к точке схода дороги, снизу выплывают новые.
// все координаты — в % от сцены улицы (она повторяет пропорции фона)

// точка схода дороги на фоне
const vanishX = 15.75;
const vanishY = 33.7;

// пропорции сцены (ширина / высота фона) — нужны, чтобы пересчитать высоту картинок в %
const stageRatio = 1556 / 898;

// тротуары: где стоит основание дерева «на макете» (глубина 1) и какой оно там высоты
const treeLanes = {
    "left": {
        baseX: 7.125,
        baseY: 75.39,
        height: 62.89
    },
    "right-1": {
        baseX: 71.425,
        baseY: 51.97,
        height: 46.07
    },
    "right-2": {
        baseX: 87.525,
        baseY: 57.18,
        height: 49.88
    }
};

// виды деревьев: картинка и её пропорции (высота / ширина)
const treeTypes = [
    {
        src: "img/tree1.svg",
        ratio: 572 / 327
    },
    {
        src: "img/tree2.svg",
        ratio: 453 / 253
    },
    {
        src: "img/tree3.svg",
        ratio: 606 / 281
    }
];

// длина поездки в экранах прокрутки и насколько за это время деревья уезжают вдаль
const driveLength = 4;
const driveDistance = 3.3;

// плавность: поездка догоняет скролл, а не дёргается вместе с колесом мыши
const driveSmoothness = 0.06;

// насколько машина «подъезжает» к нам за всю поездку (1.28 — вырастает на 28%)
const carApproach = 1.28;

// тряска машины: насколько подпрыгивает (в % своей высоты) и как часто (раз в секунду)
const carBounce = 0.35;
const carBounceSpeed = 9;

// когда дерево растворяется вдали: при каком размере начинает и при каком исчезает совсем
const treeFadeFrom = 0.55;
const treeFadeTo = 0.3;

// когда дерево выплывает снизу: при каком размере оно ещё полупрозрачное и с какой прозрачностью
const treeAppearFrom = 2.2;
const treeAppearTo = 1.3;
const treeAppearOpacity = 0.4;

// деревья идут по кругу: на какой глубине дерево уже полностью растворилось
// и на сколько его отодвинуть назад (3 дерева на тротуаре × расстояние 1.2 между ними)
const treeRespawnDepth = 1 / treeFadeTo;
const treeCyclePeriod = 3.6;

// после поездки улица уходит в черноту (в экранах прокрутки)
const blackoutDelay = 0.2;
const blackoutLength = 0.8;

let streetBlackout = null;

const drive = {
    isActive: false,
    // насколько улица уже ушла в черноту после поездки (0–1)
    blackout: 0,
    isSoundOn: false,
    start: 0,
    current: 0,
    trees: [],
    cars: []
};


function setupDrive() {
    // какое дерево последним встало на каждый тротуар — следующее будет другим
    const lastTypeOnLane = {};

    document.querySelectorAll(".street__tree").forEach(function (element) {
        const depth = Number(element.dataset.depth);
        const laneName = element.dataset.lane;

        // деревья с макета (глубина 1) остаются как есть, остальные — случайного вида,
        // но не такого же, как предыдущее дерево на этом тротуаре
        let type = treeTypes.find(function (treeType) {
            return element.getAttribute("src") === treeType.src;
        });

        if (depth !== 1) {
            const otherTypes = treeTypes.filter(function (treeType) {
                return treeType !== lastTypeOnLane[laneName];
            });

            type = otherTypes[Math.floor(Math.random() * otherTypes.length)];
            element.src = type.src;
        }

        lastTypeOnLane[laneName] = type;

        drive.trees.push({
            element: element,
            lane: treeLanes[element.dataset.lane],
            type: type,
            depth: depth,
            // сколько раз дерево уже уехало вдаль и вернулось снизу
            cycle: 0
        });
    });

    // запоминаем, какое дерево последним выплывет на каждом тротуаре
    Object.keys(treeLanes).forEach(function (laneName) {
        treeLanes[laneName].lastSpawned = lastTypeOnLane[laneName];
    });

    drive.cars = document.querySelectorAll(".street__car");
    streetBlackout = document.querySelector(".street__blackout");

    // расставляем деревья, как на макете, ещё до поездки
    updateTrees(0);
}


// дерево на глубине depth: чем дальше, тем меньше и ближе к точке схода
// дерево уехало вдаль и растворилось — возвращаем его вниз другим видом
function respawnTree(tree) {
    const lane = tree.lane;

    const otherTypes = treeTypes.filter(function (treeType) {
        return treeType !== lane.lastSpawned;
    });

    tree.type = otherTypes[Math.floor(Math.random() * otherTypes.length)];
    tree.element.src = tree.type.src;

    lane.lastSpawned = tree.type;
}


function placeTree(tree, distance) {
    let depth = tree.depth + distance;
    let cycle = 0;

    // деревья идут по кругу: растворилось вдали — снова выплывает снизу
    while (depth > treeRespawnDepth) {
        depth = depth - treeCyclePeriod;
        cycle = cycle + 1;
    }

    if (cycle !== tree.cycle) {
        tree.cycle = cycle;
        respawnTree(tree);
    }

    // ещё не выехало снизу экрана
    if (depth <= 0.25) {
        tree.element.style.opacity = 0;
        return;
    }

    const scale = 1 / depth;
    const lane = tree.lane;

    // все деревья на одном тротуаре одного роста, ширина — по пропорциям картинки
    const height = lane.height * scale;
    const width = height / (tree.type.ratio * stageRatio);
    const baseX = vanishX + (lane.baseX - vanishX) * scale;
    const baseY = vanishY + (lane.baseY - vanishY) * scale;

    tree.element.style.width = width + "%";
    tree.element.style.left = (baseX - width / 2) + "%";
    tree.element.style.top = (baseY - height) + "%";

    // ближние деревья — поверх дальних
    tree.element.style.zIndex = Math.round(scale * 100);

    // вдали — растворяется до нуля, у нижнего края — мягко проявляется (не с нуля)
    const fadeOut = smoothStep(treeFadeTo, treeFadeFrom, scale);
    const fadeIn = 1 - smoothStep(treeAppearTo, treeAppearFrom, scale) * (1 - treeAppearOpacity);

    tree.element.style.opacity = (fadeOut * fadeIn).toFixed(3);
}


function updateTrees(progress) {
    const distance = progress * driveDistance;

    drive.trees.forEach(function (tree) {
        placeTree(tree, distance);
    });
}


function updateCars(progress, now) {
    const scale = 1 + (carApproach - 1) * progress;

    // тряска: два наложенных колебания, чтобы было похоже на неровную дорогу
    const time = now / 1000;
    const bounce = Math.abs(Math.sin(time * carBounceSpeed)) * carBounce + Math.sin(time * carBounceSpeed * 2.3) * carBounce * 0.3;
    const tilt = Math.sin(time * carBounceSpeed * 0.7) * 0.25;

    drive.cars.forEach(function (car) {
        car.style.transform = "scale(" + scale.toFixed(4) + ") translateY(" + (-bounce).toFixed(3) + "%) rotate(" + tilt.toFixed(3) + "deg)";
    });
}


// звук машины: играет, пока она едет; доехала — быстро затихает, отмотали назад — снова едет
const carSoundOffAt = 0.97;


function updateCarSound() {
    const isDriving = drive.current < carSoundOffAt;

    if (isDriving && !drive.isSoundOn) {
        startCarSound();
        drive.isSoundOn = true;
    }

    if (!isDriving && drive.isSoundOn) {
        stopCarSound();
        drive.isSoundOn = false;
    }
}


function updateDrive(progress, now) {
    if (!drive.isActive) {
        return;
    }

    const target = Math.min(Math.max((progress - drive.start) / driveLength, 0), 1);

    drive.current = drive.current + (target - drive.current) * driveSmoothness;

    updateTrees(drive.current);
    updateCars(drive.current, now);

    // доехали — экран уходит в черноту
    const blackoutStart = drive.start + driveLength + blackoutDelay;
    const blackout = smoothStep(blackoutStart, blackoutStart + blackoutLength, progress);

    streetBlackout.style.opacity = blackout.toFixed(3);
    drive.blackout = blackout;

    updateCarSound();
}


// прокрутили назад к диалогу — выбор сбрасывается, можно выбрать заново
function resetChoice() {
    choice.selected = null;
    choice.element.classList.remove("choice--made");

    choice.options.forEach(function (option) {
        option.classList.remove("choice__option--selected");
    });

    hideStreet();
}


function showChoice() {
    choice.isShown = true;
    choice.element.classList.add("choice--visible");
    choice.game.classList.add("game--choice");
    document.body.classList.add("is-choosing");

    // ставим прокрутку ровно на выбор и запираем её, пока игрок не выбрал —
    // так после выбора всегда останется место для поездки
    window.scrollTo(0, hero.offsetTop + (choiceFrom + 0.02) * window.innerHeight);
    document.body.classList.add("is-choice-locked");

    // когда варианты выехали — убираем задержки, чтобы наведение срабатывало сразу
    setTimeout(function () {
        if (choice.isShown) {
            choice.element.classList.add("choice--ready");
        }
    }, choiceReadyDelay);
}


function updateChoice(progress) {
    // выбор появляется после «х-ммм, дай мне подумать» (реплики отеля идут уже после выбора)
    const lineBeforeChoice = findLine(".speech--boy-2");

    if (!choice.isShown && progress >= choiceFrom && lineBeforeChoice.isFinished) {
        showChoice();
    }

    // прокрутили назад — выбор прячется, снова видна последняя реплика
    if (choice.isShown && progress < choiceFrom - speechGap) {
        choice.isShown = false;
        choice.element.classList.remove("choice--visible");
        choice.element.classList.remove("choice--ready");
        choice.game.classList.remove("game--choice");
        document.body.classList.remove("is-choosing");
        document.body.classList.remove("is-choice-locked");

        resetChoice();
    }
}


// ---------- последствия выбора «официальное такси» ----------
// на чёрном экране после поездки печатается текст, потом — удар по деньгам и безопасности

// когда появляется текст и когда — цифры (в экранах прокрутки от начала поездки)
const outcomeTextFrom = 5.1;
const outcomeStatsFrom = 5.7;

// что было и что стало
const outcomeMoneyFrom = 320;
const outcomeMoneyTo = 260;
const outcomeSafetyFrom = 97;
const outcomeSafetyTo = 87;

// длительность падения каждой цифры и пауза между ними (мс)
const outcomeCountDuration = 1300;
const outcomePause = 500;

// один экран-итог: текст печатается, потом удар по деньгам и безопасности.
// таких экранов несколько (после такси, после кафе), поэтому всё хранится в объекте экрана
function createOutcome(selector, soundOwner) {
    return {
        selector: selector,
        soundOwner: soundOwner,
        element: null,
        flash: null,
        stats: null,
        money: null,
        safety: null,
        chars: [],
        // что было и что стало: { money, safety }
        from: null,
        to: null,
        isShown: false,
        isTextFinished: false,
        isStatsPlayed: false,
        // удар по цифрам доигран до конца
        isStatsDone: false,
        runId: 0
    };
}

const outcome = createOutcome(".outcome--taxi", "outcome");
outcome.from = { money: outcomeMoneyFrom, safety: outcomeSafetyFrom };
outcome.to = { money: outcomeMoneyTo, safety: outcomeSafetyTo };

// ветка «поехать с мужчиной»: чуть не попали в аварию, но цену он не поднял
const driverMoneyLoss = 30;
const driverSafetyLoss = 27;

const driverOutcome = createOutcome(".outcome--driver", "driver-outcome");
driverOutcome.from = { money: outcomeMoneyFrom, safety: outcomeSafetyFrom };
driverOutcome.to = { money: outcomeMoneyFrom - driverMoneyLoss, safety: outcomeSafetyFrom - driverSafetyLoss };


// итог поездки для выбранной ветки (null — ещё ничего не выбрали)
function getRideOutcome() {
    if (choice.selected === "official") {
        return outcome;
    }

    if (choice.selected === "driver") {
        return driverOutcome;
    }

    return null;
}


function setupOutcome(o) {
    o.element = document.querySelector(o.selector);
    o.flash = o.element.querySelector(".outcome__flash");
    o.stats = o.element.querySelector(".outcome__stats");

    o.money = {
        stat: o.element.querySelector(".outcome__stat--money"),
        number: o.element.querySelector(".outcome__stat--money .outcome__number")
    };

    o.safety = {
        stat: o.element.querySelector(".outcome__stat--safety"),
        number: o.element.querySelector(".outcome__stat--safety .outcome__number"),
        fill: o.element.querySelector(".outcome__scale-fill")
    };

    // текст раскладываем на невидимые буквы — место под него занято сразу.
    // строки в html разделены <br>, их сохраняем
    const textElement = o.element.querySelector(".outcome__inner");
    const textLines = readLines(textElement.innerHTML);

    textElement.innerHTML = "";

    textLines.forEach(function (line, lineIndex) {
        for (let i = 0; i < line.length; i++) {
            const char = document.createElement("span");

            char.className = "outcome__char";
            char.textContent = line[i];
            textElement.appendChild(char);

            o.chars.push({
                element: char,
                isSpace: line[i] === " ",
                isLineEnd: i === line.length - 1
            });
        }

        if (lineIndex < textLines.length - 1) {
            textElement.appendChild(document.createElement("br"));
        }
    });

    if (o.from) {
        resetOutcomeStats(o);
    }
}


function resetOutcomeStats(o) {
    o.isStatsPlayed = false;
    o.isStatsDone = false;
    o.stats.classList.remove("outcome__stats--visible");

    [o.money.stat, o.safety.stat].forEach(function (stat) {
        stat.classList.remove("outcome__stat--hit", "outcome__stat--dropped");
    });

    o.money.number.textContent = o.from.money;
    o.safety.number.textContent = o.from.safety;
    o.safety.fill.style.setProperty("--level", o.from.safety + "%");

    setGameHeader({
        money: o.from.money,
        safety: o.from.safety
    });
}


function showOutcomeText(o) {
    o.isShown = true;
    o.isTextFinished = false;
    o.runId = o.runId + 1;

    const runId = o.runId;

    o.element.classList.add("outcome--visible");

    o.chars.forEach(function (char) {
        char.element.classList.remove("outcome__char--visible");
    });

    function typeNextChar(index) {
        if (runId !== o.runId) {
            return;
        }

        if (index >= o.chars.length) {
            o.isTextFinished = true;
            stopTypewriterSound(o.soundOwner);
            return;
        }

        const char = o.chars[index];

        char.element.classList.add("outcome__char--visible");

        let delay = typingMinDelay + Math.random() * (typingMaxDelay - typingMinDelay);

        if (char.isSpace) {
            delay = delay + typingSpacePause;
        }

        if (char.isLineEnd) {
            delay = delay + typingLinePause;
        }

        setTimeout(function () {
            typeNextChar(index + 1);
        }, delay);
    }

    setTimeout(function () {
        if (runId !== o.runId) {
            return;
        }

        startTypewriterSound(o.soundOwner);
        typeNextChar(0);
    }, speechTypingDelay);
}


function hideOutcome(o) {
    o.isShown = false;
    o.isTextFinished = false;
    o.runId = o.runId + 1;

    o.element.classList.remove("outcome--visible");
    stopTypewriterSound(o.soundOwner);

    resetOutcomeStats(o);
}


// плавно «отщёлкиваем» число от from до to; onStep получает текущее значение
function countDown(o, from, to, onStep, onDone, runId) {
    const startTime = performance.now();

    function step(now) {
        if (runId !== o.runId) {
            return;
        }

        const t = Math.min((now - startTime) / outcomeCountDuration, 1);

        // сначала быстро, к концу замедляется
        const eased = 1 - Math.pow(1 - t, 3);

        onStep(from + (to - from) * eased);

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            onDone();
        }
    }

    requestAnimationFrame(step);
}


// удар по одной цифре: краснеет, трясётся, вспышка по краям, сверху падает «минус»
function hitStat(o, item, from, to, onStep, onDone, runId) {
    item.stat.classList.add("outcome__stat--hit");
    item.stat.classList.add("outcome__stat--dropped");

    o.flash.classList.remove("outcome__flash--on");
    void o.flash.offsetWidth;
    o.flash.classList.add("outcome__flash--on");

    countDown(o, from, to, onStep, function () {
        item.stat.classList.remove("outcome__stat--hit");
        onDone();
    }, runId);
}


function playOutcomeStats(o) {
    o.isStatsPlayed = true;
    o.stats.classList.add("outcome__stats--visible");

    const runId = o.runId;

    setTimeout(function () {
        if (runId !== o.runId) {
            return;
        }

        hitStat(o, o.money, o.from.money, o.to.money, function (value) {
            o.money.number.textContent = Math.round(value);
        }, function () {
            setTimeout(function () {
                if (runId !== o.runId) {
                    return;
                }

                hitStat(o, o.safety, o.from.safety, o.to.safety, function (value) {
                    o.safety.number.textContent = Math.round(value);
                    o.safety.fill.style.setProperty("--level", value.toFixed(1) + "%");
                }, function () {
                    // дальше игра идёт уже с новыми цифрами
                    setGameHeader({
                        money: o.to.money,
                        safety: o.to.safety
                    });

                    o.isStatsDone = true;
                }, runId);
            }, outcomePause);
        }, runId);
    }, outcomePause);
}


function updateOutcome(progress) {
    const current = drive.isActive ? getRideOutcome() : null;

    // итог другой ветки (или вообще без поездки) — прячем
    [outcome, driverOutcome].forEach(function (o) {
        if (o !== current && o.isShown) {
            hideOutcome(o);
        }
    });

    if (!current) {
        return;
    }

    const textFrom = drive.start + outcomeTextFrom;
    const statsFrom = drive.start + outcomeStatsFrom;

    if (!current.isShown && progress >= textFrom) {
        showOutcomeText(current);
    }

    // прокрутили назад — всё прячется, цифры возвращаются
    if (current.isShown && progress < textFrom - speechGap) {
        hideOutcome(current);
        return;
    }

    if (current.isShown && current.isTextFinished && !current.isStatsPlayed && progress >= statsFrom) {
        playOutcomeStats(current);
    }
}


// ---------- обучения: тетрадь ----------
// после итога каждой главы на чёрном экране открывается тетрадь, и по частям проявляется разбор.
// во втором обучении тетрадь сначала открыта на главе 1, потом лист переворачивается — и там глава 2

// первое обучение: когда начинается (в экранах прокрутки от начала поездки) и сколько экранов длится
const longreadFrom = 6.6;
const longreadLength = 4;

// второе обучение (после ужина): сколько экранов длится и когда переворачивается лист (от его начала)
const dinnerLongreadLength = 5.6;
const dinnerLongreadFlipAt = 0.9;

// за сколько экранов тетрадь проявляется в начале и уходит в черноту в конце
const longreadFadeIn = 0.4;
const longreadFadeOut = 0.6;

// selector — какая тетрадь, length — сколько экранов, flipAt — когда перевернуть лист (null — не переворачивать),
// getBase — отметка прокрутки, когда она начинается (null — ещё рано), getOutcomes — итоги, которые она закрывает
function createLongread(selector, length, flipAt, getBase, getOutcomes) {
    return {
        selector: selector,
        length: length,
        flipAt: flipAt,
        getBase: getBase,
        getOutcomes: getOutcomes,
        element: null,
        steps: [],
        isFlipped: false,
        flipTimer: null
    };
}


const longreads = [
    createLongread(".longread--1", longreadLength, null, getLongreadBase, function () {
        return [outcome, driverOutcome];
    }),
    createLongread(".longread--2", dinnerLongreadLength, dinnerLongreadFlipAt, getDinnerLongreadBase, function () {
        return [roomOutcome, cafeOutcome];
    }),
    createLongread(".longread--3", dinnerLongreadLength, dinnerLongreadFlipAt, getAlleyLongreadBase, function () {
        return [alleyOutcome];
    })
];


function setupLongread() {
    // страницы прошлых глав в следующих тетрадях — копии из первой: уже исписаны целиком
    document.querySelectorAll("[data-copy-from]").forEach(function (target) {
        const source = document.querySelector(target.dataset.copyFrom);

        target.innerHTML = source.innerHTML;

        target.querySelectorAll(".longread__step").forEach(function (element) {
            element.classList.remove("longread__step");
        });
    });

    longreads.forEach(function (item) {
        item.element = document.querySelector(item.selector);

        item.element.querySelectorAll(".longread__step").forEach(function (element) {
            item.steps.push({
                element: element,
                at: Number(element.dataset.step)
            });
        });
    });
}


// отметка прокрутки, когда первое обучение начинается; null — ещё рано
function getLongreadBase() {
    if (!drive.isActive) {
        return null;
    }

    // ждём, пока доиграет удар по цифрам
    if (!getRideOutcome().isStatsDone) {
        return null;
    }

    return drive.start + longreadFrom;
}


// лист переворачивается (или обратно, если прокрутили назад); пока он в воздухе — на нём тень
function setLongreadFlipped(item, isFlipped) {
    if (item.isFlipped === isFlipped) {
        return;
    }

    item.isFlipped = isFlipped;
    item.element.classList.toggle("longread--flipped", isFlipped);
    item.element.classList.add("longread--flipping");

    clearTimeout(item.flipTimer);

    item.flipTimer = setTimeout(function () {
        item.element.classList.remove("longread--flipping");
    }, 1400);
}


function updateLongread(progress) {
    longreads.forEach(function (item) {
        const base = item.getBase();
        const local = base === null ? -1 : progress - base;

        const fadeIn = smoothStep(0, longreadFadeIn, local);
        const fadeOut = 1 - smoothStep(item.length - longreadFadeOut, item.length, local);

        item.element.style.setProperty("--longread", (fadeIn * fadeOut).toFixed(3));

        // тетрадь полностью закрыла экран — итог с деньгами под ней больше не нужен,
        // иначе он проступит, когда тетрадь будет уходить (при прокрутке назад вернётся)
        item.getOutcomes().forEach(function (o) {
            o.element.classList.toggle("outcome--behind", local >= longreadFadeIn);
        });

        if (item.flipAt !== null) {
            setLongreadFlipped(item, local >= item.flipAt);
        }

        // каждый кусок текста появляется, когда до него докрутили, и прячется, если прокрутили назад
        item.steps.forEach(function (step) {
            step.element.classList.toggle("longread__step--visible", local >= step.at);
        });
    });
}


// ---------- сцена 3: отель ----------
// проявляется из черноты после поездки — только после удара по цифрам

// когда начинает проявляться (в экранах прокрутки от начала поездки) и за сколько экранов
const hotelFrom = longreadFrom + longreadLength;
const hotelFadeLength = 0.6;

// когда (от момента полного появления отеля) за стойкой проявляется ресепшионист
const receptionistFrom = 2.5;

const hotel = {
    level: 0,
    element: null,
    // шапка уже показывает вторую главу
    isChapterTwo: false
};


// отметка прокрутки, когда отель полностью проявился; null — отеля ещё нет
function getHotelBase() {
    if (!drive.isActive) {
        return null;
    }

    // отель ждёт, пока доиграет удар по цифрам
    if (!getRideOutcome().isStatsDone) {
        return null;
    }

    const from = drive.start + hotelFrom;

    return from + hotelFadeLength;
}


function updateHotel(progress) {
    let target = 0;

    if (drive.isActive) {
        const from = drive.start + hotelFrom;

        // ждём, пока доиграет удар по деньгам и безопасности
        if (getRideOutcome().isStatsDone) {
            target = smoothStep(from, from + hotelFadeLength, progress);
        }
    }

    // плавно догоняем, чтобы появление не дёргалось, если ждали удар по цифрам
    hotel.level = hotel.level + (target - hotel.level) * 0.08;

    if (Math.abs(target - hotel.level) < 0.001) {
        hotel.level = target;
    }

    light.element.style.setProperty("--hotel", hotel.level.toFixed(3));

    const isHotel = hotel.level > 0.5;

    document.body.classList.toggle("is-hotel", isHotel);

    // в отеле начинается вторая глава — меняем шапку и меню, только когда сцена сменилась
    if (isHotel !== hotel.isChapterTwo) {
        hotel.isChapterTwo = isHotel;
        setCurrentChapter(isHotel ? 2 : 1);
    }

    // ресепшионист: только после второй реплики мальчика
    const base = getHotelBase();
    const lastBoyLine = findLine(".speech--boy-4");
    const isReceptionistShown = base !== null && lastBoyLine.isFinished && progress >= base + receptionistFrom;

    hotel.element.classList.toggle("hotel--receptionist", isReceptionistShown);

    // вторая поза — с первой её реплики и дальше
    const firstReceptionistLine = lines.indexOf(findLine(".speech--receptionist-1"));
    const isReceptionistTalking = isReceptionistShown && currentLine >= firstReceptionistLine;

    hotel.element.classList.toggle("hotel--receptionist-talking", isReceptionistTalking);
}


// ---------- выбор в отеле: где поужинать ----------
// после реплик ресепшиониста отель уходит в черноту и появляются два варианта — как на первом выборе

// когда появляется выбор (в экранах прокрутки от полного появления отеля),
// и только когда последняя реплика ресепшиониста допечатана
const hotelChoiceFrom = 4.6;

const hotelChoice = {
    element: null,
    options: [],
    isShown: false,
    // что выбрал игрок: "delivery" — доставка в номер, "cafe" — местное кафе, null — ещё не выбрал
    selected: null
};


function setupHotelChoice() {
    hotelChoice.element = document.querySelector(".choice--hotel");
    hotelChoice.options = hotelChoice.element.querySelectorAll(".choice__option");

    hotelChoice.options.forEach(function (option) {
        option.addEventListener("click", function () {
            selectHotelChoice(option);
        });
    });
}


function selectHotelChoice(option) {
    hotelChoice.selected = option.dataset.choice;

    hotelChoice.options.forEach(function (otherOption) {
        otherOption.classList.toggle("choice__option--selected", otherOption === option);
    });

    hotelChoice.element.classList.add("choice--ready");
    hotelChoice.element.classList.add("choice--made");

    document.dispatchEvent(new CustomEvent("player-choice", {
        detail: {
            choice: hotelChoice.selected
        }
    }));

    // выбор сделан — дальше можно листать
    document.body.classList.remove("is-choice-locked");

    const selected = hotelChoice.selected;

    setTimeout(function () {
        // за это время игрок мог прокрутить назад и передумать
        if (!hotelChoice.isShown || hotelChoice.selected !== selected) {
            return;
        }

        if (selected === "delivery") {
            showRoom();
        }

        if (selected === "cafe") {
            showCafe();
        }
    }, streetDelay);
}


function resetHotelChoice() {
    hotelChoice.selected = null;
    hideRoom();
    hideCafe();
    hotelChoice.element.classList.remove("choice--made");

    hotelChoice.options.forEach(function (option) {
        option.classList.remove("choice__option--selected");
    });
}


function showHotelChoice(mark) {
    hotelChoice.isShown = true;
    hotelChoice.element.classList.add("choice--visible");
    hotel.element.classList.add("hotel--choice");
    document.body.classList.add("is-hotel-choosing");

    // ставим прокрутку ровно на выбор и запираем её, пока игрок не выбрал
    window.scrollTo(0, hero.offsetTop + (mark + 0.02) * window.innerHeight);
    document.body.classList.add("is-choice-locked");

    // когда варианты выехали — убираем задержки, чтобы наведение срабатывало сразу
    setTimeout(function () {
        if (hotelChoice.isShown) {
            hotelChoice.element.classList.add("choice--ready");
        }
    }, choiceReadyDelay);
}


function hideHotelChoice() {
    hotelChoice.isShown = false;
    hotelChoice.element.classList.remove("choice--visible");
    hotelChoice.element.classList.remove("choice--ready");
    hotel.element.classList.remove("hotel--choice");
    document.body.classList.remove("is-hotel-choosing");
    document.body.classList.remove("is-choice-locked");

    resetHotelChoice();
}


function updateHotelChoice(progress) {
    const base = getHotelBase();
    const mark = base === null ? null : base + hotelChoiceFrom;
    const lineBeforeChoice = findLine(".speech--receptionist-2");

    if (!hotelChoice.isShown && mark !== null && progress >= mark && lineBeforeChoice.isFinished) {
        showHotelChoice(mark);
    }

    // прокрутили назад — выбор прячется, снова виден отель
    if (hotelChoice.isShown && (mark === null || progress < mark - speechGap)) {
        hideHotelChoice();
    }
}


// ---------- сцена 4: номер ----------
// если выбрали доставку — после выбора проявляется номер, мальчик сидит на кровати

// через сколько (мс) после мысли в темноте появляется фонарик
const flashlightDelay = 900;

const room = {
    element: null,
    switchButton: null,
    isShown: false,
    // свет погас
    isDark: false,
    // в руке фонарик, ищем выключатель
    isFlashlight: false,
    // выключатель нашли и нажали
    isLit: false,
    // дверь уже открывалась (человек в балахоне вышел)
    isScareStarted: false,
    stranger: null,
    // номер «запуска» пугалки: если свет включили обратно, старые таймеры ничего не делают
    scareRunId: 0,
    eyes: []
};

// пугалка: через сколько (мс) от её начала открывается дверь,
// когда в проёме появляется человек в балахоне и когда он начинает медленно идти к мальчику.
// идёт он, пока игрок ищет выключатель, и останавливается рядом с мальчиком.
// включили свет — это девочка-курьер с пиццей
const scareTimeline = [
    { at: 0, className: "room--door" },
    { at: 1000, className: "room--stranger" },
    // идти начинает, только когда полностью проступила
    { at: 2600, className: "room--walk" }
];

// дверь открывается через столько (мс) после того, как в руке появился фонарик
const scareDelay = 1500;

// глаз в темноте: сколько (мс) он смотрит на фонарик, прежде чем зажмуриться и пропасть
const eyesStareTime = 450;

// итог доставки: когда чёрный экран с текстом и когда удар по цифрам (в экранах прокрутки от выбора в отеле)
const roomOutcomeFrom = 2;
const roomOutcomeStatsFrom = 2.6;

// сколько отдали за ужин и сколько безопасности потеряли, впустив незнакомца
const roomMoneyLoss = 20;
const roomSafetyLoss = 33;

const roomOutcome = createOutcome(".outcome--room", "room-outcome");


function setupRoom() {
    room.element = document.querySelector(".room");
    room.switchButton = document.querySelector(".room__switch");
    room.stranger = document.querySelector(".room__stranger");
    room.stranger.addEventListener("animationend", onStrangerArrived);

    room.element.querySelectorAll(".room__eyes").forEach(function (element) {
        room.eyes.push({
            element: element,
            seenAt: 0
        });
    });

    // кнопка ловит клики только когда в руке фонарик, а курсор и есть фонарик —
    // значит, нажать можно, только посветив на выключатель
    room.switchButton.addEventListener("click", turnLightsOn);
}


// отметка прокрутки, от которой считаются события номера; null — номера нет
function getRoomBase() {
    if (!room.isShown) {
        return null;
    }

    return getHotelBase() + hotelChoiceFrom;
}


function showRoom() {
    room.isShown = true;
    room.element.classList.add("room--visible");
    document.body.classList.add("is-room");
}


function hideRoom() {
    room.isShown = false;
    room.element.classList.remove("room--visible");
    document.body.classList.remove("is-room");

    hideRoomOutcome();

    resetLights();
}


function turnLightsOut(base) {
    room.isDark = true;
    room.element.classList.add("room--dark");
    document.body.classList.add("is-lights-out");
    startDarkSound();

    // запираем прокрутку, пока выключатель не найден
    window.scrollTo(0, hero.offsetTop + (base + roomDarkFrom + 0.02) * window.innerHeight);
    document.body.classList.add("is-choice-locked");
}


// дверь открывается, выходит незнакомец и бросается на нас — по таймеру, шаг за шагом
function playScare() {
    room.scareRunId = room.scareRunId + 1;

    const runId = room.scareRunId;

    scareTimeline.forEach(function (step) {
        setTimeout(function () {
            if (runId === room.scareRunId && room.isDark) {
                room.element.classList.add(step.className);

                // дверь открывается — скрип
                if (step.className === "room--door") {
                    playDoorSound();
                }
            }
        }, step.at);
    });
}


// человек в балахоне дошёл до своего места рядом с мальчиком — останавливается
function onStrangerArrived(event) {
    if (event.animationName === "stranger-walk") {
        room.element.classList.add("room--arrived");
    }
}


// глаза в темноте: попали в круг фонарика — распахиваются, потом зажмуриваются и пропадают
function updateDarkEyes(now) {
    if (!room.isFlashlight) {
        return;
    }

    const beamRadius = getDesignUnit() * 7.2222 * 0.7;

    room.eyes.forEach(function (eye) {
        if (eye.seenAt > 0) {
            if (now - eye.seenAt > eyesStareTime) {
                eye.element.classList.add("room__eyes--gone");
            }

            return;
        }

        const rect = eye.element.getBoundingClientRect();
        const distance = Math.hypot(rect.left + rect.width / 2 - light.currentX, rect.top + rect.height / 2 - light.currentY);

        if (distance < beamRadius) {
            eye.seenAt = now;
            eye.element.classList.add("room__eyes--seen");
        }
    });
}


function giveFlashlight() {
    room.isFlashlight = true;
    room.element.classList.add("room--flashlight");
    document.body.classList.add("is-flashlight");
}


function turnLightsOn() {
    room.isDark = false;
    room.isFlashlight = false;
    room.isLit = true;

    room.element.classList.remove("room--dark", "room--flashlight");
    room.element.classList.add("room--lit");
    document.body.classList.remove("is-lights-out", "is-flashlight", "is-choice-locked");
    stopDarkSound();

    // свет включили: пугалка дальше не идёт, а человек в балахоне оказывается девочкой с пиццей
    room.scareRunId = room.scareRunId + 1;
}


function stopScare() {
    room.scareRunId = room.scareRunId + 1;
    room.element.classList.remove("room--door", "room--stranger", "room--walk", "room--arrived");
    stopDoorSound();
}


function resetLights() {
    room.isDark = false;
    room.isFlashlight = false;
    room.isLit = false;
    room.isScareStarted = false;

    room.element.classList.remove("room--dark", "room--flashlight", "room--lit");
    stopScare();
    stopDarkSound();
    document.body.classList.remove("is-lights-out", "is-flashlight");

    room.eyes.forEach(function (eye) {
        eye.seenAt = 0;
        eye.element.classList.remove("room__eyes--seen", "room__eyes--gone");
    });
}


function updateRoom(progress) {
    const base = getRoomBase();

    if (base === null) {
        return;
    }

    const lineBefore = findLine(".speech--room-1");
    const darkFrom = base + roomDarkFrom;

    // после реплики про пиццу — по прокрутке резко гаснет свет
    if (!room.isDark && !room.isLit && progress >= darkFrom && lineBefore.isFinished) {
        turnLightsOut(base);
    }

    // мысль в темноте допечатана — через мгновение в руке фонарик
    const darkText = findLine(".speech--room-2");

    if (room.isDark && darkText.isFinished && !room.isFlashlight && !room.flashlightTimer) {
        room.flashlightTimer = setTimeout(function () {
            room.flashlightTimer = null;

            if (room.isDark) {
                giveFlashlight();
            }
        }, flashlightDelay);
    }

    // фонарик в руке — чуть погодя открывается дверь, и к нам медленно идёт человек в балахоне,
    // пока игрок ищет выключатель
    if (room.isFlashlight && !room.isScareStarted) {
        room.isScareStarted = true;

        const runId = room.scareRunId;

        setTimeout(function () {
            if (runId === room.scareRunId && room.isDark) {
                playScare();
            }
        }, scareDelay);
    }

    // свет уже включили и прокрутили назад, выше отметки — всё как было до темноты
    if (room.isLit && progress < darkFrom - speechGap) {
        resetLights();
    }

    updateRoomOutcome(progress, base);
}


// после «ваш ужин, сэр! с вас 20$» по прокрутке — чёрный экран: минус деньги за ужин и безопасность
function updateRoomOutcome(progress, base) {
    const lastLine = findLine(".speech--girl-1");
    const textFrom = base + roomOutcomeFrom;

    if (!roomOutcome.isShown && room.isLit && lastLine.isFinished && progress >= textFrom) {
        // считаем от того, что было у игрока до доставки (после поездки)
        const ride = getRideOutcome();
        const money = ride.to.money;
        const safety = ride.to.safety;

        roomOutcome.from = { money: money, safety: safety };
        roomOutcome.to = { money: money - roomMoneyLoss, safety: safety - roomSafetyLoss };

        resetOutcomeStats(roomOutcome);
        showOutcomeText(roomOutcome);
        document.body.classList.add("is-dinner-outcome");
    }

    // прокрутили назад — итог прячется, цифры возвращаются
    if (roomOutcome.isShown && progress < textFrom - speechGap) {
        hideRoomOutcome();
        return;
    }

    if (roomOutcome.isShown && roomOutcome.isTextFinished && !roomOutcome.isStatsPlayed && progress >= base + roomOutcomeStatsFrom) {
        playOutcomeStats(roomOutcome);
    }
}


function hideRoomOutcome() {
    if (!roomOutcome.isShown) {
        return;
    }

    hideOutcome(roomOutcome);
    document.body.classList.remove("is-dinner-outcome");
}


// ---------- сцена 4б: кафе ----------
// если выбрали кафе: мальчик заказывает пиццу, справа выезжает девочка с пиццей.
// потом гаснет свет: в руке фонарик, а девочка в балахоне прячется у левого края — её надо найти и нажать

// за сколько (мс) девочка доезжает до своего места
const cafeGirlRideTime = 1200;

// итог кафе: когда чёрный экран с текстом и когда удар по цифрам (в экранах прокрутки от выбора в отеле)
const cafeOutcomeFrom = 3;
const cafeOutcomeStatsFrom = 3.6;

// сколько украли
const cafeMoneyLoss = 150;
const cafeSafetyLoss = 25;

const cafeOutcome = createOutcome(".outcome--cafe", "cafe-outcome");

const cafe = {
    element: null,
    girl: null,
    isShown: false,
    isGirlShown: false,
    isGirlReady: false,
    isDark: false,
    isFlashlight: false,
    isLit: false,
    runId: 0
};


function setupCafe() {
    cafe.element = document.querySelector(".cafe");
    cafe.girl = document.querySelector(".cafe__girl");

    // кнопка ловит клики только в темноте с фонариком — значит, нажать можно, только найдя её
    cafe.girl.addEventListener("click", cafeLightsOn);
}


// отметка прокрутки, от которой считаются события кафе; null — кафе нет
function getCafeBase() {
    if (!cafe.isShown) {
        return null;
    }

    return getHotelBase() + hotelChoiceFrom;
}


function showCafe() {
    cafe.isShown = true;
    cafe.element.classList.add("cafe--visible");
    document.body.classList.add("is-cafe");
}


function hideCafe() {
    cafe.isShown = false;
    cafe.element.classList.remove("cafe--visible");
    document.body.classList.remove("is-cafe");

    hideCafeGirl();
    resetCafeLights();
    hideCafeOutcome();
}


function showCafeGirl() {
    cafe.isGirlShown = true;
    cafe.element.classList.add("cafe--girl");

    const runId = cafe.runId;

    setTimeout(function () {
        if (runId === cafe.runId && cafe.isGirlShown) {
            cafe.isGirlReady = true;
        }
    }, cafeGirlRideTime);
}


function hideCafeGirl() {
    cafe.runId = cafe.runId + 1;
    cafe.isGirlShown = false;
    cafe.isGirlReady = false;
    cafe.element.classList.remove("cafe--girl");
}


function cafeLightsOut(base) {
    cafe.isDark = true;
    cafe.element.classList.add("cafe--dark");
    document.body.classList.add("is-lights-out");

    // запираем прокрутку, пока девочку не нашли
    window.scrollTo(0, hero.offsetTop + (base + cafeDarkFrom + 0.02) * window.innerHeight);
    document.body.classList.add("is-choice-locked");

    // фонарик — сразу, как только свет догорел и погас
    const runId = cafe.runId;

    setTimeout(function () {
        if (runId === cafe.runId && cafe.isDark) {
            cafe.isFlashlight = true;
            cafe.element.classList.add("cafe--flashlight");
            document.body.classList.add("is-flashlight");
        }
    }, flashlightDelay);
}


function cafeLightsOn() {
    if (!cafe.isFlashlight) {
        return;
    }

    cafe.isDark = false;
    cafe.isFlashlight = false;
    cafe.isLit = true;

    cafe.element.classList.remove("cafe--dark", "cafe--flashlight");
    cafe.element.classList.add("cafe--lit");
    document.body.classList.remove("is-lights-out", "is-flashlight", "is-choice-locked");
}


function resetCafeLights() {
    cafe.isDark = false;
    cafe.isFlashlight = false;
    cafe.isLit = false;

    cafe.element.classList.remove("cafe--dark", "cafe--flashlight", "cafe--lit");
    document.body.classList.remove("is-lights-out", "is-flashlight");
}


function updateCafe(progress) {
    const base = getCafeBase();

    if (base === null) {
        return;
    }

    // после «закажу маргариту» по прокрутке справа выезжает девочка с пиццей
    const orderLine = findLine(".speech--cafe-1");

    if (!cafe.isGirlShown && progress >= base + cafeGirlFrom && orderLine.isFinished) {
        showCafeGirl();
    }

    if (cafe.isGirlShown && progress < base + cafeGirlFrom - speechGap) {
        hideCafeGirl();
    }

    // после «спасибо!» по прокрутке гаснет свет
    const thanksLine = findLine(".speech--cafe-3");
    const darkFrom = base + cafeDarkFrom;

    if (!cafe.isDark && !cafe.isLit && progress >= darkFrom && thanksLine.isFinished) {
        cafeLightsOut(base);
    }

    // свет уже включили и прокрутили назад, выше отметки — всё как было до темноты
    if (cafe.isLit && progress < darkFrom - speechGap) {
        resetCafeLights();
    }

    updateCafeOutcome(progress, base);
}


// после «приходите завтра» по прокрутке — чёрный экран: обокрали, минус деньги и безопасность
function updateCafeOutcome(progress, base) {
    const lastLine = findLine(".speech--cafe-6");
    const textFrom = base + cafeOutcomeFrom;

    if (!cafeOutcome.isShown && cafe.isLit && lastLine.isFinished && progress >= textFrom) {
        // считаем от того, что было у игрока до кафе (после поездки)
        const ride = getRideOutcome();
        const money = ride.to.money;
        const safety = ride.to.safety;

        cafeOutcome.from = { money: money, safety: safety };
        cafeOutcome.to = { money: money - cafeMoneyLoss, safety: safety - cafeSafetyLoss };

        resetOutcomeStats(cafeOutcome);
        showOutcomeText(cafeOutcome);
        document.body.classList.add("is-dinner-outcome");
    }

    // прокрутили назад — итог прячется, цифры возвращаются
    if (cafeOutcome.isShown && progress < textFrom - speechGap) {
        hideCafeOutcome();
        return;
    }

    if (cafeOutcome.isShown && cafeOutcome.isTextFinished && !cafeOutcome.isStatsPlayed && progress >= base + cafeOutcomeStatsFrom) {
        playOutcomeStats(cafeOutcome);
    }
}


function hideCafeOutcome() {
    if (!cafeOutcome.isShown) {
        return;
    }

    hideOutcome(cafeOutcome);
    document.body.classList.remove("is-dinner-outcome");
}


// ---------- глава 3: прогулка ----------
// после итога ужина (доставка или кафе) по прокрутке из черноты проявляется улица

// через сколько экранов после удара по цифрам ужина открывается тетрадь (а за ней — улица) и за сколько экранов
const walkAfterOutcome = 1;
const walkFadeLength = 0.6;

const walk = {
    element: null,
    level: 0,
    // шапка уже показывает третью главу
    isChapterThree: false
};


function setupWalk() {
    walk.element = document.querySelector(".walk");
}


// итог ужина для выбранной ветки (null — ещё не ужинали)
function getDinnerOutcome() {
    if (room.isShown) {
        return roomOutcome;
    }

    if (cafe.isShown) {
        return cafeOutcome;
    }

    return null;
}


// отметка прокрутки, когда начинается второе обучение (тетрадь после ужина); null — ещё рано
function getDinnerLongreadBase() {
    const dinnerOutcome = getDinnerOutcome();

    // ждём, пока доиграет удар по цифрам ужина
    if (dinnerOutcome === null || !dinnerOutcome.isStatsDone) {
        return null;
    }

    const statsFrom = dinnerOutcome === roomOutcome ? roomOutcomeStatsFrom : cafeOutcomeStatsFrom;

    return getHotelBase() + hotelChoiceFrom + statsFrom + walkAfterOutcome;
}


// отметка прокрутки, когда улица начинает проявляться — сразу после второго обучения; null — ещё рано
function getWalkFrom() {
    const base = getDinnerLongreadBase();

    if (base === null) {
        return null;
    }

    return base + dinnerLongreadLength;
}


// отметка прокрутки, когда улица полностью проявилась; null — улицы ещё нет
function getWalkBase() {
    const from = getWalkFrom();

    if (from === null) {
        return null;
    }

    return from + walkFadeLength;
}


function updateWalk(progress) {
    const from = getWalkFrom();
    let target = 0;

    if (from !== null) {
        target = smoothStep(from, from + walkFadeLength, progress);
    }

    // плавно догоняем, чтобы появление не дёргалось, если ждали удар по цифрам
    walk.level = walk.level + (target - walk.level) * 0.08;

    if (Math.abs(target - walk.level) < 0.001) {
        walk.level = target;
    }

    walk.element.style.setProperty("--walk", walk.level.toFixed(3));

    const isWalk = walk.level > 0.5;

    document.body.classList.toggle("is-walk", isWalk);

    // в шапке — третья глава, пока на экране улица
    if (isWalk !== walk.isChapterThree) {
        walk.isChapterThree = isWalk;
        setCurrentChapter(isWalk ? 3 : 2);
    }
}


// глава 3 начинается на улице. всё, что было до неё, считаем пройденным:
// если игрок ещё не выбирал ужин — выбор делается за него («заказать доставку»)
function goToWalk() {
    goToHotel();

    // реплики отеля считаем прочитанными — иначе выбор ужина будет их ждать
    lines.forEach(function (line) {
        if (line.scene === "hotel") {
            line.isFinished = true;
            setLineCharsVisible(line, true);
        }
    });

    const mark = getHotelBase() + hotelChoiceFrom;

    if (!hotelChoice.isShown) {
        showHotelChoice(mark);
    }

    if (!room.isShown && !cafe.isShown) {
        const deliveryOption = hotelChoice.element.querySelector('[data-choice="delivery"]');

        selectHotelChoice(deliveryOption);
        showRoom();
    }

    // ужин уже позади: реплики прочитаны, свет снова включён
    const dinnerScene = room.isShown ? "room" : "cafe";

    lines.forEach(function (line) {
        if (line.scene === dinnerScene) {
            line.isFinished = true;
            setLineCharsVisible(line, true);
        }
    });

    if (room.isShown && !room.isLit) {
        turnLightsOn();
    }

    if (cafe.isShown) {
        if (!cafe.isGirlShown) {
            showCafeGirl();
        }

        if (!cafe.isLit) {
            cafe.isFlashlight = true;
            cafeLightsOn();
        }
    }

    // и удар по цифрам после ужина тоже уже случился
    const dinnerOutcome = getDinnerOutcome();

    if (!dinnerOutcome.isStatsDone) {
        const ride = getRideOutcome();
        const isRoom = dinnerOutcome === roomOutcome;
        const moneyLoss = isRoom ? roomMoneyLoss : cafeMoneyLoss;
        const safetyLoss = isRoom ? roomSafetyLoss : cafeSafetyLoss;

        dinnerOutcome.from = { money: ride.to.money, safety: ride.to.safety };
        dinnerOutcome.to = { money: ride.to.money - moneyLoss, safety: ride.to.safety - safetyLoss };

        finishOutcome(dinnerOutcome);
        document.body.classList.add("is-dinner-outcome");
    }

    window.scrollTo(0, hero.offsetTop + getWalkBase() * window.innerHeight);
}


// экран-итог сразу в конечном виде: текст напечатан, цифры уже упали
function finishOutcome(o) {
    o.runId = o.runId + 1;
    o.isShown = true;
    o.isTextFinished = true;
    o.isStatsPlayed = true;
    o.isStatsDone = true;

    o.element.classList.add("outcome--visible");
    o.stats.classList.add("outcome__stats--visible");

    o.chars.forEach(function (char) {
        char.element.classList.add("outcome__char--visible");
    });

    [o.money.stat, o.safety.stat].forEach(function (stat) {
        stat.classList.add("outcome__stat--dropped");
    });

    o.money.number.textContent = o.to.money;
    o.safety.number.textContent = o.to.safety;
    o.safety.fill.style.setProperty("--level", o.to.safety + "%");

    setGameHeader({
        money: o.to.money,
        safety: o.to.safety
    });
}


// ---------- глава 3: выбор пути ----------
// после слов деда улица уходит в черноту: срезать по тёмному переулку или идти по людной улице

// когда появляется выбор (в экранах прокрутки от момента, когда улица полностью проявилась)
const walkChoiceFrom = 3.6;

const walkChoice = {
    element: null,
    options: null,
    isShown: false,
    // что выбрал игрок: "alley" — переулок, "street" — людная улица, null — ещё не выбрал
    selected: null
};


function setupWalkChoice() {
    walkChoice.element = document.querySelector(".choice--alley");
    walkChoice.options = walkChoice.element.querySelectorAll(".choice__option");

    walkChoice.options.forEach(function (option) {
        option.addEventListener("click", function () {
            selectWalkChoice(option);
        });
    });
}


function selectWalkChoice(option) {
    walkChoice.selected = option.dataset.choice;

    walkChoice.options.forEach(function (otherOption) {
        otherOption.classList.toggle("choice__option--selected", otherOption === option);
    });

    walkChoice.element.classList.add("choice--ready");
    walkChoice.element.classList.add("choice--made");

    // выбор сделан — дальше можно листать
    document.body.classList.remove("is-choice-locked");

    const selected = walkChoice.selected;

    setTimeout(function () {
        // за это время игрок мог прокрутить назад и передумать
        if (!walkChoice.isShown || walkChoice.selected !== selected) {
            return;
        }

        if (selected === "alley") {
            showAlley();
        }
    }, streetDelay);
}


function resetWalkChoice() {
    walkChoice.selected = null;
    hideAlley();
    walkChoice.element.classList.remove("choice--made");

    walkChoice.options.forEach(function (option) {
        option.classList.remove("choice__option--selected");
    });
}


function showWalkChoice(mark) {
    walkChoice.isShown = true;
    walkChoice.element.classList.add("choice--visible");
    walk.element.classList.add("walk--choice");
    document.body.classList.add("is-walk-choosing");

    // ставим прокрутку ровно на выбор и запираем её, пока игрок не выбрал
    window.scrollTo(0, hero.offsetTop + (mark + 0.02) * window.innerHeight);
    document.body.classList.add("is-choice-locked");

    // когда варианты выехали — убираем задержки, чтобы наведение срабатывало сразу
    setTimeout(function () {
        if (walkChoice.isShown) {
            walkChoice.element.classList.add("choice--ready");
        }
    }, choiceReadyDelay);
}


function hideWalkChoice() {
    walkChoice.isShown = false;
    walkChoice.element.classList.remove("choice--visible");
    walkChoice.element.classList.remove("choice--ready");
    walk.element.classList.remove("walk--choice");
    document.body.classList.remove("is-walk-choosing");
    document.body.classList.remove("is-choice-locked");

    resetWalkChoice();
}


// отметка прокрутки, где появляется выбор пути; null — улицы ещё нет
function getWalkChoiceMark() {
    const base = getWalkBase();

    return base === null ? null : base + walkChoiceFrom;
}


function updateWalkChoice(progress) {
    const mark = getWalkChoiceMark();
    const lineBeforeChoice = findLine(".speech--walk-3");

    if (!walkChoice.isShown && mark !== null && progress >= mark && lineBeforeChoice.isFinished) {
        showWalkChoice(mark);
    }

    // прокрутили назад — выбор прячется, снова видна улица
    if (walkChoice.isShown && (mark === null || progress < mark - speechGap)) {
        hideWalkChoice();
    }
}


// ---------- глава 3: тёмный переулок ----------
// мальчик идёт по переулку и проговаривает повороты. потом резко темнеет, колотится сердце —
// на него нападают, и надо бежать назад тем же путём (мини-игра «побег»)

// сколько поворотов и какие — выбираем случайно при загрузке страницы
const alleyTurns = 4;
const alleyRoute = [];

const turnWords = {
    left: "налево",
    right: "направо"
};

// что мальчик говорит на каждом повороте
const turnPhrases = [
    "так, по карте сначала {turn}",
    "теперь {turn}",
    "дальше {turn}",
    "и последний поворот — {turn}. что-то тут совсем темно…"
];

// сердце: с какой скоростью бьётся в темноте и во время побега (мс на один «тук-тук»)
const heartbeatCalm = 900;
const heartbeatRun = 640;
const heartbeatFastest = 380;

// итог переулка: когда чёрный экран с текстом и когда удар по цифрам (в экранах прокрутки от выбора пути)
const alleyOutcomeFrom = alleyDarkFrom + 0.6;
const alleyOutcomeStatsFrom = alleyDarkFrom + 1.2;

// что потерял: кошелёк выпал, пока убегал, и сильно испугался
const alleyMoneyLoss = 40;
const alleySafetyLoss = 30;

// через сколько экранов после удара по цифрам открывается тетрадь главы 3
const alleyLongreadAfterOutcome = 1;

const alleyOutcome = createOutcome(".outcome--alley", "alley-outcome");

const alley = {
    element: null,
    isShown: false,
    isDark: false,
    // сколько поворотов мальчик уже проговорил
    turnsSaid: 0
};


// случайные повороты; хотя бы один в каждую сторону — иначе слишком просто
function setupAlleyRoute() {
    do {
        alleyRoute.length = 0;

        for (let i = 0; i < alleyTurns; i++) {
            alleyRoute.push(Math.random() < 0.5 ? "left" : "right");
        }
    } while (alleyRoute.every(function (turn) {
        return turn === alleyRoute[0];
    }));

    // вписываем повороты в реплики — до того, как реплики разложатся на буквы
    turnPhrases.forEach(function (phrase, index) {
        const inner = document.querySelector(".speech--alley-" + (index + 1) + " .speech__inner");

        inner.innerHTML = phrase.replace("{turn}", '<b class="speech__key">' + turnWords[alleyRoute[index]] + "</b>");
    });
}


function setupAlley() {
    alley.element = document.querySelector(".alley");
}


// отметка прокрутки, от которой считаются события переулка; null — переулка нет
function getAlleyBase() {
    if (!alley.isShown) {
        return null;
    }

    return getWalkChoiceMark();
}


function showAlley() {
    alley.isShown = true;
    alley.element.classList.add("alley--visible");
    document.body.classList.add("is-alley");
}


function hideAlley() {
    alley.isShown = false;
    alley.element.classList.remove("alley--visible");
    document.body.classList.remove("is-alley");

    resetAlleyDark();
    setAlleyTurns(0);
    hideAlleyOutcome();
}


// с каждым проговорённым поворотом переулок приближается, темнеет и уходит в сторону поворота
function setAlleyTurns(count) {
    if (count === alley.turnsSaid) {
        return;
    }

    alley.turnsSaid = count;

    let shift = 0;

    if (count > 0) {
        // повернули налево — картинка уезжает вправо, и наоборот
        shift = alleyRoute[count - 1] === "left" ? 4 : -4;
    }

    alley.element.style.setProperty("--alley-zoom", (1 + count * 0.06).toFixed(2));
    alley.element.style.setProperty("--alley-shift", shift + "%");
    alley.element.style.setProperty("--alley-shade", (0.4 + count * 0.08).toFixed(2));
}


// резко темнеет: колотится сердце, прокрутка заперта до конца побега
function alleyLightsOut(base) {
    alley.isDark = true;
    alley.element.classList.add("alley--dark");
    alley.element.style.setProperty("--beat", heartbeatCalm + "ms");
    startHeartbeat(heartbeatCalm);

    window.scrollTo(0, hero.offsetTop + (base + alleyDarkFrom + 0.02) * window.innerHeight);
    document.body.classList.add("is-choice-locked");
}


function resetAlleyDark() {
    alley.isDark = false;
    alley.element.classList.remove("alley--dark", "alley--safe");
    stopHeartbeat();
    resetEscape();
}


function updateAlley(progress) {
    const base = getAlleyBase();

    if (base === null) {
        return;
    }

    // сколько поворотов уже проговорено
    let count = 0;

    for (let i = 1; i <= alleyTurns; i++) {
        if (findLine(".speech--alley-" + i).isFinished) {
            count = i;
        }
    }

    setAlleyTurns(count);

    // после последнего поворота и подсказки, как бежать обратно, по прокрутке резко темнеет
    const tipLine = findLine(".speech--alley-tip");
    const darkFrom = base + alleyDarkFrom;

    if (!alley.isDark && progress >= darkFrom && tipLine.isFinished) {
        alleyLightsOut(base);
    }

    // «надо бежать назад!» допечатано — начинается побег
    const runLine = findLine(".speech--alley-5");

    if (alley.isDark && runLine.isFinished && !escapeGame.isStarted) {
        escapeGame.isStarted = true;

        const runId = escapeGame.runId;

        setTimeout(function () {
            if (runId === escapeGame.runId && alley.isDark) {
                startEscape();
            }
        }, escapeStartDelay);
    }

    // убежали и прокрутили назад, выше темноты — всё как было
    if (alley.isDark && escapeGame.isWon && progress < darkFrom - speechGap) {
        resetAlleyDark();
    }

    updateAlleyOutcome(progress, base);
}


// убежали — по прокрутке чёрный экран: выронил кошелёк, минус деньги и безопасность
function updateAlleyOutcome(progress, base) {
    const textFrom = base + alleyOutcomeFrom;

    if (!alleyOutcome.isShown && escapeGame.isWon && progress >= textFrom) {
        // считаем от того, что было у игрока после ужина
        const dinner = getDinnerOutcome().to;

        alleyOutcome.from = { money: dinner.money, safety: dinner.safety };
        alleyOutcome.to = { money: dinner.money - alleyMoneyLoss, safety: Math.max(dinner.safety - alleySafetyLoss, 0) };

        resetOutcomeStats(alleyOutcome);
        showOutcomeText(alleyOutcome);
        document.body.classList.add("is-alley-outcome");
    }

    // прокрутили назад — итог прячется, цифры возвращаются
    if (alleyOutcome.isShown && progress < textFrom - speechGap) {
        hideAlleyOutcome();
        return;
    }

    if (alleyOutcome.isShown && alleyOutcome.isTextFinished && !alleyOutcome.isStatsPlayed && progress >= base + alleyOutcomeStatsFrom) {
        playOutcomeStats(alleyOutcome);
    }
}


function hideAlleyOutcome() {
    if (!alleyOutcome.isShown) {
        return;
    }

    hideOutcome(alleyOutcome);
    document.body.classList.remove("is-alley-outcome");
}


// отметка прокрутки, когда начинается тетрадь главы 3; null — ещё рано
function getAlleyLongreadBase() {
    const base = getAlleyBase();

    if (base === null || !alleyOutcome.isStatsDone) {
        return null;
    }

    return base + alleyOutcomeStatsFrom + alleyLongreadAfterOutcome;
}


// ---------- мини-игра «побег» ----------
// бежим назад тем же путём: повороты в обратном порядке и в другую сторону.
// на каждый поворот — всё меньше времени, кнопки каждый раз перемешиваются. «назад» — сразу схватили

// через сколько (мс) после «надо бежать назад!» начинается побег
const escapeStartDelay = 600;

// время на первый поворот и на сколько меньше на каждый следующий (мс), но не меньше минимума
const escapeFirstStepTime = 3000;
const escapeStepFaster = 300;
const escapeMinStepTime = 1800;

// кнопки на каждом повороте появляются в полный размер и сжимаются, пока тает время: до какой доли размера
const escapeButtonEndScale = 0.35;

// где можно раскидывать кнопки: ниже заголовка и полоски времени (доля высоты экрана) и с отступом от краёв (в --u)
const escapeFieldTop = 0.4;
const escapeFieldMargin = 3.4722;

// с какой доли времени полоска краснеет
const escapeHurryAt = 0.65;

const mirrorTurn = {
    left: "right",
    right: "left"
};

const escapeGame = {
    element: null,
    buttonsBox: null,
    buttons: [],
    stepsBox: null,
    steps: [],
    timer: null,
    timerFill: null,
    resultText: null,
    // правильные нажатия по порядку
    answer: [],
    index: 0,
    isStarted: false,
    isPlaying: false,
    isWon: false,
    timeoutId: null,
    hurryId: null,
    runId: 0
};


function setupEscape() {
    escapeGame.element = document.querySelector(".escape");
    escapeGame.buttonsBox = escapeGame.element.querySelector(".escape__buttons");
    escapeGame.buttons = escapeGame.element.querySelectorAll(".escape__buttons .escape__button");
    escapeGame.stepsBox = escapeGame.element.querySelector(".escape__steps");
    escapeGame.timer = escapeGame.element.querySelector(".escape__timer");
    escapeGame.timerFill = escapeGame.element.querySelector(".escape__timer-fill");
    escapeGame.resultText = escapeGame.element.querySelector(".escape__result-text");

    escapeGame.buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            onEscapeMove(button);
        });

        // анимацию «верно / неверно» снимаем, когда доиграла — чтобы сработала и в следующий раз
        button.addEventListener("animationend", function () {
            button.classList.remove("escape__button--right", "escape__button--wrong");
        });
    });

    // «ещё раз» — снова в начало переулка: мальчик заново проговаривает повороты
    escapeGame.element.querySelector(".escape__button--retry").addEventListener("click", retryAlley);
}


function startEscape() {
    clearEscapeTimers();
    escapeGame.runId = escapeGame.runId + 1;
    escapeGame.isStarted = true;
    escapeGame.isPlaying = true;
    escapeGame.isWon = false;
    escapeGame.index = 0;

    // обратный путь: последний поворот — первым, и в другую сторону
    escapeGame.answer = alleyRoute.slice().reverse().map(function (turn) {
        return mirrorTurn[turn];
    });

    // кружок на каждый поворот
    escapeGame.stepsBox.innerHTML = "";
    escapeGame.steps = [];

    escapeGame.answer.forEach(function () {
        const step = document.createElement("span");

        step.className = "escape__step";
        escapeGame.stepsBox.appendChild(step);
        escapeGame.steps.push(step);
    });

    escapeGame.element.classList.remove("escape--done", "escape--won", "escape--caught");
    escapeGame.element.classList.add("escape--visible");
    alley.element.classList.remove("alley--safe", "alley--caught", "alley--hurry");
    alley.element.classList.add("alley--escape");
    alley.element.style.setProperty("--chase", "0");

    setEscapeBeat(heartbeatRun);
    nextEscapeStep();
}


function getEscapeStepTime(index) {
    return Math.max(escapeFirstStepTime - index * escapeStepFaster, escapeMinStepTime);
}


// сердце бьётся в такт: и звук, и пульсация по краям
function setEscapeBeat(interval) {
    alley.element.style.setProperty("--beat", interval + "ms");
    setHeartbeatRate(interval);
}


function nextEscapeStep() {
    clearEscapeTimers();

    // кнопки каждый раз в новых местах и всё мельче — надо искать глазами и успевать
    placeEscapeButtons();

    // полоска времени: сразу полная, потом равномерно тает
    const time = getEscapeStepTime(escapeGame.index);

    escapeGame.timer.classList.remove("escape__timer--hurry");
    alley.element.classList.remove("alley--hurry");
    escapeGame.timerFill.style.transition = "none";
    escapeGame.timerFill.style.transform = "scaleX(1)";
    void escapeGame.timerFill.offsetWidth;
    escapeGame.timerFill.style.transition = "transform " + time + "ms linear";
    escapeGame.timerFill.style.transform = "scaleX(0)";

    // кнопки сжимаются вместе с тающим временем: чем дольше думаешь, тем труднее попасть
    escapeGame.buttons.forEach(function (button) {
        button.style.transition = "none";
        button.style.scale = "1";
    });

    void escapeGame.buttonsBox.offsetWidth;

    escapeGame.buttons.forEach(function (button) {
        button.style.transition = "transform 0.08s ease, scale " + time + "ms linear";
        button.style.scale = String(escapeButtonEndScale);
    });

    escapeGame.hurryId = setTimeout(function () {
        escapeGame.timer.classList.add("escape__timer--hurry");
        // время кончается — переулок трясёт
        alley.element.classList.add("alley--hurry");
    }, time * escapeHurryAt);

    escapeGame.timeoutId = setTimeout(function () {
        caughtEscape("ты замешкался — и тебя догнали");
    }, time);
}


// раскидываем кнопки по экрану случайно, чтобы они не налезали друг на друга
function placeEscapeButtons() {
    const unit = getDesignUnit();
    const width = escapeGame.element.offsetWidth;
    const height = escapeGame.element.offsetHeight;
    const size = 13.8889 * unit;
    const margin = escapeFieldMargin * unit;

    const minX = margin;
    const maxX = width - size - margin;
    const minY = height * escapeFieldTop;
    const maxY = height - size - margin;

    const placed = [];

    escapeGame.buttons.forEach(function (button) {
        let x = 0;
        let y = 0;

        // пробуем случайные места, пока не найдём свободное (на всякий случай — не бесконечно)
        for (let attempt = 0; attempt < 60; attempt++) {
            x = minX + Math.random() * Math.max(maxX - minX, 0);
            y = minY + Math.random() * Math.max(maxY - minY, 0);

            const isFree = placed.every(function (other) {
                return Math.hypot(other.x - x, other.y - y) > size * 1.25;
            });

            if (isFree) {
                break;
            }
        }

        placed.push({ x: x, y: y });
        button.style.left = x + "px";
        button.style.top = y + "px";
    });
}


// «ещё раз»: всё как до темноты, прокрутка — в начало переулка, повороты проговариваются заново
function retryAlley() {
    resetAlleyDark();
    setAlleyTurns(0);
    document.body.classList.remove("is-choice-locked");

    const base = getAlleyBase();

    if (base !== null) {
        window.scrollTo(0, hero.offsetTop + (base + 0.05) * window.innerHeight);
    }
}


function onEscapeMove(button) {
    if (!escapeGame.isPlaying) {
        return;
    }

    const move = button.dataset.move;

    if (move === "back") {
        button.classList.add("escape__button--wrong");
        caughtEscape("ты побежал назад — прямо к нему в руки");
        return;
    }

    if (move !== escapeGame.answer[escapeGame.index]) {
        button.classList.add("escape__button--wrong");
        caughtEscape("не тот поворот — там тупик, и тебя догнали");
        return;
    }

    button.classList.add("escape__button--right");
    escapeGame.steps[escapeGame.index].classList.add("escape__step--done");
    escapeGame.index = escapeGame.index + 1;

    if (escapeGame.index >= escapeGame.answer.length) {
        winEscape();
        return;
    }

    // чем ближе к выходу, тем чаще бьётся сердце и тем ближе силуэт сзади
    const progress = escapeGame.index / escapeGame.answer.length;

    alley.element.style.setProperty("--chase", progress.toFixed(2));

    setEscapeBeat(Math.round(heartbeatRun - (heartbeatRun - heartbeatFastest) * progress));
    nextEscapeStep();
}


function caughtEscape(reason) {
    escapeGame.isPlaying = false;
    clearEscapeTimers();

    escapeGame.resultText.textContent = "тебя схватили! " + reason + ". попробуй ещё раз — запоминай повороты";

    // силуэт — прямо перед глазами
    alley.element.classList.remove("alley--hurry");
    alley.element.classList.add("alley--caught");
    alley.element.style.setProperty("--chase", "1");
    escapeGame.element.classList.add("escape--done", "escape--caught");
}


function winEscape() {
    escapeGame.isPlaying = false;
    escapeGame.isWon = true;
    clearEscapeTimers();

    escapeGame.resultText.textContent = "фух! ты выбежал обратно на людную улицу. больше не срезай по тёмным переулкам";
    escapeGame.element.classList.add("escape--done", "escape--won");

    // сердце успокаивается, прокрутка снова свободна
    alley.element.classList.remove("alley--hurry");
    alley.element.classList.add("alley--safe");
    stopHeartbeat();
    document.body.classList.remove("is-choice-locked");
}


function clearEscapeTimers() {
    clearTimeout(escapeGame.timeoutId);
    clearTimeout(escapeGame.hurryId);
}


function resetEscape() {
    clearEscapeTimers();
    escapeGame.runId = escapeGame.runId + 1;
    escapeGame.isStarted = false;
    escapeGame.isPlaying = false;
    escapeGame.isWon = false;
    escapeGame.element.classList.remove("escape--visible", "escape--done", "escape--won", "escape--caught");
    alley.element.classList.remove("alley--escape", "alley--caught", "alley--hurry");
    alley.element.style.setProperty("--chase", "0");
}


// ---------- главный цикл ----------

function animate(now) {
    // следующий кадр планируем сразу — даже если в этом что-то пойдёт не так, анимации не остановятся
    requestAnimationFrame(animate);

    const progress = getScrollProgress();

    eyes.forEach(function (eye, index) {
        if (!eye.isStill) {
            updateFlee(eye);
        }

        updatePupil(eye, now);
        if (!eye.isAlwaysOpen) {
            updateEyeClose(eye, index, progress);
        }
    });

    updateLight();
    updateText(progress);
    updateDarkness(progress);
    characters.forEach(function (character) {
        updateCharacter(character, progress);
    });

    updateChoice(progress);
    updateDialogue(progress);
    updateDrive(progress, now);
    updateOutcome(progress);
    updateLongread(progress);
    updateHotel(progress);
    updateHotelChoice(progress);
    updateRoom(progress);
    updateCafe(progress);
    updateWalk(progress);
    updateWalkChoice(progress);
    updateAlley(progress);
    updateDarkEyes(now);
}


document.addEventListener("mousemove", function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

document.addEventListener("touchmove", function (event) {
    mouseX = event.touches[0].clientX;
    mouseY = event.touches[0].clientY;
});


document.addEventListener("DOMContentLoaded", function () {
    hero = document.querySelector(".hero");
    // координаты света ставим на весь экран — их берут оба пятна света (обычное и в темноте)
    light.element = document.querySelector(".hero__screen");

    // после перезагрузки начинаем с самого верха
    if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);

    setupSound();
    setupGameHeader();
    setupChaptersMenu();
    setupEyes();
    setupTypewriter();
    setupCharacters();
    setupAlleyRoute();
    setupDialogue();
    setupChoice();
    hotel.element = document.querySelector(".hotel");
    setupHotelChoice();
    setupRoom();
    setupCafe();
    setupWalk();
    setupWalkChoice();
    setupAlley();
    setupEscape();
    setupDrive();
    setupOutcome(outcome);
    setupOutcome(driverOutcome);
    setupOutcome(cafeOutcome);
    setupOutcome(roomOutcome);
    setupOutcome(alleyOutcome);
    setupLongread();
    setupClickSkip();
    // первый текст начинает печататься после клика по «начать» в прелоадере
    setupPreloader(startIntroText);

    scheduleFlicker();

    requestAnimationFrame(animate);
});
