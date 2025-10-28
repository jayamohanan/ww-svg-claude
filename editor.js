// ============================
// LEVEL EDITOR
// ============================

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
}

function setupNewEditorListeners() {
  document.getElementById("editor-add-word").onclick = () => {
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
