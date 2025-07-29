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
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Star,
  TrendingUp,
  Search,
  Filter,
  Plus,
  ArrowRight,
  GripVertical,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  location: string;
  aiScore: number;
  appliedDate: string;
  experience: string;
  salary: string;
  skills: string[];
  notes?: string;
}

interface PipelineStage {
  id: string;
  title: string;
  count: number;
  color: string;
  candidates: Candidate[];
}

export default function Pipeline() {
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [draggedFromStage, setDraggedFromStage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPipelineData();
  }, []);

  const loadPipelineData = async () => {
    try {
      // Since we don't have pipeline-specific endpoints yet, 
      // we'll create mock pipeline stages with real application data
      const response = await fetch('/api/applications');
      
      if (response.ok) {
        const data = await response.json();
        const applications = data.data?.data || [];
        
        // Group applications by status into pipeline stages
        const stages = [
          {
            id: "new",
            title: "New Applications",
            color: "bg-blue-100 border-blue-300",
            candidates: applications.filter((app: any) => app.status === 'new')
          },
          {
            id: "reviewing",
            title: "Under Review",
            color: "bg-yellow-100 border-yellow-300",
            candidates: applications.filter((app: any) => app.status === 'reviewing')
          },
          {
            id: "interview",
            title: "Interview Stage",
            color: "bg-purple-100 border-purple-300",
            candidates: applications.filter((app: any) => app.status === 'interview')
          },
          {
            id: "offer",
            title: "Offer Extended",
            color: "bg-green-100 border-green-300",
            candidates: applications.filter((app: any) => app.status === 'offer')
          },
          {
            id: "hired",
            title: "Hired",
            color: "bg-emerald-100 border-emerald-300",
            candidates: applications.filter((app: any) => app.status === 'hired')
          }
        ].map(stage => ({
          ...stage,
          count: stage.candidates.length,
          candidates: stage.candidates.map((app: any) => ({
            id: app.id,
            name: app.candidateName,
            position: app.position,
            email: app.email,
            phone: app.phone || '',
            location: app.location,
            aiScore: app.aiScore || 0,
            appliedDate: app.appliedDate,
            experience: app.experience,
            salary: app.salaryExpectation,
            skills: [], // Would come from candidate data in real implementation
            notes: app.notes
          }))
        }));
        
        setPipelineData(stages);
      }
    } catch (error) {
      console.error('Failed to load pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, candidate: Candidate, fromStageId: string) => {
    setDraggedCandidate(candidate);
    setDraggedFromStage(fromStageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    
    if (!draggedCandidate || !draggedFromStage || draggedFromStage === toStageId) {
      setDraggedCandidate(null);
      setDraggedFromStage(null);
      return;
    }

    try {
      // Update application status via API
      const response = await fetch(`/api/applications/${draggedCandidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: toStageId,
          stage: getStageDisplayName(toStageId),
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Update local state
        setPipelineData(prevStages => {
          const newStages = prevStages.map(stage => {
            if (stage.id === draggedFromStage) {
              return {
                ...stage,
                candidates: stage.candidates.filter(c => c.id !== draggedCandidate.id),
                count: stage.candidates.length - 1
              };
            }
            if (stage.id === toStageId) {
              return {
                ...stage,
                candidates: [...stage.candidates, draggedCandidate],
                count: stage.candidates.length + 1
              };
            }
            return stage;
          });
          return newStages;
        });

        toast({
          title: "Candidate moved",
          description: `${draggedCandidate.name} moved to ${getStageDisplayName(toStageId)}.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to move candidate. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error moving candidate:', error);
      toast({
        title: "Error",
        description: "Failed to move candidate. Please try again.",
        variant: "destructive",
      });
    }

    setDraggedCandidate(null);
    setDraggedFromStage(null);
  };

  const getStageDisplayName = (stageId: string) => {
    const stageNames: Record<string, string> = {
      new: "New Applications",
      reviewing: "Under Review", 
      interview: "Interview Stage",
      offer: "Offer Extended",
      hired: "Hired"
    };
    return stageNames[stageId] || stageId;
  };

  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDraggedFromStage(null);
  };

  const filteredStages = pipelineData.map(stage => ({
    ...stage,
    candidates: stage.candidates.filter(candidate => {
      const matchesSearch = searchTerm === "" || 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = selectedStage === "all" || stage.id === selectedStage;
      
      return matchesSearch && matchesStage;
    })
  }));

  const totalCandidates = pipelineData.reduce((sum, stage) => sum + stage.count, 0);

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsViewModalOpen(true);
  };

  const handleMoveToNextStage = (candidate: Candidate, currentStageIndex: number) => {
    // Move candidate to next stage
    if (currentStageIndex < pipelineData.length - 1) {
      setPipelineData(prev => {
        const newData = [...prev];
        // Remove from current stage
        newData[currentStageIndex].candidates = newData[currentStageIndex].candidates.filter(c => c.id !== candidate.id);
        // Add to next stage
        newData[currentStageIndex + 1].candidates.push(candidate);
        return newData;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pipeline...</p>
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
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Recruitment Pipeline</h1>
                <p className="text-gray-600">Track candidates through your hiring process</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                {totalCandidates} Total Candidates
              </Badge>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Candidate
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search candidates by name, position, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="new">New Applications</SelectItem>
                  <SelectItem value="reviewing">Under Review</SelectItem>
                  <SelectItem value="interview">Interview Stage</SelectItem>
                  <SelectItem value="offer">Offer Extended</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Stages */}
        {filteredStages.length === 0 || totalCandidates === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Candidates in Pipeline</h3>
                <p className="text-gray-600 mb-6">
                  Your recruitment pipeline is empty. Start by posting jobs and receiving applications.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  View Job Postings
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {filteredStages.map((stage, index) => (
              <Card 
                key={stage.id} 
                className={`${stage.color} border-2 min-h-[400px]`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {stage.title}
                      <Clock className="h-4 w-4 text-gray-500" />
                    </CardTitle>
                    <Badge variant="secondary" className="bg-white/50">
                      {stage.candidates.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  {stage.candidates.length === 0 ? (
                    <div className={`text-center py-8 rounded-lg border-2 border-dashed transition-colors ${
                      draggedCandidate && draggedFromStage !== stage.id
                        ? 'border-blue-300 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-500'
                    }`}>
                      <div className="text-sm">
                        {draggedCandidate && draggedFromStage !== stage.id 
                          ? 'Drop here to move candidate' 
                          : 'No candidates'}
                      </div>
                    </div>
                  ) : (
                    stage.candidates.map((candidate) => (
                      <Card 
                        key={candidate.id} 
                        className={`bg-white shadow-sm hover:shadow-md transition-all cursor-move border ${
                          draggedCandidate?.id === candidate.id 
                            ? 'opacity-50 transform rotate-2 shadow-lg' 
                            : 'hover:shadow-lg'
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, candidate, stage.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <GripVertical className="h-4 w-4 text-gray-400 drag-handle" />
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{candidate.name}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{candidate.position}</p>
                                </div>
                              </div>
                              {candidate.aiScore > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  {candidate.aiScore}%
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{candidate.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Applied {candidate.appliedDate}</span>
                              </div>
                              {candidate.experience && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{candidate.experience}</span>
                                </div>
                              )}
                            </div>

                            {candidate.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {candidate.skills.slice(0, 3).map((skill, skillIndex) => (
                                  <Badge key={skillIndex} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {candidate.skills.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{candidate.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {candidate.notes && (
                              <div className="bg-gray-50 p-2 rounded text-xs">
                                <p className="text-gray-700">{candidate.notes}</p>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-xs"
                                onClick={() => handleViewCandidate(candidate)}
                              >
                                View
                              </Button>
                              {index < filteredStages.length - 1 && (
                                <Button 
                                  size="sm" 
                                  className="flex-1 text-xs"
                                  onClick={() => handleMoveToNextStage(candidate, index)}
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Next
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pipeline Statistics */}
        {totalCandidates > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Pipeline Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {pipelineData.map((stage) => (
                  <div key={stage.id} className="text-center">
                    <div className="text-2xl font-bold">{stage.count}</div>
                    <div className="text-sm text-gray-600">{stage.title}</div>
                    <div className="text-xs text-gray-500">
                      {totalCandidates > 0 ? Math.round((stage.count / totalCandidates) * 100) : 0}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
