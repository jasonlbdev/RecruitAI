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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  MapPin,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  ExternalLink,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeFilePath?: string;
  resumeText?: string;
  summary?: string;
  yearsOfExperience: number;
  currentPosition?: string;
  currentCompany?: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  skills?: string[];
  education?: any[];
  workExperience?: any[];
  source: "manual" | "linkedin" | "indeed" | "referral" | "company-website" | "other";
  status: "active" | "inactive" | "hired" | "withdrawn";
  isRemoteOk: boolean;
  isBlacklisted: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateCandidateForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  currentPosition: string;
  currentCompany: string;
  yearsOfExperience: string;
  summary: string;
  skills: string;
  source: string;
  desiredSalaryMin: string;
  desiredSalaryMax: string;
  isRemoteOk: boolean;
  resumeFile?: File;
  useAIExtraction: boolean;
  jobId: string; // Which job they're applying for
}

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateCandidateForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    currentPosition: '',
    currentCompany: '',
    yearsOfExperience: '0',
    summary: '',
    skills: '',
    source: 'manual',
    desiredSalaryMin: '',
    desiredSalaryMax: '',
    isRemoteOk: false,
    useAIExtraction: false,
    jobId: ''
  });

  useEffect(() => {
    loadCandidates();
  }, [searchTerm, sourceFilter, locationFilter]);

  // Load available jobs when modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      loadAvailableJobs();
    }
  }, [isCreateModalOpen]);

  const loadCandidates = async () => {
    try {
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (locationFilter !== 'all') params.append('location', locationFilter);
      
      const response = await fetch(`/api/candidates?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableJobs = async () => {
    setLoadingJobs(true);
    try {
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setAvailableJobs(data.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    // Validate required fields
    if (!formData.jobId) {
      toast({
        title: "Error",
        description: "Please select a job position for this candidate.",
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    try {
      // If resume file and AI extraction is enabled
      if (formData.resumeFile && formData.useAIExtraction) {
        await createCandidateFromResume();
      } else {
        await createCandidateManually();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add candidate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const createCandidateFromResume = async () => {
    if (!formData.resumeFile) return;

    try {
      // Convert file to text (simplified - in production you'd use proper PDF parsing)
      const fileText = await formData.resumeFile.text();
      
      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: formData.resumeFile.name,
          fileContent: fileText,
          jobId: formData.jobId
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "AI Analysis Complete",
          description: `Candidate "${result.data.candidate.firstName} ${result.data.candidate.lastName}" added successfully using AI extraction.`,
        });
        setIsCreateModalOpen(false);
        resetForm();
        loadCandidates();
      } else {
        const errorData = await response.json();
        toast({
          title: "AI Extraction Failed",
          description: errorData.error || "Failed to process resume with AI.",
          variant: "destructive",
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const createCandidateManually = async () => {
    const candidateData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      currentPosition: formData.currentPosition,
      currentCompany: formData.currentCompany,
      yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
      summary: formData.summary,
      skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
      source: formData.source,
      desiredSalaryMin: formData.desiredSalaryMin ? parseInt(formData.desiredSalaryMin) : undefined,
      desiredSalaryMax: formData.desiredSalaryMax ? parseInt(formData.desiredSalaryMax) : undefined,
      isRemoteOk: formData.isRemoteOk,
      jobId: formData.jobId,
      status: 'active'
    };

    const response = await fetch('/api/candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(candidateData)
    });

    if (response.ok) {
      toast({
        title: "Candidate added",
        description: "Candidate has been added to your talent pool successfully.",
      });
      setIsCreateModalOpen(false);
      resetForm();
      loadCandidates();
    } else {
      const errorData = await response.json();
      toast({
        title: "Error",
        description: errorData.error || "Failed to add candidate.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', location: '',
      currentPosition: '', currentCompany: '', yearsOfExperience: '0',
      summary: '', skills: '', source: 'manual', desiredSalaryMin: '',
      desiredSalaryMax: '', isRemoteOk: false, useAIExtraction: false, jobId: ''
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({...prev, resumeFile: file, useAIExtraction: true}));
    }
  };

  const handleViewProfile = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsViewModalOpen(true);
  };

  const handleContactCandidate = (candidate: Candidate) => {
    // Open email client with pre-filled template
    const emailSubject = encodeURIComponent(`Re: ${candidate.currentPosition || 'Job Opportunity'} Position`);
    const emailBody = encodeURIComponent(`Hi ${candidate.firstName},\n\nI hope this message finds you well. I'm reaching out regarding a potential opportunity...\n\nBest regards`);
    window.location.href = `mailto:${candidate.email}?subject=${emailSubject}&body=${emailBody}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Added today';
    if (diffDays < 7) return `Added ${diffDays} days ago`;
    if (diffDays < 30) return `Added ${Math.ceil(diffDays / 7)} weeks ago`;
    return `Added ${Math.ceil(diffDays / 30)} months ago`;
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max?.toLocaleString()}`;
  };

  const getFullName = (candidate: Candidate) => {
    return `${candidate.firstName} ${candidate.lastName}`;
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading candidates...</p>
          </div>
              </div>

      {/* Candidate Detail Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCandidate?.firstName} {selectedCandidate?.lastName}
            </DialogTitle>
            <DialogDescription>
              {selectedCandidate?.currentPosition} at {selectedCandidate?.currentCompany}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{selectedCandidate.email}</span>
                    </div>
                    {selectedCandidate.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{selectedCandidate.phone}</span>
                      </div>
                    )}
                    {selectedCandidate.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{selectedCandidate.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Applied {formatDate(selectedCandidate.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Professional Background</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Current Position</Label>
                      <p className="text-gray-700">{selectedCandidate.currentPosition || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Current Company</Label>
                      <p className="text-gray-700">{selectedCandidate.currentCompany || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Years of Experience</Label>
                      <p className="text-gray-700">{selectedCandidate.yearsOfExperience || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Source</Label>
                      <Badge variant="outline">{selectedCandidate.source}</Badge>
                    </div>
                  </div>
                  
                  {selectedCandidate.summary && (
                    <div>
                      <Label className="font-medium">Professional Summary</Label>
                      <p className="text-gray-700 mt-1">{selectedCandidate.summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Skills */}
              {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Salary Expectations */}
              {(selectedCandidate.desiredSalaryMin || selectedCandidate.desiredSalaryMax) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Salary Expectations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium text-green-600">
                      {formatSalary(selectedCandidate.desiredSalaryMin, selectedCandidate.desiredSalaryMax)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Remote work: {selectedCandidate.isRemoteOk ? 'Yes' : 'No'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => handleContactCandidate(selectedCandidate)}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Candidate
                </Button>
                {selectedCandidate.linkedinUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(selectedCandidate.linkedinUrl, '_blank')}
                  >
                    LinkedIn Profile
                  </Button>
                )}
                {selectedCandidate.resumeFilePath && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(selectedCandidate.resumeFilePath, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Resume
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
                <h1 className="text-2xl font-bold">Candidates</h1>
                <p className="text-gray-600">Manage your talent pool and candidate profiles</p>
              </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Candidate</DialogTitle>
                  <DialogDescription>
                    Add a new candidate to your talent pool.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createCandidate} className="space-y-4">
                  {/* Job Selection - Required */}
                  <div className="space-y-2">
                    <Label htmlFor="jobId">Position Applying For *</Label>
                    <Select value={formData.jobId} onValueChange={(value) => setFormData(prev => ({...prev, jobId: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingJobs ? "Loading jobs..." : "Select a job position"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title} - {job.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableJobs.length === 0 && !loadingJobs && (
                      <p className="text-xs text-red-500">No active jobs found. Please create a job first.</p>
                    )}
                  </div>

                  {/* Resume Upload Section */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <div className="flex justify-center mb-3">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            id="useAI"
                            checked={formData.useAIExtraction}
                            onChange={(e) => setFormData(prev => ({...prev, useAIExtraction: e.target.checked}))}
                          />
                          <Label htmlFor="useAI" className="text-sm font-medium">
                            Use AI to extract candidate data from resume
                          </Label>
                        </div>
                      </div>
                      
                      {formData.useAIExtraction ? (
                        <div>
                          <input
                            type="file"
                            id="resumeFile"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="resumeFile"
                            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {formData.resumeFile ? formData.resumeFile.name : 'Upload Resume'}
                          </label>
                          <p className="text-xs text-gray-500 mt-2">
                            Upload a resume and AI will automatically extract candidate information
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Or fill in candidate details manually below
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Manual Entry Fields - Only show if not using AI or no file uploaded */}
                  {(!formData.useAIExtraction || !formData.resumeFile) && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData(prev => ({...prev, firstName: e.target.value}))}
                            required={!formData.useAIExtraction}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData(prev => ({...prev, lastName: e.target.value}))}
                            required={!formData.useAIExtraction}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                            required={!formData.useAIExtraction}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="currentPosition">Current Position</Label>
                          <Input
                            id="currentPosition"
                            value={formData.currentPosition}
                            onChange={(e) => setFormData(prev => ({...prev, currentPosition: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="currentCompany">Current Company</Label>
                          <Input
                            id="currentCompany"
                            value={formData.currentCompany}
                            onChange={(e) => setFormData(prev => ({...prev, currentCompany: e.target.value}))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                          <Input
                            id="yearsOfExperience"
                            type="number"
                            min="0"
                            value={formData.yearsOfExperience}
                            onChange={(e) => setFormData(prev => ({...prev, yearsOfExperience: e.target.value}))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="skills">Skills (comma-separated)</Label>
                        <Input
                          id="skills"
                          value={formData.skills}
                          onChange={(e) => setFormData(prev => ({...prev, skills: e.target.value}))}
                          placeholder="JavaScript, React, Node.js"
                        />
                      </div>

                      <div>
                        <Label htmlFor="summary">Summary</Label>
                        <Textarea
                          id="summary"
                          value={formData.summary}
                          onChange={(e) => setFormData(prev => ({...prev, summary: e.target.value}))}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="source">Source</Label>
                          <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({...prev, source: value}))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="resume_upload">Resume Upload</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="indeed">Indeed</SelectItem>
                              <SelectItem value="referral">Referral</SelectItem>
                              <SelectItem value="company-website">Company Website</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="salaryMin">Min Salary</Label>
                          <Input
                            id="salaryMin"
                            type="number"
                            value={formData.desiredSalaryMin}
                            onChange={(e) => setFormData(prev => ({...prev, desiredSalaryMin: e.target.value}))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="salaryMax">Max Salary</Label>
                          <Input
                            id="salaryMax"
                            type="number"
                            value={formData.desiredSalaryMax}
                            onChange={(e) => setFormData(prev => ({...prev, desiredSalaryMax: e.target.value}))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isRemoteOk"
                          checked={formData.isRemoteOk}
                          onChange={(e) => setFormData(prev => ({...prev, isRemoteOk: e.target.checked}))}
                        />
                        <Label htmlFor="isRemoteOk">Open to remote work</Label>
                      </div>
                    </>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Processing..." : formData.useAIExtraction && formData.resumeFile ? "AI Extract & Add" : "Add Candidate"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
                    placeholder="Search candidates by name, position, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="indeed">Indeed</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Company Website</SelectItem>
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="San Francisco">San Francisco</SelectItem>
                  <SelectItem value="New York">New York</SelectItem>
                  <SelectItem value="Austin">Austin</SelectItem>
                  <SelectItem value="Seattle">Seattle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Grid */}
        {candidates.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Candidates Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || sourceFilter !== 'all' || locationFilter !== 'all' 
                    ? 'No candidates match your current filters. Try adjusting your search criteria.'
                    : 'Start building your talent pool by adding your first candidate.'
                  }
                </p>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Candidate
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{getFullName(candidate)}</CardTitle>
                      {candidate.currentPosition && (
                        <p className="text-sm text-gray-600 mb-1">{candidate.currentPosition}</p>
                      )}
                      {candidate.currentCompany && (
                        <p className="text-sm text-gray-500 mb-2">at {candidate.currentCompany}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{candidate.location || 'Location not specified'}</span>
                        {candidate.isRemoteOk && (
                          <Badge variant="secondary" className="text-xs">Remote OK</Badge>
                        )}
                      </div>
                    </div>
                    {candidate.isBlacklisted && (
                      <Badge variant="destructive" className="text-xs">
                        Blacklisted
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{candidate.email}</span>
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                  </div>

                  {candidate.summary && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {candidate.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{candidate.yearsOfExperience}</span>
                      <span className="text-gray-500 ml-1">
                        {candidate.yearsOfExperience === 1 ? 'year' : 'years'} experience
                      </span>
                    </div>
                    {candidate.source && (
                      <Badge variant="outline" className="text-xs">
                        {candidate.source}
                      </Badge>
                    )}
                  </div>

                  {(candidate.desiredSalaryMin || candidate.desiredSalaryMax) && (
                    <div className="text-sm">
                      <span className="text-gray-500">Salary expectation: </span>
                      <span className="font-medium">
                        {formatSalary(candidate.desiredSalaryMin, candidate.desiredSalaryMax)}
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{getTimeAgo(candidate.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        {candidate.linkedinUrl && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {candidate.resumeFilePath && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewProfile(candidate)}
                    >
                      View Profile
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleContactCandidate(candidate)}
                    >
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {candidates.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{candidates.length}</div>
                  <div className="text-sm text-gray-600">Total Candidates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {candidates.filter(c => c.isRemoteOk).length}
                  </div>
                  <div className="text-sm text-gray-600">Remote-friendly</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {candidates.filter(c => c.yearsOfExperience >= 5).length}
                  </div>
                  <div className="text-sm text-gray-600">5+ Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {candidates.filter(c => c.source === 'referral').length}
                  </div>
                  <div className="text-sm text-gray-600">Referrals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
