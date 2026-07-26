const fs = require('fs');
const path = require('path');

describe('DisputeCard focus-visible CSS', () => {
  const focusCssPath = path.join(process.cwd(), 'src/styles/focus.css');

  it('src/styles/focus.css exists', () => {
    expect(fs.existsSync(focusCssPath)).toBe(true);
  });

  it('targets .dispute-card container for focus-visible', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.dispute-card :focus-visible');
  });

  it('applies outline and outline-offset on focus-visible', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('outline: 3px solid');
    expect(css).toContain('outline-offset: 2px');
  });

  it('provides dark-mode adjustment with box-shadow', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.dark .dispute-card :focus-visible');
    expect(css).toContain('box-shadow');
  });

  it('targets link focus-visible with underline', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.dispute-card a:focus-visible');
    expect(css).toContain('text-decoration: underline');
  });

  it('targets radio input focus-visible', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.dispute-card input[type="radio"]:focus-visible');
  });

  it('respects prefers-reduced-motion', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('supports forced-colors / high-contrast mode', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('CanvasText');
  });

  it('provides inset variant for focusable card containers', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('[data-focus-inset]:focus-visible');
    expect(css).toContain('inset 0 0 0 3px');
  });
});
