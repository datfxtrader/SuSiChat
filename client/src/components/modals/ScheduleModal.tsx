import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";
import { useSchedule } from "@/hooks/useSchedule";

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ open, onOpenChange }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [repeat, setRepeat] = useState("never");
  const [notification, setNotification] = useState("at_time");
  
  const { createReminder } = useSchedule();
  
  const handleSave = () => {
    if (!title || !date || !time) return;
    
    // Create a datetime by combining the date and time
    const [hours, minutes] = time.split(":").map(Number);
    const datetime = new Date(date);
    datetime.setHours(hours, minutes);
    
    // Convert notification setting to minutes before
    let notifyBefore = 0;
    switch (notification) {
      case "5_min": notifyBefore = 5; break;
      case "15_min": notifyBefore = 15; break;
      case "30_min": notifyBefore = 30; break;
      case "1_hour": notifyBefore = 60; break;
      case "1_day": notifyBefore = 24 * 60; break;
      default: notifyBefore = 0;
    }
    
    createReminder.mutate({
      title,
      description,
      datetime,
      repeat,
      notifyBefore
    }, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      }
    });
  };
  
  const resetForm = () => {
    setTitle("");
    setDate(undefined);
    setTime("");
    setDescription("");
    setRepeat("never");
    setNotification("at_time");
  };
  
  const getTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        const value = `${formattedHour}:${formattedMinute}`;
        
        // Format for display (12-hour clock)
        const displayHour = hour % 12 || 12;
        const period = hour < 12 ? "AM" : "PM";
        const label = `${displayHour}:${formattedMinute.padStart(2, "0")} ${period}`;
        
        options.push({ value, label });
      }
    }
    return options;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Schedule Reminder</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="reminder-title">
              Title
            </label>
            <Input
              id="reminder-title"
              placeholder="What's this reminder for?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Date & Time
            </label>
            <div className="flex space-x-3">
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex-1">
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Pick a time" />
                  </SelectTrigger>
                  <SelectContent className="h-80">
                    {getTimeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="reminder-description">
              Description (optional)
            </label>
            <Textarea
              id="reminder-description"
              placeholder="Add more details..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Repeat
            </label>
            <Select value={repeat} onValueChange={setRepeat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Notification
            </label>
            <Select value={notification} onValueChange={setNotification}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="at_time">At time of event</SelectItem>
                <SelectItem value="5_min">5 minutes before</SelectItem>
                <SelectItem value="15_min">15 minutes before</SelectItem>
                <SelectItem value="30_min">30 minutes before</SelectItem>
                <SelectItem value="1_hour">1 hour before</SelectItem>
                <SelectItem value="1_day">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!title || !date || !time || createReminder.isPending}
          >
            {createReminder.isPending ? 'Saving...' : 'Save Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleModal;
