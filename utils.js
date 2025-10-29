// ============================
// UTILITY FUNCTIONS
// ============================

// Constants for cell sides
const CELL_SIDES = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3
};

/**
 * Shuffles array in place using Fisher-Yates algorithm
 * @param {Array} arr - The array to shuffle
 * @returns {Array} The shuffled array
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Checks if currently in editor mode
 * @returns {boolean} True if in editor mode
 */
function isEditorMode() {
  return isEditor;
}

/**
 * Parses a cell position string into its components
 * Format: "XYZ" where X=slotIndex, Y=cellIndex, Z=side
 * @param {string} str - The position string (e.g., "022" or "022-100")
 * @returns {Object} Object with slotIndex, cellIndex, and side properties
 */
function parseCellPosition(str) {  
  // Handle undefined or null
  if (!str) {
    console.error('parseCellPosition received undefined or null:', str);
    return { slotIndex: 0, cellIndex: 0, side: 0 };
  }
  
  // Ensure str is a string
  str = String(str).trim();
  
  // Extract the 3-digit code (e.g., "022" from "022-100" or just "022")
  const match = str.match(/(\d{3})/);
  if (!match) {
    console.error('Invalid cell position format:', str);
    return { slotIndex: 0, cellIndex: 0, side: 0 };
  }
  
  const code = match[1];
  return {
    slotIndex: parseInt(code[0], 10),
    cellIndex: parseInt(code[1], 10),
    side: parseInt(code[2], 10)
  };
}

/**
 * Gets the center point of a specific side of a cell
 * @param {number} slotIndex - The slot index
 * @param {number} cellIndex - The cell index within the slot
 * @param {number} side - The side (0=top, 1=right, 2=bottom, 3=left)
 * @returns {Object|null} Object with x, y coordinates or null if not found
 */
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
  
  // Calculate side center based on side constant
  const halfWidth = relativeRect.width / 2;
  const halfHeight = relativeRect.height / 2;
  
  const sidePositions = {
    [CELL_SIDES.TOP]: { 
      x: relativeRect.left + halfWidth, 
      y: relativeRect.top 
    },
    [CELL_SIDES.RIGHT]: { 
      x: relativeRect.left + relativeRect.width, 
      y: relativeRect.top + halfHeight 
    },
    [CELL_SIDES.BOTTOM]: { 
      x: relativeRect.left + halfWidth, 
      y: relativeRect.top + relativeRect.height 
    },
    [CELL_SIDES.LEFT]: { 
      x: relativeRect.left, 
      y: relativeRect.top + halfHeight 
    }
  };
  
  return sidePositions[side] || null;
}

/**
 * Updates the undo count display
 */
function updateUndoCount() {
  const undoCountSpan = document.getElementById("undo-count");
  if (undoCountSpan) {
    undoCountSpan.textContent = undoCount;
  }
}
