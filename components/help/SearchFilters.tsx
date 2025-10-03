import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: Array<{
    category: string;
    icon: React.ReactNode;
    questions: any[];
  }>;
}

export function SearchFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories
}: SearchFiltersProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search for help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              All Topics
            </Button>
            {categories.map((category) => (
              <Button
                key={category.category}
                variant={selectedCategory === category.category.toLowerCase() ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.category.toLowerCase())}
                className="bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                {category.icon}
                <span className="ml-2">{category.category}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}