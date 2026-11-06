console.log("Game 2 with Chat: Script loaded");

// Manually split text sections about UC Berkeley
var textSections = [
    // Text 1
    'Made possible by President Lincoln\'s signing of the Morrill Act in 1862, the University of California was founded in 1868 as the state\'s first land-grant university, inheriting the land and facilities of the private College of California and the federal-funding eligibility of a public agricultural, mining, and mechanical arts college. The Organic Act states that the "University shall have for its design, to provide instruction and thorough and complete education in all departments of science, literature and art, industrial and professional pursuits, and general education, and also special courses of instruction in preparation for the professions."',
    
    // Text 2
    'Ten faculty members and forty male students made up the fledgling university when it opened in Oakland in 1869. Frederick Billings, a trustee of the College of California, suggested that a new campus site north of Oakland be named in honor of Anglo-Irish philosopher George Berkeley. The university began admitting women the following year. In 1870, Henry Durant, founder of the College of California, became its first president. With the completion of North and South Halls in 1873, the university relocated to its Berkeley location with 167 male and 22 female students. The first female student to graduate was in 1874, admitted in the first class to include women in 1870.',
    
    // Text 3
    'Beginning in 1891, Phoebe Apperson Hearst funded several programs and new buildings and, in 1898, sponsored an international competition in Antwerp, where French architect Émile Bénard submitted the winning design for a campus master plan. Although the University of California system does not have an official flagship campus, many scholars and experts consider Berkeley to be its unofficial flagship. It shares this unofficial status with the University of California, Los Angeles.',
    
    // Text 4
    'The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state\'s first land-grant university and is the founding campus of the University of California system.',
    
    // Text 5
    'Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business. It is classified among "R1: Doctoral Universities – Very high research activity". Lawrence Berkeley National Laboratory was originally founded as part of the university.'
];

// Function to get random text section
function getRandomTextSection() {
    return textSections[Math.floor(Math.random() * textSections.length)];
}

// Function to count word occurrences (case-insensitive, whole word)
function countWordOccurrences(text, word) {
    var regex = new RegExp('\\b' + word.toLowerCase() + '\\b', 'gi');
    var matches = text.match(regex);
    return matches ? matches.length : 0;
}

// Function to count letter occurrences (case-insensitive)
function countLetterOccurrences(text, letter) {
    var regex = new RegExp(letter, 'gi');
    var matches = text.match(regex);
    return matches ? matches.length : 0;
}

// Function to count two different letters
function countTwoLetters(text, letter1, letter2) {
    var count1 = countLetterOccurrences(text, letter1);
    var count2 = countLetterOccurrences(text, letter2);
    return count1 + count2;
}

// Generate tasks with randomness
function generateTasks() {
    var tasks = [];
    
    // Task 1: Count a word (Easy)
    var wordSection = getRandomTextSection();
    var commonWords = ['the', 'of', 'in', 'and', 'to', 'a', 'was', 'is'];
    var targetWord = commonWords[Math.floor(Math.random() * commonWords.length)];
    var wordCount = countWordOccurrences(wordSection, targetWord);
    
    // If the word doesn't appear, try another section
    var attempts = 0;
    while (wordCount === 0 && attempts < 5) {
        wordSection = getRandomTextSection();
        wordCount = countWordOccurrences(wordSection, targetWord);
        attempts++;
    }
    
    // If still no occurrences, pick a word that definitely exists
    if (wordCount === 0) {
        targetWord = 'the';
        wordSection = textSections[0]; // First section has 'the'
        wordCount = countWordOccurrences(wordSection, targetWord);
    }
    
    tasks.push({
        type: 'word',
        target: targetWord,
        content: wordSection,
        answer: wordCount,
        difficulty: 'easy'
    });
    
    // Task 2: Count a letter (Medium)
    var letterSection = getRandomTextSection();
    var commonLetters = ['e', 'a', 'i', 'o', 'n', 't', 's', 'r'];
    var targetLetter = commonLetters[Math.floor(Math.random() * commonLetters.length)];
    var letterCount = countLetterOccurrences(letterSection, targetLetter);
    
    tasks.push({
        type: 'letter',
        target: targetLetter,
        content: letterSection,
        answer: letterCount,
        difficulty: 'medium'
    });
    
    // Task 3: Count two letters (Hard)
    var twoLetterSection = getRandomTextSection();
    var letters = ['a', 'e', 'i', 'o', 'u', 'n', 't', 's'];
    var letter1 = letters[Math.floor(Math.random() * letters.length)];
    var letter2 = letters[Math.floor(Math.random() * letters.length)];
    
    // Make sure we have two different letters
    while (letter2 === letter1) {
        letter2 = letters[Math.floor(Math.random() * letters.length)];
    }
    
    var twoLetterCount = countTwoLetters(twoLetterSection, letter1, letter2);
    
    tasks.push({
        type: 'two-letters',
        target: letter1 + ' and ' + letter2,
        content: twoLetterSection,
        answer: twoLetterCount,
        difficulty: 'hard'
    });
    
    return tasks;
}

