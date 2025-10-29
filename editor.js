// ============================
// LEVEL EDITOR
// ============================

// Track selected squares for drawing connections
let drawModeEnabled = false;
let selectedSquares = []; // Array of {slotIndex, squareIndex, element}

function showEditor() {
  // Hide old game and editor screens
  const gameContainer = document.getElementById("game-container");
  console.log('gameContainer:', gameContainer);
  if (gameContainer) gameContainer.style.display = "none";
  const editorScreen = document.getElementById("editor-screen");
  if (editorScreen) editorScreen.style.display = "none";
  // Show new editor container
  const editorContainer = document.getElementById("editor-container");
  if (editorContainer) {
    editorContainer.classList.add('show');
  }
  setupNewEditorListeners();
  renderEditorGameView();
  updateWordList(); // Initialize word list display
  updateConnectionList(); // Initialize connection list display
}

function setupNewEditorListeners() {
  // Draw mode toggle
  document.getElementById("editor-draw-toggle").onchange = (e) => {
    drawModeEnabled = e.target.checked;
    selectedSquares = [];
    updateSelectionInfo();
    updateDrawButton();
    // Remove all highlights
    document.querySelectorAll('.word-cell').forEach(cell => {
      cell.style.outline = '';
    });
  };
  
  // Draw connection button
  document.getElementById("editor-draw-connection").onclick = () => {
    if (selectedSquares.length === 2) {
      const connectionString = generateConnectionString(selectedSquares[0], selectedSquares[1]);
      if (connectionString) {
        editorLevel.connections.push(connectionString);
        console.log('Added connection:', connectionString);
        updateConnectionList();
        renderEditorGameView();
        // Clear selection
        selectedSquares.forEach(sq => sq.element.style.outline = '');
        selectedSquares = [];
        updateSelectionInfo();
        updateDrawButton();
      }
    }
  };
  
  // Add word function (reusable)
  const addWord = () => {
    const input = document.getElementById("editor-word-input");
    const word = input.value.trim().toUpperCase();
    if (word) {
      editorLevel.bank.push(word);
      // Add a slot with the same length, positioned at center for the first slot
      const slotCount = editorLevel.slots.length;
      let newSlot;
      // Calculate x so that the slot's center aligns with grid cell centers for odd, and with grid cell edges for even
      // For even length, offset by half a grid step to the left (in percent)
      const step = CONFIG.gridStep;
      const slotsArea = document.getElementById('editor-word-slots-area');
      const areaWidth = slotsArea ? slotsArea.offsetWidth : 1;
      let xCenter = 50;
      if (word.length % 2 === 0) {
        // Offset by half a step to the left (in percent)
        xCenter = 50 - ((step / 2) / areaWidth) * 100;
      }
      newSlot = {
        length: word.length,
        x: xCenter,
        y: 50
      };
      console.log('Adding new slot:', newSlot);
      editorLevel.slots.push(newSlot);
      input.value = "";
      renderEditorGameView();
      updateWordList(); // Update the word list display
    }
  };
  
  // Add word button click
  document.getElementById("editor-add-word").onclick = addWord;
  
  // Add word on Enter key press
  document.getElementById("editor-word-input").addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addWord();
    }
  });
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

function saveLevels() {
  // Saving to file is not possible from browser JS, so just show JSON for manual copy-paste
  showEditorLevelJSON();
}

