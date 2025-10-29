// ============================
// DRAG AND DROP HANDLERS
// ============================

// Detect if device is mobile
function detectMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
}

// Initialize mobile detection
gameState.isMobile = detectMobile();

// ============================
// MOBILE TAP-TO-SELECT SYSTEM
// ============================

// Get next unfilled slot index
function getNextUnfilledSlot() {
  const level = levels[currentLevelIndex];
  if (!level) return 0;
  
  for (let i = 0; i < level.slots.length; i++) {
    const isSlotFilled = gameState.placedWords.some(pw => pw.slotIndex === i);
    if (!isSlotFilled) {
      return i;
    }
  }
  return 0; // Fallback
}

// Select a slot (for mobile tap mode)
function selectSlot(slotIndex) {
  gameState.selectedSlotIndex = slotIndex;
  renderSlots(levels[currentLevelIndex]); // Re-render to show selection
}

// Handle slot tap on mobile
function handleSlotTap(slotIndex) {
  if (!gameState.isMobile) return;
  
  // Check if slot is filled
  const placedWord = gameState.placedWords.find(pw => pw.slotIndex === slotIndex);
  
  if (placedWord) {
    // Slot is filled - remove word and select this slot
    removeWordFromSlot(slotIndex);
  } else {
    // Slot is empty - just select it
    selectSlot(slotIndex);
  }
}

// Remove word from slot and animate back to bank
function removeWordFromSlot(slotIndex) {
  const placedWord = gameState.placedWords.find(pw => pw.slotIndex === slotIndex);
  if (!placedWord) return;
  
  // Get slot and bank positions for animation
  const slotElement = document.querySelectorAll('.word-slot')[slotIndex];
  const bankArea = document.getElementById('word-bank');
  const bankElement = document.querySelector(`.bank-word[data-bank-index="${placedWord.bankIndex}"]`);
  
  if (slotElement && bankArea && bankElement) {
    const slotRect = slotElement.getBoundingClientRect();
    const bankRect = bankElement.getBoundingClientRect();
    
    // Remove word from gameState IMMEDIATELY to clear the slot
    gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
    
    // Re-render to show empty slot (but keep bank word hidden during animation)
    renderSlots(levels[currentLevelIndex]);
    renderBank(levels[currentLevelIndex]);
    updateHints();
    
    // Hide the bank word that we're animating back to
    const updatedBankElement = document.querySelector(`.bank-word[data-bank-index="${placedWord.bankIndex}"]`);
    if (updatedBankElement) {
      updatedBankElement.style.visibility = 'hidden';
    }
    
    // Create animated ghost word element from slot position
    const animWord = document.createElement('div');
    animWord.className = 'bank-word';
    animWord.style.position = 'fixed';
    animWord.style.left = slotRect.left + 'px';
    animWord.style.top = slotRect.top + 'px';
    animWord.style.zIndex = '1000';
    animWord.style.transition = 'all 0.3s linear';
    
    placedWord.word.split('').forEach(letter => {
      const span = document.createElement('span');
      span.className = 'bank-letter';
      span.textContent = letter;
      animWord.appendChild(span);
    });
    
    document.body.appendChild(animWord);
    
    // Animate to bank position
    requestAnimationFrame(() => {
      animWord.style.left = bankRect.left + 'px';
      animWord.style.top = bankRect.top + 'px';
    });
    
    setTimeout(() => {
      animWord.remove();
      // Restore bank word visibility
      if (updatedBankElement) {
        updatedBankElement.style.visibility = 'visible';
      }
      // Select this now-empty slot
      selectSlot(slotIndex);
    }, 300);
  } else {
    // Fallback without animation
    gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
    selectSlot(slotIndex);
    renderSlots(levels[currentLevelIndex]);
    renderBank(levels[currentLevelIndex]);
    updateHints();
  }
}

// Handle word tap on mobile
function handleWordTap(word, bankIndex) {
  if (!gameState.isMobile) return;
  
  const selectedSlot = gameState.selectedSlotIndex;
  if (selectedSlot === null || selectedSlot === undefined) return;
  
  const level = levels[currentLevelIndex];
  const slot = level.slots[selectedSlot];
  if (!slot) return;
  
  // Check if slot is already filled
  const alreadyFilled = gameState.placedWords.some(pw => pw.slotIndex === selectedSlot);
  if (alreadyFilled) return;
  
  // Validate constraints BEFORE animation
  const constraintCheck = checkConstraints(word, selectedSlot);
  
  // Get positions for animation
  const bankElement = document.querySelector(`.bank-word[data-bank-index="${bankIndex}"]`);
  const slotElement = document.querySelectorAll('.word-slot')[selectedSlot];
  
  if (bankElement && slotElement) {
    const bankRect = bankElement.getBoundingClientRect();
    const slotRect = slotElement.getBoundingClientRect();
    
    // Hide original bank word IMMEDIATELY before creating ghost
    bankElement.style.visibility = 'hidden';
    
    // Create animated ghost word element
    const animWord = document.createElement('div');
    animWord.className = 'bank-word';
    animWord.style.position = 'fixed';
    animWord.style.left = bankRect.left + 'px';
    animWord.style.top = bankRect.top + 'px';
    animWord.style.zIndex = '1000';
    animWord.style.transition = 'all 0.4s linear';
    
    word.split('').forEach(letter => {
      const span = document.createElement('span');
      span.className = 'bank-letter';
      span.textContent = letter;
      animWord.appendChild(span);
    });
    
    document.body.appendChild(animWord);
    
    // Animate ghost to slot position
    requestAnimationFrame(() => {
      animWord.style.left = slotRect.left + 'px';
      animWord.style.top = slotRect.top + 'px';
    });
    
    setTimeout(() => {
      // Remove ghost
      animWord.remove();
      
      // Check if constraints are satisfied
      if (!constraintCheck.valid) {
        // Show error and restore bank word
        if (constraintCheck.reason === 'hint' && constraintCheck.cellIndex !== undefined) {
          showErrorAtSlotCell(selectedSlot, constraintCheck.cellIndex);
        }
        
        // Restore original bank word visibility
        bankElement.style.visibility = 'visible';
      } else {
        // Place word in slot (bank word stays hidden, will be shown as invisible in renderBank)
        placeWordInSlot(word, selectedSlot, bankIndex);
      }
    }, 400);
  } else {
    // Fallback without animation
    const constraintCheck = checkConstraints(word, selectedSlot);
    if (constraintCheck.valid) {
      placeWordInSlot(word, selectedSlot, bankIndex);
    }
  }
}

