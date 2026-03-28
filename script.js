// ==================== Config ====================
const QUESTION_SETS = {
    0: {
        0: [{total:6,people:2},{total:8,people:2},{total:9,people:3},{total:10,people:2},{total:12,people:3}],
        1: [{total:7,people:2},{total:11,people:3},{total:13,people:3},{total:14,people:4},{total:17,people:4}]
    },
    1: {
        0: [{total:8,people:2},{total:12,people:3},{total:16,people:4},{total:15,people:3},{total:20,people:4}],
        1: [{total:11,people:3},{total:14,people:3},{total:17,people:4},{total:19,people:4},{total:22,people:3}]
    },
    2: {
        0: [{total:24,people:4},{total:28,people:4},{total:30,people:5},{total:36,people:6},{total:25,people:5}],
        1: [{total:26,people:4},{total:29,people:5},{total:31,people:4},{total:35,people:6},{total:37,people:5}]
    }
};

const TIME_PER_QUESTION = 60;
const FOOD_NAME = {'🍎':'蘋果','🍌':'香蕉','🍓':'草莓','🥟':'燒賣','🍪':'曲奇'};
const UNITS = {'🍎':'個','🍌':'條','🍓':'顆','🥟':'顆','🍪':'塊'};

let currentRemainderMode = 0, 
    currentFormulaMode = 0, 
    currentDifficulty = 1;
let selectedFood = '🍎', 
    selectedFoodName = '蘋果';
let currentQuestions = [], 
    currentQuestionIndex = 0;
let totalItems = 0, 
    numPeople = 0;
let countdownInterval = null, 
    hasSubmitted = false;
let results = [];           
let totalTimeUsed = 0;      

// ==================== Grade System ====================
function getGrade(score) {
    if (score >= 95) return { title: "分物大師", color: "#15803d" };
    if (score >= 80) return { title: "分物之星", color: "#eab308" };
    if (score >= 60) return { title: "分物小能手", color: "#f59e0b" };
    return { title: "繼續努力哦！", color: "#b91c1c" };
}

function getGradeCriteria() {
    return `
        <strong>評分標準：</strong><br>
        95–100 分 → 分物大師<br>
        80–94 分 → 分物之星<br>
        60–79 分 → 分物小能手<br>
        0–59 分 → 繼續努力哦！
    `;
}

// ==================== Selection Functions ====================
function selectRemainder(m) { 
    currentRemainderMode = m; 
    updateActive('#remainderChoices', m); 
}

function selectFormula(m) { 
    currentFormulaMode = m; 
    updateActive('#formulaChoices', m); 
}

function selectDifficulty(m) { 
    currentDifficulty = m; 
    updateActive('#difficultyChoices', m); 
}

function updateActive(container, val) {
    document.querySelectorAll(container + ' .choice-btn').forEach(btn => {
        const btnVal = parseInt(btn.dataset.remainder || btn.dataset.formula || btn.dataset.diff);
        btn.classList.toggle('active', btnVal === val);
    });
}

