// Track undo state
let undoCount = 10;
let undoStack = [];
// ============================
// GAME STATE & CONFIGURATION
// ============================

let levels = [];
let currentLevelIndex = 0;
let gameState = {
  placedWords: [], // Array of {word, slotIndex, bankIndex}
  draggedElement: null,
  dragData: null
};

const isEditor = window.location.search.includes("editor=true");

let editorLevel = {
  slots: [], // Array of {length, x, y} - x,y are percentages (0-100)
  bank: [],
  connections: []
};

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
      console.log('Levels loaded:', levels);
      // Start level after loading
      if (!isEditor && levels.length > 0) {
        startLevel(currentLevelIndex);
      }
    })
    .catch(function(e) {
      levels = [];
  console.error('Error loading levels.json:', e);
    });
}

function saveLevels() {
  // Saving to file is not possible from browser JS, so just show JSON for manual copy-paste
  showEditorLevelJSON();
}

// ============================
// GAME LOGIC
// ============================

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
  renderGame();
  document.getElementById("success-screen").classList.add("hidden");
}

function renderGame() {
  const level = levels[currentLevelIndex];
  if (!level) {
    console.error('No level data at index', currentLevelIndex);
    return;
  }
  renderSlots(level);
  renderBank(level);
  updateHints();
  // Draw connections only once after slots are rendered
  if (!renderGame._connectionsDrawn && !isEditorMode()) {
    renderConnections(level);
    renderGame._connectionsDrawn = true;
  }
}


// Only create slot DOM elements once per level load
function renderSlots(level, force = false) {
  const slotsContainer = document.getElementById("word-slots");
  
  // Check if slots data format has position info
  const hasPositions = level.slots.length > 0 && typeof level.slots[0] === 'object' && 'x' in level.slots[0];
  
  // If positioned slots, make container relative for absolute positioning
  if (hasPositions) {
    slotsContainer.style.position = 'relative';
    slotsContainer.style.width = '100%';
    slotsContainer.style.height = '100%';
    slotsContainer.style.flexDirection = 'unset';
    slotsContainer.style.gap = '0';
  } else {
    slotsContainer.style.position = '';
    slotsContainer.style.flexDirection = 'column';
    slotsContainer.style.gap = 'var(--spacing-xl)';
  }
  
  // If slots already exist and not forced, just update content
  if (slotsContainer.children.length === level.slots.length && !force) {
    for (let slotIndex = 0; slotIndex < level.slots.length; slotIndex++) {
      const slotDiv = slotsContainer.children[slotIndex];
      const slotData = level.slots[slotIndex];
      const slotLength = hasPositions ? slotData.length : slotData.length;
      const placedWord = gameState.placedWords.find(pw => pw.slotIndex === slotIndex);
      
      for (let i = 0; i < slotLength; i++) {
        const cell = slotDiv.children[i];
        cell.className = "word-cell";
        cell.textContent = "";
        if (placedWord) {
          cell.textContent = placedWord.word[i];
          cell.classList.add("filled");
        }
      }
      // Update drag handlers and cursor
      slotDiv.style.cursor = placedWord ? "grab" : "";
      slotDiv.onmousedown = null;
      slotDiv.ontouchstart = null;
      if (placedWord) {
        slotDiv.onmousedown = (e) => startDragFromSlot(e, slotIndex, placedWord);
        slotDiv.ontouchstart = (e) => startDragFromSlotTouch(e, slotIndex, placedWord);
      }
    }
    return;
  }
  
  // Otherwise, create all slot DOM elements
  slotsContainer.innerHTML = "";
  level.slots.forEach((slotData, slotIndex) => {
    const slotDiv = document.createElement("div");
    slotDiv.className = "word-slot";
    slotDiv.dataset.slotIndex = slotIndex;
    
    // Handle positioned slots
    if (hasPositions) {
      slotDiv.style.position = 'absolute';
      slotDiv.style.left = slotData.x + '%';
      slotDiv.style.top = slotData.y + '%';
      slotDiv.style.transform = 'translate(-50%, -50%)'; // Center the slot at x,y
    }
    
    const slotLength = hasPositions ? slotData.length : slotData.length;
    const placedWord = gameState.placedWords.find(pw => pw.slotIndex === slotIndex);
    
    for (let i = 0; i < slotLength; i++) {
      const cell = document.createElement("div");
      cell.className = "word-cell";
      cell.dataset.cellIndex = i;
      if (placedWord) {
        cell.textContent = placedWord.word[i];
        cell.classList.add("filled");
      }
      slotDiv.appendChild(cell);
    }
    slotDiv.style.cursor = placedWord ? "grab" : "";
    if (placedWord) {
      slotDiv.onmousedown = (e) => startDragFromSlot(e, slotIndex, placedWord);
      slotDiv.ontouchstart = (e) => startDragFromSlotTouch(e, slotIndex, placedWord);
    }
    slotsContainer.appendChild(slotDiv);
  });
}

