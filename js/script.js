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

// запас вокруг глаза (в vw), ближе которого курсор подойти не может
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
    const margin = window.innerWidth * fleeMargin / 100;

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
    startTypewriterSound();

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
            stopTypewriterSound();
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


function updateText(progress) {
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
}


// ---------- персонажи выходят из-за края экрана ----------

// selector — какой персонаж
// start, end — на каком отрезке прокрутки он выходит
// fromX — откуда выходит: сдвиг в % своей ширины (минус — из-за левого края, плюс — из-за правого)
// waitForLine — не выходит, пока эта реплика не допечатана (необязательно)
const characterSettings = [
    {
        selector: ".game__character--boy",
        start: 3.5,
        end: 4.5,
        fromX: -140
    },
    {
        selector: ".game__character--taxi",
        start: 5.04,
        end: 6.09,
        fromX: 220,
        waitForLine: ".speech--boy-1"
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
            fromX: settings.fromX,
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
    let target = Math.min(Math.max((progress - character.start) / (character.end - character.start), 0), 1);

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
    const x = character.fromX * (1 - walk);

    // подпрыгивание и лёгкое покачивание на каждом шаге, к концу затихает
    const step = Math.sin(raw * Math.PI * walkSteps);
    const fade = 1 - raw;
    const y = -Math.abs(step) * walkBounce * fade;
    const tilt = step * 1.5 * fade;

    character.element.style.transform = "translate(" + x.toFixed(2) + "%, " + y.toFixed(2) + "%) rotate(" + tilt.toFixed(2) + "deg)";
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
        const text = textElement.textContent.trim();

        const line = {
            selector: settings.selector,
            element: element,
            from: settings.from,
            speed: settings.speed,
            waitForCharacter: settings.waitForCharacter,
            pose: settings.pose || 1,
            chars: [],
            isFinished: false,
            runId: 0
        };

        textElement.innerHTML = "";

        for (let i = 0; i < text.length; i++) {
            const char = document.createElement("span");

            char.className = "speech__char";
            char.textContent = text[i];
            textElement.appendChild(char);

            line.chars.push({
                element: char,
                isSpace: text[i] === " "
            });
        }

        lines.push(line);
    });

    boyPoses = document.querySelector(".game__character--boy");
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
            stopTypewriterSound();
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

        startTypewriterSound();
        typeNextChar(0);
    }, speechTypingDelay);
}


function hideLine(line) {
    // если реплику прервали посреди печати — потом начнём её заново
    if (!line.isFinished) {
        setLineCharsVisible(line, false);
        stopTypewriterSound();
    }

    line.runId = line.runId + 1;
    line.element.classList.remove("speech--visible");
}


// может ли реплика с этим номером быть на экране
function canShowLine(index, progress) {
    const line = lines[index];

    if (progress < line.from) {
        return false;
    }

    if (index > 0 && !lines[index - 1].isFinished) {
        return false;
    }

    if (line.waitForCharacter && findCharacter(line.waitForCharacter).walk < 0.99) {
        return false;
    }

    return true;
}


function updateDialogue(progress) {
    // если прокрутили назад, выше отметки реплики — забываем, что она была допечатана
    lines.forEach(function (line) {
        if (progress < line.from - speechGap) {
            line.isFinished = false;
        }
    });

    // идём по порядку, пока реплики разрешены — последняя разрешённая и будет на экране
    let target = -1;

    for (let i = 0; i < lines.length; i++) {
        if (!canShowLine(i, progress)) {
            break;
        }

        target = i;
    }

    // чтобы не мигало на отметке: назад уходим, только когда отъехали от неё с запасом
    if (target < currentLine && currentLine >= 0 && progress >= lines[currentLine].from - speechGap) {
        target = currentLine;
    }

    // во время выбора плашек на экране нет
    if (choice.isShown) {
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


// ---------- ВРЕМЕННО: пропуск реплик по клику ----------
// клик в любом месте (кроме кнопок, ползунка и экрана выбора) сразу допечатывает текущую реплику.
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
    stopTypewriterSound();
}


function setupClickSkip() {
    if (!allowClickSkip) {
        return;
    }

    document.addEventListener("click", function (event) {
        if (event.target.closest("button, input, .choice, .preloader")) {
            return;
        }

        skipCurrentLine();
    });
}


// ---------- выбор игрока ----------

// с какой отметки прокрутки появляется выбор (и только когда последняя реплика допечатана)
const choiceFrom = 8.4;

// через сколько (мс) варианты успевают выехать
const choiceReadyDelay = 1000;

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
    choice.element = document.querySelector(".choice");
    choice.game = document.querySelector(".game");
    choice.options = document.querySelectorAll(".choice__option");
    street = document.querySelector(".street");

    choice.options.forEach(function (option) {
        option.addEventListener("click", function () {
            selectChoice(option);
        });
    });
}


function selectChoice(option) {
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
}


function hideStreet() {
    street.classList.remove("street--visible");
    document.body.classList.remove("is-street");
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


function updateChoice(progress) {
    const lastLine = lines[lines.length - 1];

    if (!choice.isShown && progress >= choiceFrom && lastLine.isFinished) {
        choice.isShown = true;
        choice.element.classList.add("choice--visible");
        choice.game.classList.add("game--choice");
        document.body.classList.add("is-choosing");

        // когда варианты выехали — убираем задержки, чтобы наведение срабатывало сразу
        setTimeout(function () {
            if (choice.isShown) {
                choice.element.classList.add("choice--ready");
            }
        }, choiceReadyDelay);
    }

    // прокрутили назад — выбор прячется, снова видна последняя реплика
    if (choice.isShown && progress < choiceFrom - speechGap) {
        choice.isShown = false;
        choice.element.classList.remove("choice--visible");
        choice.element.classList.remove("choice--ready");
        choice.game.classList.remove("game--choice");
        document.body.classList.remove("is-choosing");

        resetChoice();
    }
}


// ---------- главный цикл ----------

function animate(now) {
    const progress = getScrollProgress();

    eyes.forEach(function (eye, index) {
        updateFlee(eye);
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

    requestAnimationFrame(animate);
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
    setupEyes();
    setupTypewriter();
    setupCharacters();
    setupDialogue();
    setupChoice();
    setupClickSkip();
    // первый текст начинает печататься после клика по «начать» в прелоадере
    setupPreloader(startIntroText);

    scheduleFlicker();

    requestAnimationFrame(animate);
});