function selectFood(el) {
    document.querySelectorAll('.food-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedFood = el.getAttribute('data-food');
    selectedFoodName = FOOD_NAME[selectedFood];
    document.getElementById('startGameBtn').disabled = false;
}

function startGame() {
    currentQuestions = QUESTION_SETS[currentDifficulty][currentRemainderMode];
    currentQuestionIndex = 0;
    results = [];
    totalTimeUsed = 0;
    
    document.getElementById('setupPanel').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    if (currentFormulaMode === 1) {
        document.getElementById('divisionArea').style.display = 'block';
    }
    
    loadCurrentQuestion();
}

function loadCurrentQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    totalItems = q.total; 
    numPeople = q.people;

    document.getElementById('questionBox').innerHTML = 
        `有 <strong>${totalItems}</strong> ${UNITS[selectedFood]}${selectedFoodName}，要公平分給 <strong>${numPeople}</strong> 位朋友。`;
    
    document.getElementById('pileTitle').textContent = `${selectedFood}堆`;
    document.getElementById('currentQ').textContent = currentQuestionIndex + 1;

    resetGameBoard();
    startTimer();
    
    if (currentFormulaMode === 1) setupDivisionArea();

    hasSubmitted = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('hintBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'inline-block';
}

function resetGameBoard() {
    const pile = document.getElementById('pile');
    pile.innerHTML = '';
    
    for (let i = 0; i < totalItems; i++) {
        const item = document.createElement('div');
        item.className = 'siumai-item';
        item.textContent = selectedFood;
        item.draggable = true;
        item.ondragstart = (ev) => ev.dataTransfer.setData("text", "food");
        pile.appendChild(item);
    }
    
    createPlates();
    document.getElementById('feedback').style.display = 'none';
}

function createPlates() {
    const container = document.getElementById('platesContainer');
    container.innerHTML = '';
    
    for (let i = 1; i <= numPeople; i++) {
        container.innerHTML += `
            <div class="plate">
                <div class="plate-label">👦 第 ${i} 位</div>
                <div id="plate-${i}" class="dropzone" ondrop="dropFood(event)" ondragover="allowDrop(event)"></div>
                <div class="count" id="count-${i}">0</div>
            </div>`;
    }
}

window.allowDrop = function(ev) {
    ev.preventDefault();
    const zone = ev.target.closest('.dropzone, .pile');
    if (zone) zone.classList.add('dragover');
};

window.dropFood = function(ev) {
    ev.preventDefault();
    const zone = ev.target.closest('.dropzone, .pile');
    if (!zone) return;
    
    zone.classList.remove('dragover');
    
    const sourcePile = document.getElementById('pile');
    if (sourcePile.children.length > 0) {
        const item = sourcePile.lastElementChild;
        zone.appendChild(item);
        updateCounts();
    }
};

function updateCounts() {
    for (let i = 1; i <= numPeople; i++) {
        const countEl = document.getElementById('count-' + i);
        const plate = document.getElementById('plate-' + i);
        if (countEl && plate) {
            countEl.textContent = plate.children.length;
        }
    }
}

function resetDistribution() {
    resetGameBoard();
}

function setupDivisionArea() {
    ['totalInput','peopleInput','quotientInput','remainderInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.addEventListener('input', () => { if (el.value < 0) el.value = 0; });
            el.addEventListener('keydown', e => { 
                if (e.key === '-' || e.key === 'e') e.preventDefault(); 
            });
        }
    });
    document.getElementById('remainderPart').style.display = 
        currentRemainderMode === 1 ? 'flex' : 'none';
}

function startTimer() {
    if (countdownInterval) clearInterval(countdownInterval);
    
    let timeLeft = TIME_PER_QUESTION;
    document.getElementById('timer').textContent = timeLeft + ' 秒';
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft + ' 秒';
        
        if (timeLeft <= 10) {
            document.getElementById('timer').style.background = '#fecaca';
        }
        if (timeLeft <= 0) {
            submitAnswer(true);
        }
    }, 1000);
}

function showAnswer() {
    document.getElementById('totalInput').value = totalItems;
    document.getElementById('peopleInput').value = numPeople;
    document.getElementById('quotientInput').value = Math.floor(totalItems / numPeople);
    
    if (currentRemainderMode === 1) {
        document.getElementById('remainderInput').value = totalItems % numPeople;
    }
    
    resetGameBoard();
    
    const plates = Array.from({length: numPeople}, (_,i) => 
        document.getElementById(`plate-${i+1}`));
    
    Array.from(document.getElementById('pile').children).forEach((item, i) => {
        plates[i % numPeople].appendChild(item);
    });
    
    updateCounts();
}

