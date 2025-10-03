import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle,
  X,
  MessageCircle,
  Mail,
  ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export function FloatingHelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Help Options Card */}
      {isOpen && (
        <Card className="mb-4 w-64 bg-slate-800/95 border-slate-700 backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">Need Help?</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Link href="/help" className="block">
              <Button 
                variant="outline" 
                className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600"
                onClick={() => setIsOpen(false)}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help Center
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600"
              asChild
            >
              <a href="https://discord.gg/predictify" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                Discord Support
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600"
              asChild
            >
              <a href="mailto:support@predictify.com">
                <Mail className="w-4 h-4 mr-2" />
                Email Us
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Help Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <HelpCircle className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}