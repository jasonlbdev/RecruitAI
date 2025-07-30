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
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Brain,
  Clock,
  Eye,
  FileText,
  Plus,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
  Timer,
  Target,
  Briefcase,
} from "lucide-react";

interface DashboardMetrics {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  newApplicationsToday: number;
  totalCandidates: number;
  applicationsByStatus: Record<string, number>;
  recentApplications: any[];
  topPerformingJobs: any[];
  aiProcessingStats: {
    totalProcessed: number;
    averageScore: number;
    processingTime: number;
  };
}

export default function Index() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    loadUserData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard-fixed');
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      // Set empty/default metrics if API fails
      setMetrics({
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        newApplicationsToday: 0,
        totalCandidates: 0,
        applicationsByStatus: {},
        recentApplications: [],
        topPerformingJobs: [],
        aiProcessingStats: {
          totalProcessed: 0,
          averageScore: 0,
          processingTime: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Job Posting
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your recruitment pipeline today.
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.activeJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.totalJobs || 0} total jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Applications
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalApplications?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.newApplicationsToday || 0} new today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                AI Processed
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.aiProcessingStats?.totalProcessed?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                Avg score: {metrics?.aiProcessingStats?.averageScore || 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Candidates
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalCandidates || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total in database
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Performance Dashboard */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Performance Dashboard
              </CardTitle>
              <CardDescription>
                Real-time AI accuracy and recommendation tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-sm text-muted-foreground">{metrics?.aiProcessingStats?.averageScore || 0}%</span>
                  </div>
                  <Progress value={metrics?.aiProcessingStats?.averageScore || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {(metrics?.aiProcessingStats?.averageScore || 0) > 75 ? 'Above target' : 'Below target'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Processing Time</span>
                    <span className="text-sm text-muted-foreground">{(metrics?.aiProcessingStats?.processingTime || 0) / 1000}s</span>
                  </div>
                  <Progress value={Math.min((metrics?.aiProcessingStats?.processingTime || 0) / 100, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Average processing time
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Processed</span>
                    <span className="text-sm text-muted-foreground">{metrics?.aiProcessingStats?.totalProcessed || 0}</span>
                  </div>
                  <Progress value={Math.min(((metrics?.aiProcessingStats?.totalProcessed || 0) / (metrics?.totalApplications || 1)) * 100, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Of total applications
                  </p>
                </div>
              </div>

              {(!metrics?.aiProcessingStats?.totalProcessed || metrics.aiProcessingStats.totalProcessed === 0) && (
                <div className="border-t pt-4">
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 mb-2">No AI Processing Data</h4>
                    <p className="text-gray-600 text-sm">
                      Start processing applications to see AI insights and performance metrics here.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Recent Applications
              </CardTitle>
              <CardDescription>Latest application submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {!metrics?.recentApplications?.length ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No Recent Applications</h4>
                  <p className="text-gray-600 text-sm">
                    New applications will appear here when they're submitted.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.recentApplications.slice(0, 4).map((app, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">New application received</p>
                        <p className="text-xs text-muted-foreground">{app.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{app.timeAgo}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    View All Applications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Job Performance Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Performing Jobs
              </CardTitle>
              <CardDescription>
                Jobs with highest application volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!metrics?.topPerformingJobs?.length ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No Job Data</h4>
                  <p className="text-gray-600 text-sm">
                    Create job postings to see performance analytics here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.topPerformingJobs.slice(0, 3).map((job, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.location} • {job.postedDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{job.applications} applications</p>
                        <p className="text-sm text-success">{job.qualified} qualified</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    View All Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Application Status
              </CardTitle>
              <CardDescription>
                Current application distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!Object.keys(metrics?.applicationsByStatus || {}).length ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No Applications</h4>
                  <p className="text-gray-600 text-sm">
                    Application status breakdown will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(metrics.applicationsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <p className="font-medium capitalize">{status.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts to streamline your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => window.location.href = '/jobs'}
              >
                <Plus className="h-6 w-6" />
                <span>Create Job Posting</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => window.location.href = '/applications'}
              >
                <FileText className="h-6 w-6" />
                <span>Review Applications</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => window.location.href = '/pipeline'}
              >
                <Timer className="h-6 w-6" />
                <span>Manage Pipeline</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => window.location.href = '/reports'}
              >
                <BarChart3 className="h-6 w-6" />
                <span>Generate Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
