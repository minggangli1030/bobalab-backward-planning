// src/utils/taskDependencies.js
export const taskDependencies = {
  dependencies: [
    // Slider helps ALL Counting tasks - highlight words and letters
    {
      from: 'g2t1',
      to: 'g1',
      type: 'highlight',
      probability: 0.3
    },
    {
      from: 'g2t2',
      to: 'g1',
      type: 'highlight',
      probability: 0.6
    },
    {
      from: 'g2t3',
      to: 'g1',
      type: 'highlight',
      probability: 0.9
    },
    // Typing helps ALL Slider tasks - comprehensive tick marks
    {
      from: 'g3t1',
      to: 'g2',
      type: 'enhanced_slider',
      probability: 0.3
    },
    {
      from: 'g3t2',
      to: 'g2',
      type: 'enhanced_slider',
      probability: 0.6
    },
    {
      from: 'g3t3',
      to: 'g2',
      type: 'enhanced_slider',
      probability: 0.9
    },
    // Counting helps ALL Typing tasks - simpler patterns
    {
      from: 'g1t1',
      to: 'g3',
      type: 'simple_pattern',
      probability: 0.3
    },
    {
      from: 'g1t2',
      to: 'g3',
      type: 'simple_pattern',
      probability: 0.6
    },
    {
      from: 'g1t3',
      to: 'g3',
      type: 'simple_pattern',
      probability: 0.9
    }
  ],
  
  activeDependencies: {},
  
  checkDependencies(completedTask, isPractice = false) {
    const activated = [];
    
    this.dependencies.forEach(dep => {
      if (dep.from === completedTask) {
        // Use 100% probability in practice mode
        const probability = isPractice ? 1.0 : dep.probability;
        
        if (Math.random() < probability) {
          // Apply to all tasks in the target game
          for (let t = 1; t <= 3; t++) {
            const targetTask = `${dep.to}t${t}`;
            this.activeDependencies[targetTask] = {
              type: dep.type,
              fromTask: dep.from
            };
            activated.push(targetTask);
          }
        }
      }
    });
    
    return activated;
  },
  
  getActiveDependency(taskId) {
    return this.activeDependencies[taskId] || null;
  },
  
  clearDependency(taskId) {
    delete this.activeDependencies[taskId];
  },
  
  clearAllDependencies() {
    this.activeDependencies = {};
  }
};