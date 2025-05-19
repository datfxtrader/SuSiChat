import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

export default function TripPlanning() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('create');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [travelers, setTravelers] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [tripType, setTripType] = useState('vacation');

  const [trips, setTrips] = useState([
    {
      id: 1,
      destination: 'Paris, France',
      dates: 'June 15 - June 25, 2025',
      travelers: '2 adults',
      status: 'Planning'
    },
    {
      id: 2,
      destination: 'Tokyo, Japan',
      dates: 'August 10 - August 24, 2025',
      travelers: '4 adults, 2 children',
      status: 'Confirmed'
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to the backend
    alert('Trip plan saved! This is a demo feature.');
  };

  return (
    <MainLayout 
      title="Trip Planning" 
      subtitle="Plan and organize your family trips"
    >
      <div className="container mx-auto py-6">
        <Tabs defaultValue="create" onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="create">Create Trip</TabsTrigger>
            <TabsTrigger value="manage">Manage Trips</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Plan a New Trip</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Destination</label>
                      <Input 
                        placeholder="Where are you going?" 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Trip Type</label>
                      <Select value={tripType} onValueChange={setTripType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trip type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacation">Vacation</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="family">Family Visit</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Departure Date</label>
                      <DatePicker 
                        date={departureDate} 
                        setDate={setDepartureDate}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Return Date</label>
                      <DatePicker 
                        date={returnDate} 
                        setDate={setReturnDate}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Travelers</label>
                      <Input 
                        placeholder="Number of adults/children" 
                        value={travelers}
                        onChange={(e) => setTravelers(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Budget</label>
                      <Input 
                        placeholder="Estimated budget" 
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes & Preferences</label>
                    <Textarea 
                      placeholder="Any special requirements or notes?" 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Button type="submit">Save Trip Plan</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>Your Trips</CardTitle>
              </CardHeader>
              <CardContent>
                {trips.length > 0 ? (
                  <div className="space-y-4">
                    {trips.map((trip) => (
                      <Card key={trip.id} className="mb-4">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold">{trip.destination}</h3>
                              <p className="text-sm text-muted-foreground">{trip.dates}</p>
                              <p className="text-sm">{trip.travelers}</p>
                            </div>
                            <div>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                trip.status === 'Confirmed' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {trip.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex mt-4 gap-2">
                            <Button variant="outline" size="sm">View Details</Button>
                            <Button variant="outline" size="sm">Edit</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">You don't have any saved trips yet.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setSelectedTab('create')}
                    >
                      Create Your First Trip
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}