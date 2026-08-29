import React, { useState, useEffect } from "react";
import { collection, doc, setDoc, getDoc, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DailyLog, UserTargets, UnitSystem } from "../types";
import { convertWeightForInput, convertWeightToKgForStorage, getWeightLabel, lbsToKg, inchesToCm } from "../lib/units";
import { Calculator, Save, History } from "lucide-react";
import { format } from "date-fns";

export function DailyLogForm({ userId, dateRange, unitSystem }: { userId: string; dateRange: { start: string; end: string }; unitSystem: UnitSystem }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [steps, setSteps] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");
  const [sleep, setSleep] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);

  // Targets
  const [showTargets, setShowTargets] = useState(false);
  const [targetCals, setTargetCals] = useState("");
  const [targetP, setTargetP] = useState("");
  const [targetC, setTargetC] = useState("");
  const [targetF, setTargetF] = useState("");

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcGender, setCalcGender] = useState<"male" | "female">("male");
  const [calcAge, setCalcAge] = useState("23");
  const [calcWeight, setCalcWeight] = useState("70");
  const [calcHeight, setCalcHeight] = useState("175");
  const [calcActivity, setCalcActivity] = useState("1.2");

  useEffect(() => {
    // Load log for selected date
    const loadLog = async () => {
      const logRef = doc(db, "users", userId, "logs", date);
      const snap = await getDoc(logRef);
      if (snap.exists()) {
        const data = snap.data() as DailyLog;
        setSteps(data.steps ? data.steps.toString() : "");
        setCalories(data.caloriesConsumed ? data.caloriesConsumed.toString() : "");
        setProtein(data.protein ? data.protein.toString() : "");
        setCarbs(data.carbs ? data.carbs.toString() : "");
        setFat(data.fat ? data.fat.toString() : "");
        setBodyWeight(data.bodyWeight ? convertWeightForInput(data.bodyWeight, unitSystem).toString() : "");
        setSleep(data.sleepHours ? data.sleepHours.toString() : "");
      } else {
        // Clear if no data
        setSteps("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setBodyWeight("");
        setSleep("");
      }
    };
    loadLog();
  }, [date, userId]);

  useEffect(() => {
    // Load targets
    const loadTargets = async () => {
      const docRef = doc(db, "users", userId, "settings", "targets");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserTargets;
        setTargetCals(data.calories.toString());
        setTargetP(data.protein.toString());
        setTargetC(data.carbs.toString());
        setTargetF(data.fat.toString());
      }
    };
    loadTargets();
  }, [userId]);

  useEffect(() => {
    // Load recent logs
    const q = query(
      collection(db, "users", userId, "logs"), 
      where("date", ">=", dateRange.start),
      where("date", "<=", dateRange.end),
      orderBy("date", "desc"), 
      limit(31)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentLogs(snapshot.docs.map(doc => doc.data() as DailyLog));
    });
    return () => unsubscribe();
  }, [userId, dateRange.start, dateRange.end]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const logRef = doc(db, "users", userId, "logs", date);
      const logData: DailyLog = {
        userId,
        date,
        steps: parseInt(steps) || 0,
        caloriesConsumed: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        bodyWeight: convertWeightToKgForStorage(parseFloat(bodyWeight) || 0, unitSystem),
        sleepHours: parseFloat(sleep) || 0,
        timestamp: Date.now(),
      };
      await setDoc(logRef, logData, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving log", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTargets = async () => {
    const docRef = doc(db, "users", userId, "settings", "targets");
    await setDoc(docRef, {
      calories: parseFloat(targetCals) || 0,
      protein: parseFloat(targetP) || 0,
      carbs: parseFloat(targetC) || 0,
      fat: parseFloat(targetF) || 0,
    });
    setShowTargets(false);
    setShowCalculator(false);
  };

  const calculateBaseline = () => {
    let w = parseFloat(calcWeight) || 0;
    let h = parseFloat(calcHeight) || 0;
    
    if (unitSystem === "imperial") {
      w = lbsToKg(w);
      h = inchesToCm(h);
    }

    const a = parseFloat(calcAge) || 0;
    const act = parseFloat(calcActivity) || 1.2;

    let bmr = 0;
    if (calcGender === "male") {
      bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }

    const tdee = Math.round(bmr * act);
    
    // Macro split example (30% p, 40% c, 30% f)
    const p = Math.round((tdee * 0.3) / 4);
    const c = Math.round((tdee * 0.4) / 4);
    const f = Math.round((tdee * 0.3) / 9);

    setTargetCals(tdee.toString());
    setTargetP(p.toString());
    setTargetC(c.toString());
    setTargetF(f.toString());
    setShowCalculator(false);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Target Management Header */}
        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div>
            <h2 className="text-lg font-medium">Daily Targets</h2>
            <p className="text-sm text-zinc-400">Set your macro and calorie goals.</p>
          </div>
          <button
            onClick={() => setShowTargets(!showTargets)}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showTargets ? "Close" : "Edit Targets"}
          </button>
        </div>

        {showTargets && (
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
            {!showCalculator ? (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowCalculator(true)}
                  className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Auto-Calculate Baseline
                </button>
              </div>
            ) : (
              <div className="bg-zinc-950 p-4 rounded-lg mb-4 border border-zinc-800 space-y-4">
                <h3 className="text-sm font-medium text-zinc-300">Baseline Calculator</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Gender</label>
                    <select
                      value={calcGender}
                      onChange={(e) => setCalcGender(e.target.value as "male" | "female")}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <InputField label="Age (years)" value={calcAge} onChange={setCalcAge} type="number" step="1" />
                  <InputField label={`Weight (${getWeightLabel(unitSystem)})`} value={calcWeight} onChange={setCalcWeight} type="number" step="0.1" />
                  <InputField label={`Height (${unitSystem === 'imperial' ? 'in' : 'cm'})`} value={calcHeight} onChange={setCalcHeight} type="number" step="1" />
                  <div className="col-span-2 md:col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">Activity Level</label>
                    <select
                      value={calcActivity}
                      onChange={(e) => setCalcActivity(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    >
                      <option value="1.2">Sedentary (office job)</option>
                      <option value="1.375">Light Exercise (1-2 days/week)</option>
                      <option value="1.55">Moderate Exercise (3-5 days/week)</option>
                      <option value="1.725">Heavy Exercise (6-7 days/week)</option>
                      <option value="1.9">Athlete (2x per day)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowCalculator(false)} className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5">Cancel</button>
                  <button onClick={calculateBaseline} className="bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-medium">Calculate</button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputField label="Calories" value={targetCals} onChange={setTargetCals} type="number" step="1" />
              <InputField label="Protein (g)" value={targetP} onChange={setTargetP} type="number" step="1" />
              <InputField label="Carbs (g)" value={targetC} onChange={setTargetC} type="number" step="1" />
              <InputField label="Fat (g)" value={targetF} onChange={setTargetF} type="number" step="1" />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={saveTargets} className="bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium">
                Save Targets
              </button>
            </div>
          </div>
        )}

        {/* Daily Log Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Daily Log</h2>
            <p className="text-sm text-zinc-400">Enter your daily metrics. Decimals allowed.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500 [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            <InputField label={`Morning Body Weight (${getWeightLabel(unitSystem)})`} value={bodyWeight} onChange={setBodyWeight} type="number" step="0.01" required />
            <InputField label="Steps" value={steps} onChange={setSteps} type="number" step="1" />
            <InputField label="Sleep Quantity (hrs)" value={sleep} onChange={setSleep} type="number" step="0.1" />
            <InputField label="Calories Consumed" value={calories} onChange={setCalories} type="number" step="0.1" />
            
            <div className="sm:col-span-2 grid grid-cols-3 gap-4 pt-2">
               <InputField label="Protein (g)" value={protein} onChange={setProtein} type="number" step="0.1" />
               <InputField label="Carbs (g)" value={carbs} onChange={setCarbs} type="number" step="0.1" />
               <InputField label="Fat (g)" value={fat} onChange={setFat} type="number" step="0.1" />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
            <span className="text-sm text-emerald-500 min-h-[20px] transition-opacity">
              {success ? "Log saved successfully!" : ""}
            </span>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-900 hover:bg-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                 <div className="w-4 h-4 border-2 border-t-transparent border-zinc-900 rounded-full animate-spin" />
              ) : (
                 <Save className="w-4 h-4" />
              )}
              Save Log
            </button>
          </div>
        </form>
      </div>

      {/* Recent Logs Sidebar / List */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl h-fit">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-800">
          <History className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-medium text-zinc-100">Recent Logs</h2>
        </div>
        
        {recentLogs.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No logs found. Start by saving today's log!</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <button
                key={log.date}
                onClick={() => setDate(log.date)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  date === log.date 
                    ? "border-zinc-500 bg-zinc-800" 
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-medium ${date === log.date ? "text-zinc-100" : "text-zinc-300"}`}>
                    {log.date === format(new Date(), "yyyy-MM-dd") ? "Today" : log.date}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {log.bodyWeight ? `${convertWeightForInput(log.bodyWeight, unitSystem)} ${getWeightLabel(unitSystem)}` : '-'}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-zinc-400">
                  <span>{log.caloriesConsumed || 0} kcal</span>
                  <span>{log.steps || 0} steps</span>
                  <span>{log.sleepHours || 0} hrs sleep</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function InputField({ label, value, onChange, type = "text", step, required = false }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600 transition-colors text-sm"
        placeholder="0.00"
      />
    </div>
  );
}

