import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp,
  Download,
  Calendar,
  Target
} from 'lucide-react';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics?period=30');
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const result = await response.json();
      const analyticsData = result.data;
      
      // Transform analytics data to match expected format
      setMetrics({
        totalJobs: analyticsData.totalJobs,
        activeJobs: analyticsData.totalJobs, // Simplified
        totalCandidates: analyticsData.totalCandidates,
        totalApplications: analyticsData.totalApplications,
        newApplicationsToday: analyticsData.timeSeriesData?.[analyticsData.timeSeriesData.length - 1]?.applications || 0,
        statusBreakdown: {
          new: 0, // Would need to calculate from applications data
          reviewing: 0,
          interviewed: 0,
          offered: 0,
          hired: 0,
          rejected: 0
        },
        conversionRate: analyticsData.conversionRates.overallConversion,
        candidateQualityScore: 75, // Placeholder
        recentApplications: [],
        topPerformingJobs: []
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
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

  const handleExport = async (type: 'candidates' | 'applications' | 'jobs', format: 'csv' | 'json') => {
    try {
      const url = `/api/export?type=${type}&format=${format}`;
      
      if (format === 'csv') {
        // For CSV, trigger download
        const response = await fetch(url);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        toast({
          title: "Export Successful",
          description: `${type} exported as CSV successfully`
        });
      } else {
        // For JSON, show data in console and toast
        const response = await fetch(url);
        if (!response.ok) throw new Error('Export failed');
        
        const data = await response.json();
        console.log(`Exported ${type}:`, data);
        
        toast({
          title: "Export Successful",
          description: `${data.data.count} ${type} exported as JSON (check console)`
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      });
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('candidates', 'csv')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Candidates (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('applications', 'csv')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Applications (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('jobs', 'csv')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Jobs (CSV)
          </Button>
        </div>
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
          <p className="text-muted-foreground">Current distribution of application statuses</p>
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
            <p className="text-muted-foreground">Start by creating jobs and adding candidates to see analytics</p>
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