var gameState = {
    currentTask: 0,
    tasks: generateTasks(),
    results: [],
    startTime: null,
    taskStartTime: null
};

var refreshInterval;
var chatHistory = [];

Qualtrics.SurveyEngine.addOnload(function() {
    console.log("Game 2: OnLoad");
});

Qualtrics.SurveyEngine.addOnReady(function() {
    console.log("Game 2: OnReady");
    
    // Game elements
    var taskArea = document.getElementById('taskArea');
    var resultsArea = document.getElementById('resultsArea');
    var textDisplay = document.getElementById('textDisplay');
    var instruction = document.getElementById('instruction');
    var answerInput = document.getElementById('answerInput');
    var submitBtn = document.getElementById('submitBtn');
    var restartBtn = document.getElementById('restartBtn');
    var currentTaskSpan = document.getElementById('currentTask');
    
    // Chat elements
    var chatbox = document.getElementById('chatbox');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    
    // Constants
    var MAX_TOTAL_TOKENS = 300;
    
    // Check elements
    if (!taskArea || !textDisplay || !submitBtn) {
        console.error("Game 2: Missing game elements");
        return;
    }
    
    if (!chatbox || !userInput || !sendBtn) {
        console.error("Game 2: Missing chat elements");
        return;
    }
    
    console.log("Game 2: All elements found");
    
    // Initialize game
    gameState.startTime = Date.now();
    
    // Load first task
    function loadTask() {
        console.log("Loading task: " + gameState.currentTask);
        
        gameState.taskStartTime = Date.now();
        var task = gameState.tasks[gameState.currentTask];
        textDisplay.textContent = task.content;
        currentTaskSpan.textContent = gameState.currentTask + 1;
        answerInput.value = '';
        answerInput.focus();
        
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
        
        if (task.type === 'word') {
            instruction.textContent = 'Count how many times the word "' + task.target + '" appears:';
        } else if (task.type === 'letter') {
            instruction.textContent = 'Count how many times the letter "' + task.target + '" appears (case-insensitive):';
        } else if (task.type === 'two-letters') {
            instruction.textContent = 'Count how many times the letters "' + task.target + '" appear in total (case-insensitive):';
        }
    }
    
    // Submit handler
    submitBtn.onclick = function() {
        console.log("Submit clicked");
        
        var answer = parseInt(answerInput.value);
        if (isNaN(answer)) {
            alert('Please enter a number');
            return;
        }
        
        var task = gameState.tasks[gameState.currentTask];
        var correct = (answer === task.answer);
        var taskTime = (Date.now() - gameState.taskStartTime) / 1000;
        
        gameState.results.push({
            taskNumber: gameState.currentTask + 1,
            type: task.type,
            target: task.target,
            correct: correct,
            userAnswer: answer,
            correctAnswer: task.answer,
            time: taskTime.toFixed(2),
            difficulty: task.difficulty
        });
        
        console.log("Task " + (gameState.currentTask + 1) + ": " + (correct ? "Correct" : "Wrong"));
        
        // Store in Qualtrics
        try {
            Qualtrics.SurveyEngine.setEmbeddedData('g2_task' + (gameState.currentTask + 1) + '_answer', answer);
            Qualtrics.SurveyEngine.setEmbeddedData('g2_task' + (gameState.currentTask + 1) + '_correct', correct);
            Qualtrics.SurveyEngine.setEmbeddedData('g2_task' + (gameState.currentTask + 1) + '_time', taskTime.toFixed(2));
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
    
    // Show results
    function showResults() {
        console.log("Showing results");
        var totalTime = ((Date.now() - gameState.startTime) / 1000).toFixed(2);
        
        taskArea.style.display = 'none';
        resultsArea.style.display = 'block';
        
        // Hide difficulty badge
        document.getElementById('difficultyBadge').style.display = 'none';
        
        var correct = 0;
        for (var i = 0; i < gameState.results.length; i++) {
            if (gameState.results[i].correct) correct++;
        }
        
        // Update summary stats
        document.getElementById('totalTime').textContent = totalTime + ' seconds';
        document.getElementById('totalScore').textContent = correct + ' / 3 correct';
        
        // Create task breakdown
        var breakdown = document.getElementById('taskBreakdown');
        breakdown.innerHTML = '';
        
        for (var j = 0; j < gameState.results.length; j++) {
            var result = gameState.results[j];
            var taskDiv = document.createElement('div');
            taskDiv.style.cssText = 'margin: 5px 0; padding: 8px; background: #f0f0f0; border-radius: 3px;';
            
            var header = document.createElement('div');
            header.style.cssText = 'font-weight: bold; color: #333; margin-bottom: 5px;';
            var difficultyText = result.difficulty ? ' (' + result.difficulty + ')' : '';
            header.textContent = 'Task ' + result.taskNumber + difficultyText + ':';
            
            var details = document.createElement('div');
            details.style.cssText = 'color: #555; font-size: 14px;';
            details.innerHTML = 'Target: <strong>' + result.target + '</strong><br>' +
                               'Correct answer: <strong>' + result.correctAnswer + '</strong>, ' +
                               'Your answer: <strong>' + result.userAnswer + '</strong>';
            
            var status = document.createElement('div');
            status.style.cssText = 'color: ' + (result.correct ? '#4CAF50' : '#f44336') + '; font-weight: 600; margin-top: 5px;';
            status.textContent = (result.correct ? '✓ Correct' : '✗ Incorrect') + ' - Time: ' + result.time + 's';
            
            taskDiv.appendChild(header);
            taskDiv.appendChild(details);
            taskDiv.appendChild(status);
            breakdown.appendChild(taskDiv);
        }
        
        // Store final results
        try {
            Qualtrics.SurveyEngine.setEmbeddedData('g2_total_score', correct);
            Qualtrics.SurveyEngine.setEmbeddedData('g2_total_time', totalTime);
            Qualtrics.SurveyEngine.setEmbeddedData('g2_complete', true);
        } catch (e) {
            console.error("Error storing final data: " + e);
        }
    }
    
    // Restart
    restartBtn.onclick = function() {
        console.log("Restart clicked");
        gameState.currentTask = 0;
        gameState.tasks = generateTasks(); // Generate new random tasks
        gameState.results = [];
        gameState.startTime = Date.now();
        resultsArea.style.display = 'none';
        taskArea.style.display = 'block';
        loadTask();
    };
    
    // Enter key for answer
    answerInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    };
    
    // CHAT FUNCTIONS
    function submitChat() {
        var userText = userInput.value.trim();
        if (!userText) return;
        
        var numPrompts = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("g2NumPrompts")) || 0;
        
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
        Qualtrics.SurveyEngine.setEmbeddedData("g2NumPrompts", numPrompts);
        updatePromptCounter();
        
        chatHistory.push({ role: "user", content: userText });
        appendToChat("You", userText);
        userInput.value = "";
        updateTokenCounter();
        
        Qualtrics.SurveyEngine.setEmbeddedData("g2UserText", userText);
        
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
            
            Qualtrics.SurveyEngine.setEmbeddedData("g2BotFlagLevel", flag1);
            Qualtrics.SurveyEngine.setEmbeddedData("g2BotFlagType", flag2);
            Qualtrics.SurveyEngine.setEmbeddedData("g2BotResponse", answer);
            Qualtrics.SurveyEngine.setEmbeddedData("g2ChatHistoryJSON", JSON.stringify(chatHistory));
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
        var numUsed = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("g2NumPrompts")) || 0;
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
        
        Qualtrics.SurveyEngine.setEmbeddedData("g2RemainingPrompts", remaining);
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
        
        Qualtrics.SurveyEngine.setEmbeddedData("g2InputTokenEstimate", tokenEstimate);
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
    loadTask();
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    console.log("Game 2: OnUnload");
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});