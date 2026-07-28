const fs = require('fs');
const path = require('path');

describe('Dashboard focus-visible CSS', () => {
  const focusCssPath = path.join(process.cwd(), 'src/styles/focus.css');

  it('targets .dashboard-container for focus-visible', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.dashboard-container:focus-visible');
  });

  it('applies outline and outline-offset on focus-visible', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    // Using simple checks to match the style of the other tests
    expect(css).toContain('outline: 3px solid');
    expect(css).toContain('outline-offset: 2px');
  });

  it('provides dark-mode adjustment with box-shadow', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.dark .dashboard-container:focus-visible');
    expect(css).toContain('box-shadow');
  });

  it('respects prefers-reduced-motion', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    // We check the specific block manually or just check it exists generally
    // The dispute-card test only checks for the string
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('supports forced-colors / high-contrast mode', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('CanvasText');
  });
});