function renderEditorGameView() {
  const slotsArea = document.getElementById("editor-word-slots-area");
  let gridCanvas = document.getElementById("editor-grid-bg");
  let slotsContainer = document.getElementById("editor-word-slots");
  // Create grid canvas if not present
  if (!gridCanvas) {
    gridCanvas = document.createElement('canvas');
    gridCanvas.id = 'editor-grid-bg';
    gridCanvas.style.position = 'absolute';
    gridCanvas.style.left = '0';
    gridCanvas.style.top = '0';
    gridCanvas.style.width = '100%';
    gridCanvas.style.height = '100%';
    gridCanvas.style.zIndex = '0';
    gridCanvas.style.pointerEvents = 'none';
    slotsArea.appendChild(gridCanvas);
  } else {
    gridCanvas.style.zIndex = '0';
    gridCanvas.style.pointerEvents = 'none';
  }
  // Create slots container if not present
  if (!slotsContainer) {
    slotsContainer = document.createElement('div');
    slotsContainer.id = 'editor-word-slots';
    slotsContainer.style.position = 'absolute';
    slotsContainer.style.left = '0';
    slotsContainer.style.top = '0';
    slotsContainer.style.width = '100%';
    slotsContainer.style.height = '100%';
    slotsContainer.style.zIndex = '10';
    slotsContainer.style.pointerEvents = 'auto';
    slotsArea.appendChild(slotsContainer);
  } else {
    slotsContainer.style.position = 'absolute';
    slotsContainer.style.left = '0';
    slotsContainer.style.top = '0';
    slotsContainer.style.width = '100%';
    slotsContainer.style.height = '100%';
    slotsContainer.style.zIndex = '10';
    slotsContainer.style.pointerEvents = 'auto';
  }
  // Set up area and canvas to fill parent
  slotsArea.style.position = 'relative';
  slotsArea.style.width = '100%';
  slotsArea.style.height = '100%';
  gridCanvas.width = slotsArea.offsetWidth;
  gridCanvas.height = slotsArea.offsetHeight;
  // Draw grid
  drawEditorGrid(gridCanvas);
  slotsContainer.innerHTML = "";
  editorLevel.slots.forEach((slotData, slotIndex) => {
    const slotDiv = document.createElement("div");
    slotDiv.className = "word-slot";
    slotDiv.dataset.slotIndex = slotIndex;
    slotDiv.style.position = 'absolute';
    slotDiv.style.left = slotData.x + '%';
    slotDiv.style.top = slotData.y + '%';
    slotDiv.style.transform = 'translate(-50%, -50%)'; // Center the slot
    slotDiv.style.cursor = 'move';
    // Add cells based on slot length
    for (let i = 0; i < slotData.length; i++) {
      const cell = document.createElement("div");
      cell.className = "word-cell";
      cell.dataset.cellIndex = i;
      cell.dataset.slotIndex = slotIndex;
      
      // Add click handler for draw mode
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSquareClick(slotIndex, i, cell);
      });
      
      // Visual feedback on hover in draw mode
      cell.addEventListener('mouseenter', () => {
        if (drawModeEnabled) {
          cell.style.backgroundColor = '#e3f2fd';
        }
      });
      cell.addEventListener('mouseleave', () => {
        if (drawModeEnabled && !selectedSquares.some(sq => sq.element === cell)) {
          cell.style.backgroundColor = '';
        }
      });
      
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
    console.log('Slot drag start', slotIndex, 'Slot data:', editorLevel.slots[slotIndex]);
    isDragging = true;
    const rect = slotDiv.parentElement.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    // Always use slot data for initial position
    initialLeft = editorLevel.slots[slotIndex].x || 50;
    initialTop = editorLevel.slots[slotIndex].y || 50;
    console.log('Initial position:', initialLeft, initialTop);
    e.preventDefault();
  };
  
  const onMouseMove = (e) => {
    if (!isDragging) return;
    const rect = slotDiv.parentElement.getBoundingClientRect();
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    // Convert pixel delta to percentage
    let newX = initialLeft + (deltaX / rect.width) * 100;
    let newY = initialTop + (deltaY / rect.height) * 100;
    // Snap to grid cell center (in px)
    const step = CONFIG.gridStep;
    let pxX = (newX / 100) * rect.width;
    let pxY = (newY / 100) * rect.height;
    // Find the center of the canvas
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Offset so that grid cell centers are at centerX, centerY and spaced by step
    let offsetX = ((pxX - centerX) / step);
    let offsetY = ((pxY - centerY) / step);
    // For even-length slots, snap to midpoint between grid cell centers
    const slotLength = editorLevel.slots[slotIndex].length;
    let evenOffset = 0;
    if (slotLength % 2 === 0) {
      evenOffset = step / 2;
    }
    pxX = centerX + Math.round(offsetX) * step + evenOffset;
    pxY = centerY + Math.round(offsetY) * step;
    // Convert back to percent
    newX = (pxX / rect.width) * 100;
    newY = (pxY / rect.height) * 100;
    // Clamp
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));
    slotDiv.style.left = newX + '%';
    slotDiv.style.top = newY + '%';
    // Update data
    editorLevel.slots[slotIndex].x = newX;
    editorLevel.slots[slotIndex].y = newY;
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

