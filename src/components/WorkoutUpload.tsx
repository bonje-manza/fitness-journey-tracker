import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UnitSystem } from "../types";
import { lbsToKg } from "../lib/units";

export function WorkoutUpload({ userId, unitSystem }: { userId: string, unitSystem: UnitSystem }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setStatus("error");
      setErrorMessage("Please upload a CSV file from Strong App.");
      return;
    }
    setFile(selectedFile);
    parseAndUpload(selectedFile);
  };

  const parseAndUpload = (fileToParse: File) => {
    setStatus("parsing");
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setStatus("uploading");
          const records = results.data as any[];
          
          // Group by Date + Workout Name + Exercise
          const workoutsMap = new Map<string, any>();
          
          records.forEach((row) => {
            const date = row.Date?.split(" ")[0]; // YYYY-MM-DD
            const workoutName = row["Workout Name"];
            const exerciseName = row["Exercise Name"];
            
            if (!date || !exerciseName) return;

            const setOrderRaw = row["Set Order"];
            // Strong app uses "Rest Timer" or "Note" for non-set rows in some exports
            if (setOrderRaw === "Rest Timer" || setOrderRaw === "Note") return;

            const isWarmup = setOrderRaw === "W";
            const isFailure = setOrderRaw === "F";
            
            // Find the weight column dynamically since it might be "Weight (kg)" or "Weight (lbs)"
            const weightKey = Object.keys(row).find(k => k.toLowerCase().includes("weight"));
            let weight = parseFloat(weightKey ? row[weightKey] : 0) || 0;
            
            // If the CSV explicitly says lbs, convert to kg for storage.
            // If it doesn't specify, we might assume the user's current unitSystem but usually Strong specifies it.
            if (weightKey && weightKey.toLowerCase().includes("lbs")) {
              weight = lbsToKg(weight);
            }

            const reps = parseInt(row.Reps) || 0;
            const rpe = parseFloat(row.RPE) || 0;

            // Optional: skip empty sets
            if (reps === 0 && weight === 0 && !isFailure) return;

            const key = `${date}_${workoutName}_${exerciseName}`;
            if (!workoutsMap.has(key)) {
              workoutsMap.set(key, {
                userId,
                date,
                workoutName: workoutName || "Workout",
                exerciseName,
                sets: [],
                timestamp: new Date(row.Date).getTime() || Date.now()
              });
            }
            
            workoutsMap.get(key).sets.push({ 
              weight, 
              reps, 
              rpe,
              setOrder: setOrderRaw,
              isWarmup,
              isFailure
            });
          });

          // Upload in batches
          const batch = writeBatch(db);
          let count = 0;
          
          workoutsMap.forEach((workoutData, key) => {
             const docRef = doc(db, "users", userId, "workouts", key);
             batch.set(docRef, workoutData, { merge: true });
             count++;
          });
          
          if (count > 0) {
            await batch.commit();
            setStatus("success");
            setTimeout(() => {
              setFile(null);
              setStatus("idle");
            }, 3000);
          } else {
            throw new Error("No valid workout data found.");
          }
        } catch (error: any) {
          console.error("Upload Error", error);
          setStatus("error");
          setErrorMessage(error.message || "Failed to upload workouts.");
        }
      },
      error: (error) => {
        setStatus("error");
        setErrorMessage(error.message);
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Import Strong CSV</h2>
        <p className="text-sm text-zinc-400">Drag and drop your Strong App CSV export here.</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
          isDragging ? "border-zinc-500 bg-zinc-800/50" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        
        {status === "idle" && (
          <>
            <Upload className="w-8 h-8 text-zinc-500 mb-3" />
            <p className="text-sm font-medium text-zinc-300">Click or drag CSV here</p>
          </>
        )}
        
        {(status === "parsing" || status === "uploading") && (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-zinc-300">
              {status === "parsing" ? "Parsing CSV..." : "Syncing to Cloud..."}
            </p>
          </div>
        )}
        
        {status === "success" && (
          <>
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-3" />
            <p className="text-sm font-medium text-emerald-500">Sync Complete!</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
            <p className="text-sm font-medium text-red-500 mb-1">Error</p>
            <p className="text-xs text-zinc-400">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}
