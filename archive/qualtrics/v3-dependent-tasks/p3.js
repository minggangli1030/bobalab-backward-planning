// Start main game
function startMainGame() {
    gameState.isPractice = false;
    gameState.startTime = Date.now();
    
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('gameContent').style.display = 'block';
    window.scrollTo(0, 0);
    
    timerInterval = setInterval(updateGlobalTimer, 1000);
    
    // Update navigation for new game order
    updateNavigationForNewOrder();
    
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            if (!this.disabled) {
                if (gameState.isInBreak || gameState.countdownInterval) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                switchToTab(this.getAttribute('data-tab'));
            }
        });
    });
    
    setupChat();
    switchToTab('g1t1'); // Start with counting game
}

// Update navigation buttons for new game order
function updateNavigationForNewOrder() {
    var navContainer = document.getElementById('tabNav');
    navContainer.innerHTML = `
        <!-- Counting (now first) -->
        <button class="tab-btn" data-tab="g1t1" style="background: #9C27B0; color: white; padding: 10px 6px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;">Count 1</button>
        <button class="tab-btn" data-tab="g1t2" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>C2 🔒</button>
        <button class="tab-btn" data-tab="g1t3" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>C3 🔒</button>
        
        <!-- Slider (now second) -->
        <button class="tab-btn" data-tab="g2t1" style="background: #4CAF50; color: white; padding: 10px 6px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;">Slide 1</button>
        <button class="tab-btn" data-tab="g2t2" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>S2 🔒</button>
        <button class="tab-btn" data-tab="g2t3" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>S3 🔒</button>
        
        <!-- Typing (remains third) -->
        <button class="tab-btn" data-tab="g3t1" style="background: #FFC107; color: #333; padding: 10px 6px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;">Type 1</button>
        <button class="tab-btn" data-tab="g3t2" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>T2 🔒</button>
        <button class="tab-btn" data-tab="g3t3" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>T3 🔒</button>
    `;
}

function updateGlobalTimer() {
    if (Object.keys(gameState.completed).length >= 9 || gameState.isPaused) {
        return;
    }
    
    var elapsed = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    document.getElementById('globalTimer').textContent = 
        (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function switchToTab(tabId, isAutoAdvance) {
    if (gameState.isInBreak) {
        return;
    }
    
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    if (gameState.currentTab && tabId !== gameState.currentTab && !isAutoAdvance) {
        gameState.switches++;
    }
    
    if (gameState.currentTab && gameState.taskStartTimes[gameState.currentTab]) {
        var timeSpent = Date.now() - gameState.taskStartTimes[gameState.currentTab];
        gameState.taskTotalTimes[gameState.currentTab] = 
            (gameState.taskTotalTimes[gameState.currentTab] || 0) + timeSpent;
    }
    
    gameState.currentTab = tabId;
    gameState.taskStartTimes[tabId] = Date.now();
    
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
    });
    var activeBtn = document.querySelector('[data-tab="' + tabId + '"]');
    if (activeBtn) {
        activeBtn.style.transform = 'translateY(-2px)';
        activeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    }
    
    loadTab(tabId);
}

function loadTab(tabId) {
    var content = document.getElementById('contentArea');
    
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    content.innerHTML = '<div style="text-align: center; padding: 50px;">Loading...</div>';
    
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    
    setTimeout(function() {
        switch(game) {
            case 1:
                loadCountingGame(task);
                break;
            case 2:
                loadSliderGame(task);
                break;
            case 3:
                loadTypingGame(task);
                break;
        }
    }, 100);
}

