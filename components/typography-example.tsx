'use client';

/**
 * Typography Example Component
 * Demonstrates all typography classes and patterns
 * Use this for testing and as reference for implementing typography
 */

export function TypographyExample() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      <div>
        <h1 className="text-h1 mb-4">Typography System</h1>
        <p className="text-body-lg text-muted-foreground">
          Complete demonstration of Predictify typography hierarchy
        </p>
      </div>

      {/* Headings Section */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Headings</h2>
        
        <div className="space-y-4 pl-4">
          <div>
            <span className="text-caption text-muted-foreground">H1 - 40px</span>
            <h1 className="text-h1">This is H1 - Main Page Title</h1>
          </div>
          
          <div>
            <span className="text-caption text-muted-foreground">H1 Responsive (scales on mobile)</span>
            <h1 className="text-h1-responsive">This is H1 Responsive for Mobile</h1>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">H2 - 32px</span>
            <h2 className="text-h2">This is H2 - Section Heading</h2>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">H2 Responsive</span>
            <h2 className="text-h2-responsive">This is H2 Responsive</h2>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">H3 - 24px</span>
            <h3 className="text-h3">This is H3 - Subsection Heading</h3>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">H3 Responsive</span>
            <h3 className="text-h3-responsive">This is H3 Responsive</h3>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">H4 - 20px</span>
            <h4 className="text-h4">This is H4 - Card Title</h4>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">H5 - 18px</span>
            <h5 className="text-h5">This is H5 - Label Heading</h5>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">H6 - 16px</span>
            <h6 className="text-h6">This is H6 - Small Heading</h6>
          </div>
        </div>
      </section>

      {/* Body Text Section */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Body Text</h2>
        
        <div className="space-y-4 pl-4">
          <div>
            <span className="text-caption text-muted-foreground">Body Large - 18px</span>
            <p className="text-body-lg">
              This is body large text used for introduction paragraphs and emphasis content. 
              It has a generous line height for readability.
            </p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Body Medium - 16px (default)</span>
            <p className="text-body-md">
              This is body medium/default text. It's the standard size for most content 
              paragraphs and descriptions throughout the application.
            </p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Body Small - 14px</span>
            <p className="text-body-sm">
              This is body small text used for secondary information and helper text. 
              It's typically paired with muted-foreground color.
            </p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Body Small with muted color</span>
            <p className="text-body-sm text-muted-foreground">
              Secondary information with muted color for de-emphasis.
            </p>
          </div>
        </div>
      </section>

      {/* Labels & Captions Section */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Labels & Captions</h2>
        
        <div className="space-y-4 pl-4">
          <div>
            <span className="text-caption text-muted-foreground">Label - 14px, 500 weight</span>
            <div className="flex gap-2">
              <label className="text-label font-semibold">Form Label</label>
              <span className="text-label bg-secondary px-2 py-1 rounded">Badge</span>
            </div>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Caption - 12px, 500 weight</span>
            <p className="text-caption">Last updated 2 hours ago</p>
            <p className="text-caption text-muted-foreground">Helper text or metadata</p>
          </div>
        </div>
      </section>

      {/* Numbers/Stats Section */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Numeric/Stat Text</h2>
        
        <div className="grid grid-cols-3 gap-8 pl-4">
          <div>
            <p className="text-caption text-muted-foreground mb-2">Stat Large - 32px</p>
            <p className="text-stat-lg font-bold">$1,234.56</p>
          </div>

          <div>
            <p className="text-caption text-muted-foreground mb-2">Stat Medium - 24px</p>
            <p className="text-stat-md font-bold">$1,234.56</p>
          </div>

          <div>
            <p className="text-caption text-muted-foreground mb-2">Stat Small - 18px</p>
            <p className="text-stat-sm font-bold">$1,234.56</p>
          </div>
        </div>
      </section>

      {/* Text Wrapping Section */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Text Wrapping & Truncation</h2>
        
        <div className="space-y-6 pl-4">
          <div>
            <span className="text-caption text-muted-foreground">Text Balance (natural wrapping)</span>
            <p className="text-h3 text-balance">
              This is a question that might wrap awkwardly without text balance applied
            </p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Truncate Lines 2</span>
            <p className="text-body-md truncate-lines-2 border border-border p-3 rounded">
              What will be the closing price of Bitcoin on December 31, 2024? This question 
              is long and will be truncated after 2 lines with an ellipsis indicator.
            </p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Truncate Lines 3</span>
            <p className="text-body-md truncate-lines-3 border border-border p-3 rounded">
              What will be the closing price of Bitcoin on December 31, 2024? This question 
              is long and can wrap to 3 lines before being truncated with an ellipsis indicator 
              to prevent excessive height.
            </p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Single Line Truncation (ellipsis)</span>
            <div className="text-ellipsis-overflow border border-border p-3 rounded">
              This is a very long title that will be cut off with an ellipsis if it exceeds the available width
            </div>
          </div>
        </div>
      </section>

      {/* Market Card Example */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Market Card Example</h2>
        
        <div className="max-w-sm bg-card border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-h4 truncate-lines-2">
            Will Bitcoin exceed $75,000 by Q3 2024?
          </h4>
          
          <p className="text-body-sm text-muted-foreground">
            Prediction closes in 30 days
          </p>
          
          <div className="flex justify-between pt-3 border-t border-border">
            <div>
              <p className="text-caption text-muted-foreground">Volume</p>
              <p className="text-stat-md font-bold">$45.2K</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Participants</p>
              <p className="text-stat-md font-bold">234</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Odds</p>
              <p className="text-stat-md font-bold text-emerald-400">65%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Event Details Example */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Event Details Example</h2>
        
        <div className="space-y-4">
          <div>
            <h1 className="text-h1-responsive mb-2">
              Will SPY close above $450?
            </h1>
            <p className="text-body-lg text-muted-foreground">
              S&P 500 Index Prediction Market
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-h3">Event Details</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-label text-muted-foreground mb-1">Total Volume</p>
                <p className="text-stat-lg font-bold">$2.5M</p>
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-1">Participants</p>
                <p className="text-stat-lg font-bold">1,234</p>
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-1">Time Left</p>
                <p className="text-body-md">45 days</p>
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-1">Status</p>
                <p className="text-body-md">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <h3 className="text-h3 mb-4">Possible Outcomes</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-body-md">Yes - SPY > $450</span>
                <span className="text-stat-md font-bold text-emerald-400">72%</span>
              </div>
              <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-body-md">No - SPY ≤ $450</span>
                <span className="text-stat-md font-bold text-red-400">28%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive Behavior */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Responsive Typography</h2>
        <p className="text-body-md text-muted-foreground pl-4">
          Resize your browser to see how responsive classes adapt to different screen sizes
        </p>
        
        <div className="space-y-6 pl-4">
          <div>
            <div className="text-caption text-muted-foreground mb-2">
              text-h1-responsive: Desktop 40px → Tablet 32px → Mobile 24px
            </div>
            <h1 className="text-h1-responsive">Responsive H1</h1>
          </div>

          <div>
            <div className="text-caption text-muted-foreground mb-2">
              text-h2-responsive: Desktop 32px → Tablet 24px → Mobile 18px
            </div>
            <h2 className="text-h2-responsive">Responsive H2</h2>
          </div>

          <div>
            <div className="text-caption text-muted-foreground mb-2">
              text-h3-responsive: Desktop 24px → Tablet 18px → Mobile 14px
            </div>
            <h3 className="text-h3-responsive">Responsive H3</h3>
          </div>
        </div>
      </section>

      {/* Color & Emphasis Combinations */}
      <section className="space-y-6 py-8 border-t border-border">
        <h2 className="text-h2">Color & Emphasis Combinations</h2>
        
        <div className="space-y-4 pl-4">
          <div>
            <p className="text-body-md text-foreground">Default foreground color</p>
            <p className="text-body-md text-muted-foreground">Muted foreground (secondary)</p>
            <p className="text-body-md text-emerald-500">Success color</p>
            <p className="text-body-md text-red-500">Error/destructive color</p>
            <p className="text-body-md text-amber-500">Warning color</p>
          </div>

          <div>
            <span className="text-label font-semibold">Semibold Label</span>
            <span className="text-label font-medium">Medium Label</span>
            <span className="text-label font-normal">Normal Label</span>
          </div>
        </div>
      </section>

      <div className="py-8 border-t border-border text-center">
        <p className="text-caption text-muted-foreground">
          For complete documentation, see TYPOGRAPHY.md
        </p>
      </div>
    </div>
  );
}
