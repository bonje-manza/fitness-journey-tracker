import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserSettings, UnitSystem } from "../types";
import { Settings as SettingsIcon, Save } from "lucide-react";

export function Settings({ userId, onSettingsChange }: { userId: string, onSettingsChange: (settings: UserSettings) => void }) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, "users", userId, "settings", "preferences");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserSettings;
        setUnitSystem(data.unitSystem || "metric");
        onSettingsChange(data);
      }
      setLoading(false);
    };
    fetchSettings();
  }, [userId, onSettingsChange]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const newSettings: UserSettings = { unitSystem };
      await setDoc(doc(db, "users", userId, "settings", "preferences"), newSettings);
      onSettingsChange(newSettings);
      setMessage("Settings saved successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex justify-center text-zinc-500">
      Loading settings...
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
        <SettingsIcon className="w-5 h-5 text-zinc-100" />
        <h2 className="text-xl font-semibold text-zinc-100">Preferences</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-md">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Unit System</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="unitSystem"
                value="metric"
                checked={unitSystem === "metric"}
                onChange={() => setUnitSystem("metric")}
                className="accent-zinc-100"
              />
              Metric (kg, cm)
            </label>
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="unitSystem"
                value="imperial"
                checked={unitSystem === "imperial"}
                onChange={() => setUnitSystem("imperial")}
                className="accent-zinc-100"
              />
              Imperial (lbs, in)
            </label>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            This will automatically convert your displayed charts and logs, but weights are always saved locally in metric for consistency.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-medium hover:bg-white transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Preferences"}
        </button>

        {message && <p className="text-sm text-zinc-400 mt-2">{message}</p>}
      </form>
    </div>
  );
}
