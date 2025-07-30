import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, Users, Calendar, Mail } from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  count: number;
  applications: Application[];
}

interface Application {
  id: string;
  candidate_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  ai_score: number;
  status: string;
  stage: string;
  applied_date: string;
  location: string;
}

export default function Pipeline() {
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/applications-fixed');
      
      if (response.ok) {
        const data = await response.json();
        const applications = data.applications || [];
        
        // Define standard pipeline stages
        const stages = [
          { id: 'new', name: 'New Applications', status: 'new' },
          { id: 'reviewing', name: 'Under Review', status: 'reviewing' },
          { id: 'screening', name: 'Phone Screening', status: 'screening' },
          { id: 'interview', name: 'Interview', status: 'interview' },
          { id: 'offer', name: 'Offer Extended', status: 'offer' },
          { id: 'hired', name: 'Hired', status: 'hired' },
          { id: 'rejected', name: 'Rejected', status: 'rejected' }
        ];
        
        // Group applications by stage
        const pipelineData = stages.map(stage => {
          const stageApplications = applications.filter((app: Application) => 
            app.status === stage.status
          );
          
          return {
            id: stage.id,
            name: stage.name,
            count: stageApplications.length,
            applications: stageApplications.map((app: Application) => ({
              ...app,
              candidate_name: app.candidate_name || `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unknown Candidate'
            }))
          };
        });
        
        setPipelineStages(pipelineData);
      }
    } catch (err) {
      console.error('Error fetching pipeline data:', err);
      setError('Failed to load pipeline data');
      setPipelineStages([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'reviewing': return 'outline';
      case 'screening': return 'outline';
      case 'interview': return 'default';
      case 'offer': return 'default';
      case 'hired': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading pipeline...</div>
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
          <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
          <p className="text-muted-foreground">Track candidates through your hiring process</p>
        </div>
        <Button onClick={fetchPipelineData}>
          <Users className="mr-2 h-4 w-4" />
          Refresh Pipeline
        </Button>
      </div>

      {pipelineStages.every(stage => stage.count === 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>No Applications in Pipeline</CardTitle>
            <CardDescription>No applications found in any stage of the pipeline</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Applications will appear here as candidates move through your recruitment process.
            </p>
            <div className="space-x-2">
              <Button onClick={() => window.location.href = '/jobs'}>
                View Jobs
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/candidates'}>
                View Candidates
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {pipelineStages.map((stage) => (
            <Card key={stage.id} className="h-fit">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{stage.name}</CardTitle>
                  <Badge variant="outline">{stage.count}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {stage.applications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">No candidates in this stage</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stage.applications.slice(0, 5).map((application) => (
                      <div key={application.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(application.candidate_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {application.candidate_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {application.position || 'Position not specified'}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                {application.email && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{application.email}</span>
                                  </div>
                                )}
                                {application.applied_date && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(application.applied_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              {application.ai_score > 0 && (
                                <div className="mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    AI Score: {application.ai_score}%
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {stage.applications.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="outline" size="sm">
                          View {stage.applications.length - 5} more
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
