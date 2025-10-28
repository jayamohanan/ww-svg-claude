// ============================
// RENDERING FUNCTIONS
// ============================

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
