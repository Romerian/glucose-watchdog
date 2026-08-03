import type { GlucoseReading } from "./glucose-data";

// Business layer: interpretation and calculations remain independent of the UI.
export function classifyGlucose(value: number) {
  if (value < 70) return { label: "Low", tone: "low" };
  if (value > 180) return { label: "High", tone: "high" };
  return { label: "In range", tone: "in-range" };
}

export function calculateAverage(readings: GlucoseReading[]) {
  return Math.round(readings.reduce((sum, item) => sum + item.value, 0) / readings.length);
}

export function calculateTimeInRange(readings: GlucoseReading[]) {
  const count = readings.filter((item) => item.value >= 70 && item.value <= 180).length;
  return Math.round((count / readings.length) * 100);
}

export function getTrend(current: number, previous: number) {
  const delta = current - previous;
  if (delta > 3) return { label: "Rising", symbol: "↗" };
  if (delta < -3) return { label: "Falling", symbol: "↘" };
  return { label: "Steady", symbol: "→" };
}

export function formatGlucoseTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}
