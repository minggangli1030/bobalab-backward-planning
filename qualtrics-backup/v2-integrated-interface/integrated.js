// Global state
var gameState = {
    startTime: Date.now(),
    currentTab: null,
    completed: {},
    switches: 0,
    taskStartTimes: {},
    taskTotalTimes: {},
    chatHistory: [],
    numPrompts: 0,
    countdownInterval: null,
    nextDestination: null,
    pausedTime: 0,
    isPaused: false,
    isInBreak: false // Track break state
};

// Timer interval
var timerInterval;

// Pattern sets for Game 3
var patternSets = {
    easy: ['abc def ghi', 'xyz uvw rst', 'one two six', 'cat dog pig', 'red blue sky'],
    medium: ['AbC xYz 123', 'HeLLo WoRLd', 'TeSt PaTTeRn', 'Mix123 CaSe', 'UpDowN 456'],
    hard: ['a@1 B#2 c$3', 'X!y? Z&w% 9*8', 'Qw3$ Er4# Ty5@', 'Pa$$w0rd! Test', 'C0d3& $ymb0!s']
};

// Text sections for Game 2
var textSections = [
    'The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state\'s first land-grant university and is the founding campus of the University of California system.',
    'Ten faculty members and forty male students made up the fledgling university when it opened in Oakland in 1869. Frederick Billings, a trustee of the College of California, suggested that a new campus site north of Oakland be named in honor of Anglo-Irish philosopher George Berkeley.',
    'Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business.'
];

Qualtrics.SurveyEngine.addOnload(function() {
    console.log('Integrated game system loaded');
});

Qualtrics.SurveyEngine.addOnReady(function() {
    var that = this;
    that.hideNextButton();
    
    // Store the Qualtrics context globally for access in other functions
    window.qualtricsContext = that;
    
    // Handle start button click
    document.getElementById('startGameBtn').addEventListener('click', function() {
        // Hide landing page
        document.getElementById('landingPage').style.display = 'none';
        
        // Show game content
        document.getElementById('gameContent').style.display = 'block';
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Start the timer NOW
        gameState.startTime = Date.now();
        timerInterval = setInterval(updateGlobalTimer, 1000);
        
        // Set up tab navigation with break protection
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                if (!this.disabled) {
                    // COMPLETELY block clicks during break
                    if (gameState.isInBreak || gameState.countdownInterval) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    switchToTab(this.getAttribute('data-tab'));
                }
            });
        });
        
        // Set up chat
        setupChat();
        
        // Load first available tab
        switchToTab('g1t1');
    });
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    // Save final state
    storeGameData();
});

// Timer function - FIXED to respect pause
function updateGlobalTimer() {
    // Stop updating if all tasks complete or if paused
    if (Object.keys(gameState.completed).length >= 9 || gameState.isPaused) {
        return;
    }
    
    var elapsed = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    document.getElementById('globalTimer').textContent = 
        (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

// Tab switching - FIXED with break protection
function switchToTab(tabId, isAutoAdvance) {
    // ABSOLUTE BLOCK during break
    if (gameState.isInBreak) {
        return;
    }
    
    // Clear any active countdown to prevent glitches
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    // Record switch only if it's a manual switch (not auto-advance)
    if (gameState.currentTab && tabId !== gameState.currentTab && !isAutoAdvance) {
        gameState.switches++;
    }
    
    // Record time on previous task
    if (gameState.currentTab && gameState.taskStartTimes[gameState.currentTab]) {
        var timeSpent = Date.now() - gameState.taskStartTimes[gameState.currentTab];
        gameState.taskTotalTimes[gameState.currentTab] = 
            (gameState.taskTotalTimes[gameState.currentTab] || 0) + timeSpent;
    }
    
    // Update current tab
    gameState.currentTab = tabId;
    gameState.taskStartTimes[tabId] = Date.now();
    
    // Update UI
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
    });
    var activeBtn = document.querySelector('[data-tab="' + tabId + '"]');
    if (activeBtn) {
        activeBtn.style.transform = 'translateY(-2px)';
        activeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    }
    
    // Load content
    loadTab(tabId);
}

