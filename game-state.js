// ============================
// GAME STATE & CONFIGURATION
// ============================

let levels = [];
let currentLevelIndex = 0;
let gameState = {
  placedWords: [], // Array of {word, slotIndex, bankIndex}
  draggedElement: null,
  dragData: null,
  // Mobile tap-to-select state
  selectedSlotIndex: null, // Currently selected slot for mobile tap mode
  isMobile: false, // Will be set based on device detection
  isAnimating: false // Prevents multiple simultaneous animations on mobile
};

// Track undo state
let undoCount = 10;
let undoStack = [];

// Editor state
const isEditor = window.location.search.includes("editor=true");

let editorLevel = {
  slots: [], // Array of {length, x, y} - x,y are percentages (0-100)
  bank: [],
  connections: []
};
