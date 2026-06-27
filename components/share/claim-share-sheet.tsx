"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Share2, Twitter, Info, ExternalLink, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ClaimShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketTitle: string;
  claimAmount: string;
  marketId: string;
  tokenSymbol: string;
}

const PLATFORMS = [
  { id: "x", name: "X / Twitter", limit: 280, icon: Twitter, color: "text-[#1DA1F2]" },
  { id: "farcaster", name: "Farcaster", limit: 320, icon: Share2, color: "text-[#855DCD]" },
  { id: "bluesky", name: "Bluesky", limit: 300, icon: ExternalLink, color: "text-[#0085FF]" },
];

export function ClaimShareSheet({
  open,
  onOpenChange,
  marketTitle,
  claimAmount,
  marketId,
  tokenSymbol,
}: ClaimShareSheetProps) {
  const [text, setText] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // Initialize text when market info changes
  React.useEffect(() => {
    if (marketTitle) {
      setText(`I just claimed ${claimAmount} ${tokenSymbol} on Predictify for "${marketTitle}"! 🚀\n\nPredict the future at:`);
    }
  }, [marketTitle, claimAmount, tokenSymbol]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://predictify.app";
  const marketUrl = `${baseUrl}/events/${marketId}`;
  
  // Construct OG image URL using our dynamic API
  const ogImageUrl = `/api/og?title=${encodeURIComponent(marketTitle)}&status=resolved&winner=${encodeURIComponent(marketTitle)}&volume=${encodeURIComponent(claimAmount + ' ' + tokenSymbol)}`;

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Predictify Winnings",
          text: text,
          url: marketUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${text}\n${marketUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPlatform = (platformId: string) => {
    let url = "";
    const fullText = `${text}\n${marketUrl}`;
    
    switch (platformId) {
      case "x":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
        break;
      case "farcaster":
        // Farcaster warpcast composer
        url = `https://warpcast.com/~/compose?text=${encodeURIComponent(fullText)}`;
        break;
      case "bluesky":
        url = `https://bsky.app/intent/compose?text=${encodeURIComponent(fullText)}`;
        break;
    }
    
    if (url) window.open(url, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-[32px] border-t-purple-500/20 bg-card/95 backdrop-blur-xl p-6 pb-12 shadow-2xl overflow-y-auto max-h-[90vh]">
        <SheetHeader className="space-y-1 mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Share2 className="w-5 h-5" />
            </div>
            Compose Share
          </SheetTitle>
          <SheetDescription className="text-base">
            Customize your message before sharing your success.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* OG Image Preview */}
          <div className="relative aspect-[1200/630] w-full rounded-2xl overflow-hidden border border-white/10 bg-muted group">
            <img
              src={ogImageUrl}
              alt="Share Preview"
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
              <span className="text-xs font-medium text-white/70 italic">Dynamic preview of your win</span>
            </div>
          </div>

          {/* Social Text Editor */}
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[120px] bg-white/5 border-white/10 rounded-2xl p-4 text-base focus:ring-purple-500/50 resize-none"
            />
            
            {/* Character Counters */}
            <div className="flex flex-wrap gap-4 px-1">
              {PLATFORMS.map((platform) => {
                const isOver = text.length + marketUrl.length > platform.limit;
                const Icon = platform.icon;
                return (
                  <div key={platform.id} className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    <Icon className={cn("w-3.5 h-3.5", platform.color)} />
                    <span className={cn(
                      "text-[10px] font-mono",
                      isOver ? "text-red-400 font-bold" : "text-muted-foreground"
                    )}>
                      {text.length + marketUrl.length}/{platform.limit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button 
                variant="outline" 
                className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                onClick={handleCopy}
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            
            {PLATFORMS.map((platform) => (
              <Button 
                key={platform.id}
                variant="outline" 
                className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => openPlatform(platform.id)}
              >
                <platform.icon className={cn("w-4 h-4 mr-2", platform.color)} />
                {platform.name.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>

        <SheetFooter className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button 
            className="flex-1 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-6 shadow-lg shadow-purple-500/20"
            onClick={handleWebShare}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Native Share
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-2xl py-6 text-muted-foreground hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
