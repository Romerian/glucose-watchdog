import type { GlucoseReading } from "./glucose-data";

// Business layer: interpretation and calculations remain independent of the UI.
export function classifyGlucose(value: number) {
  if (value >= 40 && value <= 70) return { label: "Low", tone: "low" };
  if (value >= 180 && value <= 400) return { label: "High", tone: "high" };
  if (value >= 80 && value <= 115) return { label: "In range", tone: "in-range" };
  return { label: "Watch", tone: "watch" };
}

export function calculateAverage(readings: GlucoseReading[]) {
  return Math.round(readings.reduce((sum, item) => sum + item.value, 0) / readings.length);
}

export function calculateTimeInRange(readings: GlucoseReading[]) {
  const count = readings.filter((item) => item.value >= 80 && item.value <= 115).length;
  return Math.round((count / readings.length) * 100);
}

export function getTrend(current: number, previous: number) {
  const delta = current - previous;
  if (delta > 3) return { label: "Rising", symbol: "↗" };
  if (delta < -3) return { label: "Falling", symbol: "↘" };
  return { label: "Steady", symbol: "→" };
}

export function formatGlucoseTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp));
}

export function formatLongDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(timestamp));
}
