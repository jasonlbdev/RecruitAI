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
  FileText,
  TrendingUp,
  Search,
  Filter,
  ExternalLink,
  Eye,
} from "lucide-react";

interface Application {
  id: string;
  candidateName: string;
  position: string;
  email: string;
  phone: string;
  location: string;
  appliedDate: string;
  status: "new" | "reviewing" | "interview" | "offer" | "rejected" | "hired";
  aiScore?: number;
  stage: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  experience: string;
  salaryExpectation: string;
  source: "linkedin" | "indeed" | "referral" | "company-website" | "other" | "manual";
  notes?: string;
}

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  interview: "bg-purple-100 text-purple-800",
  offer: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  hired: "bg-emerald-100 text-emerald-800",
};

const sourceColors = {
  linkedin: "bg-blue-100 text-blue-800",
  indeed: "bg-indigo-100 text-indigo-800",
  referral: "bg-green-100 text-green-800",
  "company-website": "bg-purple-100 text-purple-800",
  manual: "bg-gray-100 text-gray-800",
  other: "bg-gray-100 text-gray-800",
};

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [searchTerm, statusFilter, sourceFilter]);

  const loadApplications = async () => {
    try {
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      
      const response = await fetch(`/api/applications-fixed?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setIsViewModalOpen(true);
  };

  const handleViewResume = (url: string) => {
    window.open(url, '_blank');
  };

  const handleMoveToNextStage = (application: Application) => {
    // Move application to next stage
    const stages = ["new", "reviewing", "interview", "offer", "hired"];
    const currentIndex = stages.indexOf(application.status);
    const nextStage = stages[currentIndex + 1];
    
    if (nextStage) {
      // Update application status (would normally be an API call)
      setApplications(prev => 
        prev.map(app => 
          app.id === application.id 
            ? { ...app, status: nextStage as any }
            : app
        )
      );
    }
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

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading applications...</p>
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
                <h1 className="text-2xl font-bold">Applications</h1>
                <p className="text-gray-600">Review and manage candidate applications</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
              <Button size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Export Data
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
                    placeholder="Search applications by candidate name, position, or email..."
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
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="indeed">Indeed</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="company-website">Company Website</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' 
                    ? 'No applications match your current filters. Try adjusting your search criteria.'
                    : 'No applications have been received yet. Applications will appear here as candidates apply for your job postings.'
                  }
                </p>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  View Job Postings
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{application.candidateName}</CardTitle>
                        <Badge className={statusColors[application.status]}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </Badge>
                        {application.aiScore && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {application.aiScore}% AI Match
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-base font-medium text-gray-700">
                        {application.position}
                      </CardDescription>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Applied {getDaysAgo(application.appliedDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{application.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Current Stage</div>
                      <div className="font-medium">{application.stage}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{application.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{application.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={sourceColors[application.source]} variant="outline">
                        {application.source.charAt(0).toUpperCase() + application.source.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Experience: </span>
                      <span>{application.experience}</span>
                    </div>
                    <div>
                      <span className="font-medium">Salary Expectation: </span>
                      <span>{application.salaryExpectation}</span>
                    </div>
                  </div>

                  {application.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-sm mb-1">Notes:</div>
                      <div className="text-sm text-gray-700">{application.notes}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      {application.resumeUrl && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewResume(application.resumeUrl!)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      )}
                      {application.coverLetterUrl && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewResume(application.coverLetterUrl!)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Cover Letter
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(application)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleMoveToNextStage(application)}
                        disabled={application.status === 'hired' || application.status === 'rejected'}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Move to Next Stage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
