
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: Date;
}

export default function SystemHealth() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Main API', status: 'unknown', lastCheck: new Date() },
    { name: 'DeerFlow Service', status: 'unknown', lastCheck: new Date() },
    { name: 'Research Storage', status: 'unknown', lastCheck: new Date() },
    { name: 'WebSocket', status: 'unknown', lastCheck: new Date() }
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const checkServices = async () => {
    setIsChecking(true);
    const newServices: ServiceStatus[] = [];

    // Check Main API
    try {
      const start = Date.now();
      const response = await fetch('/api/search-status');
      const responseTime = Date.now() - start;
      newServices.push({
        name: 'Main API',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date()
      });
    } catch (error) {
      newServices.push({
        name: 'Main API',
        status: 'unhealthy',
        lastCheck: new Date()
      });
    }

    // Check DeerFlow Service
    try {
      const start = Date.now();
      const response = await fetch('http://localhost:8000/');
      const responseTime = Date.now() - start;
      newServices.push({
        name: 'DeerFlow Service',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date()
      });
    } catch (error) {
      newServices.push({
        name: 'DeerFlow Service',
        status: 'unhealthy',
        lastCheck: new Date()
      });
    }

    // Check Research Storage
    try {
      const start = Date.now();
      const response = await fetch('/api/research/system-status');
      const responseTime = Date.now() - start;
      newServices.push({
        name: 'Research Storage',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date()
      });
    } catch (error) {
      newServices.push({
        name: 'Research Storage',
        status: 'unhealthy',
        lastCheck: new Date()
      });
    }

    // WebSocket status (simplified check)
    newServices.push({
      name: 'WebSocket',
      status: 'healthy', // You can enhance this with actual WebSocket status
      lastCheck: new Date()
    });

    setServices(newServices);
    setIsChecking(false);
  };

  useEffect(() => {
    checkServices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Health</h1>
          <Button 
            onClick={checkServices} 
            disabled={isChecking}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service) => (
            <Card key={service.name} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {service.name}
                  {getStatusIcon(service.status)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge className={getStatusColor(service.status)}>
                    {service.status.toUpperCase()}
                  </Badge>
                  {service.responseTime && (
                    <p className="text-xs text-muted-foreground">
                      Response: {service.responseTime}ms
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Last check: {service.lastCheck.toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {services.filter(s => s.status === 'healthy').length}
                </p>
                <p className="text-sm text-muted-foreground">Healthy Services</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {services.filter(s => s.status === 'unhealthy').length}
                </p>
                <p className="text-sm text-muted-foreground">Unhealthy Services</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {services.filter(s => s.status === 'unknown').length}
                </p>
                <p className="text-sm text-muted-foreground">Unknown Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
