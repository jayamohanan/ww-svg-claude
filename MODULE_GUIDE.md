# Module Navigation Guide

Quick reference for finding functions in the refactored codebase.

## 🔍 Where to Find Things

### Configuration & Constants
**File**: `config.js`
- Game dimensions (square size, gap)
- Colors for different states
- Z-index layering
- Grid step calculation

### Global State
**File**: `game-state.js`
- Current level data
- Placed words
- Undo stack
- Editor level data

### Utility Functions
**File**: `utils.js`
- `shuffleArray()` - Randomize array order
- `isEditorMode()` - Check if in editor
- `parseCellPosition()` - Parse "012" format
- `getCellSideCenter()` - Get connection point coordinates
- `updateUndoCount()` - Update undo counter display

### Game Flow & Logic
**File**: `game-logic.js`
- `loadLevels()` - Fetch levels.json
- `startLevel()` - Initialize a level
- `renderGame()` - Main render function
- `updateHints()` - Show/hide hint letters
- `checkConstraints()` - Validate word placement
- `placeWord()` - Place word in slot
- `removeWordFromSlot()` - Remove word from slot
- `checkLevelComplete()` - Check if won

### Display & Rendering
**File**: `renderer.js`
- `renderSlots()` - Draw word slots (positioned or stacked)
- `renderBank()` - Draw word bank with drag handlers
- `renderConnections()` - Draw SVG lines between cells

### Drag & Drop
**File**: `drag-drop.js`
- `startDragFromBank()` - Start dragging from bank
- `startDragFromSlot()` - Start dragging from slot
- `onDragMove()` - Handle drag movement
- `onDragEnd()` - Handle drop
- `animateBack()` - Animate word back to origin
- `showError()` - Show red X on invalid drop
- `cleanupDrag()` - Reset drag state

### Level Editor
**File**: `editor.js`
- `showEditor()` - Display editor UI
- `setupNewEditorListeners()` - Setup editor buttons
- `renderEditorGameView()` - Render editor workspace
- `makeSlotDraggable()` - Make slots draggable with snap
- `drawEditorGrid()` - Draw grid background
- `renderEditorConnections()` - Draw editor connections
- `showEditorLevelJSON()` - Display JSON output
- `saveLevels()` - Save level data

### Main Initialization
**File**: `script-new.js`
- `init()` - Initialize app
- `setupEventListeners()` - Setup button handlers
- DOMContentLoaded listener

## 🎯 Common Tasks

### Adding a New Level
1. Edit `levels.json`
2. Test in game mode (just open `index.html`)
3. OR create in editor mode (`index.html?editor=true`)

### Changing Game Appearance
1. **Colors**: Edit `config.js` → `CONFIG.colors`
2. **Sizes**: Edit `config.js` → `CONFIG.squareSize`, `CONFIG.squareGap`
3. **Styles**: Edit `style.css`

### Modifying Drag Behavior
1. Edit `drag-drop.js`
2. Touch handlers: `startDragFromBank()`, `startDragFromSlot()`
3. Movement logic: `onDragMove()`
4. Drop validation: `onDragEnd()`

### Fixing Editor Issues
1. **Grid**: Edit `editor.js` → `drawEditorGrid()`
2. **Snap**: Edit `editor.js` → `makeSlotDraggable()`
3. **UI**: Edit `editor.js` → `setupNewEditorListeners()`

### Debugging Tips
1. Check browser console for errors
2. Look for function names in error stack
3. Find function in this guide
4. Open the corresponding file

## 📦 Module Dependencies

```
config.js (no dependencies)
    ↓
game-state.js (uses CONFIG)
    ↓
utils.js (uses game-state)
    ↓
game-logic.js (uses game-state, utils)
    ↓
renderer.js (uses game-state)
    ↓
drag-drop.js (uses game-state, game-logic, renderer)
    ↓
editor.js (uses game-state, CONFIG, utils)
    ↓
script-new.js (orchestrates everything)
```

## 🚨 Important Notes

1. **Load Order Matters**: Scripts must load in dependency order (see above)
2. **Global Variables**: State is in `game-state.js`, don't create duplicates
3. **Config Changes**: Always use `CONFIG.property`, never hardcode values
4. **Testing**: Test both game mode and editor mode after changes

## 💡 For Beginners

- Start by reading `config.js` to understand game parameters
- Then read `game-state.js` to see what data the game tracks
- Look at `script-new.js` to see how everything starts
- Follow the flow: init → loadLevels → startLevel → renderGame
- Each file is 60-370 lines, much easier than 1000+ lines!
