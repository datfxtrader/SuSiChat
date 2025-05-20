import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebsocket } from "@/hooks/useWebsocket";
import { useEffect } from "react";

// Pages
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import Schedule from "@/pages/schedule";
import FamilyRoom from "@/pages/family-room";
import FamilyRoomDetail from "@/pages/family-room/[id]";
import Profile from "@/pages/profile";
import SunaAgent from "@/pages/suna-agent";
import TripPlanning from "@/pages/trip";
import DeerflowTest from "@/pages/deerflow-test";
import NotFound from "@/pages/not-found";

function App() {
  const { user, isAuthenticated } = useAuth();
  const { isConnected } = useWebsocket();

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && !isConnected && user) {
      // WebSocket initialization is handled in useWebsocket hook
      console.log("User authenticated, WebSocket connection established");
    }
  }, [isAuthenticated, isConnected, user]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={Chat} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/family-room" component={FamilyRoom} />
      <Route path="/family-room/:id" component={FamilyRoomDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/suna-agent" component={SunaAgent} />
      <Route path="/trip" component={TripPlanning} />
      <Route path="/deerflow-test" component={DeerflowTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
