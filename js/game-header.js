// ---------- шапка игры ----------
// одна шапка на все игровые экраны: чтобы поменять цифры и тексты, вызываем setGameHeader
//
// например:
// setGameHeader({
//     money: 250,
//     safety: 80,
//     chapter: 2,
//     chapterTitle: "“заселение”"
// });

const totalChapters = 4;

const gameHeader = {
    money: null,
    safety: null,
    scaleFill: null,
    chapterNumber: null,
    chapterTitle: null
};


function setupGameHeader() {
    gameHeader.money = document.querySelector(".game-header__money");
    gameHeader.safety = document.querySelector(".game-header__safety");
    gameHeader.scaleFill = document.querySelector(".game-header__scale-fill");
    gameHeader.chapterNumber = document.querySelector(".game-header__chapter-number");
    gameHeader.chapterTitle = document.querySelector(".game-header__chapter-title");

    // шкала при старте берёт процент из текста в html
    const startSafety = parseInt(gameHeader.safety.textContent, 10);

    setGameHeader({
        safety: startSafety
    });
}


function setGameHeader(data) {
    if (data.money !== undefined) {
        gameHeader.money.textContent = data.money + "$";
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
