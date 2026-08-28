import { Unit } from '../store/slices/unitSlice';

// Converts a Celsius reading to the requested display unit, rounding with
// Math.ceil to match the app's existing temperature rounding behavior.
const convertTemp = (celsius: number, unit: Unit): number => {
  if (unit === 'F') {
    return Math.ceil((celsius * 9) / 5 + 32);
  }
  return Math.ceil(celsius);
};

export { convertTemp };
