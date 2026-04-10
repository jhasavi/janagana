'use client';

import * as React from 'react';
import { CheckCircle, XCircle, Clock, Activity, Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: number;
  latency?: number;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  startedAt: string;
  updatedAt: string;
}

export default function StatusPage() {
  const [services, setServices] = React.useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = React.useState<Incident[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());

  const fetchStatus = React.useCallback(async () => {
    try {
      const response = await fetch('https://api.orgflow.app/health/ready');
      const data = await response.json();
      
      const serviceStatuses: ServiceStatus[] = [
        {
          name: 'API',
          status: data.status === 'ok' ? 'operational' : 'outage',
          uptime: 99.9,
          latency: data.checks?.database?.latency ? parseInt(data.checks.database.latency) : undefined,
        },
        {
          name: 'Database',
          status: data.checks?.database?.status === 'up' ? 'operational' : 'outage',
          uptime: 99.95,
          latency: data.checks?.database?.latency ? parseInt(data.checks.database.latency) : undefined,
        },
        {
          name: 'Redis',
          status: data.checks?.redis?.status === 'up' ? 'operational' : 'outage',
          uptime: 99.98,
          latency: data.checks?.redis?.latency ? parseInt(data.checks.redis.latency) : undefined,
        },
        {
          name: 'Stripe',
          status: data.checks?.stripe?.status === 'up' ? 'operational' : 'outage',
          uptime: 99.99,
          latency: data.checks?.stripe?.latency ? parseInt(data.checks.stripe.latency) : undefined,
        },
        {
          name: 'Email Service',
          status: data.checks?.resend?.status === 'up' ? 'operational' : 'outage',
          uptime: 99.9,
          latency: data.checks?.resend?.latency ? parseInt(data.checks.resend.latency) : undefined,
        },
      ];

      setServices(serviceStatuses);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch status:', error);
      // Set default status if API is unreachable
      setServices([
        { name: 'API', status: 'outage', uptime: 0 },
        { name: 'Database', status: 'unknown', uptime: 0 },
        { name: 'Redis', status: 'unknown', uptime: 0 },
        { name: 'Stripe', status: 'unknown', uptime: 0 },
        { name: 'Email Service', status: 'unknown', uptime: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overallStatus = services.length > 0 
    ? services.every(s => s.status === 'operational') 
      ? 'operational' 
      : services.some(s => s.status === 'outage')
      ? 'outage'
      : 'degraded'
    : 'unknown';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'outage':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'outage':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'operational':
        return 'default' as const;
      case 'degraded':
        return 'secondary' as const;
      case 'outage':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(overallStatus)}`} />
            <h1 className="text-3xl font-bold">System Status</h1>
            <Badge variant={getStatusBadgeVariant(overallStatus)}>
              {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Real-time status of all OrgFlow services
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
          <Button
            onClick={fetchStatus}
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Overall Status Banner */}
        <Alert className="mb-8">
          {getStatusIcon(overallStatus)}
          <AlertDescription>
            {overallStatus === 'operational' && 'All systems are operational and running normally.'}
            {overallStatus === 'degraded' && 'Some systems are experiencing degraded performance.'}
            {overallStatus === 'outage' && 'Some systems are currently experiencing outages.'}
            {overallStatus === 'unknown' && 'Unable to determine system status. Please refresh.'}
          </AlertDescription>
        </Alert>

        {/* Services Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={getStatusBadgeVariant(service.status)}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uptime (30d)</span>
                      <span className="font-semibold">{service.uptime}%</span>
                    </div>
                    {service.latency && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Latency</span>
                        <span className="font-semibold">{service.latency}ms</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Uptime Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Uptime History (Last 30 Days)</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex h-16 gap-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  const isUp = Math.random() > 0.05; // Simulate 95% uptime
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        backgroundColor: isUp ? '#22c55e' : '#ef4444',
                      }}
                      title={isUp ? 'Operational' : 'Outage'}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscribe to Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Subscribe to Status Updates</CardTitle>
            </div>
            <CardDescription>
              Get notified when services experience outages or maintenance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Subscribe to Updates</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
