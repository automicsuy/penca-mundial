"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownProps {
  startsAt: string;
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function Countdown({ startsAt, onExpire }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function calculate(): TimeLeft | null {
      const diff = new Date(startsAt).getTime() - Date.now();
      if (diff <= 0) return null;
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    }

    const initial = calculate();
    if (!initial) {
      setExpired(true);
      onExpire?.();
      return;
    }
    setTimeLeft(initial);

    const interval = setInterval(() => {
      const remaining = calculate();
      if (!remaining) {
        setExpired(true);
        onExpire?.();
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startsAt, onExpire]);

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        Predicciones cerradas
      </span>
    );
  }

  if (!timeLeft) return null;

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 1;

  if (timeLeft.days >= 1) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        Cierra en {timeLeft.days}d {timeLeft.hours}h
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded-full ${
        isUrgent
          ? "text-red-700 bg-red-50 animate-pulse"
          : "text-orange-700 bg-orange-50"
      }`}
    >
      <Clock className="w-3 h-3" />
      {String(timeLeft.hours).padStart(2, "0")}:
      {String(timeLeft.minutes).padStart(2, "0")}:
      {String(timeLeft.seconds).padStart(2, "0")}
    </span>
  );
}