// Draws a grid of points in the editor background
function drawEditorGrid(canvas) {
  const step = CONFIG.gridStep;
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Find the offset so that the center of the canvas is the center of a grid cell
  const centerX = Math.round(canvas.width / 2);
  const centerY = Math.round(canvas.height / 2);
  // The first vertical line to the right of center
  const firstVLine = centerX + step / 2;
  // The first horizontal line below center
  const firstHLine = centerY + step / 2;

  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1;

  // Draw vertical lines
  for (let x = firstVLine; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let x = firstVLine - step; x > 0; x -= step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = firstHLine; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  for (let y = firstHLine - step; y > 0; y -= step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Optionally, draw a green rectangle at the central cell
  ctx.save();
  ctx.strokeStyle = 'green';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - step/2, centerY - step/2, step, step);
  ctx.restore();
}

// ============================
// WORD LIST MANAGEMENT
// ============================

function updateWordList() {
  const wordListContainer = document.getElementById('editor-word-list');
  if (!wordListContainer) return;
  
  // Clear existing list
  wordListContainer.innerHTML = '';
  
  if (editorLevel.bank.length === 0) {
    wordListContainer.innerHTML = '<div style="color:#999; font-size:12px; text-align:center; padding:8px;">No words added yet</div>';
    return;
  }
  
  // Create list items for each word
  editorLevel.bank.forEach((word, index) => {
    const wordItem = document.createElement('div');
    wordItem.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 8px; margin-bottom:6px; background:#f5f5f5; border-radius:4px; border:1px solid #ddd;';
    
    const wordText = document.createElement('span');
    wordText.textContent = word;
    wordText.style.cssText = 'font-weight:bold; color:#333; font-size:13px;';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete word';
    deleteBtn.style.cssText = 'background:#f44336; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center; padding:0;';
    deleteBtn.onclick = () => deleteWord(index);
    
    // Hover effect
    deleteBtn.onmouseenter = () => deleteBtn.style.background = '#d32f2f';
    deleteBtn.onmouseleave = () => deleteBtn.style.background = '#f44336';
    
    wordItem.appendChild(wordText);
    wordItem.appendChild(deleteBtn);
    wordListContainer.appendChild(wordItem);
  });
}

function deleteWord(index) {
  if (index < 0 || index >= editorLevel.bank.length) return;
  
  // Remove word from bank
  editorLevel.bank.splice(index, 1);
  
  // Remove corresponding slot
  if (index < editorLevel.slots.length) {
    editorLevel.slots.splice(index, 1);
  }
  
  // Update the display
  renderEditorGameView();
  updateWordList();
}

// ============================
// CONNECTION DRAWING SYSTEM
// ============================

function updateSelectionInfo() {
  const infoDiv = document.getElementById('editor-selection-info');
  if (!infoDiv) return;
  
  if (!drawModeEnabled) {
    infoDiv.textContent = 'Enable Draw Mode to select squares';
    return;
  }
  
  if (selectedSquares.length === 0) {
    infoDiv.textContent = 'Select first square';
  } else if (selectedSquares.length === 1) {
    infoDiv.textContent = `Slot ${selectedSquares[0].slotIndex}, Square ${selectedSquares[0].squareIndex} selected. Select second square.`;
  } else {
    infoDiv.textContent = `Two squares selected. Click Draw Connection.`;
  }
}

function updateDrawButton() {
  const btn = document.getElementById('editor-draw-connection');
  if (!btn) return;
  
  const canDraw = drawModeEnabled && selectedSquares.length === 2 && 
                  selectedSquares[0].slotIndex !== selectedSquares[1].slotIndex;
  
  btn.disabled = !canDraw;
  btn.style.opacity = canDraw ? '1' : '0.5';
  btn.style.cursor = canDraw ? 'pointer' : 'not-allowed';
}

function handleSquareClick(slotIndex, squareIndex, element) {
  if (!drawModeEnabled) return;
  
  // Check if this square is already selected
  const alreadySelected = selectedSquares.findIndex(
    sq => sq.slotIndex === slotIndex && sq.squareIndex === squareIndex
  );
  
  if (alreadySelected !== -1) {
    // Deselect
    selectedSquares[alreadySelected].element.style.outline = '';
    selectedSquares.splice(alreadySelected, 1);
  } else {
    // If selecting from same slot as already selected, replace the old selection
    const sameSlotIndex = selectedSquares.findIndex(sq => sq.slotIndex === slotIndex);
    if (sameSlotIndex !== -1) {
      selectedSquares[sameSlotIndex].element.style.outline = '';
      selectedSquares.splice(sameSlotIndex, 1);
    }
    
    // Add new selection (max 2)
    if (selectedSquares.length < 2) {
      element.style.outline = '3px solid #4caf50';
      selectedSquares.push({ slotIndex, squareIndex, element });
    } else {
      // Replace oldest selection
      selectedSquares[0].element.style.outline = '';
      selectedSquares.shift();
      element.style.outline = '3px solid #4caf50';
      selectedSquares.push({ slotIndex, squareIndex, element });
    }
  }
  
  updateSelectionInfo();
  updateDrawButton();
}

function generateConnectionString(sq1, sq2) {
  // Get the position of each square in the viewport
  const rect1 = sq1.element.getBoundingClientRect();
  const rect2 = sq2.element.getBoundingClientRect();
  
  // Calculate center points
  const center1 = {
    x: rect1.left + rect1.width / 2,
    y: rect1.top + rect1.height / 2
  };
  const center2 = {
    x: rect2.left + rect2.width / 2,
    y: rect2.top + rect2.height / 2
  };
  
  // Determine valid sides for each square based on position in slot
  const slot1Length = editorLevel.slots[sq1.slotIndex].length;
  const slot2Length = editorLevel.slots[sq2.slotIndex].length;
  
  const validSides1 = getValidSides(sq1.squareIndex, slot1Length);
  const validSides2 = getValidSides(sq2.squareIndex, slot2Length);
  
  // Calculate midpoints for each side
  const midpoints1 = calculateSideMidpoints(rect1, validSides1);
  const midpoints2 = calculateSideMidpoints(rect2, validSides2);
  
  // Find closest pair of midpoints
  let minDist = Infinity;
  let bestSide1 = 0;
  let bestSide2 = 0;
  
  midpoints1.forEach((mp1, side1) => {
    if (mp1 === null) return;
    midpoints2.forEach((mp2, side2) => {
      if (mp2 === null) return;
      const dist = Math.sqrt(Math.pow(mp1.x - mp2.x, 2) + Math.pow(mp1.y - mp2.y, 2));
      if (dist < minDist) {
        minDist = dist;
        bestSide1 = side1;
        bestSide2 = side2;
      }
    });
  });
  
  // Format: slotIndex squareIndex side - slotIndex squareIndex side
  // e.g., "002-100" means slot 0, square 0, side 2 connects to slot 1, square 0, side 0
  const part1 = `${sq1.slotIndex}${sq1.squareIndex}${bestSide1}`;
  const part2 = `${sq2.slotIndex}${sq2.squareIndex}${bestSide2}`;
  
  return `${part1}-${part2}`;
}

function getValidSides(squareIndex, slotLength) {
  // 0: top, 1: right, 2: bottom, 3: left
  // Ignore sides that connect to adjacent squares in the SAME slot
  // Slots are horizontal: [sq0][sq1][sq2]
  if (slotLength === 1) {
    // Single square slot - all sides available
    return [true, true, true, true];
  } else if (squareIndex === 0) {
    // First square: has square to its RIGHT, so keep left side, ignore right
    return [true, false, true, true];
  } else if (squareIndex === slotLength - 1) {
    // Last square: has square to its LEFT, so keep right side, ignore left
    return [true, true, true, false];
  } else {
    // Middle square: has squares on both left and right, only top and bottom available
    return [true, false, true, false];
  }
}

function calculateSideMidpoints(rect, validSides) {
  const midpoints = [null, null, null, null];
  
  if (validSides[0]) {
    // Top
    midpoints[0] = { x: rect.left + rect.width / 2, y: rect.top };
  }
  if (validSides[1]) {
    // Right
    midpoints[1] = { x: rect.right, y: rect.top + rect.height / 2 };
  }
  if (validSides[2]) {
    // Bottom
    midpoints[2] = { x: rect.left + rect.width / 2, y: rect.bottom };
  }
  if (validSides[3]) {
    // Left
    midpoints[3] = { x: rect.left, y: rect.top + rect.height / 2 };
  }
  
  return midpoints;
}

function updateConnectionList() {
  const listContainer = document.getElementById('editor-connection-list');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';
  
  if (editorLevel.connections.length === 0) {
    listContainer.innerHTML = '<div style="color:#999; font-size:12px; text-align:center;">No connections yet</div>';
    return;
  }
  
  editorLevel.connections.forEach((conn, index) => {
    const connItem = document.createElement('div');
    connItem.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 8px; margin-bottom:6px; background:#f5f5f5; border-radius:4px; border:1px solid #ddd;';
    
    const connText = document.createElement('span');
    connText.textContent = conn;
    connText.style.cssText = 'font-family:monospace; color:#333; font-size:12px;';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete connection';
    deleteBtn.style.cssText = 'background:#f44336; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center; padding:0;';
    deleteBtn.onclick = () => deleteConnection(index);
    
    deleteBtn.onmouseenter = () => deleteBtn.style.background = '#d32f2f';
    deleteBtn.onmouseleave = () => deleteBtn.style.background = '#f44336';
    
    connItem.appendChild(connText);
    connItem.appendChild(deleteBtn);
    listContainer.appendChild(connItem);
  });
}

function deleteConnection(index) {
  if (index < 0 || index >= editorLevel.connections.length) return;
  
  editorLevel.connections.splice(index, 1);
  updateConnectionList();
  renderEditorGameView();
}
