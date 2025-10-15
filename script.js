// ============================
// GAME STATE & CONFIGURATION
// ============================

const DEFAULT_LEVELS = [
  {
    slots: ["SOFT", "TUNE"],
    bank: ["SOFT", "TUNE"],
    connections: ["032,100"] // slot0, cell3, bottom -> slot1, cell0, top
  }
];

let levels = [];
let currentLevelIndex = 0;
let gameState = {
  placedWords: [], // Array of {word, slotIndex, bankIndex}
  draggedElement: null,
  dragData: null
};

const isEditor = window.location.search.includes("editor=true");

// ============================
// INITIALIZATION
// ============================

function init() {
  loadLevels();
  
  if (isEditor) {
    showEditor();
  } else {
    startLevel(currentLevelIndex);
    setupEventListeners();
  }
}

function loadLevels() {
  const saved = localStorage.getItem("word_web_levels");
  if (saved) {
    try {
      levels = JSON.parse(saved);
    } catch (e) {
      levels = [...DEFAULT_LEVELS];
    }
  } else {
    levels = [...DEFAULT_LEVELS];
  }
}

function saveLevels() {
  localStorage.setItem("word_web_levels", JSON.stringify(levels));
}

// ============================
// GAME LOGIC
// ============================

function startLevel(index) {
  currentLevelIndex = index;
  gameState.placedWords = [];
  renderGame();
  document.getElementById("success-screen").classList.add("hidden");
}

function renderGame() {
  const level = levels[currentLevelIndex];
  renderSlots(level);
  renderBank(level);
  renderConnections(level);
  updateHints();
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
    
    wrapper.appendChild(wordDiv);
    bankContainer.appendChild(wrapper);
  });
}

