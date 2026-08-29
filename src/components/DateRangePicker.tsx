import React from "react";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg shadow-sm">
      <div className="pl-2 flex items-center justify-center">
        <Calendar className="w-4 h-4 text-zinc-400" />
      </div>
      <input
        type="date"
        value={startDate}
        max={endDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="bg-transparent text-sm text-zinc-200 focus:outline-none [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
      />
      <span className="text-zinc-600 text-sm font-medium">to</span>
      <input
        type="date"
        value={endDate}
        min={startDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="bg-transparent text-sm text-zinc-200 focus:outline-none [&::-webkit-calendar-picker-indicator]:invert cursor-pointer pr-1"
      />
    </div>
  );
}
