import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { WorkoutRecord, UnitSystem } from "../types";
import { formatWeight, convertWeightForInput, getWeightLabel } from "../lib/units";
import { Dumbbell, Search, Filter } from "lucide-react";

export function WorkoutProgress({ userId, unitSystem }: { userId: string, unitSystem: UnitSystem }) {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedWorkoutFilter, setSelectedWorkoutFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "users", userId, "workouts"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutRecord));
      setWorkouts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const workoutNames = useMemo(() => {
    return Array.from(new Set(workouts.map(w => w.workoutName))).sort();
  }, [workouts]);
  
  const filteredByWorkout = useMemo(() => {
    if (selectedWorkoutFilter === "All") return workouts;
    return workouts.filter(w => w.workoutName === selectedWorkoutFilter);
  }, [workouts, selectedWorkoutFilter]);

  const availableExercises = useMemo(() => {
    return Array.from(new Set(filteredByWorkout.map(w => w.exerciseName))).sort();
  }, [filteredByWorkout]);

  const searchedExercises = useMemo(() => {
    if (!searchQuery) return availableExercises;
    return availableExercises.filter(ex => ex.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [availableExercises, searchQuery]);

  // Auto-select first exercise when list changes if current is not in list
  useEffect(() => {
    if (searchedExercises.length > 0 && (!selectedExercise || !searchedExercises.includes(selectedExercise))) {
      setSelectedExercise(searchedExercises[0]);
    } else if (searchedExercises.length === 0) {
      setSelectedExercise(null);
    }
  }, [searchedExercises, selectedExercise]);

  const exerciseHistory = useMemo(() => {
    if (!selectedExercise) return [];
    return filteredByWorkout
      .filter(w => w.exerciseName === selectedExercise)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredByWorkout, selectedExercise]);

  if (loading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-64 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin" />
    </div>
  );

  if (workouts.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col md:flex-row h-[650px]">
      {/* Sidebar: Filters & Exercises */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col h-1/2 md:h-full shrink-0">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900 sticky top-0 space-y-4">
          <h3 className="font-medium text-zinc-100 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-zinc-400" />
            Exercises
          </h3>
          
          <div className="space-y-3">
            <div className="relative">
              <Filter className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedWorkoutFilter}
                onChange={(e) => setSelectedWorkoutFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:border-zinc-500 appearance-none"
              >
                <option value="All">All Routines</option>
                {workoutNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {searchedExercises.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-6 px-4">
              No exercises found matching your search.
            </div>
          ) : (
            searchedExercises.map(exercise => (
              <button
                key={exercise}
                onClick={() => setSelectedExercise(exercise)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors truncate ${
                  selectedExercise === exercise 
                    ? "bg-zinc-100 text-zinc-900 font-medium" 
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                {exercise}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main View: Progressive Overload History */}
      <div className="flex-1 flex flex-col overflow-hidden h-1/2 md:h-full bg-zinc-950/50">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">{selectedExercise || "Select an exercise"}</h2>
            <p className="text-sm text-zinc-400">
              {selectedWorkoutFilter !== "All" ? `Filtered by ${selectedWorkoutFilter}` : "Across all routines"}
            </p>
          </div>
          {exerciseHistory.length > 0 && (
            <div className="text-sm text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
              {exerciseHistory.length} Sessions
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedExercise ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3">
              <Dumbbell className="w-10 h-10 opacity-20" />
              <p>Select an exercise from the list to view its history</p>
            </div>
          ) : exerciseHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500">
              No history found for this exercise.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {exerciseHistory.map(workout => (
                <div key={workout.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col transition-all hover:border-zinc-700">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                    <div>
                      <span className="font-medium text-zinc-100 block">{workout.date}</span>
                      <span className="text-xs text-zinc-500 mt-0.5 block">{workout.workoutName}</span>
                    </div>
                    <span className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-md">
                      {workout.sets.length} sets
                    </span>
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    {workout.sets.map((set, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm hover:bg-zinc-800/30 px-2 py-1 -mx-2 rounded transition-colors">
                        <span className="text-zinc-500 w-12 font-mono">
                          {set.isWarmup ? "W" : set.isFailure ? "F" : `S${set.setOrder || idx + 1}`}
                        </span>
                        <span className="text-zinc-300 w-20 text-right">{formatWeight(set.weight, unitSystem)}</span>
                        <span className="text-zinc-300 w-16 text-right">{set.reps} reps</span>
                        <span className="text-zinc-500 w-16 text-right">
                          {set.rpe > 0 ? `RPE ${set.rpe}` : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Vol</span>
                      <span className="text-zinc-200">{formatWeight(workout.sets.reduce((acc, set) => acc + (set.weight * set.reps), 0), unitSystem)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Avg RPE</span>
                      <span className="text-zinc-200">{(workout.sets.reduce((acc, set) => acc + set.rpe, 0) / (workout.sets.filter(s => s.rpe > 0).length || 1)).toFixed(1)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

