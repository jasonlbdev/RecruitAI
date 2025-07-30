import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { Slider } from "@/components/ui/slider";
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
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Search,
  Filter,
  X,
  FileText,
  Edit,
  Trash2,
  Copy,
  AlertTriangle,
  Play,
  Pause,
  Archive,
  MoreHorizontal,
  History as HistoryIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuditLogModal from '@/components/AuditLogModal';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  jobType: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  niceToHave?: string[];
  postedDate: string;
  deadline?: string;
  status: string;
  isRemote: boolean;
  experienceLevel: string;
  applications?: number;
  qualified?: number;
  aiScore?: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateJobForm {
  title: string;
  department: string;
  location: string;
  jobType: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  requirements: string;
  niceToHave: string;
  deadline: string;
  isRemote: boolean;
  experienceLevel: string;
  // AI Scoring Weights (0-100, should total 100)
  experienceWeight: number;
  skillsWeight: number;
  locationWeight: number;
  educationWeight: number;
  salaryWeight: number;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedResults, setProcessedResults] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateJobForm>({
    title: '',
    department: '',
    location: '',
    jobType: 'full-time',
    employmentType: 'permanent',
    salaryMin: '',
    salaryMax: '',
    description: '',
    requirements: '',
    niceToHave: '',
    deadline: '',
    isRemote: false,
    experienceLevel: 'mid',
    // Default weights (equal distribution)
    experienceWeight: 30,
    skillsWeight: 30,
    locationWeight: 15,
    educationWeight: 15,
    salaryWeight: 10
  });

  useEffect(() => {
    loadJobs();
  }, [searchTerm, statusFilter, departmentFilter]);

  useEffect(() => {
    // Check for expired jobs when jobs load
    if (jobs.length > 0) {
      handleExpiredJobs();
    }
  }, [jobs]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      
      const response = await fetch(`/api/jobs-fixed?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add form validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.department.trim()) {
      toast({
        title: "Validation Error",
        description: "Department is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.location.trim()) {
      toast({
        title: "Validation Error",
        description: "Location is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.jobType) {
      toast({
        title: "Validation Error",
        description: "Job type is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.employmentType) {
      toast({
        title: "Validation Error",
        description: "Employment type is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Job description is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.requirements.trim()) {
      toast({
        title: "Validation Error",
        description: "Job requirements are required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.experienceLevel) {
      toast({
        title: "Validation Error",
        description: "Experience level is required.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate salary range if provided
    if (formData.salaryMin && formData.salaryMax) {
      const minSalary = parseInt(formData.salaryMin);
      const maxSalary = parseInt(formData.salaryMax);
      
      if (minSalary >= maxSalary) {
        toast({
          title: "Validation Error",
          description: "Maximum salary must be greater than minimum salary.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsCreating(true);

    try {
      const jobData = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        jobType: formData.jobType,
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        niceToHave: formData.niceToHave ? formData.niceToHave.split('\n').filter(r => r.trim()) : [],
        deadline: formData.deadline || undefined,
        isRemote: formData.isRemote,
        experienceLevel: formData.experienceLevel,
        // AI Scoring Weights
        scoringWeights: {
          experience: formData.experienceWeight,
          skills: formData.skillsWeight,
          location: formData.locationWeight,
          education: formData.educationWeight,
          salary: formData.salaryWeight
        },
        status: 'active'
      };

      const response = await fetch('/api/jobs-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (response.ok) {
        toast({
          title: "Job created",
          description: "Job posting has been created successfully.",
        });
        setIsCreateModalOpen(false);
        setFormData({
          title: '', department: '', location: '', jobType: 'full-time',
          employmentType: 'permanent', salaryMin: '', salaryMax: '',
          description: '', requirements: '', niceToHave: '', deadline: '',
          isRemote: false, experienceLevel: 'mid',
          experienceWeight: 30, skillsWeight: 30, locationWeight: 15,
          educationWeight: 15, salaryWeight: 10
        });
        loadJobs(); // Reload jobs
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to create job posting.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job posting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setIsViewModalOpen(true);
    loadAuditHistory(job.id);
  };

  const loadAuditHistory = async (jobId: string) => {
    setIsLoadingAudit(true);
    try {
      const response = await fetch(`/api/audit-logs?entity_type=job&entity_id=${jobId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load audit history:', error);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const formatAuditAction = (log: any) => {
    switch (log.action) {
      case 'created':
        return 'Job created';
      case 'updated':
        return 'Job updated';
      case 'deleted':
        return 'Job deleted';
      default:
        return log.action;
    }
  };

  const getAuditChanges = (log: any) => {
    if (log.action === 'created') {
      return 'Initial job posting created';
    }
    if (log.action === 'deleted') {
      return 'Job posting deleted';
    }
    if (log.action === 'updated' && log.changes) {
      const changes = Object.keys(log.changes)
        .filter(key => key !== 'updatedAt')
        .map(key => `${key}: ${JSON.stringify(log.changes[key])}`)
        .join(', ');
      return changes || 'No significant changes';
    }
    return 'No details available';
  };

  const handleViewApplications = (jobId: string) => {
    // Navigate to applications page filtered by this job
    window.location.href = `/applications?job=${jobId}`;
  };

  const handleBulkUpload = (job: Job) => {
    setSelectedJob(job);
    setIsBulkUploadOpen(true);
    setUploadFiles([]);
    setProcessedResults([]);
    setProcessingProgress(0);
  };

  const handleEditJob = (job: Job) => {
    // Populate form with job data
    setFormData({
      title: job.title,
      department: job.department,
      location: job.location,
      jobType: job.jobType,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin?.toString() || '',
      salaryMax: job.salaryMax?.toString() || '',
      description: job.description,
      requirements: job.requirements.join('\n'),
      niceToHave: job.niceToHave?.join('\n') || '',
      deadline: job.deadline || '',
      isRemote: job.isRemote,
      experienceLevel: job.experienceLevel,
      // Default weights if not available
      experienceWeight: 30,
      skillsWeight: 30,
      locationWeight: 15,
      educationWeight: 15,
      salaryWeight: 10
    });
    setSelectedJob(job);
    setIsEditModalOpen(true);
  };

  const updateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    
    setIsEditing(true);

    try {
      const jobData = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        jobType: formData.jobType,
        employmentType: formData.employmentType,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        niceToHave: formData.niceToHave ? formData.niceToHave.split('\n').filter(r => r.trim()) : [],
        deadline: formData.deadline || undefined,
        isRemote: formData.isRemote,
        experienceLevel: formData.experienceLevel,
        scoringWeights: {
          experience: formData.experienceWeight,
          skills: formData.skillsWeight,
          location: formData.locationWeight,
          education: formData.educationWeight,
          salary: formData.salaryWeight
        }
      };

      const response = await fetch(`/api/jobs-fixed/${selectedJob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (response.ok) {
        toast({
          title: "Job updated",
          description: "Job posting has been updated successfully.",
        });
        setIsEditModalOpen(false);
        setSelectedJob(null);
        loadJobs(); // Reload jobs
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update job posting.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job posting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/jobs-fixed/${jobToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Job deleted",
          description: `"${jobToDelete.title}" has been deleted successfully.`,
        });
        setIsDeleteDialogOpen(false);
        setJobToDelete(null);
        loadJobs(); // Reload jobs
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete job posting.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job posting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateJob = (job: Job) => {
    // Populate form with job data (without ID to create new)
    setFormData({
      title: `${job.title} (Copy)`,
      department: job.department,
      location: job.location,
      jobType: job.jobType,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin?.toString() || '',
      salaryMax: job.salaryMax?.toString() || '',
      description: job.description,
      requirements: job.requirements.join('\n'),
      niceToHave: job.niceToHave?.join('\n') || '',
      deadline: '',
      isRemote: job.isRemote,
      experienceLevel: job.experienceLevel,
      experienceWeight: 30,
      skillsWeight: 30,
      locationWeight: 15,
      educationWeight: 15,
      salaryWeight: 10
    });
    setIsCreateModalOpen(true);
  };

  const handleStatusChange = async (job: Job, newStatus: string) => {
    try {
      const response = await fetch(`/api/jobs-fixed/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Status updated",
          description: `"${job.title}" status changed to ${newStatus}.`,
        });
        loadJobs(); // Reload jobs
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update job status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-4 w-4 text-green-600" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'closed':
        return <Archive className="h-4 w-4 text-red-600" />;
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleFilesDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Validate file types and sizes
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    droppedFiles.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name}: Invalid file type (only PDF, DOC, DOCX, TXT allowed)`);
      } else if (file.size > maxSize) {
        invalidFiles.push(`${file.name}: File too large (max 10MB)`);
      } else {
        validFiles.push(file);
      }
    });
    
    // Show validation errors if any
    if (invalidFiles.length > 0) {
      toast({
        title: "File Validation Error",
        description: invalidFiles.join('\n'),
        variant: "destructive",
      });
    }
    
    // Add valid files
    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      toast({
        title: "Files Added",
        description: `${validFiles.length} file(s) added successfully.`,
      });
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate file types and sizes
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      selectedFiles.forEach(file => {
        if (!allowedTypes.includes(file.type)) {
          invalidFiles.push(`${file.name}: Invalid file type (only PDF, DOC, DOCX, TXT allowed)`);
        } else if (file.size > maxSize) {
          invalidFiles.push(`${file.name}: File too large (max 10MB)`);
        } else {
          validFiles.push(file);
        }
      });
      
      // Show validation errors if any
      if (invalidFiles.length > 0) {
        toast({
          title: "File Validation Error",
          description: invalidFiles.join('\n'),
          variant: "destructive",
        });
      }
      
      // Add valid files
      if (validFiles.length > 0) {
        setUploadFiles(prev => [...prev, ...validFiles]);
        toast({
          title: "Files Added",
          description: `${validFiles.length} file(s) added successfully.`,
        });
      }
      
      // Reset input
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processBulkResumes = async () => {
    if (!selectedJob || uploadFiles.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Convert all files to text
      const resumeData = [];
      for (const file of uploadFiles) {
        try {
          const fileText = await file.text();
          resumeData.push({
            fileName: file.name,
            fileContent: fileText
          });
        } catch (error) {
          console.error(`Failed to read file ${file.name}:`, error);
          resumeData.push({
            fileName: file.name,
            fileContent: '',
            error: 'Failed to read file'
          });
        }
      }

      // Send to bulk processing API
      const response = await fetch('/api/bulk-upload-resumes-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: resumeData,
          jobId: selectedJob.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setProcessedResults(result.data.results);
        setProcessingProgress(100);
        
        toast({
          title: "Bulk Processing Complete",
          description: `Successfully processed ${result.data.successful} of ${result.data.totalProcessed} resumes.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Processing Failed",
          description: error.error || "Failed to process resumes in bulk.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Bulk processing error:', error);
      toast({
        title: "Error",
        description: "An error occurred during bulk processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max?.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysAgo = (dateString: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  };

  const getDeadlineStatus = (deadline?: string) => {
    if (!deadline) return null;
    
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', message: `Expired ${Math.abs(diffDays)} days ago`, color: 'text-red-600' };
    } else if (diffDays === 0) {
      return { status: 'today', message: 'Expires today', color: 'text-red-600' };
    } else if (diffDays <= 3) {
      return { status: 'urgent', message: `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`, color: 'text-orange-600' };
    } else if (diffDays <= 7) {
      return { status: 'warning', message: `Expires in ${diffDays} days`, color: 'text-yellow-600' };
    } else {
      return { status: 'normal', message: `Expires ${formatDate(deadline)}`, color: 'text-gray-600' };
    }
  };

  const handleExpiredJobs = async () => {
    // Auto-close expired jobs
    const today = new Date();
    const expiredJobs = jobs.filter(job => 
      job.deadline && 
      new Date(job.deadline) < today && 
      job.status === 'active'
    );

    for (const job of expiredJobs) {
      try {
        await handleStatusChange(job, 'closed');
      } catch (error) {
        console.error(`Failed to auto-close expired job ${job.id}:`, error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading jobs...</p>
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
              <Briefcase className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Job Postings</h1>
                <p className="text-gray-600">Manage and track your job openings</p>
              </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Job Posting</DialogTitle>
                  <DialogDescription>
                    Fill out the details for your new job posting.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createJob} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g. Senior React Developer"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
                      <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Product">Product</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="e.g. San Francisco, CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isRemote">Remote Work</Label>
                      <Select value={formData.isRemote.toString()} onValueChange={(value) => setFormData({...formData, isRemote: value === 'true'})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">On-site</SelectItem>
                          <SelectItem value="true">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobType">Job Type</Label>
                      <Select value={formData.jobType} onValueChange={(value) => setFormData({...formData, jobType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employmentType">Employment Type</Label>
                      <Select value={formData.employmentType} onValueChange={(value) => setFormData({...formData, employmentType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">Permanent</SelectItem>
                          <SelectItem value="temporary">Temporary</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experienceLevel">Experience Level</Label>
                      <Select value={formData.experienceLevel} onValueChange={(value) => setFormData({...formData, experienceLevel: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="mid">Mid Level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salaryMin">Minimum Salary</Label>
                      <Input
                        id="salaryMin"
                        type="number"
                        value={formData.salaryMin}
                        onChange={(e) => setFormData({...formData, salaryMin: e.target.value})}
                        placeholder="80000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salaryMax">Maximum Salary</Label>
                      <Input
                        id="salaryMax"
                        type="number"
                        value={formData.salaryMax}
                        onChange={(e) => setFormData({...formData, salaryMax: e.target.value})}
                        placeholder="120000"
                      />
                    </div>
                  </div>

                  {/* AI Scoring Weights Section */}
                  <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">AI Candidate Scoring Weights</Label>
                      <p className="text-xs text-gray-600">
                        Configure how the AI prioritizes different candidate attributes (total should equal 100%)
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="experienceWeight" className="text-sm">Experience Level</Label>
                          <span className="text-sm font-medium">{formData.experienceWeight}%</span>
                        </div>
                        <Slider
                          id="experienceWeight"
                          min={0}
                          max={100}
                          step={5}
                          value={[formData.experienceWeight]}
                          onValueChange={(value) => setFormData({...formData, experienceWeight: value[0]})}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="skillsWeight" className="text-sm">Skills Match</Label>
                          <span className="text-sm font-medium">{formData.skillsWeight}%</span>
                        </div>
                        <Slider
                          id="skillsWeight"
                          min={0}
                          max={100}
                          step={5}
                          value={[formData.skillsWeight]}
                          onValueChange={(value) => setFormData({...formData, skillsWeight: value[0]})}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="locationWeight" className="text-sm">Location Preference</Label>
                          <span className="text-sm font-medium">{formData.locationWeight}%</span>
                        </div>
                        <Slider
                          id="locationWeight"
                          min={0}
                          max={100}
                          step={5}
                          value={[formData.locationWeight]}
                          onValueChange={(value) => setFormData({...formData, locationWeight: value[0]})}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="educationWeight" className="text-sm">Education Background</Label>
                          <span className="text-sm font-medium">{formData.educationWeight}%</span>
                        </div>
                        <Slider
                          id="educationWeight"
                          min={0}
                          max={100}
                          step={5}
                          value={[formData.educationWeight]}
                          onValueChange={(value) => setFormData({...formData, educationWeight: value[0]})}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="salaryWeight" className="text-sm">Salary Expectations</Label>
                          <span className="text-sm font-medium">{formData.salaryWeight}%</span>
                        </div>
                        <Slider
                          id="salaryWeight"
                          min={0}
                          max={100}
                          step={5}
                          value={[formData.salaryWeight]}
                          onValueChange={(value) => setFormData({...formData, salaryWeight: value[0]})}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Total Weight:</span>
                      <span className={`font-medium ${
                        (formData.experienceWeight + formData.skillsWeight + formData.locationWeight + 
                         formData.educationWeight + formData.salaryWeight) === 100 
                        ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formData.experienceWeight + formData.skillsWeight + formData.locationWeight + 
                         formData.educationWeight + formData.salaryWeight}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Job Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe the role, responsibilities, and what you're looking for..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements (one per line)</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                      placeholder="5+ years React experience&#10;TypeScript proficiency&#10;Experience with testing frameworks"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="niceToHave">Nice to Have (one per line)</Label>
                    <Textarea
                      id="niceToHave"
                      value={formData.niceToHave}
                      onChange={(e) => setFormData({...formData, niceToHave: e.target.value})}
                      placeholder="AWS experience&#10;GraphQL knowledge&#10;Startup experience"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Application Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Job"}
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
                    placeholder="Search jobs by title, department, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Jobs Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' 
                    ? 'No jobs match your current filters. Try adjusting your search criteria.'
                    : 'Get started by creating your first job posting.'
                  }
                </p>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Job
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{job.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>{job.isRemote ? 'Remote' : job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.department}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {job.status !== 'active' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job, 'active')}>
                              <Play className="mr-2 h-4 w-4 text-green-600" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {job.status !== 'paused' && job.status !== 'draft' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job, 'paused')}>
                              <Pause className="mr-2 h-4 w-4 text-yellow-600" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {job.status !== 'closed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job, 'closed')}>
                              <Archive className="mr-2 h-4 w-4 text-red-600" />
                              Close
                            </DropdownMenuItem>
                          )}
                          {job.status !== 'draft' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job, 'draft')}>
                              <FileText className="mr-2 h-4 w-4 text-gray-600" />
                              Move to Draft
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Posted {getDaysAgo(job.postedDate)}</span>
                    </div>
                  </div>

                  {job.deadline && (
                    <div className="flex items-center gap-1 text-sm">
                      <div className={`flex items-center gap-1 ${getDeadlineStatus(job.deadline)?.color}`}>
                        <Calendar className="h-4 w-4" />
                        <span>{getDeadlineStatus(job.deadline)?.message}</span>
                        {getDeadlineStatus(job.deadline)?.status === 'expired' && (
                          <Badge variant="destructive" className="text-xs">
                            EXPIRED
                          </Badge>
                        )}
                        {getDeadlineStatus(job.deadline)?.status === 'urgent' && (
                          <Badge variant="destructive" className="text-xs bg-orange-100 text-orange-800">
                            URGENT
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 line-clamp-3">
                    {job.description}
                  </p>

                  {job.requirements && job.requirements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Key Requirements:</h4>
                      <div className="flex flex-wrap gap-1">
                        {job.requirements.slice(0, 3).map((req, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {job.requirements.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{job.requirements.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{job.applications || 0} applicants</span>
                        </div>
                        {job.aiScore && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                            <span>{job.aiScore}% match</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewJob(job)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewApplications(job.id)}
                    >
                      View Applications
                    </Button>
                  </div>

                  <div className="flex gap-1 pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditJob(job)}
                      className="flex-1"
                      title="Edit Job"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDuplicateJob(job)}
                      className="flex-1"
                      title="Duplicate Job"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteJob(job)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Job"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <DialogDescription>
              {selectedJob?.department} • {selectedJob?.location} • {selectedJob?.jobType}
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6">
              {/* Job Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Job Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Department</Label>
                      <p className="text-gray-700">{selectedJob.department}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Location</Label>
                      <p className="text-gray-700">{selectedJob.location}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Employment Type</Label>
                      <p className="text-gray-700">{selectedJob.employmentType}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Experience Level</Label>
                      <p className="text-gray-700">{selectedJob.experienceLevel}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="font-medium">Description</Label>
                    <p className="text-gray-700 mt-1">{selectedJob.description}</p>
                  </div>

                  {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                    <div>
                      <Label className="font-medium">Requirements</Label>
                      <ul className="text-gray-700 mt-1 list-disc list-inside">
                        {selectedJob.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Job History</CardTitle>
                  <CardDescription>
                    Track all changes and updates to this job posting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAudit ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-gray-600">Loading history...</span>
                    </div>
                  ) : auditLogs.length > 0 ? (
                    <div className="space-y-4 max-h-60 overflow-y-auto">
                      {auditLogs.map((log, index) => (
                        <div key={log.id || index} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {formatAuditAction(log)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(log.timestamp)}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 break-words">
                              {getAuditChanges(log)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              by Admin User
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-4">
                      No history available for this job.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => handleBulkUpload(selectedJob)}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Bulk Upload Resumes
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleViewApplications(selectedJob.id)}
                >
                  View Applications ({selectedJob.applications || 0})
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Resumes</DialogTitle>
            <DialogDescription>
              Upload multiple resumes for AI analysis against "{selectedJob?.title}" position
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {!isProcessing && processedResults.length === 0 && (
              <>
                {/* File Upload Area */}
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                  onDrop={handleFilesDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Plus className="h-12 w-12 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Drop resume files here</h3>
                      <p className="text-gray-500">or click to browse</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFilesSelect}
                      className="hidden"
                      id="bulk-file-input"
                    />
                    <label htmlFor="bulk-file-input" className="cursor-pointer">
                      <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Choose Files
                      </span>
                    </label>
                    <p className="text-xs text-gray-500">
                      Supports PDF, DOC, DOCX, and TXT files
                    </p>
                  </div>
                </div>

                {/* File List */}
                {uploadFiles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Selected Files ({uploadFiles.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {uploadFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Process Button */}
                {uploadFiles.length > 0 && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={processBulkResumes}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Process {uploadFiles.length} Resume{uploadFiles.length > 1 ? 's' : ''} with AI
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setUploadFiles([])}
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Resumes...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      {Math.round(processingProgress)}% complete ({Math.ceil(processingProgress / 100 * uploadFiles.length)} of {uploadFiles.length} processed)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {processedResults.length > 0 && !isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Results</CardTitle>
                  <CardDescription>
                    {processedResults.filter(r => r.success).length} successful, {processedResults.filter(r => !r.success).length} failed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {processedResults.map((result, index) => (
                      <div key={index} className={`p-3 border rounded ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium text-sm">{result.fileName}</span>
                              {result.success ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">Success</Badge>
                              ) : (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </div>
                            {result.success && result.candidate && (
                              <div className="mt-2 text-sm">
                                <p><strong>{result.candidate.firstName} {result.candidate.lastName}</strong></p>
                                <p className="text-gray-600">{result.candidate.currentPosition} at {result.candidate.currentCompany}</p>
                                {result.analysis?.overallScore && (
                                  <p className="text-gray-600">AI Score: {result.analysis.overallScore}/100</p>
                                )}
                              </div>
                            )}
                            {!result.success && (
                              <p className="text-red-600 text-sm mt-1">{result.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button 
                      onClick={() => {
                        setIsBulkUploadOpen(false);
                        window.location.href = '/candidates';
                      }}
                      className="flex-1"
                    >
                      View All Candidates
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setUploadFiles([]);
                        setProcessedResults([]);
                        setProcessingProgress(0);
                      }}
                    >
                      Upload More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Job Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>
              Update the details for "{selectedJob?.title}".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateJob} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Job Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Senior React Developer"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. San Francisco, CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-isRemote">Remote Work</Label>
                <Select value={formData.isRemote.toString()} onValueChange={(value) => setFormData({...formData, isRemote: value === 'true'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">On-site</SelectItem>
                    <SelectItem value="true">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Job Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-requirements">Requirements (one per line)</Label>
              <Textarea
                id="edit-requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                placeholder="5+ years React experience&#10;TypeScript proficiency&#10;Experience with testing frameworks"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? "Updating..." : "Update Job"}
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
              Delete Job Posting
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
              {jobToDelete?.applications && jobToDelete.applications > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  Warning: This job has {jobToDelete.applications} active application{jobToDelete.applications > 1 ? 's' : ''}.
                </div>
              )}
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
              onClick={confirmDeleteJob}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        entityType="job"
        entityId={selectedJob?.id}
      />
    </div>
  );
}
