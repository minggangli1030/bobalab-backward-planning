let refreshInterval;

Qualtrics.SurveyEngine.addOnload(function () {});

Qualtrics.SurveyEngine.addOnReady(function()
{
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
	
	// Functions
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
		div.style.cssText = "background-color:#f0f0f0;border:1px solid #ccc;padding:8px;margin:5px 0;text-align:center;font-weight:bold;color:#333;";
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
			tokenDiv.style.cssText = "background-color: #ffe6e6; border: 1px solid #ff9999; padding: 6px; margin: 3px 0; text-align: center; font-size: 12px; color: #cc0000;";
			tokenDiv.innerHTML = "Token Cap: " + totalEstimate + "/" + MAX_TOTAL_TOKENS;
		} else {
			tokenDiv.style.cssText = "background-color: #e8f4f8; border: 1px solid #b0d4e3; padding: 6px; margin: 3px 0; text-align: center; font-size: 12px; color: #2c5aa0;";
			tokenDiv.innerHTML = "Token Cap: " + totalEstimate + "/" + MAX_TOTAL_TOKENS;
		}
		
		// Always insert token counter at the very top
		chatbox.insertBefore(tokenDiv, chatbox.firstChild);
		
		Qualtrics.SurveyEngine.setEmbeddedData("inputTokenEstimate", tokenEstimate);
	}
	
	// Attach event listeners
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


Qualtrics.SurveyEngine.addOnUnload(function()
{
	if (refreshInterval) {
		clearInterval(refreshInterval);
	}
});