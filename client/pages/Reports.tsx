import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Clock,
  Award,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";

interface ReportData {
  totalJobs: number;
  totalApplications: number;
  totalCandidates: number;
  averageTimeToHire: number;
  topPerformingJobs: Array<{
    title: string;
    applications: number;
    qualified: number;
    conversionRate: number;
  }>;
  applicationsBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    applications: number;
    hires: number;
  }>;
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("overview");

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load data from multiple endpoints
      const [dashboardResponse, jobsResponse, applicationsResponse, candidatesResponse] = await Promise.all([
        fetch('/api/dashboard/metrics'),
        fetch('/api/jobs'),
        fetch('/api/applications'),
        fetch('/api/candidates')
      ]);

      const dashboard = dashboardResponse.ok ? await dashboardResponse.json() : { data: {} };
      const jobs = jobsResponse.ok ? await jobsResponse.json() : { data: { data: [] } };
      const applications = applicationsResponse.ok ? await applicationsResponse.json() : { data: { data: [] } };
      const candidates = candidatesResponse.ok ? await candidatesResponse.json() : { data: { data: [] } };

      // Process data for reports
      const jobsData = jobs.data?.data || [];
      const applicationsData = applications.data?.data || [];
      const candidatesData = candidates.data?.data || [];

      // Calculate top performing jobs
      const topPerformingJobs = jobsData.slice(0, 5).map((job: any) => ({
        title: job.title,
        applications: Math.floor(Math.random() * 50), // Mock data
        qualified: Math.floor(Math.random() * 20),
        conversionRate: Math.floor(Math.random() * 40) + 20
      }));

      // Calculate applications by source
      const sourceCount: Record<string, number> = {};
      applicationsData.forEach((app: any) => {
        sourceCount[app.source || 'manual'] = (sourceCount[app.source || 'manual'] || 0) + 1;
      });

      const totalApps = Object.values(sourceCount).reduce((sum: number, count: number) => sum + count, 0);
      const applicationsBySource = Object.entries(sourceCount).map(([source, count]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        count: count as number,
        percentage: totalApps > 0 ? Math.round((count as number / totalApps) * 100) : 0
      }));

      // Mock monthly trends
      const monthlyTrends = [
        { month: 'Jan', applications: Math.floor(Math.random() * 100), hires: Math.floor(Math.random() * 20) },
        { month: 'Feb', applications: Math.floor(Math.random() * 100), hires: Math.floor(Math.random() * 20) },
        { month: 'Mar', applications: Math.floor(Math.random() * 100), hires: Math.floor(Math.random() * 20) },
        { month: 'Apr', applications: Math.floor(Math.random() * 100), hires: Math.floor(Math.random() * 20) },
        { month: 'May', applications: Math.floor(Math.random() * 100), hires: Math.floor(Math.random() * 20) },
        { month: 'Jun', applications: Math.floor(Math.random() * 100), hires: Math.floor(Math.random() * 20) }
      ];

      setReportData({
        totalJobs: jobsData.length,
        totalApplications: applicationsData.length,
        totalCandidates: candidatesData.length,
        averageTimeToHire: 12, // Mock data
        topPerformingJobs,
        applicationsBySource,
        monthlyTrends
      });

    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Analytics & Reports</h1>
                <p className="text-gray-600">Track your recruitment performance and insights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={loadReportData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="applications">Applications</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="sources">Sources</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData?.totalApplications || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+23%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData?.totalCandidates || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time to Hire</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData?.averageTimeToHire || 0} days</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600">+2 days</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Performing Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Jobs</CardTitle>
              <CardDescription>Jobs with highest application rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.topPerformingJobs?.map((job, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.applications} applications • {job.qualified} qualified
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{job.conversionRate}% rate</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Applications by Source */}
          <Card>
            <CardHeader>
              <CardTitle>Applications by Source</CardTitle>
              <CardDescription>Where your candidates are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.applicationsBySource?.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{source.source}</p>
                      <p className="text-sm text-muted-foreground">{source.count} applications</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{source.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Application and hiring trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {reportData?.monthlyTrends?.map((month, index) => (
                <div key={index} className="text-center">
                  <div className="text-lg font-bold">{month.applications}</div>
                  <div className="text-sm text-gray-600">{month.month}</div>
                  <div className="text-xs text-green-600">{month.hires} hires</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Applications</span>
                  <span className="font-medium">{reportData?.totalApplications || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Screening</span>
                  <span className="font-medium">{Math.floor((reportData?.totalApplications || 0) * 0.6)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Interviews</span>
                  <span className="font-medium">{Math.floor((reportData?.totalApplications || 0) * 0.3)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Offers</span>
                  <span className="font-medium">{Math.floor((reportData?.totalApplications || 0) * 0.1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Hires</span>
                  <span className="font-medium">{Math.floor((reportData?.totalApplications || 0) * 0.05)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg AI Score</span>
                  <span className="font-medium">85%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Interview Show Rate</span>
                  <span className="font-medium">92%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Offer Acceptance</span>
                  <span className="font-medium">78%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">90-day Retention</span>
                  <span className="font-medium">94%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Time Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Time to First Response</span>
                  <span className="font-medium">4.2 hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Time to Interview</span>
                  <span className="font-medium">5.8 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Time to Offer</span>
                  <span className="font-medium">12.3 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Time to Hire</span>
                  <span className="font-medium">{reportData?.averageTimeToHire || 0} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
