import React, { useState, useEffect } from "react";
import { User, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Activity, Camera, Dumbbell, LineChart, LogOut, FileText, Settings as SettingsIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { format, subMonths } from "date-fns";
import { DailyLogForm } from "./DailyLogForm";
import { WorkoutUpload } from "./WorkoutUpload";
import { WorkoutProgress } from "./WorkoutProgress";
import { Charts } from "./Charts";
import { ProgressGallery } from "./ProgressGallery";
import { DateRangePicker } from "./DateRangePicker";
import { Settings } from "./Settings";
import { UserSettings, UnitSystem } from "../types";

type Tab = "overview" | "logs" | "workouts" | "gallery" | "settings";

export function Dashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  
  // Global date range filter for charts and history
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });

  useEffect(() => {
    const loadSettings = async () => {
      const docRef = doc(db, "users", user.uid, "settings", "preferences");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUnitSystem(docSnap.data().unitSystem || "metric");
      }
    };
    loadSettings();
  }, [user.uid]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col md:h-screen shrink-0 sticky top-0 z-10">
        <div className="p-6 pb-2 md:pb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-zinc-900" />
          </div>
          <span className="font-semibold text-zinc-100 truncate">Fitness Tracker</span>
        </div>

        <div className="flex-1 overflow-x-auto md:overflow-y-auto p-4 md:pt-2 flex md:flex-col gap-2">
          <NavItem active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<LineChart className="w-4 h-4" />}>
            Overview
          </NavItem>
          <NavItem active={activeTab === "logs"} onClick={() => setActiveTab("logs")} icon={<FileText className="w-4 h-4" />}>
            Logs & Targets
          </NavItem>
          <NavItem active={activeTab === "workouts"} onClick={() => setActiveTab("workouts")} icon={<Dumbbell className="w-4 h-4" />}>
            Workouts
          </NavItem>
          <NavItem active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} icon={<Camera className="w-4 h-4" />}>
            Gallery
          </NavItem>
          <NavItem active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={<SettingsIcon className="w-4 h-4" />}>
            Settings
          </NavItem>
        </div>

        <div className="p-4 border-t border-zinc-800 hidden md:block mt-auto">
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.displayName}</span>
              <span className="text-xs text-zinc-500 truncate">{user.email}</span>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Global Header / Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div>
              <h1 className="text-lg font-semibold text-zinc-100 capitalize">
                {activeTab === "logs" ? "Logs & Targets" : activeTab}
              </h1>
              <p className="text-sm text-zinc-400">
                {activeTab === "overview" && "Analyze your performance trends"}
                {activeTab === "logs" && "Manage your daily logs and nutrition targets"}
                {activeTab === "workouts" && "Track your progressive overload"}
                {activeTab === "gallery" && "View your physical progress"}
              </p>
            </div>
            
            {(activeTab === "overview" || activeTab === "logs" || activeTab === "workouts") && (
              <DateRangePicker 
                startDate={dateRange.start} 
                endDate={dateRange.end} 
                onStartDateChange={(start) => setDateRange(prev => ({ ...prev, start }))} 
                onEndDateChange={(end) => setDateRange(prev => ({ ...prev, end }))} 
              />
            )}
          </div>

          {activeTab === "overview" && <Charts userId={user.uid} dateRange={dateRange} unitSystem={unitSystem} />}
          
          {activeTab === "logs" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DailyLogForm userId={user.uid} dateRange={dateRange} unitSystem={unitSystem} />
            </div>
          )}

          {activeTab === "workouts" && (
            <div className="space-y-8">
              <WorkoutUpload userId={user.uid} unitSystem={unitSystem} />
              <WorkoutProgress userId={user.uid} unitSystem={unitSystem} />
            </div>
          )}

          {activeTab === "gallery" && (
            <ProgressGallery userId={user.uid} unitSystem={unitSystem} />
          )}

          {activeTab === "settings" && (
            <Settings userId={user.uid} onSettingsChange={(s) => setUnitSystem(s.unitSystem)} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0",
        active ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
