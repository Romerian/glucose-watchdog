export type GlucoseReading = { timestamp: string; value: number };
export type InsulinType = "Basal" | "Bolus";
export type InsulinDose = { timestamp: string; units: number; type: InsulinType; durationMinutes?: number };

const dayNumbers = [28, 29, 30, 31, 1, 2, 3];

// Data layer: seven complete 24-hour pages of deterministic sample readings.
export const glucoseReadings: GlucoseReading[] = dayNumbers.flatMap((day, dayIndex) =>
  Array.from({ length: 24 }, (_, hour) => {
    const month = day >= 28 ? 6 : 7;
    const circadian = Math.round(15 * Math.sin(((hour - 5) / 24) * Math.PI * 2));
    const mealRise = [8, 9, 13, 14, 19, 20].includes(hour) ? 44 : 0;
    const dayShift = [2, -4, 5, 0, -2, 4, 1][dayIndex];
    let value = 93 + circadian + mealRise + dayShift;
    if (dayIndex === 1 && hour === 4) value = 64;
    if (dayIndex === 4 && hour === 14) value = 194;
    if (dayIndex === 6 && hour === 23) value = 104;
    return { value, timestamp: new Date(2026, month, day, hour, 0).toISOString() };
  }),
);

export const insulinDoses: InsulinDose[] = dayNumbers.flatMap((day, dayIndex) => {
  const month = day >= 28 ? 6 : 7;
  return [
    { timestamp: new Date(2026, month, day, 8, 15).toISOString(), units: 4 + (dayIndex % 2), type: "Basal" as const, durationMinutes: 8 * 60 },
    { timestamp: new Date(2026, month, day, 13, 10).toISOString(), units: 5, type: "Bolus" as const },
    { timestamp: new Date(2026, month, day, 19, 20).toISOString(), units: 6, type: "Bolus" as const },
  ];
});
