export const kgToLbs = (kg: number): number => {
  return kg * 2.20462;
};

export const lbsToKg = (lbs: number): number => {
  return lbs / 2.20462;
};

export const inchesToCm = (inches: number): number => {
  return inches * 2.54;
};

export const formatWeight = (weightInKg: number, unitSystem: "metric" | "imperial"): string => {
  if (unitSystem === "imperial") {
    return `${kgToLbs(weightInKg).toFixed(1)} lbs`;
  }
  return `${weightInKg.toFixed(1)} kg`;
};

export const convertWeightForInput = (weightInKg: number, unitSystem: "metric" | "imperial"): number => {
  if (unitSystem === "imperial") {
    return Number(kgToLbs(weightInKg).toFixed(1));
  }
  return Number(weightInKg.toFixed(1));
};

export const convertWeightToKgForStorage = (inputWeight: number, unitSystem: "metric" | "imperial"): number => {
  if (unitSystem === "imperial") {
    return Number(lbsToKg(inputWeight).toFixed(2)); // keep some precision
  }
  return Number(inputWeight.toFixed(2));
};

export const getWeightLabel = (unitSystem: "metric" | "imperial"): string => {
  return unitSystem === "imperial" ? "lbs" : "kg";
};
