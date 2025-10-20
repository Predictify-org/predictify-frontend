import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export function OtherWaysToGetHelp() {
  return (
    <Card className="mt-5 lg:mt-10">
      <CardContent>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 my-5">
        Other Ways to Get Help
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Discord Community
            </h3>
            <p className="text-gray-600 mb-6">
              Join our Discord server for community support and discussions.
            </p>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-600 hover:text-blue-700 font-medium transition-colors"
              aria-label="Join Discord community"
            >
              Join Discord
            </a>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Email Support
            </h3>
            <p className="text-gray-600 mb-6">
              Send us an email and we'll get back to you within 24 hours.
            </p>
            <a
              href="mailto:support@predictify.com"
              className="inline-block text-blue-600 hover:text-blue-700 font-medium transition-colors"
              aria-label="Email support at support@predictify.com"
            >
              support@predictify.com
            </a>
          </CardContent>
        </Card>
      </div>
      </CardContent>
    </Card>
  );
}
