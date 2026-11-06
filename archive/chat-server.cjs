const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const loadJSON = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message || "";
    const history = req.body.history || [];

    const rules = loadJSON('./rules/classification.json');
    const workflows = loadJSON('./rules/workflows.json');
    const systemPrompt = fs.readFileSync('./prompts/system-cot-prompt.txt', 'utf8');

    try {
        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history,
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await openaiRes.json();
        const reply = data.choices?.[0]?.message?.content || "No response.";

        res.json({ reply });
    } catch (err) {
        console.error("OpenAI error:", err);
        res.status(500).json({ reply: "Server error." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));