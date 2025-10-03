import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock,
  User,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  ExternalLink
} from "lucide-react";

interface HelpArticleProps {
  title: string;
  content: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: number;
  helpful: number;
  notHelpful: number;
  tags: string[];
  relatedLinks?: Array<{
    title: string;
    url: string;
  }>;
}

export function HelpArticle({
  title,
  content,
  category,
  author,
  publishedAt,
  readTime,
  helpful,
  notHelpful,
  tags,
  relatedLinks = []
}: HelpArticleProps) {
  return (
    <div className="space-y-6">
      {/* Article Header */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-blue-500/30 text-blue-400">
              {category}
            </Badge>
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <Clock className="w-4 h-4" />
              {readTime} min read
            </div>
          </div>
          <CardTitle className="text-2xl text-white">{title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {author}
            </div>
            <span>•</span>
            <span>{publishedAt}</span>
          </div>
        </CardHeader>
      </Card>

      {/* Article Content */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="prose prose-invert max-w-none">
            <div className="text-slate-300 leading-relaxed whitespace-pre-line">
              {content}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="bg-slate-700 text-slate-300">
                #{tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Related Links */}
      {relatedLinks.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Related Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
                >
                  <span className="text-slate-300 group-hover:text-white">{link.title}</span>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm">Was this helpful?</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 hover:bg-green-600/20">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {helpful}
                </Button>
                <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 hover:bg-red-600/20">
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  {notHelpful}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600">
                <Bookmark className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600">
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}