function renderConnections(level) {
  const svg = document.getElementById("svg-connections");
  svg.innerHTML = "";
  
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
      line.setAttribute("stroke", "#2196f3");
      line.setAttribute("stroke-width", "3");
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
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // side: 0=top, 1=right, 2=bottom, 3=left
  switch (side) {
    case 0: return { x: centerX, y: rect.top };
    case 1: return { x: rect.right, y: centerY };
    case 2: return { x: centerX, y: rect.bottom };
    case 3: return { x: rect.left, y: centerY };
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

function startDragFromBank(e, word, bankIndex) {
  e.preventDefault();
  
  const element = e.currentTarget;
  const rect = element.getBoundingClientRect();
  
  gameState.draggedElement = element;
  gameState.dragData = {
    word,
    bankIndex,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    source: "bank"
  };
  
  element.classList.add("dragging");
  element.style.position = "fixed";
  element.style.left = (e.clientX - gameState.dragData.offsetX) + "px";
  element.style.top = (e.clientY - gameState.dragData.offsetY) + "px";
  element.style.zIndex = "1000";
  
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
}

function startDragFromSlot(e, slotIndex, placedWord) {
  e.preventDefault();
  
  const slot = e.currentTarget;
  const rect = slot.getBoundingClientRect();
  
  // Create a temporary drag element
  const tempElement = document.createElement("div");
  tempElement.className = "bank-word dragging";
  placedWord.word.split("").forEach(letter => {
    const span = document.createElement("span");
    span.className = "bank-letter";
    span.textContent = letter;
    tempElement.appendChild(span);
  });
  
  tempElement.style.position = "fixed";
  tempElement.style.left = rect.left + "px";
  tempElement.style.top = rect.top + "px";
  tempElement.style.zIndex = "1000";
  document.body.appendChild(tempElement);
  
  gameState.draggedElement = tempElement;
  gameState.dragData = {
    word: placedWord.word,
    bankIndex: placedWord.bankIndex,
    slotIndex: slotIndex,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    source: "slot",
    tempElement: true
  };
  
  // Remove from slot but DON'T re-render yet (keeps bank word hidden)
  gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
  renderSlots(levels[currentLevelIndex]);
  renderConnections(levels[currentLevelIndex]);
  updateHints();
  
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
}

function onDragMove(e) {
  if (!gameState.draggedElement || !gameState.dragData) return;
  
  const x = e.clientX - gameState.dragData.offsetX;
  const y = e.clientY - gameState.dragData.offsetY;
  
  gameState.draggedElement.style.left = x + "px";
  gameState.draggedElement.style.top = y + "px";
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
    // Dropped outside - animate back
    animateBack();
  }
}

function animateBack() {
  if (!gameState.draggedElement || !gameState.dragData) return;
  
  const { source, bankIndex } = gameState.dragData;
  
  if (source === "bank") {
    // Animate back to bank
    const originalElement = document.querySelector(`[data-bank-index="${bankIndex}"]`);
    if (originalElement) {
      const rect = originalElement.getBoundingClientRect();
      
      gameState.draggedElement.style.transition = "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
      gameState.draggedElement.style.left = rect.left + "px";
      gameState.draggedElement.style.top = rect.top + "px";
      
      setTimeout(() => {
        cleanupDrag(true);
      }, 300);
    }
  } else {
    // From slot - animate to bank position then show original
    const originalElement = document.querySelector(`[data-bank-index="${bankIndex}"]`);
    if (originalElement) {
      const rect = originalElement.getBoundingClientRect();
      
      gameState.draggedElement.style.transition = "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
      gameState.draggedElement.style.left = rect.left + "px";
      gameState.draggedElement.style.top = rect.top + "px";
      
      setTimeout(() => {
        cleanupDrag(true);
      }, 300);
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

let editorLevel = {
  slots: [],
  bank: [],
  connections: []
};

function showEditor() {
  document.getElementById("editor-screen").classList.remove("hidden");
  document.getElementById("game-container").style.display = "none";
  
  setupEditorListeners();
  renderEditor();
}

function setupEditorListeners() {
  document.getElementById("editor-add-slot").addEventListener("click", () => {
    const input = document.getElementById("editor-slot-input");
    const word = input.value.trim().toUpperCase();
    if (word) {
      editorLevel.slots.push(word);
      input.value = "";
      renderEditor();
    }
  });
  
  document.getElementById("editor-add-bank").addEventListener("click", () => {
    const input = document.getElementById("editor-bank-input");
    const word = input.value.trim().toUpperCase();
    if (word) {
      editorLevel.bank.push(word);
      input.value = "";
      renderEditor();
    }
  });
  
  document.getElementById("editor-add-conn").addEventListener("click", () => {
    const input = document.getElementById("editor-conn-input");
    const conn = input.value.trim();
    if (conn && /^\d{3},\d{3}$/.test(conn)) {
      editorLevel.connections.push(conn);
      input.value = "";
      renderEditor();
    }
  });
  
  document.getElementById("editor-save").addEventListener("click", () => {
    if (editorLevel.slots.length > 0 && editorLevel.bank.length > 0) {
      levels.push({
        slots: [...editorLevel.slots],
        bank: [...editorLevel.bank],
        connections: [...editorLevel.connections]
      });
      saveLevels();
      alert("Level saved successfully!");
      
      // Reset editor
      editorLevel = { slots: [], bank: [], connections: [] };
      renderEditor();
    } else {
      alert("Please add at least one slot and one bank word.");
    }
  });
  
  document.getElementById("editor-exit").addEventListener("click", () => {
    window.location.href = window.location.pathname;
  });
}

function renderEditor() {
  // Render slots
  const slotsList = document.getElementById("editor-slots-list");
  slotsList.innerHTML = "";
  editorLevel.slots.forEach((word, index) => {
    const item = document.createElement("div");
    item.className = "editor-item";
    item.innerHTML = `
      <span>Slot ${index}: ${word}</span>
      <button class="remove-btn" data-type="slot" data-index="${index}">×</button>
    `;
    slotsList.appendChild(item);
  });
  
  // Render bank
  const bankList = document.getElementById("editor-bank-list");
  bankList.innerHTML = "";
  editorLevel.bank.forEach((word, index) => {
    const item = document.createElement("div");
    item.className = "editor-item";
    item.innerHTML = `
      <span>${word}</span>
      <button class="remove-btn" data-type="bank" data-index="${index}">×</button>
    `;
    bankList.appendChild(item);
  });
  
  // Render connections
  const connList = document.getElementById("editor-conn-list");
  connList.innerHTML = "";
  editorLevel.connections.forEach((conn, index) => {
    const item = document.createElement("div");
    item.className = "editor-item";
    item.innerHTML = `
      <span>${conn}</span>
      <button class="remove-btn" data-type="conn" data-index="${index}">×</button>
    `;
    connList.appendChild(item);
  });
  
  // Add remove listeners
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const type = e.target.dataset.type;
      const index = parseInt(e.target.dataset.index);
      
      if (type === "slot") editorLevel.slots.splice(index, 1);
      else if (type === "bank") editorLevel.bank.splice(index, 1);
      else if (type === "conn") editorLevel.connections.splice(index, 1);
      
      renderEditor();
    });
  });
}

// ============================
// START APPLICATION
// ============================

document.addEventListener("DOMContentLoaded", init);
