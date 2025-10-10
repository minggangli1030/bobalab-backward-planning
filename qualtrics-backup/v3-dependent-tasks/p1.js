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
    basePrompts: 3,
    bonusPrompts: 0,
    countdownInterval: null,
    nextDestination: null,
    pausedTime: 0,
    isPaused: false,
    isInBreak: false,
    isPractice: false,
    practiceCompleted: false,
    practiceTasksCompleted: {} // Track practice completions
};

// Timer interval
var timerInterval;

// Pattern sets for Game 3 (Typing)
var patternSets = {
    easy: ['abc def ghi', 'xyz uvw rst', 'one two six', 'cat dog pig', 'red blue sky'],
    medium: ['AbC xYz 123', 'HeLLo WoRLd', 'TeSt PaTTeRn', 'Mix123 CaSe', 'UpDowN 456'],
    hard: ['a@1 B#2 c$3', 'X!y? Z&w% 9*8', 'Qw3$ Er4# Ty5@', 'Pa$$w0rd! Test', 'C0d3& $ymb0!s'],
    // Special easy patterns when counting game helps
    veryEasy: ['hello world', 'easy typing', 'simple text', 'no numbers', 'just words']
};

// Text sections for Game 1 (Counting - now first)
var textSections = [
    'The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state\'s first land-grant university and is the founding campus of the University of California system.',
    'Ten faculty members and forty male students made up the fledgling university when it opened in Oakland in 1869. Frederick Billings, a trustee of the College of California, suggested that a new campus site north of Oakland be named in honor of Anglo-Irish philosopher George Berkeley.',
    'Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business.'
];

// Enhanced task dependency configuration (simplified)
var taskDependencies = {
    dependencies: [
        // Slider helps ALL Counting tasks - highlight words and letters
        {
            from: 'g2t1', // Slider task 1
            to: 'g1',   // ALL Counting tasks
            type: 'highlight',
            probability: 0.3
        },
        {
            from: 'g2t2', // Slider task 2
            to: 'g1',   // ALL Counting tasks
            type: 'highlight',
            probability: 0.6
        },
        {
            from: 'g2t3', // Slider task 3
            to: 'g1',   // ALL Counting tasks
            type: 'highlight',
            probability: 0.9
        },
        // Typing helps ALL Slider tasks - comprehensive tick marks
        {
            from: 'g3t1', // Typing task 1
            to: 'g2',   // ALL Slider tasks
            type: 'enhanced_slider',
            probability: 0.3
        },
        {
            from: 'g3t2', // Typing task 2
            to: 'g2',   // ALL Slider tasks
            type: 'enhanced_slider',
            probability: 0.6
        },
        {
            from: 'g3t3', // Typing task 3
            to: 'g2',   // ALL Slider tasks
            type: 'enhanced_slider',
            probability: 0.9
        },
        // Counting helps ALL Typing tasks - simpler patterns
        {
            from: 'g1t1', // Counting task 1
            to: 'g3',   // ALL Typing tasks
            type: 'simple_pattern',
            probability: 0.3
        },
        {
            from: 'g1t2', // Counting task 2
            to: 'g3',   // ALL Typing tasks
            type: 'simple_pattern',
            probability: 0.6
        },
        {
            from: 'g1t3', // Counting task 3
            to: 'g3',   // ALL Typing tasks
            type: 'simple_pattern',
            probability: 0.9
        }
    ],
    
    
    activeDependencies: {},
    
    checkDependencies: function(completedTask) {
        var activated = [];
        
        this.dependencies.forEach(function(dep) {
            if (dep.from === completedTask) {
                // Use 100% probability in practice mode
                var probability = gameState.isPractice ? 1.0 : dep.probability;
                
                if (Math.random() < probability) {
                    // Apply to all tasks in the target game
                    for (var t = 1; t <= 3; t++) {
                        var targetTask = dep.to + 't' + t;
                        taskDependencies.activeDependencies[targetTask] = {
                            type: dep.type,
                            fromTask: dep.from
                        };
                        activated.push(targetTask);
                    }
                    Qualtrics.SurveyEngine.setEmbeddedData('dependency_' + dep.from + '_to_' + dep.to, 'activated');
                }
            }
        });
        
        return activated;
    },
    
    getActiveDependency: function(taskId) {
        return this.activeDependencies[taskId] || null;
    },
    
    clearDependency: function(taskId) {
        delete this.activeDependencies[taskId];
    }
};