function submitAnswer(isTimeout = false) {
    if (hasSubmitted) return;
    hasSubmitted = true;
    
    if (countdownInterval) clearInterval(countdownInterval);

    const timeUsedThisQ = TIME_PER_QUESTION - parseInt(document.getElementById('timer').textContent) || 0;
    totalTimeUsed += timeUsedThisQ;

    const correctQ = Math.floor(totalItems / numPeople);
    const correctR = totalItems % numPeople;

    // 檢查分配是否正確
    let distCorrect = document.getElementById('pile').children.length === correctR;
    for (let i = 1; i <= numPeople; i++) {
        if (document.getElementById('plate-' + i).children.length !== correctQ) {
            distCorrect = false;
        }
    }

    // 檢查除式輸入是否正確
    let formulaCorrect = true;
    if (currentFormulaMode === 1) {
        const stuT = parseInt(document.getElementById('totalInput').value) || 0;
        const stuP = parseInt(document.getElementById('peopleInput').value) || 0;
        const stuQ = parseInt(document.getElementById('quotientInput').value) || 0;
        const stuR = currentRemainderMode === 1 ? parseInt(document.getElementById('remainderInput').value) || 0 : 0;
        
        if (stuT !== totalItems || stuP !== numPeople || stuQ !== correctQ || 
            (currentRemainderMode === 1 && stuR !== correctR)) {
            formulaCorrect = false;
        }
    }

    const isCorrect = distCorrect && (currentFormulaMode === 0 || formulaCorrect);

    results.push({
        qNum: currentQuestionIndex + 1,
        isCorrect: isCorrect,
        correctQ: correctQ,
        correctR: correctR
    });

    const fb = document.getElementById('feedback');
    const unit = UNITS[selectedFood];

    if (isCorrect) {
        fb.style.background = '#d1fae5'; 
        fb.style.color = '#166534';
        fb.innerHTML = `🎉 太棒了！<br>${totalItems}${unit}${selectedFoodName}分給${numPeople}個人，每個人共分得${correctQ}${unit}`;
        document.getElementById('hintBtn').style.display = 'none';
    } else {
        fb.style.background = '#fee2e2'; 
        fb.style.color = '#b91c1c';
        fb.innerHTML = `正確答案：<br>${totalItems}${unit}${selectedFoodName}分給${numPeople}個人，每個人共分得${correctQ}${unit}`;
        document.getElementById('hintBtn').style.display = 'inline-block';
    }

    fb.style.display = 'block';
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'inline-block';
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= currentQuestions.length) {
        showFinalResult();
    } else {
        loadCurrentQuestion();
    }
}

function showFinalResult() {
    document.getElementById('gameArea').style.display = 'none';
    const resultPanel = document.getElementById('resultPanel');
    resultPanel.style.display = 'block';

    const correctCount = results.filter(r => r.isCorrect).length;
    const score = Math.round((correctCount / results.length) * 100);

    document.getElementById('scoreCircle').textContent = score;
    document.getElementById('scoreCircle').style.borderColor = score >= 80 ? '#15803d' : '#f59e0b';

    const grade = getGrade(score);
    const gradeEl = document.getElementById('gradeTitle');
    gradeEl.innerHTML = `
        ${grade.title}
        <span class="tooltip">
            <span style="font-size:1.4rem;cursor:help;">ℹ️</span>
            <span class="tooltiptext">${getGradeCriteria()}</span>
        </span>
    `;
    gradeEl.style.color = grade.color;

    document.getElementById('totalTime').textContent = totalTimeUsed;

    let listHTML = '';
    results.forEach(r => {
        listHTML += `
            <div class="result-item">
                <span>第 ${r.qNum} 題</span>
                <span class="${r.isCorrect ? 'correct' : 'wrong'}">
                    ${r.isCorrect ? '✅ 正確' : '❌ 錯誤'}
                </span>
            </div>`;
    });
    document.getElementById('resultList').innerHTML = listHTML;
}

function restartGame() {
    location.reload();
}

// 初始化
window.onload = () => {
    document.querySelector('.food-option').classList.add('selected');
    document.getElementById('startGameBtn').disabled = false;
};
