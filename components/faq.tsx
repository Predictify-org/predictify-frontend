"use client";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: "Common issues",
    items: [
      {
        question: "My transaction is pending for a long time",
        answer:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      },
      {
        question: "I can't connect my wallet",
        answer:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      },
      {
        question: "My winnings haven't been credited",
        answer:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      },
    ],
  },
  {
    title: "Predicting events",
    items: [
      {
        question: "How do I Predict events?",
        answer:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      },
      {
        question: "Minimum amount to place on an event?",
        answer:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      },
      {
        question: "Can I cancel a prediction after predicting an event?",
        answer:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      },
    ],
  },
];

export default function FAQ() {
  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const toggleCategory = (index: number) => {
    setOpenCategory(openCategory === index ? null : index);
    setOpenQuestion(null);
  };

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenQuestion(openQuestion === key ? null : key);
  };

  return (
    <div className="space-y-4 mx-4">
      {faqData.map((category, categoryIndex) => (
        <Card
          key={categoryIndex}
          className="w-full max-w-2xl mx-auto bg-white shadow-sm border border-gray-200 overflow-hidden"
        >
          <CardContent className="p-0">
            <button
              onClick={() => toggleCategory(categoryIndex)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              aria-expanded={openCategory === categoryIndex}
              aria-controls={`category-content-${categoryIndex}`}
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {category.title}
              </h2>
              {openCategory === categoryIndex ? (
                <ChevronUp
                  className="w-6 h-6 text-purple-600 hover:text-purple-700 transition-colors flex-shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className="w-6 h-6 text-purple-600 hover:text-purple-700 transition-colors flex-shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Category Content */}
            <div
              id={`category-content-${categoryIndex}`}
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                openCategory === categoryIndex
                  ? "max-h-[2000px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6">
                {category.items.map((item, itemIndex) => {
                  const questionKey = `${categoryIndex}-${itemIndex}`;
                  const isOpen = openQuestion === questionKey;

                  return (
                    <div
                      key={itemIndex}
                      className="border-b border-[#540D8D] last:border-b-0"
                    >
                      {/* Question */}
                      <button
                        onClick={() => toggleQuestion(categoryIndex, itemIndex)}
                        className="w-full py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
                        aria-expanded={isOpen}
                        aria-controls={`answer-${questionKey}`}
                      >
                        <span className="text-base text-gray-700 pr-4">
                          {item.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp
                            className="w-5 h-5 text-purple-600 hover:text-purple-700 transition-colors flex-shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            className="w-5 h-5 text-purple-600 hover:text-purple-700 transition-colors flex-shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>

                      {/* Answer */}
                      <div
                        id={`answer-${questionKey}`}
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        }`}
                        role="region"
                        aria-labelledby={`question-${questionKey}`}
                      >
                        <div className="pb-4 pt-0">
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