function markTaskComplete(tabId) {
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    gameState.completed[tabId] = true;
    
    // Award bonus prompt
    gameState.bonusPrompts += 1;
    Qualtrics.SurveyEngine.setEmbeddedData('bonusPrompts', gameState.bonusPrompts);
    
    // Show prompt bonus notification
    var promptNotification = document.createElement('div');
    promptNotification.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: #2196F3; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; animation: slideIn 0.5s ease-out;';
    promptNotification.innerHTML = '<strong>+1 Chat Prompt Earned!</strong><br>Total available: ' + (gameState.basePrompts + gameState.bonusPrompts - gameState.numPrompts);
    document.body.appendChild(promptNotification);
    
    setTimeout(function() {
    if (promptNotification && document.body.contains(promptNotification)) {
        promptNotification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(function() {
            if (document.body.contains(promptNotification)) {
                document.body.removeChild(promptNotification);
            }
        }, 500);
    }
}, 2000);
    
    // Check and activate dependencies
    var activatedDeps = taskDependencies.checkDependencies(tabId);
    
    var btn = document.querySelector('[data-tab="' + tabId + '"]');
    var btnText = btn.textContent;
    if (!btnText.includes('✓')) {
        btn.textContent = btnText + ' ✓';
    }
    btn.style.opacity = '0.8';
    
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    if (task < 3) {
        var nextTabId = 'g' + game + 't' + (task + 1);
        var btn = document.querySelector('[data-tab="' + nextTabId + '"]');
        if (btn) {
            btn.disabled = false;
            btn.style.background = game === 1 ? '#9C27B0' : game === 2 ? '#4CAF50' : '#FFC107';
            btn.style.color = game === 3 ? '#333' : 'white';
            btn.style.cursor = 'pointer';
            btn.textContent = btn.textContent.replace(' 🔒', '');
        }
    }
    
    var progress = (Object.keys(gameState.completed).length / 9) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    
    storeGameData();
    
    if (Object.keys(gameState.completed).length === 9) {
        showCompletion();
    } else {
        startMandatoryBreak(tabId);
    }
}

