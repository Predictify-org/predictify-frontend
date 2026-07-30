const fs = require('fs');
const path = require('path');

describe('MarketDetail focus-visible CSS', () => {
  const focusCssPath = path.join(process.cwd(), 'src/styles/focus.css');

  it('src/styles/focus.css exists', () => {
    expect(fs.existsSync(focusCssPath)).toBe(true);
  });

  it('targets .market-detail-page container for focus-visible', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.market-detail-page :focus-visible');
  });

  it('applies outline and outline-offset on focus-visible', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    const section = css.split('.market-detail-page :focus-visible')[1];
    expect(section).toContain('outline: 3px solid');
    expect(section).toContain('outline-offset: 2px');
  });

  it('provides dark-mode adjustment with box-shadow', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    expect(css).toContain('.dark .market-detail-page :focus-visible');
  });

  it('respects prefers-reduced-motion', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    const section = css.split('MarketDetail page focus')[1];
    expect(section).toContain('prefers-reduced-motion: reduce');
  });

  it('supports forced-colors / high-contrast mode', () => {
    const css = fs.readFileSync(focusCssPath, 'utf8');
    const section = css.split('MarketDetail page focus')[1];
    expect(section).toContain('forced-colors: active');
    expect(section).toContain('CanvasText');
  });
});
