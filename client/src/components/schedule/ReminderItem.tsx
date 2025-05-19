import React from "react";
import { formatDateTime } from "@/lib/utils";
import { Reminder } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { useSchedule } from "@/hooks/useSchedule";

interface ReminderItemProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
}

const ReminderItem: React.FC<ReminderItemProps> = ({ reminder, onEdit }) => {
  const { toggleReminder, deleteReminder } = useSchedule();
  
  const handleToggle = (checked: boolean) => {
    toggleReminder.mutate({
      id: reminder.id,
      completed: checked
    });
  };
  
  const handleDelete = () => {
    deleteReminder.mutate(reminder.id);
  };
  
  return (
    <div className={`flex items-start p-3 rounded-lg transition-colors ${
      reminder.completed ? 'bg-neutral-100/50 dark:bg-neutral-800/50' : 'bg-white dark:bg-neutral-800'
    }`}>
      <Checkbox 
        checked={reminder.completed}
        onCheckedChange={handleToggle}
        className="mt-1"
      />
      
      <div className="ml-3 flex-1">
        <div className={`font-medium ${
          reminder.completed ? 'line-through text-neutral-500 dark:text-neutral-400' : ''
        }`}>
          {reminder.title}
        </div>
        
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {formatDateTime(reminder.datetime)}
          {reminder.repeat !== 'never' && ` • Repeats ${reminder.repeat}`}
        </div>
        
        {reminder.description && (
          <div className={`text-sm mt-2 ${
            reminder.completed ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-300'
          }`}>
            {reminder.description}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(reminder)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ReminderItem;