function startMandatoryBreak(completedTabId) {
    gameState.isPaused = true;
    gameState.isInBreak = true;
    var pauseStartTime = Date.now();
    
    var game = parseInt(completedTabId[1]);
    var task = parseInt(completedTabId[3]);
    var defaultNext = null;
    
    if (task < 3) {
        defaultNext = 'g' + game + 't' + (task + 1);
    } else {
        for (var g = 1; g <= 3; g++) {
            if (g === game) continue;
            for (var t = 1; t <= 3; t++) {
                var checkTabId = 'g' + g + 't' + t;
                if (!gameState.completed[checkTabId]) {
                    defaultNext = checkTabId;
                    break;
                }
            }
            if (defaultNext) break;
        }
        
        if (!defaultNext) {
            for (var g2 = 1; g2 <= 3; g2++) {
                for (var t2 = 1; t2 <= 3; t2++) {
                    var checkTabId2 = 'g' + g2 + 't' + t2;
                    if (!gameState.completed[checkTabId2]) {
                        defaultNext = checkTabId2;
                        break;
                    }
                }
                if (defaultNext) break;
            }
        }
    }
    
    gameState.nextDestination = defaultNext;
    
    var breakDiv = document.createElement('div');
    breakDiv.id = 'breakOverlay';
    breakDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center;';
    
    var contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'background: white; padding: 40px; border-radius: 10px; text-align: center; max-width: 600px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); position: relative; z-index: 1000000;';
    
    var navCopy = document.createElement('div');
    navCopy.style.cssText = 'display: flex; gap: 2px; margin-bottom: 20px; flex-wrap: nowrap; justify-content: center; overflow-x: auto; width: 90%; padding: 0 5px;';
    
    document.querySelectorAll('.tab-btn').forEach(function(originalBtn) {
        var btnCopy = document.createElement('button');
        var tabId = originalBtn.getAttribute('data-tab');
        var taskNum = parseInt(tabId[3]);
        
        var btnText = originalBtn.textContent;
        if (taskNum === 2) {
            if (tabId.startsWith('g1')) btnText = 'C2';
            else if (tabId.startsWith('g2')) btnText = 'S2';
            else if (tabId.startsWith('g3')) btnText = 'T2';
        } else if (taskNum === 3) {
            if (tabId.startsWith('g1')) btnText = 'C3';
            else if (tabId.startsWith('g2')) btnText = 'S3';
            else if (tabId.startsWith('g3')) btnText = 'T3';
        }
        
        if (gameState.completed[tabId]) {
            btnText = btnText.replace(' 🔒', '') + ' ✓';
        }
        
        btnCopy.textContent = btnText;
        btnCopy.style.cssText = originalBtn.style.cssText;
        
        if (taskNum === 2 || taskNum === 3) {
            btnCopy.style.minWidth = '40px';
            btnCopy.style.padding = '10px 4px';
            btnCopy.style.fontSize = '12px';
        }
        
        btnCopy.setAttribute('data-tab', tabId);
        
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
                
                var destinationText = this.textContent.replace(' 🔒', '').replace(' ✓', '');
                document.getElementById('autoDestination').innerHTML = destinationText + ' <span style="color: #666; font-size: 12px;">(selected)</span>';
                
                navCopy.querySelectorAll('button').forEach(function(b) {
                    b.style.boxShadow = 'none';
                    b.style.transform = 'scale(1)';
                });
                
                this.style.boxShadow = '0 0 0 3px #2196F3';
                this.style.transform = 'scale(1.05)';
            });
        }
        
        navCopy.appendChild(btnCopy);
    });
    
    var tasksCompleted = Object.keys(gameState.completed).length;
    var tasksRemaining = 9 - tasksCompleted;
    var totalPrompts = gameState.basePrompts + gameState.bonusPrompts;
    var promptsRemaining = totalPrompts - gameState.numPrompts;
    
    contentDiv.innerHTML = '<h2 style="color: #4CAF50; margin-bottom: 30px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Task Complete! +1 Prompt Earned</h2>' +
        '<div style="display: flex; gap: 30px; justify-content: center; margin: 40px 0;">' +
        '<div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px;">' +
        '<span style="color: #666; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Tasks Remaining:</span> ' +
        '<span style="color: #333; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">' + tasksRemaining + '/9</span>' +
        '</div>' +
        '<div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px;">' +
        '<span style="color: #666; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Prompts Available:</span> ' +
        '<span style="color: #333; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">' + promptsRemaining + '</span>' +
        '</div>' +
        '</div>' +
        '<p style="color: #666; font-size: 16px; margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Auto-advancing to: <span style="font-weight: bold; color: #2196F3;" id="autoDestination">' + 
        (defaultNext ? document.querySelector('[data-tab="' + defaultNext + '"]').textContent.replace(' 🔒', '').replace(' ✓', '') : 'Completion') + '</span></p>';
    
    contentDiv.insertBefore(navCopy, contentDiv.firstChild);
    breakDiv.appendChild(contentDiv);
    document.body.appendChild(breakDiv);
    
    setTimeout(function() {
        gameState.countdownInterval = null;
        
        if (document.body.contains(breakDiv)) {
            document.body.removeChild(breakDiv);
        }
        
        gameState.pausedTime += (Date.now() - pauseStartTime);
        gameState.isPaused = false;
        gameState.isInBreak = false;
        
        if (gameState.nextDestination) {
            switchToTab(gameState.nextDestination, true);
        }
        gameState.nextDestination = null;
    }, 3000);
}

