// ============================
// GAME CONFIGURATION
// ============================
// All game dimensions and design constants in one place

const CONFIG = {
  // Square/Cell dimensions
  squareSize: 35,        // Size of each letter square in pixels
  squareGap: 1,          // Gap between squares in pixels
  squareFontSize: 20,    // Font size for letters
  squareBorderRadius: 6, // Border radius in pixels
  squareBorderWidth: 2,  // Border width in pixels
  
  // Grid spacing (for editor)
  get gridStep() {
    return this.squareSize + this.squareGap;
  },
  
  // Colors
  colors: {
    borderDefault: '#888',
    borderLight: 'rgba(0, 0, 0, 0.3)',
    bgBody: '#2c3e50',
    bgContainer: '#f5f5f5',
    bgSquare: 'white',
    bgFilled: '#e3f2fd',
    bgTransparent: 'transparent',
    textPrimary: '#333',
    textSecondary: '#555',
    textHint: 'rgba(0, 0, 0, 0.3)',
    btnPrimary: '#2196f3',
    btnPrimaryHover: '#0b7dda',
    btnSuccess: '#4caf50',
    btnDisabledBg: '#eee',
    btnDisabledBorder: '#bbb',
    btnDisabledText: '#aaa'
  },
  
  // Layout
  containerWidth: 420,
  containerHeight: 600,
  
  // Z-index layers
  zIndex: {
    svg: 1,
    base: 2,
    dragging: 100,
    undo: 10,
    success: 1000,
    editorScreen: 9999,
    error: 10000
  }
};

// Make CONFIG available globally
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
