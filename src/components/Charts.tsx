import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DailyLog, UserTargets, WorkoutRecord } from "../types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
  Legend
} from "recharts";

export function Charts({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [targets, setTargets] = useState<UserTargets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Logs
    const qLogs = query(collection(db, "users", userId, "logs"), orderBy("date", "asc"));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(doc => doc.data() as DailyLog));
    });

    // Fetch Workouts
    const qWorkouts = query(collection(db, "users", userId, "workouts"), orderBy("date", "asc"));
    const unsubWorkouts = onSnapshot(qWorkouts, (snap) => {
      setWorkouts(snap.docs.map(doc => doc.data() as WorkoutRecord));
    });

    // Fetch Targets
    const fetchTargets = async () => {
      const docRef = doc(db, "users", userId, "settings", "targets");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTargets(docSnap.data() as UserTargets);
      }
      setLoading(false);
    };
    
    fetchTargets();

    return () => {
      unsubLogs();
      unsubWorkouts();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Pre-process data for Graph 2 (Recovery & Performance)
  // We need to merge sleep data from logs with average RPE/Volume from workouts per date
  const performanceDataMap = new Map<string, any>();
  
  logs.forEach(log => {
    if (log.sleepHours > 0) {
      performanceDataMap.set(log.date, { date: log.date, sleep: log.sleepHours, volume: 0, rpe: 0, workoutCount: 0 });
    }
  });

  workouts.forEach(w => {
    const vol = w.sets.reduce((acc, s) => acc + (s.weight * s.reps), 0);
    const validRpes = w.sets.filter(s => s.rpe > 0).map(s => s.rpe);
    const avgRpe = validRpes.length ? validRpes.reduce((a, b) => a + b, 0) / validRpes.length : 0;
    
    if (performanceDataMap.has(w.date)) {
      const entry = performanceDataMap.get(w.date);
      entry.volume += vol;
      entry.rpe = entry.workoutCount === 0 ? avgRpe : (entry.rpe + avgRpe) / 2;
      entry.workoutCount += 1;
    } else {
      performanceDataMap.set(w.date, { date: w.date, sleep: 0, volume: vol, rpe: avgRpe, workoutCount: 1 });
    }
  });

  const performanceData = Array.from(performanceDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }} />
              <span className="text-zinc-400">{pld.name}:</span>
              <span className="text-zinc-100 font-medium">{pld.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Graph 1: Nutrition & Weight */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-zinc-100">Nutrition & Weight Trend</h2>
          <p className="text-sm text-zinc-400">Track body weight changes against caloric intake.</p>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={logs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val.substring(5)} 
              />
              
              {/* Calories Axis */}
              <YAxis 
                yAxisId="cals" 
                orientation="left" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              
              {/* Weight Axis */}
              <YAxis 
                yAxisId="weight" 
                orientation="right" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              {targets?.calories && (
                <ReferenceLine 
                  y={targets.calories} 
                  yAxisId="cals" 
                  stroke="#a1a1aa" 
                  strokeDasharray="3 3" 
                  label={{ position: 'insideTopLeft', value: 'Caloric Target', fill: '#a1a1aa', fontSize: 10 }} 
                />
              )}

              <Bar yAxisId="cals" dataKey="caloriesConsumed" name="Calories" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="weight" type="monotone" dataKey="bodyWeight" name="Weight (kg)" stroke="#10b981" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graph 2: Recovery & Performance */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-zinc-100">Recovery & Performance</h2>
          <p className="text-sm text-zinc-400">Analyze how sleep impacts your workout volume and perceived exertion.</p>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val.substring(5)} 
              />
              
              <YAxis 
                yAxisId="sleep" 
                orientation="left" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                domain={[0, 12]}
              />
              
              <YAxis 
                yAxisId="rpe" 
                orientation="right" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                domain={[0, 10]}
              />
              
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <Bar yAxisId="sleep" dataKey="sleep" name="Sleep (hrs)" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="rpe" type="monotone" dataKey="rpe" name="Avg RPE" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