// Load tab content
function loadTab(tabId) {
    var content = document.getElementById('contentArea');
    
    // Clear any active countdown immediately when loading new content
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    content.innerHTML = '<div style="text-align: center; padding: 50px;">Loading...</div>';
    
    // Parse tab ID
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    
    setTimeout(function() {
        switch(game) {
            case 1:
                loadSliderGame(task);
                break;
            case 2:
                loadCountingGame(task);
                break;
            case 3:
                loadTypingGame(task);
                break;
        }
    }, 100);
}

// Mark task complete - COMPLETELY REWRITTEN with new break system
function markTaskComplete(tabId) {
    // Clear any existing countdown first
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    gameState.completed[tabId] = true;
    
    // Update button appearance
    var btn = document.querySelector('[data-tab="' + tabId + '"]');
    var btnText = btn.textContent;
    if (!btnText.includes('✓')) {
        btn.textContent = btnText + ' ✓';
    }
    btn.style.opacity = '0.8';
    
    // Unlock next task
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    if (task < 3) {
        var nextTabId = 'g' + game + 't' + (task + 1);
        var nextBtn = document.querySelector('[data-tab="' + nextTabId + '"]');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.style.background = game === 1 ? '#4CAF50' : game === 2 ? '#9C27B0' : '#FFC107';
            nextBtn.style.color = game === 3 ? '#333' : 'white';
            nextBtn.style.cursor = 'pointer';
            nextBtn.textContent = nextBtn.textContent.replace(' 🔒', '');
        }
    }
    
    // Update progress
    var progress = (Object.keys(gameState.completed).length / 9) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    
    // Store data
    storeGameData();
    
    // Check if all tasks complete
    if (Object.keys(gameState.completed).length === 9) {
        showCompletion();
    } else {
        // Start mandatory 2-second break
        startMandatoryBreak(tabId);
    }
}

