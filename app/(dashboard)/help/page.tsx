"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Mail,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Wallet,
  TrendingUp,
  CreditCard,
  Shield,
  Zap,
  Users,
  BookOpen,
  LifeBuoy,
} from "lucide-react";
import { SearchFilters } from "@/components/help/SearchFilters";
import { ContactForm } from "@/components/help/ContactForm";
import { SystemStatus } from "@/components/help/SystemStatus";
import { QuickStartGuide } from "@/components/help/QuickStartGuide";
import { HelpBreadcrumb } from "@/components/help/HelpBreadcrumb";

const FAQS = [
  {
    category: "Getting Started",
    icon: <HelpCircle className="w-5 h-5" />,
    questions: [
      {
        question: "How do I connect my wallet to Predictify?",
        answer: "To connect your wallet: 1) Click the 'Connect Wallet' button in the top navigation, 2) Select your preferred wallet from the list (Freighter, Albedo, etc.), 3) Follow the prompts to authorize the connection. Make sure you have a Stellar-compatible wallet installed."
      },
      {
        question: "What wallets are supported?",
        answer: "Predictify supports all major Stellar wallets including Freighter, Albedo, WalletConnect, and xBull. We recommend Freighter for the best experience as it's the most widely used Stellar wallet."
      },
      {
        question: "Do I need XLM to use Predictify?",
        answer: "Yes, you need a small amount of XLM for transaction fees on the Stellar network. Each prediction requires a minimal fee (usually less than 0.01 XLM). You'll also need XLM or USDC to place bets."
      }
    ]
  },
  {
    category: "Placing Bets",
    icon: <TrendingUp className="w-5 h-5" />,
    questions: [
      {
        question: "How do I place a prediction bet?",
        answer: "To place a bet: 1) Browse available markets on the dashboard, 2) Click on a market you're interested in, 3) Choose your prediction outcome, 4) Enter your bet amount, 5) Review the odds and potential payout, 6) Click 'Place Bet' and confirm the transaction in your wallet."
      },
      {
        question: "What's the minimum bet amount?",
        answer: "The minimum bet amount is 1 USDC or equivalent in XLM. This helps ensure meaningful participation while keeping the platform accessible to all users."
      },
      {
        question: "Can I cancel a bet after placing it?",
        answer: "Once a bet is confirmed on the blockchain, it cannot be cancelled. Make sure to review your prediction carefully before confirming the transaction. However, you may be able to hedge your position by betting on other outcomes in the same market."
      },
      {
        question: "How are odds calculated?",
        answer: "Odds are determined by the collective betting activity of all users in a market. When more people bet on an outcome, its odds decrease (lower payout), and when fewer people bet on it, the odds increase (higher payout). This creates a dynamic, market-driven pricing system."
      }
    ]
  },
  {
    category: "Payouts & Rewards",
    icon: <CreditCard className="w-5 h-5" />,
    questions: [
      {
        question: "When do I receive my winnings?",
        answer: "Winnings are automatically distributed to your wallet once the market is resolved. This typically happens within 24-48 hours after the event concludes and the outcome is verified by our oracle system."
      },
      {
        question: "How are payouts calculated?",
        answer: "Your payout = (Your bet amount) × (Odds at time of bet). For example, if you bet 10 USDC at 2.5x odds, you'll receive 25 USDC total (15 USDC profit + 10 USDC original bet) if you win."
      },
      {
        question: "Are there any fees on winnings?",
        answer: "Predictify charges a 2% platform fee on winnings only. You never pay fees on losing bets. This fee helps maintain the platform and fund development of new features."
      },
      {
        question: "What happens if a market is cancelled?",
        answer: "If a market is cancelled due to unforeseen circumstances, all bets are refunded to participants' wallets minus network transaction fees. We strive to avoid cancellations by carefully vetting all markets before listing."
      }
    ]
  },
  {
    category: "Wallet Integration",
    icon: <Wallet className="w-5 h-5" />,
    questions: [
      {
        question: "My wallet isn't connecting. What should I do?",
        answer: "Try these steps: 1) Refresh the page and try again, 2) Make sure your wallet extension is unlocked, 3) Clear your browser cache and cookies, 4) Disable other wallet extensions temporarily, 5) Try using an incognito/private browser window."
      },
      {
        question: "Can I use multiple wallets?",
        answer: "Yes, you can connect different wallets, but each session only supports one active wallet at a time. To switch wallets, disconnect the current one and connect your preferred wallet."
      },
      {
        question: "Is my wallet secure on Predictify?",
        answer: "Yes, Predictify never stores your private keys or has access to your funds beyond what you explicitly authorize for each transaction. We use industry-standard security practices and only interact with your wallet through secure, audited protocols."
      }
    ]
  },
  {
    category: "Technical Issues",
    icon: <AlertCircle className="w-5 h-5" />,
    questions: [
      {
        question: "Transactions are failing. What's wrong?",
        answer: "Common causes: 1) Insufficient XLM for fees, 2) Network congestion, 3) Wallet authorization timeout. Try ensuring you have enough XLM, wait a few minutes, and retry the transaction."
      },
      {
        question: "The page is loading slowly or not at all.",
        answer: "This may be due to network issues or high traffic. Try refreshing the page, checking your internet connection, or clearing your browser cache. If problems persist, try accessing the site from a different device or network."
      },
      {
        question: "I don't see my recent transaction.",
        answer: "Stellar transactions typically confirm within 3-5 seconds, but may take longer during high network activity. Check the transaction status in your wallet or on StellarExpert.io using your transaction hash."
      }
    ]
  }
];

