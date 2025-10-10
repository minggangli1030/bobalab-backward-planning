Qualtrics.SurveyEngine.addOnload(function() {
    console.log('Integrated game system loaded');
    
    // Add CSS animations including golden glow
    var style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
        
        @keyframes highlight {
            0% { background-color: rgba(255, 215, 0, 0.3); }
            50% { background-color: rgba(255, 215, 0, 0.6); }
            100% { background-color: rgba(255, 215, 0, 0.3); }
        }
        
        @keyframes goldenGlow {
            0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
            50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.6); }
            100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
        }
        
        .highlighted-text {
            animation: highlight 1.5s ease-in-out infinite;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        .enhanced-task {
            animation: goldenGlow 2s ease-in-out infinite;
            border: 2px solid rgba(255, 215, 0, 0.6) !important;
        }
    `;
    document.head.appendChild(style);
});

Qualtrics.SurveyEngine.addOnReady(function() {
    var that = this;
    that.hideNextButton();
    
    window.qualtricsContext = that;
    
    document.getElementById('startGameBtn').addEventListener('click', function() {
        // Show practice mode choice
        showPracticeChoice();
    });
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    storeGameData();
});

// Show practice mode choice
function showPracticeChoice() {
    var landingPage = document.getElementById('landingPage');
    landingPage.innerHTML = `
        <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Would you like to practice first?</h2>
            <p style="color: #666; margin-bottom: 20px;">Practice mode lets you try each game type without time pressure.</p>
            <p style="color: #888; font-size: 14px; margin-bottom: 30px; font-style: italic;">
                Tip: Try completing different tasks and revisiting them to see what changes. Tasks are dependent - plan your strategy accordingly!
            </p>
            
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="practiceYesBtn" style="padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Yes, Practice First
                </button>
                <button id="practiceNoBtn" style="padding: 15px 30px; background: #2196F3; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    No, Start Main Game
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('practiceYesBtn').addEventListener('click', function() {
        startPracticeMode();
    });
    
    document.getElementById('practiceNoBtn').addEventListener('click', function() {
        startMainGame();
    });
}

// Start practice mode
function startPracticeMode() {
    gameState.isPractice = true;
    
    var landingPage = document.getElementById('landingPage');
    landingPage.innerHTML = `
        <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 30px;">
            <h2 style="text-align: center; color: #333; margin-bottom: 20px;">Practice Mode</h2>
            <p style="text-align: center; color: #666; margin-bottom: 30px; font-style: italic;">
                Try completing tasks in different orders and see what happens!
            </p>
            
            <div style="display: grid; gap: 20px; max-width: 600px; margin: 0 auto;">
                <div id="counting-practice-card" style="border: 2px solid #9C27B0; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #9C27B0; margin-bottom: 10px;">Counting Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Count words or letters in a text passage.</p>
                    <button class="practice-btn" data-game="counting" style="background: #9C27B0; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Counting
                    </button>
                </div>
                
                <div id="slider-practice-card" style="border: 2px solid #4CAF50; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #4CAF50; margin-bottom: 10px;">Slider Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Move a slider to match target values.</p>
                    <button class="practice-btn" data-game="slider" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Slider
                    </button>
                </div>
                
                <div id="typing-practice-card" style="border: 2px solid #FFC107; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #FF9800; margin-bottom: 10px;">Typing Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Type patterns exactly as shown.</p>
                    <button class="practice-btn" data-game="typing" style="background: #FFC107; color: #333; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Typing
                    </button>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button id="endPracticeBtn" style="padding: 12px 30px; background: #2196F3; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Done Practicing - Start Main Game
                </button>
            </div>
        </div>
    `;
    
    // Add practice button listeners
    document.querySelectorAll('.practice-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            loadPracticeGame(this.getAttribute('data-game'));
        });
    });
    
    document.getElementById('endPracticeBtn').addEventListener('click', function() {
        gameState.practiceCompleted = true;
        startMainGame();
    });
}

