import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useSchedule } from "@/hooks/useSchedule";
import ReminderItem from "@/components/schedule/ReminderItem";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarDays, ListChecks, Loader2 } from "lucide-react";
import ScheduleModal from "@/components/modals/ScheduleModal";
import { Reminder } from "@shared/schema";
import { format } from "date-fns";

const Schedule: React.FC = () => {
  const { reminders, isLoading } = useSchedule();
  const [showModal, setShowModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"list" | "calendar">("list");

  // Filter reminders for selected date in calendar view
  const filteredReminders = selectedDate && view === "calendar"
    ? reminders?.filter(reminder => 
        format(new Date(reminder.datetime), 'yyyy-MM-dd') === 
        format(selectedDate, 'yyyy-MM-dd')
      )
    : reminders;

  const handleEditReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowModal(true);
  };

  return (
    <MainLayout
      title="Schedule"
      subtitle="Manage your reminders and events"
      headerRight={
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reminder
        </Button>
      }
    >
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs 
          defaultValue="list" 
          value={view}
          onValueChange={(value) => setView(value as "list" | "calendar")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-4 pt-4">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="list" className="flex items-center">
                <ListChecks className="h-4 w-4 mr-2" />
                List View
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2" />
                Calendar View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent 
            value="list" 
            className="flex-1 overflow-auto p-4 space-y-4"
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : reminders?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="h-8 w-8 text-neutral-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Reminders</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4 max-w-md">
                  You don't have any reminders yet. Create one to stay organized!
                </p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Reminder
                </Button>
              </div>
            ) : (
              <>
                {reminders?.map(reminder => (
                  <ReminderItem 
                    key={reminder.id} 
                    reminder={reminder} 
                    onEdit={handleEditReminder}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent 
            value="calendar" 
            className="flex-1 overflow-auto p-4 flex flex-col md:flex-row md:space-x-4"
          >
            <div className="mb-6 md:mb-0 md:w-auto">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border shadow"
              />
            </div>

            <div className="flex-1 space-y-4">
              <h3 className="font-medium">
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </h3>
              
              {filteredReminders?.length === 0 ? (
                <div className="text-center p-4 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No reminders for this date.
                  </p>
                </div>
              ) : (
                filteredReminders?.map(reminder => (
                  <ReminderItem 
                    key={reminder.id} 
                    reminder={reminder} 
                    onEdit={handleEditReminder}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ScheduleModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </MainLayout>
  );
};

export default Schedule;
