import React from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  X, Copy, Trash2, Edit, RefreshCcw,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Menu,
  Wallet, Coins, CircleDollarSign, TrendingUp, BarChart3
} from 'lucide-react';

export default function IconSheet() {
  const iconGroups = [
    {
      title: 'Statuses',
      icons: [
        { name: 'Success', component: CheckCircle2, description: 'Successful operations, completed steps' },
        { name: 'Error', component: XCircle, description: 'Failed actions, critical errors' },
        { name: 'Warning', component: AlertTriangle, description: 'Destructive warnings, cautions' },
        { name: 'Info', component: Info, description: 'Informational messages, tooltips' },
      ]
    },
    {
      title: 'Actions',
      icons: [
        { name: 'Close/Dismiss', component: X, description: 'Close modals, dismiss alerts' },
        { name: 'Copy', component: Copy, description: 'Copy to clipboard actions' },
        { name: 'Delete', component: Trash2, description: 'Remove items, destructive actions' },
        { name: 'Edit', component: Edit, description: 'Modify existing content' },
        { name: 'Refresh', component: RefreshCcw, description: 'Reload data, retry actions' },
      ]
    },
    {
      title: 'Navigation',
      icons: [
        { name: 'ChevronLeft', component: ChevronLeft, description: 'Back, previous page' },
        { name: 'ChevronRight', component: ChevronRight, description: 'Forward, next page' },
        { name: 'ChevronDown', component: ChevronDown, description: 'Expand accordions, dropdowns' },
        { name: 'ChevronUp', component: ChevronUp, description: 'Collapse accordions' },
        { name: 'Menu', component: Menu, description: 'Mobile navigation toggle' },
      ]
    },
    {
      title: 'Domain (Crypto/Finance)',
      icons: [
        { name: 'Wallet', component: Wallet, description: 'Connect wallet, user balance' },
        { name: 'Coins', component: Coins, description: 'Tokens, currency amounts' },
        { name: 'CircleDollarSign', component: CircleDollarSign, description: 'USDC, fiat values, stablecoins' },
        { name: 'TrendingUp', component: TrendingUp, description: 'Positive price action, statistics' },
        { name: 'BarChart3', component: BarChart3, description: 'Analytics, history, data views' },
      ]
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Iconography Guidelines</h1>
        <p className="text-muted-foreground text-lg">
          Standardized icon set and layout rules for the Predictify application. All icons use <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">lucide-react</code>.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-3 p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="font-semibold text-xl">1. Size Rules</h2>
          <ul className="space-y-4 pt-2 text-sm text-card-foreground">
            <li className="flex items-center gap-4">
              <div className="w-8 flex justify-center text-muted-foreground"><Wallet size={16} /></div>
              <span><code className="font-semibold font-mono bg-muted px-1 py-0.5 rounded">sm (16px)</code> - Inside badges, dense tables, secondary text</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-8 flex justify-center text-muted-foreground"><Wallet size={20} /></div>
              <span><code className="font-semibold font-mono bg-muted px-1 py-0.5 rounded">md (20px)</code> - Default size, alongside standard body text, standard buttons</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="w-8 flex justify-center text-muted-foreground"><Wallet size={24} /></div>
              <span><code className="font-semibold font-mono bg-muted px-1 py-0.5 rounded">lg (24px)</code> - Primary action buttons, empty states, section headers</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3 p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="font-semibold text-xl">2. Stroke Width</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            We use the default Lucide stroke width of <strong>2px</strong> across all sizes to ensure perfect legibility, especially at smaller sizes where thicker strokes maintain clarity.
          </p>
          <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-md mt-4 border border-border/50">
            <div className="p-3 bg-background rounded-md shadow-sm border"><AlertTriangle size={24} strokeWidth={2} className="text-foreground" /></div>
            <div className="text-sm">Consistent 2px stroke<br/><span className="text-muted-foreground text-xs mt-1 block">Optimal balance and clarity</span></div>
          </div>
        </div>

        <div className="space-y-3 p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="font-semibold text-xl">3. Alignment</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Always optical align icons with text using Flexbox. Icons should support text, not replace it (unless the action is universally understood like Close or Menu).
          </p>
          <div className="p-6 bg-muted/30 rounded-md border flex items-center justify-center border border-border/50">
             <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow">
               <Wallet size={16} />
               <span>Connect Wallet</span>
             </button>
          </div>
          <p className="text-xs text-center font-mono text-muted-foreground mt-3 bg-muted w-fit mx-auto px-2 py-1 rounded">items-center gap-2</p>
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <h2 className="text-2xl font-bold border-b pb-4">Icon Mappings</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 pt-2">
          {iconGroups.map((group, i) => (
            <div key={i} className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{group.title}</h3>
              <div className="space-y-3">
                {group.icons.map((item, j) => {
                  const Icon = item.component;
                  return (
                    <div key={j} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 group shadow-sm hover:shadow-md cursor-default">
                      <div className="mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                        <Icon size={20} />
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-center">
                        <p className="text-sm font-medium leading-none">{item.name}</p>
                        <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/80 leading-snug">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
