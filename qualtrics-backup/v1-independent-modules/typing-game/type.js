console.log("Game 3 Pattern Typing: Script loaded");

// Pattern sets for different difficulties
var patternSets = {
    easy: [
        'abc def ghi',
        'xyz uvw rst',
        'one two six',
        'cat dog pig',
        'red blue sky'
    ],
    medium: [
        'AbC xYz 123',
        'HeLLo WoRLd',
        'TeSt PaTTeRn',
        'Mix123 CaSe',
        'UpDowN 456'
    ],
    hard: [
        'a@1 B#2 c$3',
        'X!y? Z&w% 9*8',
        'Qw3$ Er4# Ty5@',
        'Pa$$w0rd! Test',
        'C0d3& $ymb0!s'
    ]
};

// Function to get random pattern
function getRandomPattern(difficulty) {
    var patterns = patternSets[difficulty];
    return patterns[Math.floor(Math.random() * patterns.length)];
}

// Calculate similarity between two strings
function calculateAccuracy(expected, actual) {
    if (expected === actual) return 100;
    
    var longer = expected.length > actual.length ? expected : actual;
    var shorter = expected.length > actual.length ? actual : expected;
    
    var correctChars = 0;
    for (var i = 0; i < shorter.length; i++) {
        if (expected[i] === actual[i]) {
            correctChars++;
        }
    }
    
    return Math.round((correctChars / longer.length) * 100);
}

// Initialize game state at the top level
var gameState = {
    currentTask: 0,
    tasks: [],
    results: [],
    startTime: null,
    taskStartTime: null,
    keystrokes: 0,
    backspaces: 0
};

// Initialize tasks immediately
gameState.tasks = [
    {
        difficulty: 'easy',
        pattern: getRandomPattern('easy')
    },
    {
        difficulty: 'medium', 
        pattern: getRandomPattern('medium')
    },
    {
        difficulty: 'hard',
        pattern: getRandomPattern('hard')
    }
];

var refreshInterval;
var chatHistory = [];

Qualtrics.SurveyEngine.addOnload(function() {
    console.log("Game 3: OnLoad");
    console.log("Initial tasks:", gameState.tasks);
});

