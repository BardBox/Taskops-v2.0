import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeRangeFilterProps {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
}

export function TimeRangeFilter({ 
  dateFrom, 
  dateTo, 
  onDateFromChange, 
  onDateToChange 
}: TimeRangeFilterProps) {
  const handlePresetChange = (preset: string) => {
    const now = new Date();
    
    switch (preset) {
      case "this-month":
        onDateFromChange(startOfMonth(now));
        onDateToChange(endOfMonth(now));
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        onDateFromChange(startOfMonth(lastMonth));
        onDateToChange(endOfMonth(lastMonth));
        break;
      case "this-year":
        onDateFromChange(startOfYear(now));
        onDateToChange(endOfYear(now));
        break;
      case "last-year":
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        onDateFromChange(startOfYear(lastYear));
        onDateToChange(endOfYear(lastYear));
        break;
      case "all-time":
        onDateFromChange(undefined);
        onDateToChange(undefined);
        break;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select onValueChange={handlePresetChange} defaultValue="all-time">
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="this-year">This Year</SelectItem>
          <SelectItem value="last-year">Last Year</SelectItem>
          <SelectItem value="all-time">All Time</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={onDateFromChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-muted-foreground">to</span>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM dd, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={onDateToChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