const TROUBLESHOOTING_GUIDES = [
  {
    title: "Wallet Connection Issues",
    icon: <Wallet className="w-6 h-6 text-blue-500" />,
    steps: [
      "Ensure your wallet extension is installed and unlocked",
      "Refresh the page and try connecting again",
      "Check if your wallet is set to the correct network (Mainnet/Testnet)",
      "Disable other wallet extensions temporarily",
      "Try using an incognito/private browser window"
    ]
  },
  {
    title: "Transaction Failures",
    icon: <AlertCircle className="w-6 h-6 text-orange-500" />,
    steps: [
      "Check your XLM balance for transaction fees (minimum 0.01 XLM)",
      "Verify you have sufficient funds for your bet amount",
      "Wait for previous transactions to complete",
      "Increase gas fees if your wallet supports it",
      "Contact support if issues persist"
    ]
  },
  {
    title: "Missing Payouts",
    icon: <CreditCard className="w-6 h-6 text-green-500" />,
    steps: [
      "Check if the market has been officially resolved",
      "Verify your winning prediction was correct",
      "Allow 24-48 hours for automatic payout processing",
      "Check your wallet transaction history",
      "Contact support with your bet details if payout is delayed"
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredFAQs = FAQS.filter(category => {
    if (selectedCategory !== "all" && category.category.toLowerCase() !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      return category.questions.some(q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <HelpBreadcrumb items={[{ label: "Help & Support" }]} />
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Help & Support</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Get answers to your questions and learn how to make the most of Predictify's decentralized prediction platform.
          </p>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={FAQS}
        />

        {/* FAQ Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            
            {filteredFAQs.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    {category.icon}
                    {category.category}
                    <Badge variant="secondary" className="ml-auto">
                      {category.questions.length} questions
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`${categoryIndex}-${index}`}>
                        <AccordionTrigger className="text-left text-slate-200 hover:text-white">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-300 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Start Guide */}
            <QuickStartGuide />

            {/* Quick Links */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5" />
                  Quick Help
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600" asChild>
                  <a href="mailto:support@predictify.com">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Support
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600" asChild>
                  <a href="https://discord.gg/predictify" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Join Discord
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600" asChild>
                  <a href="/dashboard" className="flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600" asChild>
                  <a href="#" className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    User Guide
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <QuickStartGuide />

            {/* Contact Form */}
            <ContactForm />

            {/* System Status */}
            <SystemStatus />
          </div>
        </div>

        {/* Troubleshooting Guides */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Troubleshooting Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TROUBLESHOOTING_GUIDES.map((guide, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white">
                    {guide.icon}
                    {guide.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3 text-slate-300">
                        <span className="flex-shrink-0 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                          {stepIndex + 1}
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6 text-center">
            <p className="text-slate-300 mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600" asChild>
                <a href="mailto:support@predictify.com">Email Support</a>
              </Button>
              <Button variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600" asChild>
                <a href="https://discord.gg/predictify" target="_blank" rel="noopener noreferrer">
                  Join Discord Community
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}