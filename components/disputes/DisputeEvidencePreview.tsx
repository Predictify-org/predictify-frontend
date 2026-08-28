import { ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeDisputeEvidence, type DisputeEvidenceInput } from '@/lib/dispute-evidence';

interface DisputeEvidencePreviewProps {
  evidence?: DisputeEvidenceInput;
  fallbackMessage?: string;
}

export function DisputeEvidencePreview({
  evidence,
  fallbackMessage = 'No verified evidence link available.',
}: DisputeEvidencePreviewProps) {
  const items = normalizeDisputeEvidence(evidence);

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{fallbackMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {item.isPrivate ? 'Private evidence preview' : item.label}
            </span>
            {item.isPrivate && <ShieldAlert className="h-4 w-4 text-amber-500" aria-label="Private evidence" />}
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
              {item.isPrivate ? 'View evidence' : item.label}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}
