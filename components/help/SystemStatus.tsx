import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "maintenance";
  description?: string;
  lastUpdated?: string;
}

const SERVICES: ServiceStatus[] = [
  {
    name: "Predictify Platform",
    status: "operational",
    description: "Core platform functionality",
    lastUpdated: "2 minutes ago"
  },
  {
    name: "Stellar Network",
    status: "operational", 
    description: "Blockchain connectivity",
    lastUpdated: "1 minute ago"
  },
  {
    name: "Wallet Integration",
    status: "operational",
    description: "Wallet connection services",
    lastUpdated: "3 minutes ago"
  },
  {
    name: "Market Resolution",
    status: "operational",
    description: "Oracle and payout processing",
    lastUpdated: "5 minutes ago"
  }
];

const getStatusIcon = (status: ServiceStatus["status"]) => {
  switch (status) {
    case "operational":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "degraded":
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case "outage":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "maintenance":
      return <Clock className="w-4 h-4 text-blue-500" />;
    default:
      return <CheckCircle className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: ServiceStatus["status"]) => {
  const variants = {
    operational: "bg-green-500/20 text-green-400 border-green-500/30",
    degraded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    outage: "bg-red-500/20 text-red-400 border-red-500/30",
    maintenance: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  };

  const labels = {
    operational: "Operational",
    degraded: "Degraded",
    outage: "Outage",
    maintenance: "Maintenance"
  };

  return (
    <Badge className={variants[status]}>
      {labels[status]}
    </Badge>
  );
};

export function SystemStatus() {
  const overallStatus = SERVICES.every(service => service.status === "operational") 
    ? "operational" 
    : SERVICES.some(service => service.status === "outage") 
    ? "outage" 
    : "degraded";

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {getStatusIcon(overallStatus)}
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {SERVICES.map((service, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <span className="text-slate-300 font-medium">{service.name}</span>
                </div>
                {getStatusBadge(service.status)}
              </div>
              {service.description && (
                <p className="text-xs text-slate-400 ml-6">{service.description}</p>
              )}
              {service.lastUpdated && (
                <p className="text-xs text-slate-500 ml-6">Updated {service.lastUpdated}</p>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Overall Status</span>
            {getStatusBadge(overallStatus)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}