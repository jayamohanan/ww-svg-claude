// ============================
// INITIALIZATION
// ============================

function init() {
  console.log('Init called, isEditor:', isEditor);
  loadLevels();
  
  if (isEditor) {
    console.log('Showing editor...');
    showEditor();
  } else {
    setupEventListeners();
  }
}

function setupEventListeners() {
  const updateUndoCount = () => {
    const undoCountSpan = document.getElementById("undo-count");
    if (undoCountSpan) undoCountSpan.textContent = undoCount;
  };
  updateUndoCount();
  
  // Undo button
  const undoBtn = document.getElementById("undo-btn");
  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      if (undoCount > 0 && undoStack.length > 0) {
        const last = undoStack.pop();
        // Remove the word from placedWords
        gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== last.slotIndex);
        // Decrement undo count
        undoCount--;
        // Disable button if no undos left
        if (undoCount === 0) {
          undoBtn.disabled = true;
          undoBtn.classList.add("disabled");
        }
        renderSlots(levels[currentLevelIndex]);
        renderBank(levels[currentLevelIndex]);
        updateHints();
        updateUndoCount();
      }
    });
  }
  
  document.getElementById("replay-btn").addEventListener("click", () => {
    startLevel(currentLevelIndex);
  });
  
  document.getElementById("next-btn").addEventListener("click", () => {
    currentLevelIndex = (currentLevelIndex + 1) % levels.length;
    startLevel(currentLevelIndex);
  });
}

// ============================
// START APPLICATION
// ============================

document.addEventListener("DOMContentLoaded", init);
