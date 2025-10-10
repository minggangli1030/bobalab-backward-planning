let refreshInterval;
let gameState;

Qualtrics.SurveyEngine.addOnload(function () {
    // Initialize game state with random targets
    gameState = {
        currentTaskIndex: 0,
        tasks: [
            { 
                target: Math.floor(Math.random() * 11), // Random whole number 0-10
                difficulty: 'easy', 
                showValue: true, 
                step: 1, 
                max: 10 
            },
            { 
                target: (Math.random() * 10).toFixed(1), // Random number with 1 decimal 0.0-10.0
                difficulty: 'medium', 
                showValue: true, 
                step: 0.1, 
                max: 10 
            },
            { 
                target: (Math.random() * 10).toFixed(2), // Random number with 2 decimals 0.00-10.00
                difficulty: 'hard', 
                showValue: false, 
                step: 0.01, 
                max: 10 
            }
        ],
        results: [],
        startTime: null,
        taskStartTime: null
    };
});

Qualtrics.SurveyEngine.addOnReady(function() {
    // Constants - Move to top and add defensive checks
    const chatbox = document.getElementById('chatbox');
    const input = document.getElementById('userInput');
    const sendButton = document.getElementById('sendBtn');
    
    // Check if essential elements exist
    if (!chatbox || !input || !sendButton) {
        console.error("Essential elements not found:", {chatbox, input, sendButton});
        return; // Exit if elements don't exist
    }
    
    const MAX_TOTAL_TOKENS = 300; 
    const chatHistory = [];
    
    // Initialize game
    initGame();
    
    // Game Functions
    function initGame() {
        gameState.startTime = Date.now();
        loadTask(0);
    }
    
    // Generate random target based on difficulty
    function generateRandomTarget(difficulty) {
        switch(difficulty) {
            case 'easy':
                return Math.floor(Math.random() * 11); // 0-10 whole numbers
            case 'medium':
                return parseFloat((Math.random() * 10).toFixed(1)); // 0.0-10.0
            case 'hard':
                return parseFloat((Math.random() * 10).toFixed(2)); // 0.00-10.00
            default:
                return 5;
        }
    }
    
    // Reset game state
    function resetGame() {
        gameState = {
            currentTaskIndex: 0,
            tasks: [
                { 
                    target: generateRandomTarget('easy'),
                    difficulty: 'easy', 
                    showValue: true, 
                    step: 1, 
                    max: 10 
                },
                { 
                    target: generateRandomTarget('medium'),
                    difficulty: 'medium', 
                    showValue: true, 
                    step: 0.1, 
                    max: 10 
                },
                { 
                    target: generateRandomTarget('hard'),
                    difficulty: 'hard', 
                    showValue: false, 
                    step: 0.01, 
                    max: 10 
                }
            ],
            results: [],
            startTime: null,
            taskStartTime: null
        };
        
        // Hide results, show task area
        document.getElementById('resultsContainer').style.display = 'none';
        document.getElementById('taskArea').style.display = 'block';
        
        // Initialize the game
        initGame();
    }
    
    // Load a specific task
    function loadTask(taskIndex) {
        if (taskIndex >= gameState.tasks.length) {
            showResults();
            return;
        }

        gameState.currentTaskIndex = taskIndex;
        gameState.taskStartTime = Date.now();
        
        const task = gameState.tasks[taskIndex];
        const slider = document.getElementById('gameSlider');
        const targetSpan = document.getElementById('targetValue');
        const difficultyBadge = document.getElementById('difficultyBadge');
        const valueDisplay = document.getElementById('valueDisplay');
        const currentTaskSpan = document.getElementById('currentTask');
        
        // Update UI
        currentTaskSpan.textContent = taskIndex + 1;
        targetSpan.textContent = task.target;
        slider.min = 0;
        slider.max = task.max;
        slider.step = task.step;
        slider.value = task.max / 2; // Start in middle
        
        // Update difficulty badge
        difficultyBadge.className = 'difficulty-badge difficulty-' + task.difficulty;
        difficultyBadge.textContent = task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1);
        difficultyBadge.style.display = 'inline-block'; // Make sure it's visible during tasks
        
        // Show/hide value based on difficulty
        if (task.showValue) {
            valueDisplay.textContent = slider.value;
            valueDisplay.style.visibility = 'visible';
        } else {
            valueDisplay.textContent = '?';
            valueDisplay.style.visibility = 'visible';
        }
        
        // Store in Qualtrics
        Qualtrics.SurveyEngine.setEmbeddedData('sliderGameTask', taskIndex + 1);
        Qualtrics.SurveyEngine.setEmbeddedData('sliderGameTarget', task.target);
    }
    
    // Show results - Fixed to render properly in Qualtrics
    function showResults() {
        const taskArea = document.getElementById('taskArea');
        const resultsContainer = document.getElementById('resultsContainer');
        const totalTime = ((Date.now() - gameState.startTime) / 1000).toFixed(2);
        
        // Calculate average accuracy
        const avgAccuracy = gameState.results.reduce((sum, r) => sum + parseFloat(r.accuracy), 0) / gameState.results.length;
        
        // Hide task area, show results
        taskArea.style.display = 'none';
        resultsContainer.style.display = 'block';
        
        // Hide the difficulty badge when showing results
        document.getElementById('difficultyBadge').style.display = 'none';
        
        // Display results - Using textContent to ensure proper rendering
        document.getElementById('totalTime').textContent = totalTime + ' seconds';
        document.getElementById('avgAccuracy').textContent = avgAccuracy.toFixed(2) + '%';
        
        // Task breakdown - Creating elements dynamically like the chat counters
        const breakdown = document.getElementById('taskBreakdown');
        breakdown.innerHTML = ''; // Clear existing content
        
        gameState.results.forEach(function(r) {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'task-breakdown-item';
            
            const header = document.createElement('div');
            header.className = 'task-breakdown-header';
            header.textContent = 'Task ' + r.taskNumber + ' (' + r.difficulty + '):';
            
            const details = document.createElement('div');
            details.className = 'task-breakdown-details';
            details.textContent = 'Target: ' + r.target + ', Your answer: ' + r.submitted;
            
            const stats = document.createElement('div');
            stats.className = 'task-breakdown-details';
            stats.textContent = 'Accuracy: ' + r.accuracy + '%, Time: ' + r.time + 's';
            
            taskDiv.appendChild(header);
            taskDiv.appendChild(details);
            taskDiv.appendChild(stats);
            breakdown.appendChild(taskDiv);
        });
        
        // Store final results in Qualtrics
        Qualtrics.SurveyEngine.setEmbeddedData('sliderGameComplete', true);
        Qualtrics.SurveyEngine.setEmbeddedData('sliderGameTotalTime', totalTime);
        Qualtrics.SurveyEngine.setEmbeddedData('sliderGameAvgAccuracy', avgAccuracy.toFixed(2));
        Qualtrics.SurveyEngine.setEmbeddedData('sliderGameResults', JSON.stringify(gameState.results));
    }
    
    // Handle slider change
    document.getElementById('gameSlider').addEventListener('input', function(e) {
        const task = gameState.tasks[gameState.currentTaskIndex];
        const valueDisplay = document.getElementById('valueDisplay');
        
        if (task.showValue) {
            valueDisplay.textContent = e.target.value;
        }
    });
    
    // Handle submit
    document.getElementById('submitBtn').addEventListener('click', function() {
        const task = gameState.tasks[gameState.currentTaskIndex];
        const slider = document.getElementById('gameSlider');
        const currentValue = parseFloat(slider.value);
        const taskTime = (Date.now() - gameState.taskStartTime) / 1000; // in seconds
        
        // Calculate accuracy
        const difference = Math.abs(currentValue - task.target);
        const accuracy = Math.max(0, 100 - (difference / task.max * 100));
        
        // Store result
        gameState.results.push({
            taskNumber: gameState.currentTaskIndex + 1,
            target: task.target,
            submitted: currentValue,
            accuracy: accuracy.toFixed(2),
            time: taskTime.toFixed(2),
            difficulty: task.difficulty
        });
        
        // Store in Qualtrics
        Qualtrics.SurveyEngine.setEmbeddedData('sliderTask' + (gameState.currentTaskIndex + 1) + 'Value', currentValue);
        Qualtrics.SurveyEngine.setEmbeddedData('sliderTask' + (gameState.currentTaskIndex + 1) + 'Accuracy', accuracy.toFixed(2));
        Qualtrics.SurveyEngine.setEmbeddedData('sliderTask' + (gameState.currentTaskIndex + 1) + 'Time', taskTime.toFixed(2));
        
        // Load next task
        loadTask(gameState.currentTaskIndex + 1);
    });
    
    // Handle restart button
    document.getElementById('restartBtn').addEventListener('click', function() {
        resetGame();
    });
    
    // Chat Functions (from original code)
    function submitInput() {
        const userText = input.value.trim();
        if (!userText) return;
        // 💾 Step 1: Read from embedded data
        let numPrompts = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("numPrompts")) || 0;
        // 🚫 Step 2: Enforce limit
        if (numPrompts >= 3) {
            appendToChat("System", "⚠️ You've reached your 3-prompt limit for this round.");
            input.disabled = true;
            sendButton.disabled = true;
            updatePromptCounter();
            return;
        }
        const userTokenEstimate = estimateTokens(userText);
        const historyTokenEstimate = chatHistory.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
        const estimatedTotal = userTokenEstimate + historyTokenEstimate;
        if (estimatedTotal > MAX_TOTAL_TOKENS) {
            appendToChat("System", "⚠️ Exceeds token limit. Please shorten your message.");
            return;
        }
        // ✅ Step 3: Track + increment
        numPrompts += 1;
        Qualtrics.SurveyEngine.setEmbeddedData("numPrompts", numPrompts);
        updatePromptCounter(); // update live
        // 🤖 Step 4: Proceed with GPT call
        chatHistory.push({ role: "user", content: userText });
        appendToChat("You", userText);
        input.value = "";
        updateTokenCounter(); // Reset token counter after sending
        Qualtrics.SurveyEngine.setEmbeddedData("userText", userText);
        fetch("https://bobalab-chatgpt-backend.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, history: chatHistory })
        })
        .then(r => r.json())
        .then(data => {
            const { flag1, flag2, answer } = splitBotReply(data.reply || "");
            chatHistory.push({ role: "assistant", content: answer });
            appendToChat("AI", answer);
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagLevel", flag1);
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagType", flag2);
            Qualtrics.SurveyEngine.setEmbeddedData("botResponse", answer);
            Qualtrics.SurveyEngine.setEmbeddedData("chatHistoryJSON", JSON.stringify(chatHistory));
        })
        .catch(err => appendToChat("AI", "⚠️ Error talking to the server."));
    }
    
    function appendToChat(sender, message) {
        if (!chatbox) return;
        const p = document.createElement("p");
        p.style.margin = "0"; // keep it tight
        const bold = document.createElement("b");
        bold.textContent = sender + ": ";
        p.appendChild(bold);
        const textNode = document.createTextNode(message);
        p.appendChild(textNode);
        chatbox.appendChild(p);
        chatbox.scrollTop = chatbox.scrollHeight;
    }
    
    function splitBotReply(raw) {
        const lines = raw.split("\n").filter(Boolean);   // remove empty lines
        return {
            flag1: lines.length > 0 ? lines[0] : "", // level of query
            flag2: lines.length > 1 ? lines[1] : "", // type of query
            answer: lines.length > 2 ? lines.slice(2).join("\n") : raw // actual response
        };
    }
    
    function estimateTokens(text) {
        // Rough estimate: 1 token ≈ 4 characters in English
        return Math.ceil(text.length / 4);
    }
    
    function updatePromptCounter() {
        if (!chatbox) return;
        
        const maxPrompts = 3;
        const numUsed = parseInt(Qualtrics.SurveyEngine.getEmbeddedData("numPrompts")) || 0;
        const remaining = Math.max(0, maxPrompts - numUsed);
        
        console.log("🧮 Updating prompt counter - numUsed:", numUsed, "remaining:", remaining);
        
        // remove old
        const old = document.getElementById("promptCounterInChat");
        if (old) old.remove();
        
        // create & insert
        const div = document.createElement("div");
        div.id = "promptCounterInChat";
        div.style.cssText = "background-color:#fff3e0;border:1px solid #ffcc80;padding:8px;margin:5px 0;text-align:center;font-weight:600;color:#f57c00;border-radius:8px;font-size:13px;";
        div.innerHTML = "Prompt Cap: " + remaining + " / " + maxPrompts;
        
        // Insert after token counter if it exists
        const tokenCounter = document.getElementById("tokenCounterInChat");
        if (tokenCounter) {
            // Insert right after token counter
            if (tokenCounter.nextSibling) {
                chatbox.insertBefore(div, tokenCounter.nextSibling);
            } else {
                chatbox.appendChild(div);
            }
        } else {
            // If no token counter, insert at top
            chatbox.insertBefore(div, chatbox.firstChild);
        }
        
        Qualtrics.SurveyEngine.setEmbeddedData("remainingPrompts", remaining);
    }
    
    function updateTokenCounter() {
        if (!chatbox || !input) return;
        
        const text = input.value.trim();
        const tokenEstimate = text ? estimateTokens(text) : 0;
        console.log("✏️ Updating token counter - estimate:", tokenEstimate);
        
        // Remove old token counter if exists
        const oldTokenCounter = document.getElementById("tokenCounterInChat");
        if (oldTokenCounter) oldTokenCounter.remove();
        
        // Always show token counter (even when empty)
        const tokenDiv = document.createElement("div");
        tokenDiv.id = "tokenCounterInChat";
        
        // Calculate total tokens
        const historyTokens = chatHistory.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
        const totalEstimate = tokenEstimate + historyTokens;
        
        // Style based on token usage
        if (totalEstimate > MAX_TOTAL_TOKENS * 0.8) {
            tokenDiv.style.cssText = "background-color: #ffebee; border: 1px solid #ef5350; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #c62828; border-radius: 8px; font-weight: 600;";
            tokenDiv.innerHTML = "Token Cap: " + totalEstimate + "/" + MAX_TOTAL_TOKENS;
        } else {
            tokenDiv.style.cssText = "background-color: #e3f2fd; border: 1px solid #64b5f6; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #1565c0; border-radius: 8px; font-weight: 600;";
            tokenDiv.innerHTML = "Token Cap: " + totalEstimate + "/" + MAX_TOTAL_TOKENS;
        }
        
        // Always insert token counter at the very top
        chatbox.insertBefore(tokenDiv, chatbox.firstChild);
        
        Qualtrics.SurveyEngine.setEmbeddedData("inputTokenEstimate", tokenEstimate);
    }
    
    // Attach event listeners for chat
    sendButton.addEventListener('click', submitInput); 
    input.addEventListener("input", updateTokenCounter);
    
    // Also handle Enter key
    input.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            submitInput();
        }
    });
    
    // Initial display
    try {
        updateTokenCounter();  // Token counter first (will be on top)
        updatePromptCounter(); // Prompt counter second (will be below token)
    } catch (e) {
        console.error("Error in initial display:", e);
    }
    
    // Update counters periodically - only update what's needed
    refreshInterval = setInterval(function () {
        try {
            // Only update token counter if input value changed
            const currentValue = input.value;
            if (!input.hasAttribute('data-last-value') || input.getAttribute('data-last-value') !== currentValue) {
                input.setAttribute('data-last-value', currentValue);
                updateTokenCounter();
            }
            
            // Always check prompt counter but it won't recreate if unchanged
            updatePromptCounter();
        } catch (e) {
            console.error("Error in interval update:", e);
        }
    }, 300);
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});