function renderBank(level) {
  const bankContainer = document.getElementById("word-bank");
  bankContainer.innerHTML = "";
  
  level.bank.forEach((word, bankIndex) => {
    const isPlaced = gameState.placedWords.some(pw => pw.bankIndex === bankIndex);
    
    const wrapper = document.createElement("div");
    wrapper.className = "bank-word-wrapper";
    
    const wordDiv = document.createElement("div");
    wordDiv.className = "bank-word";
    wordDiv.dataset.bankIndex = bankIndex;
    wordDiv.dataset.word = word;
    wordDiv.style.position = "absolute";
    wordDiv.style.left = "50%";
    wordDiv.style.transform = "translateX(-50%)";
    
    if (isPlaced) {
      wordDiv.classList.add("invisible");
    }
    
      // Render as a row of .bank-letter squares (like .word-cell)
      for (let i = 0; i < word.length; i++) {
        const cell = document.createElement("span");
        cell.className = "bank-letter";
        cell.textContent = word[i];
        wordDiv.appendChild(cell);
      }
    
    wordDiv.addEventListener("mousedown", (e) => {
      if (!wordDiv.classList.contains("invisible")) startDragFromBank(e, word, bankIndex);
    });
    wordDiv.addEventListener("touchstart", (e) => {
      if (!wordDiv.classList.contains("invisible")) startDragFromBankTouch(e, word, bankIndex);
    });
    
    wrapper.appendChild(wordDiv);
    bankContainer.appendChild(wrapper);
  });
}

function renderConnections(level) {
  const svg = document.getElementById("svg-connections");
  svg.innerHTML = "";
  
  // Set SVG viewBox to match container
  const container = document.getElementById("game-container");
  const rect = container.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.setAttribute("width", rect.width);
  svg.setAttribute("height", rect.height);
  
  level.connections.forEach(conn => {
    const [from, to] = conn.split(",");
    const fromPos = parseCellPosition(from);
    const toPos = parseCellPosition(to);
    
    const p1 = getCellSideCenter(fromPos.slotIndex, fromPos.cellIndex, fromPos.side);
    const p2 = getCellSideCenter(toPos.slotIndex, toPos.cellIndex, toPos.side);
    
    if (p1 && p2) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
  line.setAttribute("stroke", "#888");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    }
  });
}

function parseCellPosition(str) {
  return {
    slotIndex: parseInt(str[0]),
    cellIndex: parseInt(str[1]),
    side: parseInt(str[2])
  };
}