// NEW mandatory break function - 2 seconds, unskippable, timer paused
function startMandatoryBreak(completedTabId) {
    // IMMEDIATELY pause timer and set break state
    gameState.isPaused = true;
    gameState.isInBreak = true;
    var pauseStartTime = Date.now();
    
    // Determine default next destination
    var game = parseInt(completedTabId[1]);
    var task = parseInt(completedTabId[3]);
    var defaultNext = null;
    
    if (task < 3) {
        defaultNext = 'g' + game + 't' + (task + 1);
    } else {
        // Find next available game
        for (var g = game + 1; g <= 3; g++) {
            for (var t = 1; t <= 3; t++) {
                var checkTabId = 'g' + g + 't' + t;
                if (!gameState.completed[checkTabId]) {
                    defaultNext = checkTabId;
                    break;
                }
            }
            if (defaultNext) break;
        }
    }
    
    gameState.nextDestination = defaultNext;
    
    // Create break overlay that blocks EVERYTHING
    var breakDiv = document.createElement('div');
    breakDiv.id = 'breakOverlay';
    breakDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center;';
    
    var contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'background: white; padding: 40px; border-radius: 10px; text-align: center; max-width: 600px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); position: relative; z-index: 1000000;';
    
    // Create navigation copy inside the overlay
    var navCopy = document.createElement('div');
    navCopy.style.cssText = 'display: flex; gap: 2px; margin-bottom: 30px; flex-wrap: wrap; justify-content: center;';
    
    // Copy all navigation buttons into the overlay
    document.querySelectorAll('.tab-btn').forEach(function(originalBtn) {
        var btnCopy = document.createElement('button');
        btnCopy.textContent = originalBtn.textContent;
        btnCopy.style.cssText = originalBtn.style.cssText;
        btnCopy.setAttribute('data-tab', originalBtn.getAttribute('data-tab'));
        
        var tabId = originalBtn.getAttribute('data-tab');
        
        // Check if this task is completed
        if (originalBtn.disabled || gameState.completed[tabId]) {
            btnCopy.disabled = true;
            btnCopy.style.cursor = 'not-allowed';
            btnCopy.style.opacity = '0.5';
        } else {
            btnCopy.style.cursor = 'pointer';
            btnCopy.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var clickedTabId = this.getAttribute('data-tab');
                gameState.nextDestination = clickedTabId;
                
                // Update the text to show manual selection
                var destinationText = this.textContent.replace(' 🔒', '').replace(' ✓', '');
                document.getElementById('autoDestination').innerHTML = destinationText + ' <span style="color: #666; font-size: 12px;">(selected)</span>';
                
                // Visual feedback - clear all highlights first
                navCopy.querySelectorAll('button').forEach(function(b) {
                    b.style.boxShadow = 'none';
                    b.style.transform = 'scale(1)';
                });
                
                // Highlight the clicked button
                this.style.boxShadow = '0 0 0 3px #2196F3';
                this.style.transform = 'scale(1.05)';
                
                console.log('Task selected:', clickedTabId); // Debug log
            });
        }
        
        navCopy.appendChild(btnCopy);
    });
    
    // Calculate tasks remaining
    var tasksCompleted = Object.keys(gameState.completed).length;
    var tasksRemaining = 9 - tasksCompleted;
    var promptsUsed = gameState.numPrompts || 0;
    var promptsRemaining = 3 - promptsUsed;
    
    contentDiv.innerHTML = '<h2 style="color: #4CAF50; margin-bottom: 30px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Task Complete!</h2>' +
        '<div style="display: flex; gap: 30px; justify-content: center; margin: 40px 0;">' +
        '<div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px;">' +
        '<span style="color: #666; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Tasks Remaining:</span> ' +
        '<span style="color: #333; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">' + tasksRemaining + '/9</span>' +
        '</div>' +
        '<div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px;">' +
        '<span style="color: #666; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Prompts Remaining:</span> ' +
        '<span style="color: #333; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">' + promptsRemaining + '/3</span>' +
        '</div>' +
        '</div>' +
        '<p style="color: #666; font-size: 16px; margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Auto-advancing to: <span style="font-weight: bold; color: #2196F3;" id="autoDestination">' + 
        (defaultNext ? document.querySelector('[data-tab="' + defaultNext + '"]').textContent.replace(' 🔒', '').replace(' ✓', '') : 'Completion') + '</span></p>';
    
    
    breakDiv.appendChild(contentDiv);
    document.body.appendChild(breakDiv);
    
    // Countdown - 1.5 seconds (hidden)
    setTimeout(function() {
        // Clear interval
        gameState.countdownInterval = null;
        
        // Remove overlay
        if (document.body.contains(breakDiv)) {
            document.body.removeChild(breakDiv);
        }
        
        // Update paused time
        gameState.pausedTime += (Date.now() - pauseStartTime);
        gameState.isPaused = false;
        gameState.isInBreak = false;
        
        // Go to destination
        if (gameState.nextDestination) {
            switchToTab(gameState.nextDestination, true);
        }
        gameState.nextDestination = null;
    }, 1500);
}

