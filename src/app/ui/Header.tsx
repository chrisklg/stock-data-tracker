"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [marketStatus, setMarketStatus] = useState<
    "open" | "closed" | "pre" | "after"
  >("closed");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Weekend
    if (day === 0 || day === 6) {
      setMarketStatus("closed");
    }
    // Pre-market: 4:00 AM - 9:30 AM EST
    else if (hour >= 4 && hour < 9) {
      setMarketStatus("pre");
    }
    // Market hours: 9:30 AM - 4:00 PM EST
    else if (hour >= 9 && hour < 16) {
      setMarketStatus("open");
    }
    // After-hours: 4:00 PM - 8:00 PM EST
    else if (hour >= 16 && hour < 20) {
      setMarketStatus("after");
    }
    // Closed
    else {
      setMarketStatus("closed");
    }
  }, [currentTime]);

  const getMarketStatusInfo = () => {
    switch (marketStatus) {
      case "open":
        return {
          text: "Market Open",
          color: "text-green-400",
          bg: "bg-green-400/10",
          dot: "bg-green-400",
        };
      case "pre":
        return {
          text: "Pre-Market",
          color: "text-blue-400",
          bg: "bg-blue-400/10",
          dot: "bg-blue-400",
        };
      case "after":
        return {
          text: "After Hours",
          color: "text-orange-400",
          bg: "bg-orange-400/10",
          dot: "bg-orange-400",
        };
      default:
        return {
          text: "Market Closed",
          color: "text-gray-400",
          bg: "bg-gray-400/10",
          dot: "bg-gray-400",
        };
    }
  };

  const statusInfo = getMarketStatusInfo();

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-2xl sticky top-0 z-50">
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-white font-mono tracking-tight">
                TradeScope
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Stock Tracker
              </p>
            </div>
          </div>

          {/* Market Status and Time */}
          <div className="flex items-center space-x-6">
            {/* Market Status */}
            <div
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${statusInfo.bg} border border-slate-600`}
            >
              <div
                className={`w-2 h-2 rounded-full ${statusInfo.dot} ${
                  marketStatus === "open" ? "animate-pulse" : ""
                }`}
              ></div>
              <span className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>

            {/* Current Time */}
            <div className="text-right">
              <div className="text-white font-mono text-sm font-bold">
                {currentTime.toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-slate-400 text-xs font-medium">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
