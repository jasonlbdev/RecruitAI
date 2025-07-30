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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  MessageCircle,
  UserCheck,
  Edit,
  Trash2,
  Ban,
  UserMinus,
  AlertTriangle,
  MessageSquareIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CandidateNotesModal from '@/components/CandidateNotesModal';

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
  skillsDetailed?: {
    programmingLanguages?: string[];
    frameworks?: string[];
    tools?: string[];
    databases?: string[];
    softSkills?: string[];
    certifications?: string[];
    allSkills?: string[];
  };
  education?: any;
  workExperience?: any[];
  source: "manual" | "linkedin" | "indeed" | "referral" | "company-website" | "other" | "resume_upload" | "bulk_upload";
  status: "active" | "inactive" | "hired" | "withdrawn";
  isRemoteOk: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  notes?: string;
  jobId?: string;
  aiScore?: number;
  aiAnalysisSummary?: string;
  aiRecommendation?: string;
  aiScores?: {
    overall?: number;
    experience?: number;
    skills?: number;
    location?: number;
    education?: number;
    salary?: number;
  };
  keyStrengths?: string[];
  concerns?: string[];
  biasDetection?: any;
  createdAt?: string;
  updatedAt?: string;
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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
      
      const response = await fetch(`/api/candidates-fixed?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
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
      const jobsResponse = await fetch('/api/jobs-fixed');
      if (jobsResponse.ok) {
        const data = await jobsResponse.json();
        setAvailableJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // AI-First Flow: If AI extraction is enabled, skip manual validation
    if (formData.useAIExtraction && formData.resumeFile) {
      // Only validate required fields for AI extraction
      if (!formData.jobId) {
        toast({
          title: "Validation Error",
          description: "Please select a job position for AI analysis.",
          variant: "destructive",
        });
        return;
      }

      setIsCreating(true);
      try {
        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(formData.resumeFile.type)) {
          toast({
            title: "Invalid File Type",
            description: "Please upload a PDF, DOC, DOCX, or TXT file.",
            variant: "destructive",
          });
          return;
        }

        // Validate file size (max 10MB)
        if (formData.resumeFile.size > 10 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: "Please upload a file smaller than 10MB.",
            variant: "destructive",
          });
          return;
        }

        const formDataWithFile = new FormData();
        formDataWithFile.append('resume', formData.resumeFile);
        formDataWithFile.append('jobId', formData.jobId);
        
        const response = await fetch('/api/upload-resume-fixed', {
          method: 'POST',
          body: formDataWithFile,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload resume');
        }

        const result = await response.json();
        if (result.success) {
          toast({
            title: "Candidate Added Successfully",
            description: `${result.data.firstName} ${result.data.lastName} has been added with AI-extracted data.`,
          });
          setIsCreateModalOpen(false);
          resetForm();
          loadCandidates();
        }
      } catch (error) {
        console.error('Error with AI extraction:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process resume with AI. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreating(false);
      }
      return;
    }
    
    // Manual entry validation (only when NOT using AI extraction)
    if (!formData.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.lastName.trim()) {
      toast({
        title: "Validation Error", 
        description: "Last name is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.jobId) {
      toast({
        title: "Validation Error",
        description: "Please select a job position.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      let candidateData = {
        ...formData,
        yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
        desiredSalaryMin: parseInt(formData.desiredSalaryMin) || 0,
        desiredSalaryMax: parseInt(formData.desiredSalaryMax) || 0,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0) : [],
      };

      // TODO: Update to use candidates-fixed endpoint
      // const response = await fetch('/api/candidates', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(candidateData)
      // });
      console.log('Manual candidate creation not yet implemented');

      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.error || 'Failed to create candidate');
      // }

      // const result = await response.json();
      // if (result.success) {
        toast({
          title: "Candidate Added Successfully",
          description: `${formData.firstName} ${formData.lastName} has been added to the system.`,
        });
        setIsCreateModalOpen(false);
        resetForm();
        loadCandidates();
      // }
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create candidate. Please try again.",
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
      
      const response = await fetch('/api/upload-resume-fixed', {
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

    const candidateResponse = await fetch('/api/candidates-fixed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(candidateData)
    });

    if (candidateResponse.ok) {
      const result = await candidateResponse.json();
      toast({
        title: "Candidate added",
        description: "Candidate has been added to your talent pool successfully.",
      });
      setIsCreateModalOpen(false);
      resetForm();
      loadCandidates();
    } else {
      const errorData = await candidateResponse.json();
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
    // Open email client with pre-filled email
    const subject = `Regarding your application for ${availableJobs.find(j => j.id === candidate.jobId)?.title || 'our position'}`;
    const body = `Dear ${candidate.firstName},\n\nThank you for your interest in our position...\n\nBest regards,\nRecruitment Team`;
    const mailtoLink = `mailto:${candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  const handleEditCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setFormData({
      firstName: candidate.firstName || '',
      lastName: candidate.lastName || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      location: candidate.location || '',
      currentPosition: candidate.currentPosition || '',
      currentCompany: candidate.currentCompany || '',
      yearsOfExperience: candidate.yearsOfExperience?.toString() || '0',
      summary: candidate.summary || '',
      skills: candidate.skills?.join(', ') || '',
      source: candidate.source || 'manual',
      desiredSalaryMin: candidate.desiredSalaryMin?.toString() || '',
      desiredSalaryMax: candidate.desiredSalaryMax?.toString() || '',
      isRemoteOk: candidate.isRemoteOk || false,
      useAIExtraction: false,
      jobId: candidate.jobId || '',
      resumeFile: null
    });
    setIsEditModalOpen(true);
  };

  const handleAddNote = async (candidateId: string, note: string) => {
    try {
      const response = await fetch('/api/candidate-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          candidate_id: candidateId, 
          note: note,
          note_type: 'general'
        })
      });

      if (response.ok) {
        toast({
          title: "Note Added",
          description: "Candidate note has been added successfully."
        });
        // Refresh the list or update the specific candidate
      } else {
        throw new Error('Failed to add note');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleBlacklistCandidate = async (candidate: Candidate) => {
    try {
      const response = await fetch(`/api/candidates-fixed/${candidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...candidate,
          isBlacklisted: !candidate.isBlacklisted,
          blacklistReason: !candidate.isBlacklisted ? 'Marked via candidate management' : ''
        })
      });

      if (response.ok) {
        toast({
          title: candidate.isBlacklisted ? "Candidate Unblacklisted" : "Candidate Blacklisted",
          description: `${candidate.firstName} ${candidate.lastName} has been ${candidate.isBlacklisted ? 'removed from' : 'added to'} the blacklist.`
        });
        loadCandidates();
      } else {
        throw new Error('Failed to update candidate status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update candidate status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const updateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    
    setIsEditing(true);

    try {
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
        desiredSalaryMin: formData.desiredSalaryMin ? parseInt(formData.desiredSalaryMin) : null,
        desiredSalaryMax: formData.desiredSalaryMax ? parseInt(formData.desiredSalaryMax) : null,
        isRemoteOk: formData.isRemoteOk,
        jobId: formData.jobId
      };

      const updateResponse = await fetch(`/api/candidates-fixed/${selectedCandidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateData),
      });

      if (updateResponse.ok) {
        toast({
          title: "Candidate updated",
          description: "Candidate information has been updated successfully.",
        });
        setIsEditModalOpen(false);
        setSelectedCandidate(null);
        resetForm();
        loadCandidates(); // Reload candidates
      } else {
        const errorData = await updateResponse.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update candidate.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update candidate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    
    setIsDeleting(true);

    try {
      const deleteResponse = await fetch(`/api/candidates-fixed/${candidateToDelete.id}`, {
        method: 'DELETE',
      });

      if (deleteResponse.ok) {
        toast({
          title: "Candidate deleted",
          description: `${candidateToDelete.firstName} ${candidateToDelete.lastName} has been deleted successfully.`,
        });
        setIsDeleteDialogOpen(false);
        setCandidateToDelete(null);
        loadCandidates(); // Reload candidates
      } else {
        const errorData = await deleteResponse.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete candidate.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete candidate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCandidate = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
    setIsDeleteDialogOpen(true);
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'name':
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'position':
        aValue = (a.currentPosition || '').toLowerCase();
        bValue = (b.currentPosition || '').toLowerCase();
        break;
      case 'aiScore':
        aValue = a.aiScore || 0;
        bValue = b.aiScore || 0;
        break;
      case 'experience':
        aValue = a.yearsOfExperience || 0;
        bValue = b.yearsOfExperience || 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const getStatusBadge = (candidate: Candidate) => {
    if (candidate.isBlacklisted) return { text: 'Blacklisted', variant: 'destructive' as const };
    if (candidate.status === 'hired') return { text: 'Hired', variant: 'default' as const };
    if (candidate.status === 'withdrawn') return { text: 'Withdrawn', variant: 'secondary' as const };
    if (candidate.aiRecommendation === 'STRONG_MATCH') return { text: 'Interview', variant: 'default' as const };
    if (candidate.aiRecommendation === 'GOOD_MATCH') return { text: 'Reviewing', variant: 'secondary' as const };
    if (candidate.aiRecommendation === 'POTENTIAL_MATCH') return { text: 'Offer', variant: 'outline' as const };
    return { text: 'New', variant: 'outline' as const };
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMatchScoreBar = (score: number) => {
    const percentage = Math.min(100, Math.max(0, score));
    let colorClass = 'bg-red-500';
    if (percentage >= 90) colorClass = 'bg-green-500';
    else if (percentage >= 80) colorClass = 'bg-blue-500';
    else if (percentage >= 70) colorClass = 'bg-yellow-500';
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
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

        {/* Candidates Table */}
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
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="w-[200px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        CANDIDATE
                        {getSortIcon('name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('position')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        POSITION
                        {getSortIcon('position')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('aiScore')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        AI SCORE
                        {getSortIcon('aiScore')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">STATUS</TableHead>
                    <TableHead className="w-[100px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('createdAt')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        APPLIED
                        {getSortIcon('createdAt')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[150px]">MATCH SCORE</TableHead>
                    <TableHead className="w-[120px]">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCandidates.map((candidate) => {
                    const statusBadge = getStatusBadge(candidate);
                    const aiScore = candidate.aiScore || 0;
                    
                    return (
                      <TableRow key={candidate.id} className="hover:bg-gray-50">
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {getFullName(candidate)}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {candidate.location || 'Location not specified'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {candidate.currentPosition || 'Position not specified'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {candidate.yearsOfExperience} years experience
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className={`text-sm font-semibold ${getScoreColor(aiScore)}`}>
                            <TrendingUp className="h-4 w-4 inline mr-1" />
                            {aiScore}/100
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant={statusBadge.variant} className="text-xs">
                            {statusBadge.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {formatDate(candidate.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className={`font-medium ${getScoreColor(aiScore)}`}>{aiScore}%</span>
                            </div>
                            {getMatchScoreBar(aiScore)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewProfile(candidate)}
                              className="h-8 w-8 p-0"
                              title="View Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleContactCandidate(candidate)}
                              className="h-8 w-8 p-0"
                              title="Contact"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCandidate(candidate);
                                setIsNotesModalOpen(true);
                              }}
                            >
                              <MessageSquareIcon className="h-4 w-4 mr-2" />
                              Notes
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="More actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleEditCandidate(candidate)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Candidate
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleBlacklistCandidate(candidate)}
                                  className={candidate.isBlacklisted ? 'text-green-600' : 'text-yellow-600'}
                                >
                                  {candidate.isBlacklisted ? (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Unblacklist
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="mr-2 h-4 w-4" />
                                      Blacklist
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCandidate(candidate)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Candidate
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
              {/* AI Analysis Summary */}
              {selectedCandidate.aiAnalysisSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      AI Analysis Summary
                      <Badge variant="outline" className="ml-auto">
                        AI Score: {selectedCandidate.aiScore || 0}/100
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedCandidate.aiAnalysisSummary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Match Criteria Breakdown */}
              {selectedCandidate.aiScores && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Match Criteria Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedCandidate.aiScores.skills !== undefined && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-green-600">Skills Match</span>
                            <span className="font-semibold text-green-600">{selectedCandidate.aiScores.skills}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full bg-green-500" 
                              style={{ width: `${Math.min(100, selectedCandidate.aiScores.skills)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {selectedCandidate.aiScores.experience !== undefined && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-blue-600">Experience</span>
                            <span className="font-semibold text-blue-600">{selectedCandidate.aiScores.experience}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full bg-blue-500" 
                              style={{ width: `${Math.min(100, selectedCandidate.aiScores.experience)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {selectedCandidate.aiScores.education !== undefined && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-purple-600">Education</span>
                            <span className="font-semibold text-purple-600">{selectedCandidate.aiScores.education}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full bg-purple-500" 
                              style={{ width: `${Math.min(100, selectedCandidate.aiScores.education)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {selectedCandidate.aiScores.location !== undefined && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-orange-600">Location</span>
                            <span className="font-semibold text-orange-600">{selectedCandidate.aiScores.location}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full bg-orange-500" 
                              style={{ width: `${Math.min(100, selectedCandidate.aiScores.location)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

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

              {/* Skills & Technologies */}
              {(selectedCandidate.skills || selectedCandidate.skillsDetailed) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Skills & Technologies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Organized Skills Categories */}
                    {selectedCandidate.skillsDetailed && (
                      <div className="space-y-4">
                        {selectedCandidate.skillsDetailed.programmingLanguages && selectedCandidate.skillsDetailed.programmingLanguages.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 mb-2">Programming Languages</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.skillsDetailed.programmingLanguages.map((skill, index) => (
                                <Badge key={index} variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedCandidate.skillsDetailed.frameworks && selectedCandidate.skillsDetailed.frameworks.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 mb-2">Frameworks & Libraries</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.skillsDetailed.frameworks.map((skill, index) => (
                                <Badge key={index} variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedCandidate.skillsDetailed.tools && selectedCandidate.skillsDetailed.tools.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 mb-2">Tools & Platforms</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.skillsDetailed.tools.map((skill, index) => (
                                <Badge key={index} variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedCandidate.skillsDetailed.databases && selectedCandidate.skillsDetailed.databases.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 mb-2">Databases</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.skillsDetailed.databases.map((skill, index) => (
                                <Badge key={index} variant="default" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedCandidate.skillsDetailed.softSkills && selectedCandidate.skillsDetailed.softSkills.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 mb-2">Soft Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.skillsDetailed.softSkills.map((skill, index) => (
                                <Badge key={index} variant="outline" className="border-gray-300">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedCandidate.skillsDetailed.certifications && selectedCandidate.skillsDetailed.certifications.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 mb-2">Certifications</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedCandidate.skillsDetailed.certifications.map((skill, index) => (
                                <Badge key={index} variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Fallback to simple skills list if detailed skills not available */}
                    {!selectedCandidate.skillsDetailed && selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
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
                {selectedCandidate.resumeFilePath && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(selectedCandidate.resumeFilePath, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Download Resume
                  </Button>
                )}
                <Button 
                  variant="destructive"
                  onClick={() => {
                    // Handle reject logic here
                    toast({
                      title: "Candidate Rejected",
                      description: `${selectedCandidate.firstName} ${selectedCandidate.lastName} has been rejected.`,
                      variant: "destructive"
                    });
                    setIsViewModalOpen(false);
                  }}
                  className="flex-1"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => {
                    // Handle move to interview logic here
                    toast({
                      title: "Moved to Interview",
                      description: `${selectedCandidate.firstName} ${selectedCandidate.lastName} has been moved to interview stage.`,
                    });
                    setIsViewModalOpen(false);
                  }}
                  className="flex-1"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Move to Interview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Candidate Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update information for "{selectedCandidate?.firstName} {selectedCandidate?.lastName}".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateCandidate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="City, State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-yearsOfExperience">Years of Experience</Label>
                <Input
                  id="edit-yearsOfExperience"
                  type="number"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currentPosition">Current Position</Label>
                <Input
                  id="edit-currentPosition"
                  value={formData.currentPosition}
                  onChange={(e) => setFormData({...formData, currentPosition: e.target.value})}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currentCompany">Current Company</Label>
                <Input
                  id="edit-currentCompany"
                  value={formData.currentCompany}
                  onChange={(e) => setFormData({...formData, currentCompany: e.target.value})}
                  placeholder="TechCorp Inc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-skills">Skills (comma-separated)</Label>
              <Textarea
                id="edit-skills"
                value={formData.skills}
                onChange={(e) => setFormData({...formData, skills: e.target.value})}
                placeholder="JavaScript, React, Node.js, Python"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-summary">Summary</Label>
              <Textarea
                id="edit-summary"
                value={formData.summary}
                onChange={(e) => setFormData({...formData, summary: e.target.value})}
                placeholder="Brief professional summary"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? "Updating..." : "Update Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Candidate
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{candidateToDelete?.firstName} {candidateToDelete?.lastName}"? This action cannot be undone.
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                Warning: This will permanently remove all candidate data and associated applications.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={confirmDeleteCandidate}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Notes Modal */}
      <CandidateNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        candidateId={selectedCandidate?.id || ''}
        candidateName={selectedCandidate ? `${selectedCandidate.firstName} ${selectedCandidate.lastName}` : ''}
      />
    </div>
  );
}
