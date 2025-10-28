# Word Connection Game - Level Editor Guide

## Overview
This game allows you to create word puzzle levels where players must place words into slots while satisfying letter connections between slots.

## Level Format

### New Format (Positioned Slots)
```json
{
  "slots": [
    { "length": 4, "x": 50, "y": 30 },
    { "length": 4, "x": 50, "y": 60 }
  ],
  "bank": ["SOFT", "TUNE"],
  "connections": ["032,100"]
}
```

### Old Format (Vertical Stack) - Still Supported
```json
{
  "slots": ["SOFT", "TUNE"],
  "bank": ["SOFT", "TUNE"],
  "connections": ["032,100"]
}
```

## Slot Positioning

### Structure
- **`length`**: Number of letters in the slot (creates that many squares)
- **`x`**: Horizontal position (0-100%) - 50 = center
- **`y`**: Vertical position (0-100%) - 50 = center

### Important Notes
- Slots are **NOT** tied to specific words anymore
- Each slot just defines **how many letters** it can hold and **where it appears**
- **Any word** from the bank can go in **any slot** of matching length
- The game is won when **all connections are satisfied**, regardless of which word is in which slot

## Example: CAR and CAT

```json
{
  "slots": [
    { "length": 3, "x": 30, "y": 40 },
    { "length": 3, "x": 70, "y": 40 }
  ],
  "bank": ["CAR", "CAT"],
  "connections": ["000,100"]
}
```

This means:
- First letters of both slots must match
- **CAR** can go in slot 0 and **CAT** in slot 1 ✅
- **CAT** can go in slot 0 and **CAR** in slot 1 ✅
- Both solutions satisfy the connection!

## Connection Format

Format: `"slotIndex cellIndex side, slotIndex cellIndex side"`

### Indices
- **slotIndex**: Which slot (0, 1, 2, ...)
- **cellIndex**: Which letter in that slot (0 = first, 1 = second, ...)
- **side**: Which side of the cell (0 = top, 1 = right, 2 = bottom, 3 = left)

### Examples
- `"032,100"`: Connect right side of slot 0, cell 3 to top side of slot 1, cell 0
- `"010,121"`: Connect right side of slot 0, cell 1 to bottom side of slot 1, cell 2

## Using the Level Editor

### Access
Open: `http://localhost:8000/index.html?editor=true`

### Creating a Level

1. **Add Words**
   - Enter a word (e.g., "SOFT")
   - Click "Add Word"
   - A slot of matching length is created
   - The word is added to the bank

2. **Position Slots**
   - **Drag slots** with your mouse to position them
   - Slots can be placed anywhere in the game area
   - Position is stored as x/y percentages (0-100)

3. **Add Connections**
   - Enter connection string (e.g., "032,100")
   - Click "Add Connection"
   - Lines will be drawn showing the connections

4. **Export Level**
   - Click "Show Level JSON"
   - Copy the JSON output
   - Paste into `levels.json`

### Tips for Good Level Design

1. **Spacing**: Keep slots far enough apart so words don't overlap
2. **Visual Balance**: Position slots to create interesting visual layouts
3. **Multiple Solutions**: Remember that slots aren't tied to specific words - design connections that allow flexibility
4. **Difficulty**: More connections = harder puzzle

## Game Logic

### Win Condition
The level is complete when:
- All slots are filled with words from the bank
- All connections are satisfied (matching letters at connected points)

### Key Feature
- **Flexible word placement**: Unlike traditional crosswords, this game doesn't care which word goes where
- Only the **connections** matter
- This creates puzzles where players must think about letter patterns, not specific word positions

## Migration from Old Format

If you have levels in the old format (word strings), they still work! The game automatically detects the format and handles both:

**Old format** → slots stacked vertically (default behavior)
**New format** → slots positioned at x,y coordinates

## Examples

### Simple Two-Word Level
```json
{
  "slots": [
    { "length": 4, "x": 40, "y": 40 },
    { "length": 4, "x": 60, "y": 40 }
  ],
  "bank": ["NEWS", "WEST"],
  "connections": ["022,100"]
}
```

### Complex Layout
```json
{
  "slots": [
    { "length": 5, "x": 50, "y": 20 },
    { "length": 5, "x": 30, "y": 50 },
    { "length": 5, "x": 70, "y": 50 },
    { "length": 5, "x": 50, "y": 80 }
  ],
  "bank": ["APPLE", "GRAPE", "PEACH", "MANGO"],
  "connections": ["042,100", "142,200", "242,300"]
}
```

This creates a cross/star pattern with words connecting in a circle.

## Troubleshooting

### Slots appear stacked vertically
- Check that your slots use the new format: `{ "length": 4, "x": 50, "y": 30 }`
- Old format (word strings) will always stack vertically

### Connections not drawing
- Verify connection format: `"slotIndex cellIndex side, slotIndex cellIndex side"`
- All indices should be within bounds (slot exists, cell exists in that slot)
- Click "Redraw Lines" button in editor

### Game won't complete even when filled
- Check all connections are satisfied
- Remember: connections compare **letters**, not words
- Use browser console to debug connection validation

## Technical Details

### Coordinate System
- Origin (0,0) = top-left of game container
- (50,50) = center
- (100,100) = bottom-right
- Slots are centered at their (x,y) position using `transform: translate(-50%, -50%)`

### Responsive Design
- Percentages ensure slots scale with screen size
- Works on desktop and mobile
- Safe areas handled for mobile browsers

## Support
For questions or issues, check the browser console for error messages. Most issues are related to:
- Invalid JSON format
- Connection indices out of bounds
- Missing required fields (length, x, y for new format)