// Show completion - UPDATED with accuracy
function showCompletion() {
    // Stop the timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Record final time
    var finalElapsed = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
    gameState.finalTime = finalElapsed;
    
    // Calculate accuracies for each game
    var sliderAccuracies = [];
    var countingCorrect = 0;
    var typingAccuracies = [];
    
    // Get stored accuracy data from each game
    // Game 1 - Slider (accuracy percentages)
    for (var i = 1; i <= 3; i++) {
        var acc = Qualtrics.SurveyEngine.getEmbeddedData('g1t' + i + '_accuracy');
        if (acc) sliderAccuracies.push(parseFloat(acc));
    }
    
    // Game 2 - Counting (correct/incorrect)
    for (var j = 1; j <= 3; j++) {
        var correct = Qualtrics.SurveyEngine.getEmbeddedData('g2t' + j + '_correct');
        if (correct === 'true' || correct === true || correct === '1') countingCorrect++;
    }
    
    // Game 3 - Typing (accuracy percentages)
    for (var k = 1; k <= 3; k++) {
        var typeAcc = Qualtrics.SurveyEngine.getEmbeddedData('g3t' + k + '_accuracy');
        if (typeAcc) typingAccuracies.push(parseFloat(typeAcc));
    }
    
    // Calculate averages
    var sliderAvg = sliderAccuracies.length > 0 ? 
        (sliderAccuracies.reduce(function(a, b) { return a + b; }, 0) / sliderAccuracies.length).toFixed(1) : '0.0';
    
    var countingPercentage = (countingCorrect / 3 * 100).toFixed(1);
    
    var typingAvg = typingAccuracies.length > 0 ? 
        (typingAccuracies.reduce(function(a, b) { return a + b; }, 0) / typingAccuracies.length).toFixed(1) : '0.0';
    
    // Calculate overall accuracy
    var overallAccuracy = ((parseFloat(sliderAvg) + parseFloat(countingPercentage) + parseFloat(typingAvg)) / 3).toFixed(1);
    
    // Hide game elements
    document.getElementById('tabNav').style.display = 'none';
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('gameContent').style.display = 'none';
    document.getElementById('completionMsg').style.display = 'block';
    
    // Display final stats
    var totalTime = finalElapsed;
    document.getElementById('finalTime').textContent = Math.floor(totalTime / 60) + 'm ' + (totalTime % 60) + 's';
    document.getElementById('finalSwitches').textContent = gameState.switches;
    document.getElementById('finalAccuracy').textContent = overallAccuracy + '%';
    
    // Display game-specific accuracies
    document.getElementById('sliderAccuracy').textContent = sliderAvg + '%';
    document.getElementById('countingAccuracy').textContent = countingPercentage + '%';
    document.getElementById('typingAccuracy').textContent = typingAvg + '%';
    
    // Store final accuracy data
    Qualtrics.SurveyEngine.setEmbeddedData('finalOverallAccuracy', overallAccuracy);
    Qualtrics.SurveyEngine.setEmbeddedData('finalSliderAccuracy', sliderAvg);
    Qualtrics.SurveyEngine.setEmbeddedData('finalCountingScore', countingCorrect);
    Qualtrics.SurveyEngine.setEmbeddedData('finalCountingAccuracy', countingPercentage);
    Qualtrics.SurveyEngine.setEmbeddedData('finalTypingAccuracy', typingAvg);
    Qualtrics.SurveyEngine.setEmbeddedData('totalTime', totalTime);
    
    // Set up continue button
    document.getElementById('continueBtn').addEventListener('click', function() {
        // Final save of all data
        storeGameData();
        
        // Get the Qualtrics context
        var qContext = window.qualtricsContext;
        
        if (qContext) {
            // Show the next button first
            qContext.showNextButton();
            
            // Give it a moment to render, then click it
            setTimeout(function() {
                var nextButton = document.getElementById('NextButton');
                if (nextButton) {
                    nextButton.click();
                } else {
                    console.error('NextButton not found after showing');
                }
            }, 100);
        } else {
            console.error('Qualtrics context not available');
            // Fallback: try clicking directly
            var nextButton = document.getElementById('NextButton');
            if (nextButton) {
                nextButton.click();
            }
        }
    });
}