function getCellSideCenter(slotIndex, cellIndex, side) {
  const slot = document.querySelector(`[data-slot-index="${slotIndex}"]`);
  if (!slot) return null;
  
  const cell = slot.querySelector(`[data-cell-index="${cellIndex}"]`);
  if (!cell) return null;
  
  const rect = cell.getBoundingClientRect();
  const containerRect = document.getElementById("game-container").getBoundingClientRect();
  
  const centerX = rect.left - containerRect.left + rect.width / 2;
  const centerY = rect.top - containerRect.top + rect.height / 2;
  const left = rect.left - containerRect.left;
  const right = rect.right - containerRect.left;
  const top = rect.top - containerRect.top;
  const bottom = rect.bottom - containerRect.top;
  
  // side: 0=top, 1=right, 2=bottom, 3=left
  switch (side) {
    case 0: return { x: centerX, y: top };
    case 1: return { x: right, y: centerY };
    case 2: return { x: centerX, y: bottom };
    case 3: return { x: left, y: centerY };
    default: return { x: centerX, y: centerY };
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
    const [from, to] = conn.split(",");
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
    const [from, to] = conn.split(",");
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
  if (gameState.placedWords.length === level.slots.length) {
    setTimeout(() => {
      document.getElementById("success-screen").classList.remove("hidden");
    }, 500);
  }
}

// ============================
// DRAG AND DROP
// ============================

// --- Touch event helpers ---
function getTouchCoords(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

function startDragFromBankTouch(e, word, bankIndex) {
  e.preventDefault();
  const coords = getTouchCoords(e);
  const element = e.currentTarget;
  const rect = element.getBoundingClientRect();
  const offsetX = coords.clientX - rect.left;
  const offsetY = coords.clientY - rect.top;
  gameState.draggedElement = element;
  gameState.dragData = {
    word,
    bankIndex,
    startX: coords.clientX,
    startY: coords.clientY,
    offsetX,
    offsetY,
    source: "bank",
    originalRect: rect
  };
  element.classList.add("dragging");
  element.style.position = "fixed";
  element.style.left = (coords.clientX - offsetX) + "px";
  element.style.top = (coords.clientY - offsetY) + "px";
  element.style.zIndex = "1000";
  element.style.transform = "none";
  document.addEventListener("touchmove", onDragMoveTouch, { passive: false });
  document.addEventListener("touchend", onDragEndTouch);
}

function startDragFromSlotTouch(e, slotIndex, placedWord) {
  e.preventDefault();
  const coords = getTouchCoords(e);
  const slotElem = e.currentTarget;
  const rect = slotElem.getBoundingClientRect();
  const offsetX = coords.clientX - rect.left;
  const offsetY = coords.clientY - rect.top;
  const tempElement = document.createElement("div");
  tempElement.className = "bank-word dragging";
  placedWord.word.split("").forEach(letter => {
    const span = document.createElement("span");
    span.className = "bank-letter";
    span.textContent = letter;
    tempElement.appendChild(span);
  });
  tempElement.style.position = "fixed";
  tempElement.style.left = (coords.clientX - offsetX) + "px";
  tempElement.style.top = (coords.clientY - offsetY) + "px";
  tempElement.style.zIndex = "1000";
  document.body.appendChild(tempElement);
  gameState.draggedElement = tempElement;
  gameState.dragData = {
    word: placedWord.word,
    bankIndex: placedWord.bankIndex,
    slotIndex: slotIndex,
    startX: coords.clientX,
    startY: coords.clientY,
    offsetX,
    offsetY,
    source: "slot",
    tempElement: true
  };
  // Remove from slot and update only slot content (deferred to avoid canceling touch)
  gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
  // Defer update to next frame so touch drag can start properly
  requestAnimationFrame(() => {
    renderSlots(levels[currentLevelIndex]);
    updateHints();
  });
  document.addEventListener("touchmove", onDragMoveTouch, { passive: false });
  document.addEventListener("touchend", onDragEndTouch);
}

function onDragMoveTouch(e) {
  if (!gameState.draggedElement || !gameState.dragData) return;
  e.preventDefault();
  const coords = getTouchCoords(e);
  const x = coords.clientX - gameState.dragData.offsetX;
  const y = coords.clientY - gameState.dragData.offsetY;
  gameState.draggedElement.style.left = x + "px";
  gameState.draggedElement.style.top = y + "px";
}

function onDragEndTouch(e) {
  if (!gameState.draggedElement || !gameState.dragData) return;
  document.removeEventListener("touchmove", onDragMoveTouch);
  document.removeEventListener("touchend", onDragEndTouch);
  const coords = getTouchCoords(e);
  const { word, bankIndex, source } = gameState.dragData;
  const slots = document.querySelectorAll(".word-slot");
  let droppedOnSlot = false;
  slots.forEach((slot, index) => {
    const rect = slot.getBoundingClientRect();
    if (
      coords.clientX >= rect.left &&
      coords.clientX <= rect.right &&
      coords.clientY >= rect.top &&
      coords.clientY <= rect.bottom
    ) {
      droppedOnSlot = true;
      const result = checkConstraints(word, index);
      if (result.valid) {
        placeWord(word, index, bankIndex);
        if (gameState.dragData.tempElement) {
          gameState.draggedElement.remove();
        } else {
          gameState.draggedElement.classList.remove("dragging");
          gameState.draggedElement.style.position = "";
          gameState.draggedElement.style.left = "";
          gameState.draggedElement.style.top = "";
          gameState.draggedElement.style.zIndex = "";
          gameState.draggedElement.style.transition = "";
        }
        gameState.draggedElement = null;
        gameState.dragData = null;
      } else {
        if (result.reason === 'length') {
          // Show X at slot center
          const rect = slot.getBoundingClientRect();
          showError(rect.left + rect.width/2, rect.top + rect.height/2);
        } else if (result.reason === 'hint') {
          // Show X at the mismatched cell
          const cell = slot.querySelector(`[data-cell-index="${result.cellIndex}"]`);
          if (cell) {
            const rect = cell.getBoundingClientRect();
            showError(rect.left + rect.width/2, rect.top + rect.height/2);
          } else {
            // fallback to slot center
            const rect = slot.getBoundingClientRect();
            showError(rect.left + rect.width/2, rect.top + rect.height/2);
          }
        } else {
          showError(coords.clientX, coords.clientY);
        }
        animateBack();
      }
    }
  });
  if (!droppedOnSlot) {
    animateBack();
  }
}

function startDragFromBank(e, word, bankIndex) {
  e.preventDefault();
  const element = e.currentTarget;
  const rect = element.getBoundingClientRect();
  // Calculate offset from mouse to top-left of word
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  // Create a ghost (clone) for dragging
  const ghost = element.cloneNode(true);
  ghost.classList.add("dragging");
  ghost.style.position = "fixed";
  ghost.style.left = (e.clientX - offsetX) + "px";
  ghost.style.top = (e.clientY - offsetY) + "px";
  ghost.style.zIndex = "1000";
  ghost.style.transform = "none";
  document.body.appendChild(ghost);
  // Hide the original with visibility:hidden
  element.classList.add("invisible");
  gameState.draggedElement = ghost;
  gameState.dragData = {
    word,
    bankIndex,
    startX: e.clientX,
    startY: e.clientY,
    offsetX,
    offsetY,
    source: "bank",
    originalRect: rect,
    originalElement: element
  };
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
}

function startDragFromSlot(e, slotIndex, placedWord) {
  e.preventDefault();
  const slot = e.currentTarget;
  const rect = slot.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  const tempElement = document.createElement("div");
  tempElement.className = "bank-word dragging";
  placedWord.word.split("").forEach(letter => {
    const span = document.createElement("span");
    span.className = "bank-letter";
    span.textContent = letter;
    tempElement.appendChild(span);
  });
  tempElement.style.position = "fixed";
  tempElement.style.left = (e.clientX - offsetX) + "px";
  tempElement.style.top = (e.clientY - offsetY) + "px";
  tempElement.style.zIndex = "1000";
  document.body.appendChild(tempElement);
  gameState.draggedElement = tempElement;
  gameState.dragData = {
    word: placedWord.word,
    bankIndex: placedWord.bankIndex,
    slotIndex: slotIndex,
    startX: e.clientX,
    startY: e.clientY,
    offsetX,
    offsetY,
    source: "slot",
    tempElement: true
  };
  // Remove from slot and update only slot content
  gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
  renderSlots(levels[currentLevelIndex]);
  updateHints();
  // Do NOT call renderConnections here
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
}

function onDragMove(e) {
  if (!gameState.draggedElement || !gameState.dragData) return;
  
  const x = e.clientX - gameState.dragData.offsetX;
  const y = e.clientY - gameState.dragData.offsetY;
  
  gameState.draggedElement.style.left = x + "px";
  gameState.draggedElement.style.top = y + "px";
  // Do NOT call renderGame or renderConnections here
}

function onDragEnd(e) {
  if (!gameState.draggedElement || !gameState.dragData) return;
  
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragEnd);
  
  const { word, bankIndex, source } = gameState.dragData;
  
  // Check if dropped on a slot
  const slots = document.querySelectorAll(".word-slot");
  let droppedOnSlot = false;
  
  slots.forEach((slot, index) => {
    const rect = slot.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      droppedOnSlot = true;
      // Check constraints
      const result = checkConstraints(word, index);
      if (result.valid) {
        placeWord(word, index, bankIndex);
        // Always remove the ghost/dragged element
        if (gameState.draggedElement) {
          gameState.draggedElement.remove();
        }
        // Restore original bank word if needed
        if (gameState.dragData && gameState.dragData.originalElement) {
          gameState.dragData.originalElement.classList.remove("invisible");
        }
        gameState.draggedElement = null;
        gameState.dragData = null;
      } else {
        if (result.reason === 'length') {
          // Show X at slot center
          const rect = slot.getBoundingClientRect();
          showError(rect.left + rect.width/2, rect.top + rect.height/2);
        } else if (result.reason === 'hint') {
          // Show X at the mismatched cell
          const cell = slot.querySelector(`[data-cell-index="${result.cellIndex}"]`);
          if (cell) {
            const rect = cell.getBoundingClientRect();
            showError(rect.left + rect.width/2, rect.top + rect.height/2);
          } else {
            // fallback to slot center
            const rect = slot.getBoundingClientRect();
            showError(rect.left + rect.width/2, rect.top + rect.height/2);
          }
        } else {
          showError(e.clientX, e.clientY);
        }
        animateBack();
      }
    }
  });
  
  if (!droppedOnSlot) {
    // Dropped outside - animate back immediately
    animateBack();
  }
}

