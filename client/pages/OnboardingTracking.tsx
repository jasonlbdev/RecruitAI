import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UserCheck, Calendar, Clock, CheckCircle } from 'lucide-react';

interface OnboardingCandidate {
  id: string;
  name: string;
  position: string;
  startDate: string;
  stage: string;
  progress: number;
  tasks: string[];
  completedTasks: string[];
  manager: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export default function OnboardingTracking() {
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOnboardingCandidates();
  }, []);

  const fetchOnboardingCandidates = async () => {
    try {
      setLoading(true);
      
      // Fetch hired candidates from applications
      const applicationsResponse = await fetch('/api/applications');
      if (!applicationsResponse.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      const applicationsResult = await applicationsResponse.json();
      const applications = applicationsResult.data?.data || [];
      
      // Filter for hired candidates and create onboarding data
      const hiredApplications = applications.filter((app: any) => app.status === 'hired');
      
      const onboardingData = hiredApplications.map((app: any) => {
        const startDate = new Date(app.created_at);
        startDate.setDate(startDate.getDate() + 14); // Assume start date is 2 weeks after hire
        
        return {
          id: app.id,
          name: `${app.first_name || 'Unknown'} ${app.last_name || 'Candidate'}`,
          position: app.position || 'Position Not Specified',
          startDate: startDate.toISOString().split('T')[0],
          stage: determineOnboardingStage(startDate),
          progress: calculateProgress(startDate),
          tasks: getStandardTasks(),
          completedTasks: getCompletedTasks(startDate),
          manager: 'Hiring Manager', // This would come from job posting or assignment
          status: determineStatus(startDate)
        };
      });
      
      setCandidates(onboardingData);
    } catch (err) {
      console.error('Error fetching onboarding data:', err);
      setError('Failed to load onboarding data');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const determineOnboardingStage = (startDate: Date): string => {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysSinceStart < 0) return 'Pre-boarding';
    if (daysSinceStart < 3) return 'Orientation';
    if (daysSinceStart < 7) return 'Initial Training';
    if (daysSinceStart < 30) return 'Role Integration';
    if (daysSinceStart < 90) return 'Performance Review';
    return 'Completed';
  };

  const calculateProgress = (startDate: Date): number => {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysSinceStart < 0) return 0;
    if (daysSinceStart >= 90) return 100;
    return Math.min(Math.floor((daysSinceStart / 90) * 100), 100);
  };

  const getStandardTasks = (): string[] => [
    'Complete paperwork and documentation',
    'IT setup and access provisioning',
    'Meet with direct manager',
    'Department introduction and tour',
    'Review role expectations and goals',
    'Complete required training modules',
    '30-day check-in meeting',
    '60-day performance review',
    '90-day evaluation'
  ];

  const getCompletedTasks = (startDate: Date): string[] => {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const allTasks = getStandardTasks();
    
    if (daysSinceStart < 0) return [];
    if (daysSinceStart < 3) return allTasks.slice(0, 2);
    if (daysSinceStart < 7) return allTasks.slice(0, 4);
    if (daysSinceStart < 30) return allTasks.slice(0, 6);
    if (daysSinceStart < 60) return allTasks.slice(0, 7);
    if (daysSinceStart < 90) return allTasks.slice(0, 8);
    return allTasks;
  };

  const determineStatus = (startDate: Date): 'pending' | 'in_progress' | 'completed' => {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysSinceStart < 0) return 'pending';
    if (daysSinceStart >= 90) return 'completed';
    return 'in_progress';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading onboarding data...</div>
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
          <h1 className="text-3xl font-bold">Onboarding Tracking</h1>
          <p className="text-muted-foreground">Track new hire onboarding progress and completion</p>
        </div>
        <Button onClick={fetchOnboardingCandidates}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Onboarding Candidates</CardTitle>
            <CardDescription>No hired candidates found for onboarding tracking</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Candidates will appear here once they are hired and have a start date.
            </p>
            <Button onClick={() => window.location.href = '/applications'}>
              View Applications
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {candidate.name}
                      <Badge variant={
                        candidate.status === 'completed' ? 'default' :
                        candidate.status === 'in_progress' ? 'secondary' :
                        'outline'
                      }>
                        {candidate.status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {candidate.position} • Manager: {candidate.manager}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Start Date: {new Date(candidate.startDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4" />
                      Stage: {candidate.stage}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Onboarding Progress</span>
                      <span>{candidate.progress}%</span>
                    </div>
                    <Progress value={candidate.progress} className="w-full" />
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Task Completion</h4>
                    <div className="space-y-2">
                      {candidate.tasks.map((task, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${
                            candidate.completedTasks.includes(task) 
                              ? 'text-green-600' 
                              : 'text-muted-foreground'
                          }`} />
                          <span className={`text-sm ${
                            candidate.completedTasks.includes(task)
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}>
                            {task}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