// Store data
function storeGameData() {
    Qualtrics.SurveyEngine.setEmbeddedData('gameState', JSON.stringify(gameState));
    Qualtrics.SurveyEngine.setEmbeddedData('completedTasks', Object.keys(gameState.completed).length);
    Qualtrics.SurveyEngine.setEmbeddedData('totalSwitches', gameState.switches);
    Qualtrics.SurveyEngine.setEmbeddedData('totalTime', Math.floor((Date.now() - gameState.startTime) / 1000));
    
    // Store individual task data
    Object.keys(gameState.completed).forEach(function(tabId) {
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_complete', 'true');
        if (gameState.taskTotalTimes[tabId]) {
            Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_time', Math.floor(gameState.taskTotalTimes[tabId] / 1000));
        }
    });
}

// GAME 1: SLIDER
function loadSliderGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    // Use pure Math.random() for true randomness
    var target = difficulty === 'easy' ? Math.floor(Math.random() * 11) :
                 difficulty === 'medium' ? parseFloat((Math.random() * 10).toFixed(1)) :
                 parseFloat((Math.random() * 10).toFixed(2));
    
    var step = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 0.1 : 0.01;
    var showValue = difficulty !== 'hard';
    
    var content = document.getElementById('contentArea');
    
    // Build HTML with proper string concatenation
    var html = '<div style="border: 2px solid #4CAF50; border-radius: 8px; padding: 30px; background: white;">';
    html += '<h3 style="text-align: center; color: #333;">Slider Game - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 20px; text-align: center; margin: 20px 0;">';
    html += 'Move the slider to: <strong style="color: #4CAF50; font-size: 24px;">' + target + '</strong>';
    html += '</p>';
    
    html += '<div style="margin: 30px 0;">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; font-weight: bold; color: #666;">';
    html += '<span>0</span><span>10</span></div>';
    html += '<input type="range" id="gameSlider" min="0" max="10" step="' + step + '" value="5" ';
    html += 'style="width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: #ddd; outline: none; cursor: pointer;">';
    html += '<div id="sliderValue" style="text-align: center; font-size: 36px; font-weight: bold; color: #4CAF50; margin-top: 20px;">';
    html += showValue ? '5' : '?';
    html += '</div></div>';
    
    html += '<button id="sliderSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    // Slider event
    var slider = document.getElementById('gameSlider');
    slider.oninput = function() {
        if (showValue) {
            document.getElementById('sliderValue').textContent = this.value;
        }
    };
    
    // Submit event
    document.getElementById('sliderSubmit').onclick = function() {
        var value = parseFloat(slider.value);
        var accuracy = Math.max(0, 100 - (Math.abs(value - target) / 10 * 100));
        
        var tabId = 'g1t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_target', target);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_value', value);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_accuracy', accuracy.toFixed(2));
        
        // Always mark complete regardless of accuracy
        markTaskComplete(tabId);
    };
}