// GAME 1: COUNTING (now first)
function loadCountingGame(taskNum) {
    var textIndex = Math.floor(Math.random() * textSections.length);
    var text = textSections[textIndex];
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    var target, instruction, answer;
    
    if (taskNum === 1) {
        var words = ['the', 'of', 'and', 'in'];
        target = words[Math.floor(Math.random() * words.length)];
        instruction = 'Count how many times the word "' + target + '" appears:';
        answer = (text.match(new RegExp('\\b' + target + '\\b', 'gi')) || []).length;
    } else if (taskNum === 2) {
        var letters = ['e', 'a', 'i', 'o'];
        target = letters[Math.floor(Math.random() * letters.length)];
        instruction = 'Count how many times the letter "' + target + '" appears (case-insensitive):';
        answer = (text.match(new RegExp(target, 'gi')) || []).length;
    } else {
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
    
    // Check for dependency to add golden glow
    var dependency = taskDependencies.getActiveDependency('g1t' + taskNum);
    var hasEnhancement = dependency && dependency.type === 'highlight';
    
    var html = '<div style="border: 2px solid #9C27B0; border-radius: 8px; padding: 30px; background: white;' + (hasEnhancement ? ' animation: goldenGlow 2s ease-in-out infinite;' : '') + '">';
    html += '<h3 style="text-align: center; color: #333;">Counting Game - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p id="instruction" style="font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0;">' + instruction + '<br><span style="font-size: 14px; color: #666; font-weight: normal;">(Case-insensitive)</span></p>';
    
    html += '<div style="background-color: #fafafa; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left; line-height: 1.8; font-family: monospace; font-size: 14px;">';
    
    // Process text for highlighting if enhanced
    if (hasEnhancement) {
        var displayText = text;
        
        if (taskNum === 1) {
            // Highlight words
            var regex = new RegExp('\\b' + target + '\\b', 'gi');
            displayText = text.replace(regex, function(match) {
                return '<span style="background-color: rgba(255, 215, 0, 0.4); padding: 2px 4px; border-radius: 3px;">' + match + '</span>';
            });
        } else if (taskNum === 2) {
            // Highlight single letter
            var regex = new RegExp(target, 'gi');
            displayText = text.replace(regex, function(match) {
                return '<span style="background-color: rgba(255, 215, 0, 0.4); padding: 1px 3px; border-radius: 2px;">' + match + '</span>';
            });
        } else {
            // Highlight two letters
            var targets = target.split('" and "');
            displayText = text;
            targets.forEach(function(letter) {
                var regex = new RegExp(letter, 'gi');
                displayText = displayText.replace(regex, function(match) {
                    return '<span style="background-color: rgba(255, 215, 0, 0.4); padding: 1px 3px; border-radius: 2px;">' + match + '</span>';
                });
            });
        }
        html += displayText;
    } else {
        html += text;
    }
    
    html += '</div>';
    
    html += '<div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin: 20px 0;">';
    html += '<label style="font-weight: bold;">Your answer:</label>';
    html += '<input type="number" id="countAnswer" min="0" max="999" placeholder="Enter count" ';
    html += 'style="width: 150px; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 18px; text-align: center;">';
    html += '</div>';
    
    html += '<button id="countSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    document.getElementById('countSubmit').onclick = function() {
        var userAnswer = parseInt(document.getElementById('countAnswer').value || 0);
        var correct = userAnswer === answer;
        
        var tabId = 'g1t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_answer', userAnswer);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correct', correct);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correctAnswer', answer);
        
        markTaskComplete(tabId);
    };
}