function animateBack() {
  if (!gameState.draggedElement || !gameState.dragData) return;
  const { source, bankIndex, originalRect, originalElement } = gameState.dragData;
  // Remove dragging class and reset z-index for instant snap-back
  gameState.draggedElement.classList.remove("dragging");
  gameState.draggedElement.style.zIndex = "";
  void gameState.draggedElement.offsetWidth;
  if (source === "bank") {
    if (originalRect) {
      gameState.draggedElement.style.transition = "left 0.1s linear, top 0.1s linear";
      gameState.draggedElement.style.left = originalRect.left + "px";
      gameState.draggedElement.style.top = originalRect.top + "px";
      setTimeout(() => {
        if (originalElement) originalElement.classList.remove("invisible");
        if (gameState.draggedElement) gameState.draggedElement.remove();
        cleanupDrag(true);
      }, 100);
    } else {
      if (originalElement) originalElement.classList.remove("invisible");
      if (gameState.draggedElement) gameState.draggedElement.remove();
      cleanupDrag(true);
    }
  } else {
    const originalElement = document.querySelector(`[data-bank-index="${bankIndex}"]`);
    if (originalElement) {
      const rect = originalElement.getBoundingClientRect();
      void gameState.draggedElement.offsetWidth;
      gameState.draggedElement.style.transition = "left 0.1s linear, top 0.1s linear";
      gameState.draggedElement.style.left = rect.left + "px";
      gameState.draggedElement.style.top = rect.top + "px";
      setTimeout(() => {
        if (gameState.draggedElement) gameState.draggedElement.remove();
        cleanupDrag(true);
      }, 100);
    } else {
      if (gameState.draggedElement) gameState.draggedElement.remove();
      cleanupDrag(true);
    }
  }
}