// GAME 2: COUNTING
function loadCountingGame(taskNum) {
    // Better randomization - use Math.random() directly
    var textIndex = Math.floor(Math.random() * textSections.length);
    var text = textSections[textIndex];
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    var target, instruction, answer;
    
    if (taskNum === 1) {
        // Easy: count word
        var words = ['the', 'of', 'and', 'in'];
        target = words[Math.floor(Math.random() * words.length)];
        instruction = 'Count how many times the word "' + target + '" appears:';
        answer = (text.match(new RegExp('\\b' + target + '\\b', 'gi')) || []).length;
    } else if (taskNum === 2) {
        // Medium: count letter
        var letters = ['e', 'a', 'i', 'o'];
        target = letters[Math.floor(Math.random() * letters.length)];
        instruction = 'Count how many times the letter "' + target + '" appears (case-insensitive):';
        answer = (text.match(new RegExp(target, 'gi')) || []).length;
    } else {
        // Hard: count two letters
        var letter1Options = ['a', 'e', 'i'];
        var letter2Options = ['n', 't', 's'];
        var letter1 = letter1Options[Math.floor(Math.random() * letter1Options.length)];
        var letter2 = letter2Options[Math.floor(Math.random() * letter2Options.length)];
        target = letter1 + '" and "' + letter2;
        instruction = 'Count how many times the letters "' + letter1 + '" and "' + letter2 + '" appear in total:';
        answer = (text.match(new RegExp(letter1, 'gi')) || []).length + 
                (text.match(new RegExp(letter2, 'gi')) || []).length;
    }
    
    var content = document.getElementById('contentArea');
    
    // Build HTML with proper string concatenation
    var html = '<div style="border: 2px solid #9C27B0; border-radius: 8px; padding: 30px; background: white;">';
    html += '<h3 style="text-align: center; color: #333;">Counting Game - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0;">' + instruction + '</p>';
    
    // Canvas for text display (like Game 3)
    html += '<div style="background-color: #fafafa; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">';
    html += '<canvas id="textCanvas" width="750" height="300" style="max-width: 100%; height: auto;"></canvas>';
    html += '</div>';
    
    html += '<div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin: 20px 0;">';
    html += '<label style="font-weight: bold;">Your answer:</label>';
    html += '<input type="number" id="countAnswer" min="0" max="999" placeholder="Enter count" ';
    html += 'style="width: 150px; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 18px; text-align: center;">';
    html += '</div>';
    
    html += '<button id="countSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    // Draw text on canvas to prevent copying
    var canvas = document.getElementById('textCanvas');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set font and color
    ctx.font = '14px monospace';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Word wrap the text
    var words = text.split(' ');
    var line = '';
    var y = 20;
    var lineHeight = 22;
    var maxWidth = canvas.width - 40;
    var x = 20;
    
    for (var i = 0; i < words.length; i++) {
        var testLine = line + words[i] + ' ';
        var metrics = ctx.measureText(testLine);
        var testWidth = metrics.width;
        
        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = words[i] + ' ';
            y += lineHeight;
            
            // Check if we've run out of canvas space
            if (y > canvas.height - 40) {
                // Resize canvas if needed
                canvas.height = y + 100;
                ctx.font = '14px monospace';
                ctx.fillStyle = '#333333';
            }
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
    
    // Add slight visual noise to prevent OCR
    ctx.strokeStyle = 'rgba(156, 39, 176, 0.05)';
    ctx.lineWidth = 1;
    for (var j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    // Submit event
    document.getElementById('countSubmit').onclick = function() {
        var userAnswer = parseInt(document.getElementById('countAnswer').value || 0);
        var correct = userAnswer === answer;
        
        var tabId = 'g2t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_answer', userAnswer);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correct', correct);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correctAnswer', answer);
        
        // Always mark complete regardless of whether answer is correct
        markTaskComplete(tabId);
    };
}

// GAME 3: TYPING
function loadTypingGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    var patterns = patternSets[difficulty];
    
    // Use pure Math.random() for true randomness
    var pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    var content = document.getElementById('contentArea');
    
    // Build HTML with proper string concatenation
    var html = '<div style="border: 2px solid #FFC107; border-radius: 8px; padding: 30px; background: white;">';
    html += '<h3 style="text-align: center; color: #333;">Pattern Typing - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0;">Type the following pattern exactly:</p>';
    
    html += '<div style="background-color: #f5f5f5; border: 2px solid #FFC107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">';
    html += '<canvas id="patternCanvas" width="600" height="80" style="max-width: 100%; height: auto;"></canvas>';
    html += '</div>';
    
    html += '<input type="text" id="typeInput" placeholder="Type the pattern here..." ';
    html += 'style="width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 20px; font-family: \'Courier New\', monospace; text-align: center; letter-spacing: 2px; box-sizing: border-box;">';
    
    html += '<div style="margin-top: 20px;">';
    html += '<button id="typeSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    // Draw pattern on canvas
    var canvas = document.getElementById('patternCanvas');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 36px Courier New, monospace';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pattern, canvas.width / 2, canvas.height / 2);
    
    // Add visual noise
    ctx.strokeStyle = 'rgba(255, 193, 7, 0.1)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    // Real-time feedback - REMOVED
    var input = document.getElementById('typeInput');
    
    // Submit event
    document.getElementById('typeSubmit').onclick = function() {
        var userPattern = input.value;
        var accuracy = userPattern === pattern ? 100 : 0;
        
        if (accuracy === 0 && userPattern.length > 0) {
            var matches = 0;
            for (var i = 0; i < Math.min(userPattern.length, pattern.length); i++) {
                if (userPattern[i] === pattern[i]) matches++;
            }
            accuracy = Math.round((matches / Math.max(userPattern.length, pattern.length)) * 100);
        }
        
        var tabId = 'g3t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_pattern', userPattern);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_accuracy', accuracy);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_expected', pattern);
        
        // Always mark complete regardless of accuracy
        markTaskComplete(tabId);
    };
}