Qualtrics.SurveyEngine.addOnReady(function() {
    console.log("Game 3: OnReady");
    
    // Game elements
    var taskArea = document.getElementById('taskArea');
    var resultsArea = document.getElementById('resultsArea');
    var patternCanvas = document.getElementById('patternCanvas');
    var patternInput = document.getElementById('patternInput');
    var submitBtn = document.getElementById('submitBtn');
    var restartBtn = document.getElementById('restartBtn');
    var currentTaskSpan = document.getElementById('currentTask');
    var feedbackText = document.getElementById('feedbackText');
    
    // Chat elements
    var chatbox = document.getElementById('chatbox');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    
    // Constants
    var MAX_TOTAL_TOKENS = 300;
    
    // Check elements
    if (!taskArea || !patternCanvas || !submitBtn) {
        console.error("Game 3: Missing game elements");
        return;
    }
    
    if (!chatbox || !userInput || !sendBtn) {
        console.error("Game 3: Missing chat elements");
        return;
    }
    
    console.log("Game 3: All elements found");
    
    // Function to draw pattern on canvas
    function drawPattern(pattern) {
        var ctx = patternCanvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
        
        // Set background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
        
        // Configure text style
        ctx.font = 'bold 36px Courier New, monospace';
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add slight noise/distortion to prevent OCR
        var gradient = ctx.createLinearGradient(0, 0, patternCanvas.width, 0);
        gradient.addColorStop(0, '#333333');
        gradient.addColorStop(0.5, '#2a2a2a');
        gradient.addColorStop(1, '#333333');
        ctx.fillStyle = gradient;
        
        // Draw the pattern
        ctx.fillText(pattern, patternCanvas.width / 2, patternCanvas.height / 2);
        
        // Add some visual noise lines to prevent OCR
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.1)';
        ctx.lineWidth = 1;
        for (var i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * patternCanvas.width, Math.random() * patternCanvas.height);
            ctx.lineTo(Math.random() * patternCanvas.width, Math.random() * patternCanvas.height);
            ctx.stroke();
        }
    }
    
    // Initialize game
    gameState.startTime = Date.now();
    
    // Track keystrokes
    patternInput.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            gameState.backspaces++;
        }
    });
    
    patternInput.addEventListener('input', function(e) {
        gameState.keystrokes++;
        updateFeedback();
    });
    
    // Update feedback in real-time
    function updateFeedback() {
        var expected = gameState.tasks[gameState.currentTask].pattern;
        var actual = patternInput.value;
        
        if (actual.length === 0) {
            feedbackText.textContent = '';
            return;
        }
        
        var isCorrectSoFar = true;
        for (var i = 0; i < actual.length && i < expected.length; i++) {
            if (actual[i] !== expected[i]) {
                isCorrectSoFar = false;
                break;
            }
        }
        
        if (isCorrectSoFar && actual.length <= expected.length) {
            feedbackText.textContent = '✓ Looking good!';
            feedbackText.style.color = '#4CAF50';
        } else {
            feedbackText.textContent = '✗ Check your typing';
            feedbackText.style.color = '#f44336';
        }
    }
    
    // Load task
    function loadTask() {
        console.log("Loading task: " + gameState.currentTask);
        
        gameState.taskStartTime = Date.now();
        gameState.keystrokes = 0;
        gameState.backspaces = 0;
        
        var task = gameState.tasks[gameState.currentTask];
        console.log("Task pattern: " + task.pattern);
        
        // Fallback if pattern is undefined
        if (!task.pattern) {
            console.error("Pattern is undefined, using fallback");
            task.pattern = 'test pattern';
        }
        
        // Draw pattern on canvas
        drawPattern(task.pattern);
        console.log("Pattern drawn on canvas");
        
        currentTaskSpan.textContent = gameState.currentTask + 1;
        patternInput.value = '';
        patternInput.focus();
        feedbackText.textContent = '';
        
        // Update difficulty badge
        var badge = document.getElementById('difficultyBadge');
        badge.textContent = task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1);
        
        // Update badge color based on difficulty
        if (task.difficulty === 'easy') {
            badge.style.backgroundColor = '#4CAF50';
            badge.style.color = 'white';
        } else if (task.difficulty === 'medium') {
            badge.style.backgroundColor = '#FF9800';
            badge.style.color = 'white';
        } else {
            badge.style.backgroundColor = '#f44336';
            badge.style.color = 'white';
        }
    }
    
    // Submit handler
    submitBtn.onclick = function() {
        console.log("Submit clicked");
        
        var userPattern = patternInput.value;
        var expectedPattern = gameState.tasks[gameState.currentTask].pattern;
        var accuracy = calculateAccuracy(expectedPattern, userPattern);
        var taskTime = (Date.now() - gameState.taskStartTime) / 1000;
        
        gameState.results.push({
            taskNumber: gameState.currentTask + 1,
            expected: expectedPattern,
            actual: userPattern,
            accuracy: accuracy,
            time: taskTime.toFixed(2),
            difficulty: gameState.tasks[gameState.currentTask].difficulty,
            keystrokes: gameState.keystrokes,
            backspaces: gameState.backspaces
        });
        
        console.log("Task " + (gameState.currentTask + 1) + ": " + accuracy + "% accurate");
        
        // Store in Qualtrics
        try {
            Qualtrics.SurveyEngine.setEmbeddedData('g3_task' + (gameState.currentTask + 1) + '_pattern', userPattern);
            Qualtrics.SurveyEngine.setEmbeddedData('g3_task' + (gameState.currentTask + 1) + '_accuracy', accuracy);
            Qualtrics.SurveyEngine.setEmbeddedData('g3_task' + (gameState.currentTask + 1) + '_time', taskTime.toFixed(2));
            Qualtrics.SurveyEngine.setEmbeddedData('g3_task' + (gameState.currentTask + 1) + '_keystrokes', gameState.keystrokes);
        } catch (e) {
            console.error("Error storing task data: " + e);
        }
        
        // Next task or finish
        if (gameState.currentTask < gameState.tasks.length - 1) {
            gameState.currentTask++;
            loadTask();
        } else {
            showResults();
        }
    };
    
    // Enter key to submit
    patternInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    };
    
    // Show results
    function showResults() {
        console.log("Showing results");
        var totalTime = ((Date.now() - gameState.startTime) / 1000).toFixed(2);
        
        taskArea.style.display = 'none';
        resultsArea.style.display = 'block';
        
        // Hide difficulty badge
        document.getElementById('difficultyBadge').style.display = 'none';
        
        var totalAccuracy = 0;
        for (var i = 0; i < gameState.results.length; i++) {
            totalAccuracy += gameState.results[i].accuracy;
        }
        var avgAccuracy = Math.round(totalAccuracy / gameState.results.length);
        
        // Update summary stats
        document.getElementById('totalTime').textContent = totalTime + ' seconds';
        document.getElementById('accuracyScore').textContent = avgAccuracy + '%';
        
        // Create task breakdown
        var breakdown = document.getElementById('taskBreakdown');
        breakdown.innerHTML = '';
        
        for (var j = 0; j < gameState.results.length; j++) {
            var result = gameState.results[j];
            var taskDiv = document.createElement('div');
            taskDiv.style.cssText = 'margin: 5px 0; padding: 8px; background: #f0f0f0; border-radius: 3px;';
            
            var header = document.createElement('div');
            header.style.cssText = 'font-weight: bold; color: #333; margin-bottom: 5px;';
            header.textContent = 'Task ' + result.taskNumber + ' (' + result.difficulty + '):';
            
            var details = document.createElement('div');
            details.style.cssText = 'color: #555; font-size: 14px; font-family: monospace;';
            details.innerHTML = 'Expected: <strong>' + result.expected + '</strong><br>' +
                               'You typed: <strong>' + result.actual + '</strong>';
            
            var status = document.createElement('div');
            status.style.cssText = 'color: ' + (result.accuracy === 100 ? '#4CAF50' : '#f44336') + '; font-weight: 600; margin-top: 5px;';
            status.textContent = 'Accuracy: ' + result.accuracy + '% - Time: ' + result.time + 's - Keystrokes: ' + result.keystrokes;
            
            taskDiv.appendChild(header);
            taskDiv.appendChild(details);
            taskDiv.appendChild(status);
            breakdown.appendChild(taskDiv);
        }
        
        // Store final results
        try {
            Qualtrics.SurveyEngine.setEmbeddedData('g3_total_accuracy', avgAccuracy);
            Qualtrics.SurveyEngine.setEmbeddedData('g3_total_time', totalTime);
            Qualtrics.SurveyEngine.setEmbeddedData('g3_complete', true);
        } catch (e) {
            console.error("Error storing final data: " + e);
        }
    }
    
    // Restart
    restartBtn.onclick = function() {
        console.log("Restart clicked");
        gameState.currentTask = 0;
        gameState.tasks = [
            { difficulty: 'easy', pattern: getRandomPattern('easy') },
            { difficulty: 'medium', pattern: getRandomPattern('medium') },
            { difficulty: 'hard', pattern: getRandomPattern('hard') }
        ];
        gameState.results = [];
        gameState.startTime = Date.now();
        resultsArea.style.display = 'none';
        taskArea.style.display = 'block';
        document.getElementById('difficultyBadge').style.display = 'inline-block';
        loadTask();
    };
    
    // CHAT FUNCTIONS
    function submitChat() {
        var userText = userInput.value.trim();
        if (!userText) return;
        
        var numPrompts = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("g3NumPrompts")) || 0;
        
        if (numPrompts >= 3) {
            appendToChat("System", "⚠️ You've reached your 3-prompt limit for this round.");
            userInput.disabled = true;
            sendBtn.disabled = true;
            updatePromptCounter();
            return;
        }
        
        var userTokenEstimate = estimateTokens(userText);
        var historyTokenEstimate = 0;
        for (var i = 0; i < chatHistory.length; i++) {
            historyTokenEstimate += estimateTokens(chatHistory[i].content);
        }
        var estimatedTotal = userTokenEstimate + historyTokenEstimate;
        
        if (estimatedTotal > MAX_TOTAL_TOKENS) {
            appendToChat("System", "⚠️ Exceeds token limit. Please shorten your message.");
            return;
        }
        
        numPrompts += 1;
        Qualtrics.SurveyEngine.setEmbeddedData("g3NumPrompts", numPrompts);
        updatePromptCounter();
        
        chatHistory.push({ role: "user", content: userText });
        appendToChat("You", userText);
        userInput.value = "";
        updateTokenCounter();
        
        Qualtrics.SurveyEngine.setEmbeddedData("g3UserText", userText);
        
        // Make API call
        fetch("https://bobalab-chatgpt-backend.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, history: chatHistory })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var reply = data.reply || "";
            var lines = reply.split("\n").filter(Boolean);
            var flag1 = lines.length > 0 ? lines[0] : "";
            var flag2 = lines.length > 1 ? lines[1] : "";
            var answer = lines.length > 2 ? lines.slice(2).join("\n") : reply;
            
            chatHistory.push({ role: "assistant", content: answer });
            appendToChat("AI", answer);
            
            Qualtrics.SurveyEngine.setEmbeddedData("g3BotFlagLevel", flag1);
            Qualtrics.SurveyEngine.setEmbeddedData("g3BotFlagType", flag2);
            Qualtrics.SurveyEngine.setEmbeddedData("g3BotResponse", answer);
            Qualtrics.SurveyEngine.setEmbeddedData("g3ChatHistoryJSON", JSON.stringify(chatHistory));
        })
        .catch(function(err) {
            appendToChat("AI", "⚠️ Error talking to the server.");
        });
    }
    
    function appendToChat(sender, message) {
        if (!chatbox) return;
        var p = document.createElement("p");
        p.style.cssText = "margin: 8px 0; padding: 10px 14px; border-radius: 12px; max-width: 80%; word-wrap: break-word;";
        
        if (sender === "You") {
            p.style.cssText += "background-color: #e3f2fd; margin-left: auto; text-align: right;";
        } else if (sender === "AI") {
            p.style.cssText += "background-color: #ffffff; border: 1px solid #e0e0e0; margin-right: auto;";
        } else {
            p.style.cssText += "background-color: #fff3cd; border: 1px solid #ffeaa7; margin: 10px auto; text-align: center; max-width: 90%;";
        }
        
        var bold = document.createElement("b");
        bold.textContent = sender + ": ";
        p.appendChild(bold);
        var textNode = document.createTextNode(message);
        p.appendChild(textNode);
        chatbox.appendChild(p);
        chatbox.scrollTop = chatbox.scrollHeight;
    }
    
    function estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    
    function updatePromptCounter() {
        if (!chatbox) return;
        
        var maxPrompts = 3;
        var numUsed = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("g3NumPrompts")) || 0;
        var remaining = Math.max(0, maxPrompts - numUsed);
        
        var old = document.getElementById("promptCounterInChat");
        if (old) old.remove();
        
        var div = document.createElement("div");
        div.id = "promptCounterInChat";
        div.style.cssText = "background-color:#fff3e0;border:1px solid #ffcc80;padding:8px;margin:5px 0;text-align:center;font-weight:600;color:#f57c00;border-radius:8px;font-size:13px;";
        div.innerHTML = "Prompt Cap: " + remaining + " / " + maxPrompts;
        
        var tokenCounter = document.getElementById("tokenCounterInChat");
        if (tokenCounter && tokenCounter.nextSibling) {
            chatbox.insertBefore(div, tokenCounter.nextSibling);
        } else {
            chatbox.insertBefore(div, chatbox.firstChild);
        }
        
        Qualtrics.SurveyEngine.setEmbeddedData("g3RemainingPrompts", remaining);
    }
    
    function updateTokenCounter() {
        if (!chatbox || !userInput) return;
        
        var text = userInput.value.trim();
        var tokenEstimate = text ? estimateTokens(text) : 0;
        
        var oldTokenCounter = document.getElementById("tokenCounterInChat");
        if (oldTokenCounter) oldTokenCounter.remove();
        
        var tokenDiv = document.createElement("div");
        tokenDiv.id = "tokenCounterInChat";
        
        var historyTokens = 0;
        for (var i = 0; i < chatHistory.length; i++) {
            historyTokens += estimateTokens(chatHistory[i].content);
        }
        var totalEstimate = tokenEstimate + historyTokens;
        
        if (totalEstimate > MAX_TOTAL_TOKENS * 0.8) {
            tokenDiv.style.cssText = "background-color: #ffebee; border: 1px solid #ef5350; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #c62828; border-radius: 8px; font-weight: 600;";
        } else {
            tokenDiv.style.cssText = "background-color: #e3f2fd; border: 1px solid #64b5f6; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #1565c0; border-radius: 8px; font-weight: 600;";
        }
        tokenDiv.innerHTML = "Token Cap: " + totalEstimate + "/" + MAX_TOTAL_TOKENS;
        
        chatbox.insertBefore(tokenDiv, chatbox.firstChild);
        
        Qualtrics.SurveyEngine.setEmbeddedData("g3InputTokenEstimate", tokenEstimate);
    }
    
    // Chat event listeners
    sendBtn.onclick = submitChat;
    userInput.oninput = updateTokenCounter;
    userInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            submitChat();
        }
    };
    
    // Initialize counters
    updateTokenCounter();
    updatePromptCounter();
    
    // Update counters periodically
    refreshInterval = setInterval(function() {
        var currentValue = userInput.value;
        if (!userInput.hasAttribute('data-last-value') || userInput.getAttribute('data-last-value') !== currentValue) {
            userInput.setAttribute('data-last-value', currentValue);
            updateTokenCounter();
        }
        updatePromptCounter();
    }, 300);
    
    // Start game
    console.log("Starting game with first task");
    loadTask();
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    console.log("Game 3: OnUnload");
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});