// Load practice game - SIMPLIFIED VERSION
function loadPracticeGame(gameType) {
    var content = document.getElementById('landingPage');
    
    // Set practice mode state
    gameState.isPractice = true;
    gameState.currentTab = 'practice_' + gameType;
    
    if (gameType === 'counting') {
    // Practice counting
    var practiceText = 'The quick brown fox jumps over the lazy dog. The dog was sleeping under the tree. The fox was very clever and the tree provided shade.';
    
    content.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto;">
            <h3 style="text-align: center; color: #9C27B0;">Practice: Counting Game</h3>
            <p style="text-align: center; color: #666; margin: 20px 0; font-size: 16px;">Count how many times the word "the" appears:<br><span style="font-size: 13px; color: #888;">(Case-insensitive)</span></p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; line-height: 1.8; font-family: Arial, sans-serif;">
                The quick brown fox jumps over the lazy dog. The dog was sleeping under the tree. The fox was very clever and the tree provided shade.
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <input type="number" id="practiceAnswer" style="padding: 10px; font-size: 18px; width: 100px; border: 2px solid #ddd; border-radius: 4px;">
                <button onclick="window.checkPracticeAnswer()" style="margin-left: 10px; padding: 10px 20px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Check Answer
                </button>
            </div>
            
            <div id="practiceFeedback" style="text-align: center; margin: 20px 0; font-weight: bold;"></div>
            
            <div style="text-align: center;">
                <button onclick="window.startPracticeMode()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Back to Practice Menu
                </button>
            </div>
        </div>
    `;
} else if (gameType === 'slider') {
        // Practice slider
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto;">
                <h3 style="text-align: center; color: #4CAF50;">Practice: Slider Game</h3>
                <p style="text-align: center; color: #666; margin: 20px 0;">Move the slider to: <strong style="font-size: 24px; color: #4CAF50;">7.5</strong></p>
                
                <div style="margin: 30px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; font-weight: bold; color: #666;">
                        <span>0</span><span>10</span>
                    </div>
                    <input type="range" id="practiceSlider" min="0" max="10" step="0.1" value="5" style="width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: #ddd; outline: none; cursor: pointer;">
                    <div style="text-align: center; font-size: 36px; color: #4CAF50; margin: 30px 0 20px 0;">
                        <span id="sliderValue">5.0</span>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <button onclick="window.checkPracticeSlider()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Submit
                    </button>
                </div>
                
                <div id="practiceFeedback" style="text-align: center; margin: 20px 0; font-weight: bold;"></div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.startPracticeMode()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Back to Practice Menu
                    </button>
                </div>
            </div>
        `;
        
        // Add slider listener
        setTimeout(function() {
            var slider = document.getElementById('practiceSlider');
            if (slider) {
                slider.oninput = function() {
                    document.getElementById('sliderValue').textContent = parseFloat(this.value).toFixed(1);
                };
            }
        }, 100);
    } else if (gameType === 'typing') {
        // Practice typing - FIXED PATTERN
        var pattern = 'easy typing';
        
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto;">
                <h3 style="text-align: center; color: #FFC107;">Practice: Typing Game</h3>
                <p style="text-align: center; color: #666; margin: 20px 0;">Type this pattern exactly:</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #FFC107;">
                    <span style="font-size: 32px; font-family: 'Courier New', monospace; letter-spacing: 2px; color: #333; font-weight: bold;">easy typing</span>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <input type="text" id="practiceTyping" style="padding: 10px; font-size: 18px; width: 300px; font-family: monospace; border: 2px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="text-align: center;">
                    <button onclick="window.checkPracticeTyping('easy typing');" style="padding: 10px 20px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer;">
                        Submit
                    </button>
                </div>
                
                <div id="practiceFeedback" style="text-align: center; margin: 20px 0; font-weight: bold;"></div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.startPracticeMode()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Back to Practice Menu
                    </button>
                </div>
            </div>
        `;
    }
}

// Simplified practice check functions
function checkPracticeAnswer() {
    var answer = document.getElementById('practiceAnswer').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (answer === '6') {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Correct! You found all 6 occurrences of "the".';
        gameState.practiceTasksCompleted['counting1'] = true;
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Not quite. Count again - there are 6 occurrences of "the" (case-insensitive).';
    }
}

function checkPracticeSlider() {
    var value = document.getElementById('practiceSlider').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (value === '7.5') {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Perfect! You got exactly 7.5.';
        gameState.practiceTasksCompleted['slider1'] = true;
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Close! You selected ' + value + ' but the target was 7.5.';
    }
}

function checkPracticeTyping(expectedPattern) {
    var typed = document.getElementById('practiceTyping').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (typed === expectedPattern) {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Excellent! Perfect match.';
        gameState.practiceTasksCompleted['typing1'] = true;
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Not quite right. Type "easy typing" exactly.';
    }
}

// Remove updatePracticeButtons function - no longer needed

// Update practice buttons with golden glow
function updatePracticeButtons() {
    // Check which tasks should glow
    if (gameState.practiceTasksCompleted['slider1'] || gameState.practiceTasksCompleted['slider2'] || gameState.practiceTasksCompleted['slider3']) {
        var countingCard = document.getElementById('counting-practice-card');
        if (countingCard && !countingCard.classList.contains('enhanced-task')) {
            countingCard.classList.add('enhanced-task');
        }
    }
    
    if (gameState.practiceTasksCompleted['typing1'] || gameState.practiceTasksCompleted['typing2'] || gameState.practiceTasksCompleted['typing3']) {
        var sliderCard = document.getElementById('slider-practice-card');
        if (sliderCard && !sliderCard.classList.contains('enhanced-task')) {
            sliderCard.classList.add('enhanced-task');
        }
    }
    
    if (gameState.practiceTasksCompleted['counting1'] || gameState.practiceTasksCompleted['counting2'] || gameState.practiceTasksCompleted['counting3']) {
        var typingCard = document.getElementById('typing-practice-card');
        if (typingCard && !typingCard.classList.contains('enhanced-task')) {
            typingCard.classList.add('enhanced-task');
        }
    }
}

// Make practice check functions globally accessible
window.checkPracticeAnswer = checkPracticeAnswer;
window.checkPracticeSlider = checkPracticeSlider;
window.checkPracticeTyping = checkPracticeTyping;
window.startPracticeMode = startPracticeMode;