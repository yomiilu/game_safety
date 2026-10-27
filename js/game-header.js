
const totalChapters = 4;

const startMoney = 320;

const gameHeader = {
    money: null,
    moneyFill: null,
    safety: null,
    scaleFill: null,
    chapterNumber: null,
    chapterTitle: null
};


function setupGameHeader() {
    gameHeader.money = document.querySelector(".game-header__money");
    gameHeader.safety = document.querySelector(".game-header__safety");
    gameHeader.scaleFill = document.querySelector(".game-header__scale-fill--safety");
    gameHeader.moneyFill = document.querySelector(".game-header__scale-fill--money");
    gameHeader.chapterNumber = document.querySelector(".game-header__chapter-number");
    gameHeader.chapterTitle = document.querySelector(".game-header__chapter-title");

    const startSafety = parseInt(gameHeader.safety.textContent, 10);

    setGameHeader({
        money: parseInt(gameHeader.money.textContent, 10),
        safety: startSafety
    });
}


function setGameHeader(data) {
    if (data.money !== undefined) {
        gameHeader.money.textContent = data.money + "$";

        const moneyLevel = Math.min(Math.max(data.money / startMoney * 100, 0), 100);

        gameHeader.moneyFill.style.setProperty("--level", moneyLevel.toFixed(1) + "%");
    }

    if (data.safety !== undefined) {
        const safety = Math.min(Math.max(data.safety, 0), 100);

        gameHeader.safety.textContent = safety + "%";
        gameHeader.scaleFill.style.setProperty("--level", safety + "%");
    }

    if (data.chapter !== undefined) {
        gameHeader.chapterNumber.textContent = "глава " + data.chapter + "/" + totalChapters;
    }

    if (data.chapterTitle !== undefined) {
        gameHeader.chapterTitle.textContent = data.chapterTitle;
    }
}


const chapterTitles = {
    1: "“прибытие”",
    2: "“ужин”",
    3: "“прогулка”"
};


function setCurrentChapter(chapter) {
    setGameHeader({
        chapter: chapter,
        chapterTitle: chapterTitles[chapter]
    });

    document.querySelector(".chapters-menu__current").textContent = "глава " + chapter + "/" + totalChapters + " " + chapterTitles[chapter];

    document.querySelectorAll(".chapters-menu__link").forEach(function (link) {
        link.classList.toggle("chapters-menu__link--current", link.dataset.chapter === String(chapter));
    });
}


const chaptersMenu = {
    header: null,
    burger: null,
    isOpen: false
};


function setupChaptersMenu() {
    chaptersMenu.header = document.querySelector(".game-header");
    chaptersMenu.burger = document.querySelector(".game-header__burger");

    placeSoundControl();
    mobileQuery.addEventListener("change", placeSoundControl);

    chaptersMenu.burger.addEventListener("click", function (event) {
        event.stopPropagation();
        setChaptersMenuOpen(!chaptersMenu.isOpen);
    });

    document.querySelectorAll(".chapters-menu__link").forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.stopPropagation();
            setChaptersMenuOpen(false);
            goToChapter(link.dataset.chapter);
        });
    });

    document.addEventListener("click", function (event) {
        if (chaptersMenu.isOpen && !event.target.closest(".chapters-menu")) {
            setChaptersMenuOpen(false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            setChaptersMenuOpen(false);
        }
    });
}


const mobileQuery = window.matchMedia("(max-width: 767px)");


function placeSoundControl() {
    const soundControl = document.querySelector(".sound");
    const burger = document.querySelector(".game-header__burger");

    if (mobileQuery.matches) {
        if (soundControl.nextElementSibling !== burger) {
            burger.parentNode.insertBefore(soundControl, burger);
        }
    } else {
        const header = document.querySelector(".game-header");

        if (soundControl.nextElementSibling !== header) {
            header.parentNode.insertBefore(soundControl, header);
        }
    }
}


function setChaptersMenuOpen(isOpen) {
    chaptersMenu.isOpen = isOpen;
    chaptersMenu.header.classList.toggle("game-header--menu-open", isOpen);
    document.body.classList.toggle("is-menu-open", isOpen);
    chaptersMenu.burger.setAttribute("aria-expanded", String(isOpen));
    chaptersMenu.burger.setAttribute("aria-label", isOpen ? "Закрыть меню глав" : "Открыть меню глав");
}