// CHAT SYSTEM
function setupChat() {
    var MAX_TOTAL_TOKENS = 300;
    var chatbox = document.getElementById('chatbox');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    
    // Check if elements exist
    if (!chatbox || !userInput || !sendBtn) {
        console.error("Chat elements not found");
        return;
    }
    
    function submitChat() {
        var userText = userInput.value.trim();
        if (!userText) return;
        
        // Read from embedded data
        var numPrompts = gameState.numPrompts || 0;
        
        // Enforce limit
        if (numPrompts >= 3) {
            appendToChat("System", "⚠️ You've reached your 3-prompt limit for this round.");
            userInput.disabled = true;
            sendBtn.disabled = true;
            updatePromptCounter();
            return;
        }
        
        var userTokenEstimate = estimateTokens(userText);
        var historyTokenEstimate = gameState.chatHistory.reduce(function(sum, msg) {
            return sum + estimateTokens(msg.content);
        }, 0);
        var estimatedTotal = userTokenEstimate + historyTokenEstimate;
        
        if (estimatedTotal > MAX_TOTAL_TOKENS) {
            appendToChat("System", "⚠️ Exceeds token limit. Please shorten your message.");
            return;
        }
        
        // Track + increment
        numPrompts += 1;
        gameState.numPrompts = numPrompts;
        Qualtrics.SurveyEngine.setEmbeddedData("numPrompts", numPrompts);
        updatePromptCounter();
        
        // Record inquiry timestamp and current task
        var currentTime = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
        var inquiryData = {
            timestamp: currentTime,
            currentTask: gameState.currentTab || 'none',
            promptNumber: numPrompts
        };
        
        // Store individual inquiry data
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_timestamp", currentTime);
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_task", gameState.currentTab || 'none');
        
        // Store all inquiries as JSON
        if (!gameState.inquiries) {
            gameState.inquiries = [];
        }
        gameState.inquiries.push(inquiryData);
        Qualtrics.SurveyEngine.setEmbeddedData("inquiryTimeStamps", JSON.stringify(gameState.inquiries));
        
        // Proceed with chat
        gameState.chatHistory.push({ role: "user", content: userText });
        appendToChat("You", userText);
        userInput.value = "";
        updateTokenCounter();
        
        Qualtrics.SurveyEngine.setEmbeddedData("userText", userText);
        
        fetch("https://bobalab-chatgpt-backend.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, history: gameState.chatHistory })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var reply = data.reply || "";
            var split = splitBotReply(reply);
            
            gameState.chatHistory.push({ role: "assistant", content: split.answer });
            appendToChat("AI", split.answer);
            
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagLevel", split.flag1);
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagType", split.flag2);
            Qualtrics.SurveyEngine.setEmbeddedData("botResponse", split.answer);
            Qualtrics.SurveyEngine.setEmbeddedData("chatHistoryJSON", JSON.stringify(gameState.chatHistory));
        })
        .catch(function(err) {
            console.error("Chat error:", err);
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
    
    function splitBotReply(raw) {
        var lines = raw.split("\n").filter(Boolean);
        return {
            flag1: lines.length > 0 ? lines[0] : "",
            flag2: lines.length > 1 ? lines[1] : "",
            answer: lines.length > 2 ? lines.slice(2).join("\n") : raw
        };
    }
    
    function estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    
    function updatePromptCounter() {
        if (!chatbox) return;
        
        var maxPrompts = 3;
        var numUsed = gameState.numPrompts || 0;
        var remaining = Math.max(0, maxPrompts - numUsed);
        
        // Remove old counter
        var old = document.getElementById("promptCounterInChat");
        if (old) old.remove();
        
        // Create new counter
        var div = document.createElement("div");
        div.id = "promptCounterInChat";
        div.style.cssText = "background-color:#fff3e0;border:1px solid #ffcc80;padding:8px;margin:5px 0;text-align:center;font-weight:600;color:#f57c00;border-radius:8px;font-size:13px;";
        div.innerHTML = "Prompt Cap: " + remaining + " / " + maxPrompts;
        
        // Insert at top
        var tokenCounter = document.getElementById("tokenCounterInChat");
        if (tokenCounter && tokenCounter.nextSibling) {
            chatbox.insertBefore(div, tokenCounter.nextSibling);
        } else {
            chatbox.insertBefore(div, chatbox.firstChild);
        }
        
        Qualtrics.SurveyEngine.setEmbeddedData("remainingPrompts", remaining);
    }
    
    function updateTokenCounter() {
        if (!chatbox || !userInput) return;
        
        var text = userInput.value.trim();
        var tokenEstimate = text ? estimateTokens(text) : 0;
        
        // Remove old counter
        var oldTokenCounter = document.getElementById("tokenCounterInChat");
        if (oldTokenCounter) oldTokenCounter.remove();
        
        // Create new counter
        var tokenDiv = document.createElement("div");
        tokenDiv.id = "tokenCounterInChat";
        
        // Calculate total tokens
        var historyTokens = gameState.chatHistory.reduce(function(sum, msg) {
            return sum + estimateTokens(msg.content);
        }, 0);
        var totalEstimate = tokenEstimate + historyTokens;
        
        // Style based on usage
        if (totalEstimate > MAX_TOTAL_TOKENS * 0.8) {
            tokenDiv.style.cssText = "background-color: #ffebee; border: 1px solid #ef5350; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #c62828; border-radius: 8px; font-weight: 600;";
        } else {
            tokenDiv.style.cssText = "background-color: #e3f2fd; border: 1px solid #64b5f6; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #1565c0; border-radius: 8px; font-weight: 600;";
        }
        tokenDiv.innerHTML = "Token Cap: " + totalEstimate + "/" + MAX_TOTAL_TOKENS;
        
        // Insert at top
        chatbox.insertBefore(tokenDiv, chatbox.firstChild);
        
        Qualtrics.SurveyEngine.setEmbeddedData("inputTokenEstimate", tokenEstimate);
    }
    
    // Attach event listeners
    sendBtn.addEventListener('click', submitChat);
    userInput.addEventListener("input", updateTokenCounter);
    
    userInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            submitChat();
        }
    });
    
    // Initial display
    try {
        updateTokenCounter();
        updatePromptCounter();
    } catch (e) {
        console.error("Error in initial display:", e);
    }
    
    // Update counters periodically
    setInterval(function() {
        try {
            var currentValue = userInput.value;
            if (!userInput.hasAttribute('data-last-value') || userInput.getAttribute('data-last-value') !== currentValue) {
                userInput.setAttribute('data-last-value', currentValue);
                updateTokenCounter();
            }
            updatePromptCounter();
        } catch (e) {
            console.error("Error in interval update:", e);
        }
    }, 300);
}