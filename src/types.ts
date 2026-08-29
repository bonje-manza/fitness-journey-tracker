export type UnitSystem = "metric" | "imperial";

export interface UserSettings {
  unitSystem: UnitSystem;
}

export interface UserTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  steps: number;
  caloriesConsumed: number;
  protein: number;
  carbs: number;
  fat: number;
  bodyWeight: number;
  sleepHours: number;
  timestamp: number;
}

export interface WorkoutSet {
  reps: number;
  weight: number; // kg
  rpe: number;
  setOrder?: string;
  isWarmup?: boolean;
  isFailure?: boolean;
}

export interface WorkoutRecord {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  workoutName: string;
  exerciseName: string;
  sets: WorkoutSet[];
  timestamp: number;
}

export interface ProgressPicture {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  imageUrl: string;
  bodyWeight: number;
  timestamp: number;
}