// Preset responses database (updated to emphasize strategy without revealing specifics)
var presetResponses = {
    counting: { // Now first game
        general: [
            {
                id: 'count_how',
                triggers: ['count', 'how', 'counting', 'find'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Count the occurrences of the specified word or letter(s) in the text. Read carefully through the entire passage!'
            },
            {
                id: 'count_strategy',
                triggers: ['strategy', 'method', 'approach', 'tip'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Try reading through once to get familiar, then count systematically. Remember, tasks can affect each other - experiment with different orders!'
            },
            {
                id: 'count_case',
                triggers: ['case', 'capital', 'lowercase', 'sensitive'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Letter counting is case-insensitive - both "A" and "a" count as the same letter. Word counting looks for exact matches only.'
            }
        ],
        taskType: {
            word: [
                {
                    id: 'count_word',
                    triggers: ['word', 'the', 'of', 'and'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'When counting words, look for complete word matches only. "The" in "Therefore" doesn\'t count.'
                }
            ],
            letter: [
                {
                    id: 'count_letter',
                    triggers: ['letter', 'single', 'character'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Count every occurrence of the letter, regardless of case. Don\'t forget letters at word boundaries!'
                }
            ],
            twoLetters: [
                {
                    id: 'count_two',
                    triggers: ['two', 'both', 'total', 'add', 'sum'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Count both letters separately, then add them together.'
                }
            ]
        }
    },
    
    slider: { // Now second game
        general: [
            {
                id: 'slider_how',
                triggers: ['how', 'slider', 'move', 'control'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Click and drag the slider to match the target value. The value shows below (except hard mode).'
            },
            {
                id: 'slider_strategy',
                triggers: ['strategy', 'tip', 'advice', 'help', 'trick'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Make large movements first, then fine-tune. Tasks are interconnected - the order you complete them matters!'
            },
            {
                id: 'slider_accuracy',
                triggers: ['accuracy', 'precise', 'exact', 'close'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Your accuracy is based on how close you get. You don\'t need 100% to complete the task.'
            }
        ],
        difficulty: {
            easy: [
                {
                    id: 'slider_easy',
                    triggers: ['easy', 'whole', 'number', 'integer'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Easy mode uses whole numbers (0-10).'
                }
            ],
            medium: [
                {
                    id: 'slider_medium',
                    triggers: ['medium', 'decimal', 'point', 'tenth'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Medium uses one decimal place. Each small movement = 0.1.'
                }
            ],
            hard: [
                {
                    id: 'slider_hard',
                    triggers: ['hard', 'hidden', 'blind', 'no value', 'question mark'],
                    level: 'Workflow-level',
                    type: 'Iterate with me',
                    response: 'Hard mode hides the value. Count movements from 0 to estimate.'
                }
            ]
        }
    },
    
    typing: { // Remains third
        general: [
            {
                id: 'type_how',
                triggers: ['type', 'typing', 'pattern', 'enter'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Type exactly as shown - every character, space, and symbol.'
            },
            {
                id: 'type_accuracy',
                triggers: ['accuracy', 'correct', 'exact', 'match'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Must match exactly. Every character counts!'
            },
            {
                id: 'type_easier',
                triggers: ['easier', 'simple', 'help', 'hard'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Finding it tough? Remember that task order matters - experiment with different sequences!'
            }
        ],
        difficulty: {
            easy: [
                {
                    id: 'type_easy',
                    triggers: ['easy', 'simple', 'lowercase'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Easy patterns are simple words.'
                }
            ],
            medium: [
                {
                    id: 'type_medium',
                    triggers: ['medium', 'mixed', 'case', 'capital'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Medium mixes cases and numbers.'
                }
            ],
            hard: [
                {
                    id: 'type_hard',
                    triggers: ['hard', 'symbol', 'special', 'character'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Hard includes symbols like @#$%.'
                }
            ]
        }
    },
    
    general: {
        navigation: [
            {
                id: 'nav_switch',
                triggers: ['switch', 'change', 'different', 'task', 'move'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Switch between unlocked tasks anytime. Task order affects difficulty - plan your strategy!'
            },
            {
                id: 'nav_order',
                triggers: ['order', 'sequence', 'which', 'first', 'next'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Any order works! Each task gives +1 prompt. Tasks are interconnected - experiment to find the best sequence!'
            }
        ],
        help: [
            {
                id: 'help_practice',
                triggers: ['practice', 'tutorial', 'learn', 'how'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'You can practice in the tutorial. Each completed task earns bonus prompts!'
            },
            {
                id: 'help_prompts',
                triggers: ['prompt', 'limit', 'question', 'more'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'You start with 3 prompts, but earn +1 for each task completed! Save prompts for when you really need help.'
            }
        ],
        strategy: [
            {
                id: 'strategy_general',
                triggers: ['strategy', 'overall', 'plan', 'approach'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Tasks are dependent on each other. The order matters! Each completed task = +1 prompt. Experiment to discover the best approach!'
            },
            {
                id: 'strategy_dependency',
                triggers: ['connection', 'relate', 'help', 'other', 'hint', 'depend'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Tasks affect each other in subtle ways. Pay attention to any changes when switching between tasks. Higher numbered tasks tend to have stronger effects!'
            }
        ]
    },
    
    fallback: [
        {
            id: 'fallback_unclear',
            response: 'I\'m not sure I understand. Ask about counting, slider, or typing tasks. Remember: tasks are interconnected!',
            level: 'Task-level',
            type: 'Iterate with me'
        },
        {
            id: 'fallback_offtopic',
            response: 'Let\'s focus on the games. Need help with counting, slider, or typing? Complete tasks to earn more prompts!',
            level: 'Task-level',
            type: 'Iterate with me'
        }
    ]
};

// Response selection system (unchanged)
var responseSelector = {
    findBestResponse: function(userInput, currentTask) {
        var input = userInput.toLowerCase();
        var matches = [];
        
        var currentGame = currentTask ? parseInt(currentTask[1]) : null;
        var gameType = currentGame === 1 ? 'counting' : currentGame === 2 ? 'slider' : currentGame === 3 ? 'typing' : null;
        
        if (gameType && presetResponses[gameType]) {
            this.searchResponses(presetResponses[gameType], input, matches, 2);
        }
        
        this.searchResponses(presetResponses.general, input, matches, 1);
        
        Object.keys(presetResponses).forEach(function(key) {
            if (key !== gameType && key !== 'general' && key !== 'fallback') {
                responseSelector.searchResponses(presetResponses[key], input, matches, 0.5);
            }
        });
        
        matches.sort(function(a, b) { return b.score - a.score; });
        
        if (matches.length > 0 && matches[0].score > 0.3) {
            return matches[0].response;
        } else {
            var fallbacks = presetResponses.fallback;
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
    },
    
    searchResponses: function(category, input, matches, weight) {
        var searchInArray = function(arr) {
            arr.forEach(function(resp) {
                var score = 0;
                resp.triggers.forEach(function(trigger) {
                    if (input.includes(trigger)) {
                        score += (trigger.length / input.length) * weight;
                    }
                });
                
                if (score > 0) {
                    matches.push({
                        response: resp,
                        score: score
                    });
                }
            });
        };
        
        Object.keys(category).forEach(function(key) {
            if (Array.isArray(category[key])) {
                searchInArray(category[key]);
            } else if (typeof category[key] === 'object') {
                Object.keys(category[key]).forEach(function(subkey) {
                    if (Array.isArray(category[key][subkey])) {
                        searchInArray(category[key][subkey]);
                    }
                });
            }
        });
    }
};