function cleanupDrag(success) {
  if (gameState.draggedElement) {
    if (gameState.dragData && gameState.dragData.tempElement) {
      gameState.draggedElement.remove();
    } else {
      gameState.draggedElement.classList.remove("dragging");
      gameState.draggedElement.style.position = "";
      gameState.draggedElement.style.left = "";
      gameState.draggedElement.style.top = "";
      gameState.draggedElement.style.zIndex = "";
      gameState.draggedElement.style.transition = "";
      gameState.draggedElement.style.transform = "";
    }
  }
  
  gameState.draggedElement = null;
  gameState.dragData = null;
  
  renderGame();
}

function showError(x, y) {
  const cross = document.createElement("div");
  cross.className = "error-cross";
  cross.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 40 40">
      <line x1="8" y1="8" x2="32" y2="32" stroke="#f44336" stroke-width="4" stroke-linecap="round"/>
      <line x1="32" y1="8" x2="8" y2="32" stroke="#f44336" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `;
  cross.style.left = (x - 20) + "px";
  cross.style.top = (y - 20) + "px";
  document.body.appendChild(cross);
  
  setTimeout(() => cross.remove(), 700);
}

// ============================
// EVENT LISTENERS
// ============================

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
// LEVEL EDITOR
// ============================

function showEditor() {
  console.log('showEditor called');
  // Hide old game and editor screens
  const gameContainer = document.getElementById("game-container");
  console.log('gameContainer:', gameContainer);
  if (gameContainer) gameContainer.style.display = "none";
  const editorScreen = document.getElementById("editor-screen");
  if (editorScreen) editorScreen.style.display = "none";
  // Show new editor container
  const editorContainer = document.getElementById("editor-container");
  console.log('editorContainer:', editorContainer);
  if (editorContainer) {
    editorContainer.classList.add('show');
    console.log('Editor container show class added');
  }
  setupNewEditorListeners();
  renderEditorGameView();
}

function setupNewEditorListeners() {
  document.getElementById("editor-add-word").onclick = () => {
    const input = document.getElementById("editor-word-input");
    const word = input.value.trim().toUpperCase();
    if (word) {
      editorLevel.bank.push(word);
      // Add a slot with the same length, positioned at center initially
      editorLevel.slots.push({
        length: word.length,
        x: 50,  // center horizontally
        y: 30 + (editorLevel.slots.length * 15) // stack vertically with spacing
      });
      input.value = "";
      renderEditorGameView();
    }
  };
  document.getElementById("editor-add-conn").onclick = () => {
    const input = document.getElementById("editor-conn-input");
    const conn = input.value.trim();
    if (conn && /^\d{3},\d{3}$/.test(conn)) {
      editorLevel.connections.push(conn);
      input.value = "";
      renderEditorGameView();
    }
  };
  document.getElementById("editor-redraw-lines").onclick = () => {
    renderEditorConnections();
  };
  document.getElementById("editor-shuffle-bank").onclick = () => {
    editorLevel.bank = shuffleArray(editorLevel.bank);
    renderEditorGameView();
  };
  document.getElementById("editor-save").onclick = () => {
    saveLevels();
  };
  document.getElementById("editor-exit").onclick = () => {
    window.location.href = "index.html";
  };
  // Add button to show JSON
  let jsonBtn = document.getElementById("editor-show-json");
  if (!jsonBtn) {
    jsonBtn = document.createElement("button");
    jsonBtn.id = "editor-show-json";
    jsonBtn.textContent = "Show Level JSON";
    jsonBtn.style.width = "100%";
    jsonBtn.style.marginTop = "10px";
    document.getElementById("editor-controls").appendChild(jsonBtn);
    jsonBtn.onclick = showEditorLevelJSON;
  }
}

function showEditorLevelJSON() {
  let jsonArea = document.getElementById("editor-json-area");
  if (!jsonArea) {
    jsonArea = document.createElement("textarea");
    jsonArea.id = "editor-json-area";
    jsonArea.style.width = "100%";
    jsonArea.style.height = "120px";
    jsonArea.style.marginTop = "10px";
    document.getElementById("editor-controls").appendChild(jsonArea);
  }
  jsonArea.value = JSON.stringify(editorLevel, null, 2);
  jsonArea.select();
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderEditorGameView() {
  const slotsContainer = document.getElementById("editor-word-slots");
  if (!slotsContainer) return;
  
  // Set up container for absolute positioning
  slotsContainer.style.position = 'relative';
  slotsContainer.style.width = '100%';
  slotsContainer.style.height = '100%';
  
  slotsContainer.innerHTML = "";
  editorLevel.slots.forEach((slotData, slotIndex) => {
    const slotDiv = document.createElement("div");
    slotDiv.className = "word-slot";
    slotDiv.dataset.slotIndex = slotIndex;
    slotDiv.style.position = 'absolute';
    slotDiv.style.left = slotData.x + '%';
    slotDiv.style.top = slotData.y + '%';
    slotDiv.style.transform = 'translate(-50%, -50%)';
    slotDiv.style.cursor = 'move';
    
    // Add cells based on slot length
    for (let i = 0; i < slotData.length; i++) {
      const cell = document.createElement("div");
      cell.className = "word-cell";
      cell.dataset.cellIndex = i;
      slotDiv.appendChild(cell);
    }
    
    // Make slots draggable in editor
    makeSlotDraggable(slotDiv, slotIndex);
    
    slotsContainer.appendChild(slotDiv);
  });
  
  // Render bank words
  const bankContainer = document.getElementById("editor-word-bank");
  if (!bankContainer) return;
  bankContainer.innerHTML = "";
  editorLevel.bank.forEach((word, bankIndex) => {
    const wordDiv = document.createElement("div");
    wordDiv.className = "bank-word";
    wordDiv.textContent = word;
    bankContainer.appendChild(wordDiv);
  });
  renderEditorConnections();
}

// Make slots draggable in the editor
function makeSlotDraggable(slotDiv, slotIndex) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  
  const onMouseDown = (e) => {
    isDragging = true;
    const rect = slotDiv.parentElement.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    
    // Get current position as percentage
    const currentX = parseFloat(slotDiv.style.left);
    const currentY = parseFloat(slotDiv.style.top);
    initialLeft = currentX;
    initialTop = currentY;
    
    e.preventDefault();
  };
  
  const onMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = slotDiv.parentElement.getBoundingClientRect();
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Convert pixel delta to percentage
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;
    
    let newX = initialLeft + deltaXPercent;
    let newY = initialTop + deltaYPercent;
    
    // Clamp to 0-100%
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));
    
    slotDiv.style.left = newX + '%';
    slotDiv.style.top = newY + '%';
    
    // Update data
    editorLevel.slots[slotIndex].x = newX;
    editorLevel.slots[slotIndex].y = newY;
    
    // Redraw connections
    renderEditorConnections();
  };
  
  const onMouseUp = () => {
    isDragging = false;
  };
  
  slotDiv.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function renderEditorConnections() {
  const svg = document.getElementById("editor-svg-connections");
  svg.innerHTML = "";
  
  const container = document.getElementById("editor-container");
  const rect = container.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.setAttribute("width", rect.width);
  svg.setAttribute("height", rect.height);
  
  editorLevel.connections.forEach(conn => {
    const [from, to] = conn.split(",");
    const fromPos = parseCellPosition(from);
    const toPos = parseCellPosition(to);
    
    const p1 = getCellSideCenter(fromPos.slotIndex, fromPos.cellIndex, fromPos.side);
    const p2 = getCellSideCenter(toPos.slotIndex, toPos.cellIndex, toPos.side);
    
    if (p1 && p2) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
  line.setAttribute("stroke", "#888");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    }
  });
}

function isEditorMode() {
  return isEditor;
}

// ============================
// START APPLICATION
// ============================

document.addEventListener("DOMContentLoaded", init);
