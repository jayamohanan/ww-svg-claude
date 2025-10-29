// ============================
// GAME LOGIC
// ============================

function loadLevels() {
  fetch('levels.json')
    .then(function(response) {
      if (response.ok) {
        return response.json();
      } else {
        console.error('Could not load levels.json');
        return [];
      }
    })
    .then(function(data) {
      levels = data;
      // Start level after loading
      if (!isEditor && levels.length > 0) {
        startLevel(currentLevelIndex);
      }
    })
    .catch(function(e) {
      console.error('Error loading levels.json:', e);
    });
}

function startLevel(index) {
  // Update undo count display
  setTimeout(() => {
    const undoCountSpan = document.getElementById("undo-count");
    if (undoCountSpan) undoCountSpan.textContent = undoCount;
  }, 0);
  undoCount = 10;
  undoStack = [];
  const undoBtn = document.getElementById("undo-btn");
  if (undoBtn) {
    undoBtn.disabled = false;
    undoBtn.classList.remove("disabled");
  }
  currentLevelIndex = index;
  gameState.placedWords = [];
  renderGame._connectionsDrawn = false;
  renderGame(true);
  document.getElementById("success-screen").classList.add("hidden");
  
  // Initialize mobile selection to first unfilled slot
  if (gameState.isMobile) {
    selectSlot(getNextUnfilledSlot());
  }
}

function renderGame(force = false) {
  const level = levels[currentLevelIndex];
  if (!level) {
    console.error('No level data at index', currentLevelIndex);
    return;
  }
  renderSlots(level, force);
  renderBank(level);
  updateHints();
  // Draw connections only once after slots are rendered
  if (!renderGame._connectionsDrawn && !isEditorMode()) {
    renderConnections(level);
    renderGame._connectionsDrawn = true;
  }
}

function updateHints() {
  const level = levels[currentLevelIndex];
  // Clear all hints first (but not filled cells)
  for (let slotIndex = 0; slotIndex < level.slots.length; slotIndex++) {
    const slotDiv = document.querySelector(`[data-slot-index="${slotIndex}"]`);
    if (!slotDiv) continue;
    for (let i = 0; i < slotDiv.children.length; i++) {
      const cell = slotDiv.children[i];
      if (!cell.classList.contains("filled")) {
        cell.classList.remove("hint");
        cell.textContent = "";
      }
    }
  }
  // Now apply hints only to relevant cells
  level.connections.forEach(conn => {
    const [from, to] = conn.split("-");
    const fromPos = parseCellPosition(from);
    const toPos = parseCellPosition(to);
    const fromPlaced = gameState.placedWords.find(pw => pw.slotIndex === fromPos.slotIndex);
    const toPlaced = gameState.placedWords.find(pw => pw.slotIndex === toPos.slotIndex);
    // Show hint if one side is filled and other is empty
    if (fromPlaced && !toPlaced) {
      const requiredLetter = fromPlaced.word[fromPos.cellIndex];
      showHint(toPos.slotIndex, toPos.cellIndex, requiredLetter);
    } else if (toPlaced && !fromPlaced) {
      const requiredLetter = toPlaced.word[toPos.cellIndex];
      showHint(fromPos.slotIndex, fromPos.cellIndex, requiredLetter);
    }
  });
}

function showHint(slotIndex, cellIndex, letter) {
  const slot = document.querySelector(`[data-slot-index="${slotIndex}"]`);
  if (!slot) return;
  
  const cell = slot.querySelector(`[data-cell-index="${cellIndex}"]`);
  if (cell && !cell.classList.contains("filled")) {
    cell.textContent = letter;
    cell.classList.add("hint");
  }
}

function checkConstraints(word, slotIndex) {
  const level = levels[currentLevelIndex];
  const slotLength = level.slots[slotIndex].length;
  
  // Check word length
  if (word.length !== slotLength) {
    return { valid: false, reason: 'length' };
  }
  // Check connection constraints and hint mismatches
  for (const conn of level.connections) {
    const [from, to] = conn.split("-");
    const fromPos = parseCellPosition(from);
    const toPos = parseCellPosition(to);
    // If placing in fromPos slot, check against toPos slot
    if (fromPos.slotIndex === slotIndex) {
      const toPlaced = gameState.placedWords.find(pw => pw.slotIndex === toPos.slotIndex);
      if (toPlaced) {
        if (word[fromPos.cellIndex] !== toPlaced.word[toPos.cellIndex]) {
          return { valid: false, reason: 'hint', cellIndex: fromPos.cellIndex };
        }
      }
    }
    // If placing in toPos slot, check against fromPos slot
    if (toPos.slotIndex === slotIndex) {
      const fromPlaced = gameState.placedWords.find(pw => pw.slotIndex === fromPos.slotIndex);
      if (fromPlaced) {
        if (word[toPos.cellIndex] !== fromPlaced.word[fromPos.cellIndex]) {
          return { valid: false, reason: 'hint', cellIndex: toPos.cellIndex };
        }
      }
    }
  }
  return { valid: true };
}

function placeWord(word, slotIndex, bankIndex) {
  // Push to undo stack
  if (undoCount > 0) {
    undoStack.push({ word, slotIndex, bankIndex });
    if (undoStack.length > 10) undoStack.shift();
  }
  // Remove if already placed in this slot
  gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
  
  // Add new placement
  gameState.placedWords.push({ word, slotIndex, bankIndex });
  
  renderGame();
  checkLevelComplete();
}

function removeWordFromSlot(slotIndex) {
  gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
  renderGame();
}

function checkLevelComplete() {
  const level = levels[currentLevelIndex];
  if (gameState.placedWords.length !== level.slots.length) return;
  
  // Check all connections are satisfied
  for (const conn of level.connections) {
    const [from, to] = conn.split("-");
    const fromPos = parseCellPosition(from);
    const toPos = parseCellPosition(to);
    
    const fromPlaced = gameState.placedWords.find(pw => pw.slotIndex === fromPos.slotIndex);
    const toPlaced = gameState.placedWords.find(pw => pw.slotIndex === toPos.slotIndex);
    
    if (!fromPlaced || !toPlaced) return;
    if (fromPlaced.word[fromPos.cellIndex] !== toPlaced.word[toPos.cellIndex]) return;
  }
  
  // Level complete!
  document.getElementById("success-screen").classList.remove("hidden");
}
