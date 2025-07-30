import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Download, TrendingUp, Users, FileText, Target } from 'lucide-react';

interface DashboardMetrics {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  totalApplications: number;
  newApplicationsToday: number;
  statusBreakdown: {
    new: number;
    reviewing: number;
    interviewed: number;
    offered: number;
    hired: number;
    rejected: number;
  };
  conversionRate: number;
  candidateQualityScore: number;
  recentApplications: any[];
  topPerformingJobs: any[];
}

export default function Reports() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard-fixed');
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const result = await response.json();
      setMetrics(result.metrics);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError('Failed to load dashboard metrics');
      // Fallback to empty metrics
      setMetrics({
        totalJobs: 0,
        activeJobs: 0,
        totalCandidates: 0,
        totalApplications: 0,
        newApplicationsToday: 0,
        statusBreakdown: {
          new: 0,
          reviewing: 0,
          interviewed: 0,
          offered: 0,
          hired: 0,
          rejected: 0
        },
        conversionRate: 0,
        candidateQualityScore: 0,
        recentApplications: [],
        topPerformingJobs: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading reports...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Comprehensive recruitment analytics and insights</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeJobs || 0} active positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.newApplicationsToday || 0} applications today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidate Pool</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCandidates || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active candidates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Application to hire ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Application Status Breakdown</CardTitle>
          <CardDescription>Current distribution of application statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(metrics?.statusBreakdown || {}).map(([status, count]) => (
              <div key={status} className="text-center space-y-2">
                <div className="text-2xl font-bold">{count}</div>
                <Badge variant="outline" className="capitalize">
                  {status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No Data State */}
      {metrics && metrics.totalApplications === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Start by creating jobs and adding candidates to see analytics</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No data available yet. Create your first job posting and upload some resumes to see detailed analytics.
            </p>
            <div className="space-x-2">
              <Button onClick={() => window.location.href = '/jobs'}>
                Create Job
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/candidates'}>
                Add Candidates
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
