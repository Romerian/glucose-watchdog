export type GlucoseReading = { timestamp: string; value: number };

// Data layer: this module is the single source of glucose readings for the base app.
export const glucoseReadings: GlucoseReading[] = [
  104, 99, 96, 93, 89, 86, 84, 82, 85, 90,
  96, 105, 116, 128, 141, 149, 143, 136, 130, 125,
  120, 116, 113, 110, 108, 106, 104, 103, 102, 104,
].map((value, index) => ({
  value,
  timestamp: new Date(2026, 7, 3, 0, index * 30).toISOString(),
}));
