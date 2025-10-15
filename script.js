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
  slots: [],
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

function renderSlots(level) {
  const slotsContainer = document.getElementById("word-slots");
  slotsContainer.innerHTML = "";
  
  level.slots.forEach((slotWord, slotIndex) => {
    const slotDiv = document.createElement("div");
    slotDiv.className = "word-slot";
    slotDiv.dataset.slotIndex = slotIndex;
    
    const placedWord = gameState.placedWords.find(pw => pw.slotIndex === slotIndex);
    
    for (let i = 0; i < slotWord.length; i++) {
      const cell = document.createElement("div");
      cell.className = "word-cell";
      cell.dataset.cellIndex = i;
      
      if (placedWord) {
        cell.textContent = placedWord.word[i];
        cell.classList.add("filled");
      }
      
      slotDiv.appendChild(cell);
    }
    
    // Allow dragging word out of slot
    if (placedWord) {
      slotDiv.style.cursor = "grab";
    slotDiv.addEventListener("mousedown", (e) => startDragFromSlot(e, slotIndex, placedWord));
    slotDiv.addEventListener("touchstart", (e) => startDragFromSlotTouch(e, slotIndex, placedWord));
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
      wordDiv.classList.add("hidden");
    }
    
    for (let i = 0; i < word.length; i++) {
      const letter = document.createElement("span");
      letter.className = "bank-letter";
      letter.textContent = word[i];
      wordDiv.appendChild(letter);
    }
    
    wordDiv.addEventListener("mousedown", (e) => startDragFromBank(e, word, bankIndex));
    wordDiv.addEventListener("touchstart", (e) => startDragFromBankTouch(e, word, bankIndex));
    
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
      line.setAttribute("stroke", "#333");
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
    return false;
  }
  
  // Check connection constraints
  for (const conn of level.connections) {
    const [from, to] = conn.split(",");
    const fromPos = parseCellPosition(from);
    const toPos = parseCellPosition(to);
    
    // If placing in fromPos slot, check against toPos slot
    if (fromPos.slotIndex === slotIndex) {
      const toPlaced = gameState.placedWords.find(pw => pw.slotIndex === toPos.slotIndex);
      if (toPlaced) {
        if (word[fromPos.cellIndex] !== toPlaced.word[toPos.cellIndex]) {
          return false;
        }
      }
    }
    
    // If placing in toPos slot, check against fromPos slot
    if (toPos.slotIndex === slotIndex) {
      const fromPlaced = gameState.placedWords.find(pw => pw.slotIndex === fromPos.slotIndex);
      if (fromPlaced) {
        if (word[toPos.cellIndex] !== fromPlaced.word[fromPos.cellIndex]) {
          return false;
        }
      }
    }
  }
  
  return true;
}

function placeWord(word, slotIndex, bankIndex) {
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
  const slot = e.currentTarget;
  const rect = slot.getBoundingClientRect();
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
  gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
  renderSlots(levels[currentLevelIndex]);
  updateHints();
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
      if (checkConstraints(word, index)) {
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
        showError(coords.clientX, coords.clientY);
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
  
  gameState.draggedElement = element;
  gameState.dragData = {
    word,
    bankIndex,
    startX: e.clientX,
    startY: e.clientY,
    offsetX,
    offsetY,
    source: "bank",
    originalRect: rect
  };
  
  element.classList.add("dragging");
  element.style.position = "fixed";
  element.style.left = (e.clientX - offsetX) + "px";
  element.style.top = (e.clientY - offsetY) + "px";
  element.style.zIndex = "1000";
  element.style.transform = "none";
  
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
  // Remove from slot but DON'T re-render yet (keeps bank word hidden)
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
      if (checkConstraints(word, index)) {
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
        // Show error and animate back
        showError(e.clientX, e.clientY);
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
  const { source, bankIndex, originalRect } = gameState.dragData;
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
        cleanupDrag(true);
      }, 100);
    } else {
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
        cleanupDrag(true);
      }, 100);
    } else {
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
    <svg width="60" height="60" viewBox="0 0 60 60">
      <line x1="10" y1="10" x2="50" y2="50" stroke="#f44336" stroke-width="6" stroke-linecap="round"/>
      <line x1="50" y1="10" x2="10" y2="50" stroke="#f44336" stroke-width="6" stroke-linecap="round"/>
    </svg>
  `;
  cross.style.left = (x - 30) + "px";
  cross.style.top = (y - 30) + "px";
  document.body.appendChild(cross);
  
  setTimeout(() => cross.remove(), 700);
}

// ============================
// EVENT LISTENERS
// ============================

function setupEventListeners() {
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
      editorLevel.slots.push(word);
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
  slotsContainer.innerHTML = "";
  editorLevel.slots.forEach((slotWord, slotIndex) => {
    const slotDiv = document.createElement("div");
    slotDiv.className = "word-slot";
    slotDiv.dataset.slotIndex = slotIndex;
    for (let i = 0; i < slotWord.length; i++) {
      const cell = document.createElement("div");
      cell.className = "word-cell";
      cell.dataset.cellIndex = i;
      slotDiv.appendChild(cell);
    }
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
      line.setAttribute("stroke", "#333");
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