// GAME 2: SLIDER (now second)
function loadSliderGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    var target = difficulty === 'easy' ? Math.floor(Math.random() * 11) :
                 difficulty === 'medium' ? parseFloat((Math.random() * 10).toFixed(1)) :
                 parseFloat((Math.random() * 10).toFixed(2));
    
    var step = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 0.1 : 0.01;
    var showValue = difficulty !== 'hard';
    
    var content = document.getElementById('contentArea');
    
    // Check for dependency to add golden glow
    var dependency = taskDependencies.getActiveDependency('g2t' + taskNum);
    var hasEnhancement = dependency && dependency.type === 'enhanced_slider';
    
    var html = '<div style="border: 2px solid #4CAF50; border-radius: 8px; padding: 30px; background: white;' + (hasEnhancement ? ' animation: goldenGlow 2s ease-in-out infinite;' : '') + '">';
    html += '<h3 style="text-align: center; color: #333;">Slider Game - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 20px; text-align: center; margin: 20px 0;">';
    html += 'Move the slider to: <strong style="color: #4CAF50; font-size: 24px;">' + target + '</strong>';
    html += '</p>';
    
    if (hasEnhancement) {
        // Enhanced slider with comprehensive scale
        html += '<div style="margin: 30px 0;">';
        html += '<div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 16px; font-weight: bold; color: #666;">';
        html += '<span>0</span><span>10</span></div>';
        
        html += '<div style="position: relative; padding: 20px 0 30px 0;">';
        
        // Scale marks
        html += '<div style="position: absolute; width: 100%; height: 20px; top: 0;">';
        for (var i = 0; i <= 10; i++) {
            var left = (i * 10) + '%';
            html += '<div style="position: absolute; left: ' + left + '; transform: translateX(-50%);">';
            html += '<div style="width: 2px; height: 12px; background: #666;"></div>';
            html += '<div style="font-size: 12px; color: #666; margin-top: 2px; text-align: center;">' + i + '</div>';
            html += '</div>';
        }
        html += '</div>';
        
        html += '<input type="range" id="gameSlider" min="0" max="10" step="' + step + '" value="5" ';
        html += 'style="width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: #ddd; outline: none; cursor: pointer; margin-top: 20px; position: relative; z-index: 10;">';
        html += '</div>';
        
        html += '<div id="sliderValue" style="text-align: center; font-size: 36px; font-weight: bold; color: #4CAF50; margin-top: 10px;">';
        html += showValue ? '5' : '?';
        html += '</div></div>';
    } else {
        // Standard slider
        html += '<div style="margin: 30px 0;">';
        html += '<div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; font-weight: bold; color: #666;">';
        html += '<span>0</span><span>10</span></div>';
        html += '<input type="range" id="gameSlider" min="0" max="10" step="' + step + '" value="5" ';
        html += 'style="width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: #ddd; outline: none; cursor: pointer;">';
        html += '<div id="sliderValue" style="text-align: center; font-size: 36px; font-weight: bold; color: #4CAF50; margin-top: 20px;">';
        html += showValue ? '5' : '?';
        html += '</div></div>';
    }
    
    html += '<button id="sliderSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    // Add slider styling
    var style = document.createElement('style');
    style.textContent = `
        #gameSlider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 25px;
            height: 25px;
            background: #4CAF50;
            cursor: pointer;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        #gameSlider::-moz-range-thumb {
            width: 25px;
            height: 25px;
            background: #4CAF50;
            cursor: pointer;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: none;
        }
    `;
    document.head.appendChild(style);
    
    var slider = document.getElementById('gameSlider');
    slider.oninput = function() {
        if (showValue) {
            document.getElementById('sliderValue').textContent = this.value;
        }
    };
    
    document.getElementById('sliderSubmit').onclick = function() {
        var value = parseFloat(slider.value);
        var accuracy = Math.max(0, 100 - (Math.abs(value - target) / 10 * 100));
        
        var tabId = 'g2t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_target', target);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_value', value);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_accuracy', accuracy.toFixed(2));
        
        markTaskComplete(tabId);
    };
}

// GAME 3: TYPING (remains third)
function loadTypingGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    // Check for dependency that makes typing easier
    var dependency = taskDependencies.getActiveDependency('g3t' + taskNum);
    var hasEnhancement = dependency && dependency.type === 'simple_pattern';
    var pattern;
    
    if (hasEnhancement) {
        // Always use simple patterns when enhanced
        var simplePatterns = ['hello world', 'easy typing', 'simple text', 'quick test', 'basic words'];
        pattern = simplePatterns[Math.floor(Math.random() * simplePatterns.length)];
    } else {
        pattern = patternSets[difficulty][Math.floor(Math.random() * patternSets[difficulty].length)];
    }
    
    var content = document.getElementById('contentArea');
    
    var html = '<div style="border: 2px solid #FFC107; border-radius: 8px; padding: 30px; background: white;' + (hasEnhancement ? ' animation: goldenGlow 2s ease-in-out infinite;' : '') + '">';
    html += '<h3 style="text-align: center; color: #333;">Pattern Typing - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0;">Type the following pattern exactly:</p>';
    
    // Direct text display instead of canvas
    html += '<div style="background-color: #f5f5f5; border: 2px solid #FFC107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">';
    html += '<span style="font-size: 32px; font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #333; font-weight: bold;">' + pattern + '</span>';
    html += '</div>';
    
    html += '<input type="text" id="typeInput" placeholder="Type the pattern here..." ';
    html += 'style="width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 20px; font-family: \'Courier New\', monospace; text-align: center; letter-spacing: 2px; box-sizing: border-box;">';
    
    html += '<div style="margin-top: 20px;">';
    html += '<button id="typeSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    var input = document.getElementById('typeInput');
    
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
        
        markTaskComplete(tabId);
    };
}

