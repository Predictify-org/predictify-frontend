import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

export function ContactForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    category: "general",
    message: ""
  });

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically send the form data to your backend
      console.log("Contact form submitted:", formData);
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        category: "general",
        message: ""
      });

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Contact Support</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-300">Name</Label>
            <Input
              id="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>
          
          <div>
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-slate-300">Category</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            >
              <option value="general">General Question</option>
              <option value="technical">Technical Issue</option>
              <option value="wallet">Wallet Problem</option>
              <option value="betting">Betting Question</option>
              <option value="payout">Payout Issue</option>
              <option value="feature">Feature Request</option>
            </select>
          </div>

          <div>
            <Label htmlFor="subject" className="text-slate-300">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="message" className="text-slate-300">Message</Label>
            <Textarea
              id="message"
              placeholder="Please provide as much detail as possible..."
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              required
              rows={5}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}