// ============================
// UTILITY FUNCTIONS
// ============================

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isEditorMode() {
  return isEditor;
}

function parseCellPosition(str) {
  const slotIndex = parseInt(str[0]);
  const cellIndex = parseInt(str[1]);
  const side = parseInt(str[2]);
  return { slotIndex, cellIndex, side };
}

function getCellSideCenter(slotIndex, cellIndex, side) {
  const slotsContainer = document.getElementById("word-slots");
  if (!slotsContainer) return null;
  
  const slotDiv = slotsContainer.children[slotIndex];
  if (!slotDiv) return null;
  
  const cell = slotDiv.children[cellIndex];
  if (!cell) return null;
  
  const rect = cell.getBoundingClientRect();
  const containerRect = document.getElementById("game-container").getBoundingClientRect();
  
  const relativeRect = {
    left: rect.left - containerRect.left,
    top: rect.top - containerRect.top,
    width: rect.width,
    height: rect.height
  };
  
  let x, y;
  switch (side) {
    case 0: // top
      x = relativeRect.left + relativeRect.width / 2;
      y = relativeRect.top;
      break;
    case 1: // right
      x = relativeRect.left + relativeRect.width;
      y = relativeRect.top + relativeRect.height / 2;
      break;
    case 2: // bottom
      x = relativeRect.left + relativeRect.width / 2;
      y = relativeRect.top + relativeRect.height;
      break;
    case 3: // left
      x = relativeRect.left;
      y = relativeRect.top + relativeRect.height / 2;
      break;
  }
  
  return { x, y };
}

function updateUndoCount() {
  const undoCountSpan = document.getElementById("undo-count");
  if (undoCountSpan) {
    undoCountSpan.textContent = undoCount;
  }
}