// CHAT SYSTEM
function setupChat() {
    var chatbox = document.getElementById('chatbox');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    
    if (!chatbox || !userInput || !sendBtn) {
        console.error("Chat elements not found");
        return;
    }
    
    function submitChat() {
        var userText = userInput.value.trim();
        if (!userText) return;
        
        var numPrompts = gameState.numPrompts || 0;
        var totalAvailable = gameState.basePrompts + gameState.bonusPrompts;
        
        if (numPrompts >= totalAvailable) {
            appendToChat("System", "⚠️ You've used all your prompts. Complete more tasks to earn additional prompts!");
            userInput.disabled = true;
            sendBtn.disabled = true;
            updatePromptCounter();
            return;
        }
        
        numPrompts += 1;
        gameState.numPrompts = numPrompts;
        Qualtrics.SurveyEngine.setEmbeddedData("numPrompts", numPrompts);
        updatePromptCounter();
        
        var currentTime = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
        var inquiryData = {
            timestamp: currentTime,
            currentTask: gameState.currentTab || 'none',
            promptNumber: numPrompts,
            userQuery: userText
        };
        
        if (!gameState.inquiries) {
            gameState.inquiries = [];
        }
        gameState.inquiries.push(inquiryData);
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_timestamp", currentTime);
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_task", gameState.currentTab || 'none');
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_query", userText);
        
        gameState.chatHistory.push({ role: "user", content: userText });
        appendToChat("You", userText);
        userInput.value = "";
        
        // Show typing indicator
        var typingIndicator = document.createElement("p");
        typingIndicator.id = "typingIndicator";
        typingIndicator.style.cssText = "margin: 8px 0; padding: 10px 14px; border-radius: 12px; max-width: 80%; word-wrap: break-word; background-color: #ffffff; border: 1px solid #e0e0e0; margin-right: auto;";
        typingIndicator.innerHTML = "<b>AI: </b><span style='color: #999;'>Typing...</span>";
        chatbox.appendChild(typingIndicator);
        chatbox.scrollTop = chatbox.scrollHeight;
        
        // Add 1 second delay before showing response
        setTimeout(function() {
            // Remove typing indicator
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            
            var selectedResponse = responseSelector.findBestResponse(userText, gameState.currentTab);
            
            gameState.chatHistory.push({ role: "assistant", content: selectedResponse.response });
            appendToChat("AI", selectedResponse.response);
            
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagLevel", selectedResponse.level);
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagType", selectedResponse.type);
            Qualtrics.SurveyEngine.setEmbeddedData("botResponse", selectedResponse.response);
            Qualtrics.SurveyEngine.setEmbeddedData("botResponseId", selectedResponse.id);
            Qualtrics.SurveyEngine.setEmbeddedData("chatHistoryJSON", JSON.stringify(gameState.chatHistory));
        }, 1000);
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
    
    function updatePromptCounter() {
        if (!chatbox) return;
        
        var totalAvailable = gameState.basePrompts + gameState.bonusPrompts;
        var numUsed = gameState.numPrompts || 0;
        var remaining = Math.max(0, totalAvailable - numUsed);
        
        var old = document.getElementById("promptCounterInChat");
        if (old) old.remove();
        
        var div = document.createElement("div");
        div.id = "promptCounterInChat";
        div.style.cssText = "background-color:#fff3e0;border:1px solid #ffcc80;padding:8px;margin:5px 0;text-align:center;font-weight:600;color:#f57c00;border-radius:8px;font-size:13px;";
        div.innerHTML = "Prompts Available: " + remaining + " (Base: 3 + Bonus: " + gameState.bonusPrompts + ")";
        
        chatbox.insertBefore(div, chatbox.firstChild);
        
        Qualtrics.SurveyEngine.setEmbeddedData("remainingPrompts", remaining);
    }
    
    sendBtn.addEventListener('click', submitChat);
    
    userInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            submitChat();
        }
    });
    
    try {
        updatePromptCounter();
    } catch (e) {
        console.error("Error in initial display:", e);
    }
    
    setInterval(function() {
        try {
            updatePromptCounter();
        } catch (e) {
            console.error("Error in interval update:", e);
        }
    }, 300);
}