// Place word in slot (used by both drag-drop and tap-select)
function placeWordInSlot(word, slotIndex, bankIndex) {
  gameState.placedWords.push({ word, slotIndex, bankIndex });
  undoStack.push({ word, slotIndex, bankIndex });
  
  // Select next unfilled slot
  gameState.selectedSlotIndex = getNextUnfilledSlot();
  
  // Re-render
  renderSlots(levels[currentLevelIndex]);
  renderBank(levels[currentLevelIndex]);
  updateHints();
  checkLevelComplete();
}

// ============================
// DRAG AND DROP (DESKTOP)
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
          const rect = slot.getBoundingClientRect();
          showError(rect.left + rect.width/2, rect.top + rect.height/2);
        } else if (result.reason === 'hint') {
          const cell = slot.querySelector(`[data-cell-index="${result.cellIndex}"]`);
          if (cell) {
            const rect = cell.getBoundingClientRect();
            showError(rect.left + rect.width/2, rect.top + rect.height/2);
          } else {
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
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  const ghost = element.cloneNode(true);
  ghost.classList.add("dragging");
  ghost.style.position = "fixed";
  ghost.style.left = (e.clientX - offsetX) + "px";
  ghost.style.top = (e.clientY - offsetY) + "px";
  ghost.style.zIndex = "1000";
  ghost.style.transform = "none";
  document.body.appendChild(ghost);
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
  gameState.placedWords = gameState.placedWords.filter(pw => pw.slotIndex !== slotIndex);
  renderSlots(levels[currentLevelIndex]);
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
      const result = checkConstraints(word, index);
      if (result.valid) {
        placeWord(word, index, bankIndex);
        if (gameState.draggedElement) {
          gameState.draggedElement.remove();
        }
        if (gameState.dragData && gameState.dragData.originalElement) {
          gameState.dragData.originalElement.classList.remove("invisible");
        }
        gameState.draggedElement = null;
        gameState.dragData = null;
      } else {
        if (result.reason === 'length') {
          const rect = slot.getBoundingClientRect();
          showError(rect.left + rect.width/2, rect.top + rect.height/2);
        } else if (result.reason === 'hint') {
          const cell = slot.querySelector(`[data-cell-index="${result.cellIndex}"]`);
          if (cell) {
            const rect = cell.getBoundingClientRect();
            showError(rect.left + rect.width/2, rect.top + rect.height/2);
          } else {
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
    animateBack();
  }
}

function animateBack() {
  if (!gameState.draggedElement || !gameState.dragData) return;
  const { source, bankIndex, originalRect, originalElement } = gameState.dragData;
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

function cleanupDrag(restoreWord) {
  if (restoreWord && gameState.dragData && gameState.dragData.source === "slot") {
    const { word, bankIndex, slotIndex } = gameState.dragData;
    gameState.placedWords.push({ word, slotIndex, bankIndex });
    renderSlots(levels[currentLevelIndex]);
    updateHints();
  }
  gameState.draggedElement = null;
  gameState.dragData = null;
}

function showError(x, y) {
  const errorX = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  errorX.classList.add("error-cross");
  errorX.setAttribute("viewBox", "0 0 40 40");
  errorX.style.left = (x - 20) + "px";
  errorX.style.top = (y - 20) + "px";
  
  const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line1.setAttribute("x1", "10");
  line1.setAttribute("y1", "10");
  line1.setAttribute("x2", "30");
  line1.setAttribute("y2", "30");
  line1.setAttribute("stroke", "#f44336");
  line1.setAttribute("stroke-width", "4");
  line1.setAttribute("stroke-linecap", "round");
  
  const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line2.setAttribute("x1", "30");
  line2.setAttribute("y1", "10");
  line2.setAttribute("x2", "10");
  line2.setAttribute("y2", "30");
  line2.setAttribute("stroke", "#f44336");
  line2.setAttribute("stroke-width", "4");
  line2.setAttribute("stroke-linecap", "round");
  
  errorX.appendChild(line1);
  errorX.appendChild(line2);
  document.body.appendChild(errorX);
  
  setTimeout(() => errorX.remove(), 700);
}

function showErrorAtSlotCell(slotIndex, cellIndex) {
  const slotElement = document.querySelectorAll('.word-slot')[slotIndex];
  if (!slotElement) return;
  
  const cellElement = slotElement.querySelector(`[data-cell-index="${cellIndex}"]`);
  if (!cellElement) return;
  
  const rect = cellElement.getBoundingClientRect();
  showError(rect.left + rect.width / 2, rect.top + rect.height / 2);
}
