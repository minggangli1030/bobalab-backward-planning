// src/utils/patternGenerator.js - Generate patterns for 100 levels per game

export const patternGenerator = {
  // Seeded random number generator
  seedRandom: null,
  currentSeed: null,

  initializeSeed(seed) {
    this.currentSeed = seed;
    // Simple seeded random based on xorshift
    let s = seed;
    this.seedRandom = function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  },

  getRandom() {
    return this.seedRandom ? this.seedRandom() : Math.random();
  },

  // Counting Game Patterns
  generateCountingPattern(level) {
    // Difficulty based on actual level (1-100)
    // 1-10: easy, 11-24: medium, 25-100: hard
    const difficulty = level <= 10 ? "easy" : level < 25 ? "medium" : "hard";

    // For pattern selection, cycle through available patterns
    let patternIndex;
    if (difficulty === "easy") {
      patternIndex = ((level - 1) % 5) + 1; // Cycles 1-5
    } else if (difficulty === "medium") {
      patternIndex = ((level - 11) % 5) + 6; // Cycles 6-10
    } else {
      patternIndex = ((level - 25) % 5) + 11; // Cycles 11-15 for levels 25-100
    }

    // Word/letter targets based on pattern
    const patterns = {
      easy: {
        1: { target: "the", type: "word" },
        2: { target: "and", type: "word" },
        3: { target: "of", type: "word" },
        4: { target: "to", type: "word" },
        5: { target: "in", type: "word" },
      },
      medium: {
        6: { target: "e", type: "letter" },
        7: { target: "a", type: "letter" },
        8: { target: "i", type: "letter" },
        9: { target: "o", type: "letter" },
        10: { target: "s", type: "letter" },
      },
      hard: {
        11: { targets: ["a", "e"], type: "multi-letter" },
        12: { targets: ["i", "o"], type: "multi-letter" },
        13: { targets: ["s", "t"], type: "multi-letter" },
        14: { targets: ["n", "r"], type: "multi-letter" },
        15: { targets: ["l", "d"], type: "multi-letter" },
      },
    };

    const levelData = patterns[difficulty][patternIndex];

    // Generate instruction based on type
    let instruction = "";
    if (levelData.type === "word") {
      instruction = `Count how many times the word "${levelData.target}" appears:`;
    } else if (levelData.type === "letter") {
      instruction = `Count how many times the letter "${levelData.target}" appears (case-insensitive):`;
    } else {
      instruction = `Count how many times the letters "${levelData.targets[0]}" and "${levelData.targets[1]}" appear in total:`;
    }

    return {
      ...levelData,
      instruction,
      difficulty,
      difficultyLabel: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    };
  },

  // Slider Game Patterns
  generateSliderPattern(level) {
    // Difficulty based on actual level (1-100)
    // 1-10: easy, 11-24: medium, 25-100: hard
    const difficulty = level <= 10 ? "easy" : level < 25 ? "medium" : "hard";

    let target, step, showValue;

    if (difficulty === "easy") {
      // Easy: integers 0-10
      target = Math.floor(this.getRandom() * 11);
      step = 1;
      showValue = true;
    } else if (difficulty === "medium") {
      // Medium: one decimal place
      target = Math.round(this.getRandom() * 10 * 10) / 10;
      step = 0.1;
      showValue = true;
    } else {
      // Hard: two decimal places, some with hidden values
      target = Math.round(this.getRandom() * 10 * 100) / 100;
      step = 0.01;
      // Hide value occasionally in hard mode (every 5th hard level)
      showValue = (level - 25) % 5 !== 0;
    }

    return {
      target,
      step,
      showValue,
      difficulty: difficulty,
      difficultyLabel: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      precision: difficulty === "easy" ? 0 : difficulty === "medium" ? 1 : 2,
    };
  },

  // Typing Game Patterns
  generateTypingPattern(level) {
    // Difficulty based on actual level (1-100)
    // 1-10: easy, 11-24: medium, 25-100: hard
    const difficulty = level <= 10 ? "easy" : level < 25 ? "medium" : "hard";

    const patterns = {
      // Easy patterns
      easy: [
        "hello world",
        "quick test",
        "type this",
        "easy mode",
        "simple text",
        "good job",
        "keep going",
        "nice work",
        "almost done",
        "level up",
      ],
      // Medium patterns - mixed case
      medium: [
        "HeLLo WoRLd",
        "QuIcK tEsT",
        "TyPe ThIs",
        "MeDiUm MoDe",
        "MiXeD cAsE",
        "KeEp GoInG",
        "NiCe WoRk",
        "AlMoSt DoNe",
        "LeVeL uP",
        "ChAlLeNgE",
        "TeSt RuN",
        "NeXt LeVeL",
        "TrY aGaIn",
        "GoOd LuCk",
        "FiNaL tEsT",
      ],
      // Hard patterns - symbols and numbers
      hard: [
        "Test@123",
        "Go4It!Now",
        "X9%Y8&Z7*",
        "P6!Q5?R4+",
        "Z1@Y2#X3$",
        "M7&N8*O9!",
        "J4%K5^L6&",
        "D1!E2@F3#",
        "A7$B8%C9^",
        "V3*W4+X5=",
        "Q2#R3$S4%",
        "H5^I6&J7*",
        "K8(L9)M0!",
        "N1@O2#P3$",
        "T4%U5^V6&",
        "W7*X8(Y9)",
        "C0!D1@E2#",
        "F3$G4%H5^",
        "I6&J7*K8(",
        "L9)M0!N1@",
        "O2#P3$Q4%",
        "R5^S6&T7*",
        "U8(V9)W0!",
        "X1@Y2#Z3$",
        "A4%B5^C6&",
      ],
    };

    let pattern;
    if (difficulty === "easy") {
      // Cycle through easy patterns (10 patterns for 10 levels)
      const index = (level - 1) % patterns.easy.length;
      pattern = patterns.easy[index];
    } else if (difficulty === "medium") {
      // Cycle through medium patterns (15 patterns for 15 levels)
      const index = (level - 11) % patterns.medium.length;
      pattern = patterns.medium[index];
    } else {
      // Cycle through hard patterns (25 patterns for levels 25-100)
      const index = (level - 25) % patterns.hard.length;
      pattern = patterns.hard[index];
    }

    return {
      pattern,
      difficulty: difficulty,
      difficultyLabel: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    };
  },

  // Text passages for counting game (expanded to support 50 levels)
  textPassages: [
    // Passage 1
    "The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state's first land-grant university and is the founding campus of the University of California system.",

    // Passage 2
    "Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business.",

    // Passage 3
    'The Berkeley campus encompasses approximately 1,232 acres, though the "central campus" occupies only the low-lying western 178 acres. The campus contains numerous wooded areas, including the Eucalyptus Grove and Strawberry Creek, which runs through the center of campus.',

    // Passage 4
    "Oski the Bear (Oski) is the official mascot of the University of California, Berkeley, representing the California Golden Bears. Named after the Oski Yell, he made his debut at a freshman rally in the Greek Theatre on September 25, 1941.",

    // Passage 5
    "Berkeley faculty, alumni, and researchers have won 111 Nobel laureates, 25 Turing Award winners, and 19 Academy Award winners. The university has produced many notable alumni in various fields including science, politics, business, and entertainment.",

    // Passage 6
    "The university's athletic teams compete as the California Golden Bears and are members of the Atlantic Coast Conference for most sports. Berkeley teams have won 107 national championships, including 45 NCAA national championships.",

    // Passage 7
    "Research at Berkeley is conducted within departments, organized research units, and interdisciplinary research centers. Berkeley operates Lawrence Berkeley National Laboratory, manages Los Alamos National Laboratory, and is a founding partner of the Space Sciences Laboratory.",

    // Passage 8
    "The Berkeley campus offers over 350 degree programs through its 14 colleges and schools. Popular majors include Computer Science, Economics, Political Science, and Business Administration. The student-faculty ratio is 17:1.",

    // Passage 9
    "Berkeley's libraries contain more than 13 million volumes and maintain special collections including the Mark Twain Papers, the Oral History Center, and the Bancroft Library, which houses the largest collection of materials on California history.",

    // Passage 10
    "The campus is home to several museums including the Berkeley Art Museum and Pacific Film Archive, the Lawrence Hall of Science, and the UC Botanical Garden. These facilities serve both educational and public outreach purposes.",

    // Additional passages for levels 11-50
    "Notable Berkeley inventions and discoveries include the cyclotron, the atomic bomb, the flu vaccine, and vitamin E. Berkeley researchers discovered 16 chemical elements of the periodic table, more than any other university.",

    "The Free Speech Movement, which took place during the 1964-65 academic year, was a pivotal moment in the history of civil liberties in the United States. It began when students protested a ban on political activities on campus.",

    "Berkeley's Campanile, known as Sather Tower, is the third-tallest clock tower in the world at 307 feet. It was completed in 1914 and is visible for miles, serving as a symbol of the university.",

    "The university operates on a semester system, with fall semester beginning in late August and spring semester beginning in mid-January. Berkeley offers over 5,000 courses each semester across all disciplines.",

    'Cal Bears have won at least one team national title in 13 different sports. The university\'s traditional rival is Stanford University, with the annual football game known as "The Big Game" dating back to 1892.',
  ],

  // Get a text passage for a specific level
  getTextPassage(level) {
    // Use seeded random to select passage if seed is initialized
    if (this.seedRandom) {
      // Use level and seed to deterministically select a passage
      const randomOffset = Math.floor(
        this.getRandom() * this.textPassages.length
      );
      const index = (level - 1 + randomOffset) % this.textPassages.length;
      return this.textPassages[index];
    } else {
      // Fallback to original behavior if no seed
      const index = (level - 1) % this.textPassages.length;
      return this.textPassages[index];
    }
  },
};