function showCompletion() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    var finalElapsed = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
    gameState.finalTime = finalElapsed;
    
    var sliderAccuracies = [];
    var countingCorrect = 0;
    var typingAccuracies = [];
    
    for (var i = 1; i <= 3; i++) {
        var acc = Qualtrics.SurveyEngine.getEmbeddedData('g2t' + i + '_accuracy');
        if (acc) sliderAccuracies.push(parseFloat(acc));
    }
    
    for (var j = 1; j <= 3; j++) {
        var correct = Qualtrics.SurveyEngine.getEmbeddedData('g1t' + j + '_correct');
        if (correct === 'true' || correct === true || correct === '1') countingCorrect++;
    }
    
    for (var k = 1; k <= 3; k++) {
        var typeAcc = Qualtrics.SurveyEngine.getEmbeddedData('g3t' + k + '_accuracy');
        if (typeAcc) typingAccuracies.push(parseFloat(typeAcc));
    }
    
    var sliderAvg = sliderAccuracies.length > 0 ? 
        (sliderAccuracies.reduce(function(a, b) { return a + b; }, 0) / sliderAccuracies.length).toFixed(1) : '0.0';
    
    var countingPercentage = (countingCorrect / 3 * 100).toFixed(1);
    
    var typingAvg = typingAccuracies.length > 0 ? 
        (typingAccuracies.reduce(function(a, b) { return a + b; }, 0) / typingAccuracies.length).toFixed(1) : '0.0';
    
    var overallAccuracy = ((parseFloat(sliderAvg) + parseFloat(countingPercentage) + parseFloat(typingAvg)) / 3).toFixed(1);
    
    document.getElementById('tabNav').style.display = 'none';
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('gameContent').style.display = 'none';
    document.getElementById('completionMsg').style.display = 'block';
    
    var totalTime = finalElapsed;
    document.getElementById('finalTime').textContent = Math.floor(totalTime / 60) + 'm ' + (totalTime % 60) + 's';
    document.getElementById('finalSwitches').textContent = gameState.switches;
    document.getElementById('finalAccuracy').textContent = overallAccuracy + '%';
    
    document.getElementById('countingAccuracy').textContent = countingPercentage + '%';
    document.getElementById('sliderAccuracy').textContent = sliderAvg + '%';
    document.getElementById('typingAccuracy').textContent = typingAvg + '%';
    
    Qualtrics.SurveyEngine.setEmbeddedData('finalOverallAccuracy', overallAccuracy);
    Qualtrics.SurveyEngine.setEmbeddedData('finalCountingAccuracy', countingPercentage);
    Qualtrics.SurveyEngine.setEmbeddedData('finalSliderAccuracy', sliderAvg);
    Qualtrics.SurveyEngine.setEmbeddedData('finalCountingScore', countingCorrect);
    Qualtrics.SurveyEngine.setEmbeddedData('finalTypingAccuracy', typingAvg);
    Qualtrics.SurveyEngine.setEmbeddedData('totalTime', totalTime);
    Qualtrics.SurveyEngine.setEmbeddedData('practiceCompleted', gameState.practiceCompleted);
    
    document.getElementById('continueBtn').addEventListener('click', function() {
        storeGameData();
        
        var qContext = window.qualtricsContext;
        
        if (qContext) {
            qContext.showNextButton();
            
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
            var nextButton = document.getElementById('NextButton');
            if (nextButton) {
                nextButton.click();
            }
        }
    });
}

function storeGameData() {
    Qualtrics.SurveyEngine.setEmbeddedData('gameState', JSON.stringify(gameState));
    Qualtrics.SurveyEngine.setEmbeddedData('completedTasks', Object.keys(gameState.completed).length);
    Qualtrics.SurveyEngine.setEmbeddedData('totalSwitches', gameState.switches);
    Qualtrics.SurveyEngine.setEmbeddedData('totalTime', Math.floor((Date.now() - gameState.startTime) / 1000));
    Qualtrics.SurveyEngine.setEmbeddedData('bonusPromptsEarned', gameState.bonusPrompts);
    
    Object.keys(gameState.completed).forEach(function(tabId) {
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_complete', 'true');
        if (gameState.taskTotalTimes[tabId]) {
            Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_time', Math.floor(gameState.taskTotalTimes[tabId] / 1000));
        }
    });
}