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
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Search,
  Plus,
  UserCheck,
} from "lucide-react";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  type: "document" | "training" | "meeting" | "system" | "other";
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  completedDate?: string;
  assignedTo?: string;
  priority: "low" | "medium" | "high";
}

interface NewHire {
  id: string;
  name: string;
  position: string;
  department: string;
  startDate: string;
  email: string;
  phone: string;
  manager: string;
  location: string;
  status: "pre-boarding" | "first-week" | "first-month" | "completed";
  overallProgress: number;
  tasks: OnboardingTask[];
  nextMilestone: string;
}

const statusColors = {
  "pre-boarding": "bg-blue-100 text-blue-800",
  "first-week": "bg-yellow-100 text-yellow-800",
  "first-month": "bg-orange-100 text-orange-800",
  "completed": "bg-green-100 text-green-800",
};

const taskStatusColors = {
  pending: "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export default function OnboardingTracking() {
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      // Since we don't have onboarding-specific endpoints yet, 
      // we'll create mock data based on hired candidates
      const response = await fetch('/api/applications?status=hired');
      
      if (response.ok) {
        const data = await response.json();
        const hiredApplications = data.data?.data || [];
        
        // Convert hired applications to onboarding entries
        const mockNewHires: NewHire[] = hiredApplications.map((app: any, index: number) => {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + (index * 7)); // Stagger start dates
          
          const mockTasks: OnboardingTask[] = [
            {
              id: `${app.id}-1`,
              title: "Employee Handbook Review",
              description: "Read and acknowledge company policies",
              type: "document",
              status: "completed",
              dueDate: startDate.toISOString().split('T')[0],
              completedDate: startDate.toISOString().split('T')[0],
              priority: "high",
            },
            {
              id: `${app.id}-2`,
              title: "IT Equipment Setup",
              description: "Configure laptop and development tools",
              type: "system",
              status: Math.random() > 0.5 ? "completed" : "in-progress",
              dueDate: new Date(startDate.getTime() + 86400000).toISOString().split('T')[0],
              assignedTo: "IT Support",
              priority: "high",
            },
            {
              id: `${app.id}-3`,
              title: "Security Training",
              description: "Complete cybersecurity awareness course",
              type: "training",
              status: Math.random() > 0.3 ? "pending" : "completed",
              dueDate: new Date(startDate.getTime() + 172800000).toISOString().split('T')[0],
              priority: "medium",
            },
          ];

          const completedTasks = mockTasks.filter(task => task.status === 'completed').length;
          const overallProgress = Math.round((completedTasks / mockTasks.length) * 100);

          return {
            id: app.id,
            name: app.candidateName,
            position: app.position,
            department: app.position.includes('Engineer') ? 'Engineering' : 
                      app.position.includes('Product') ? 'Product' : 
                      app.position.includes('Design') ? 'Design' : 'Other',
            startDate: startDate.toISOString().split('T')[0],
            email: app.email,
            phone: app.phone || '',
            manager: 'Hiring Manager', // Mock data
            location: app.location,
            status: overallProgress === 100 ? 'completed' : 
                   overallProgress > 75 ? 'first-month' : 
                   overallProgress > 50 ? 'first-week' : 'pre-boarding',
            overallProgress,
            tasks: mockTasks,
            nextMilestone: overallProgress === 100 ? 'Onboarding Complete' : 
                          overallProgress > 75 ? '30-day check-in meeting' : 
                          overallProgress > 50 ? 'Complete development environment setup' : 
                          'IT equipment setup'
          };
        });
        
        setNewHires(mockNewHires);
      }
    } catch (error) {
      console.error('Failed to load onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNewHires = newHires.filter((hire) => {
    const matchesSearch = searchTerm === "" || 
      hire.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hire.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hire.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || hire.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || hire.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'document': return <CheckCircle className="h-4 w-4" />;
      case 'training': return <TrendingUp className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'system': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading onboarding data...</p>
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
              <UserCheck className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Onboarding Tracking</h1>
                <p className="text-gray-600">Monitor new hire progress and task completion</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                {newHires.length} New Hires
              </Badge>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add New Hire
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
                    placeholder="Search new hires by name, position, or department..."
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
                  <SelectItem value="pre-boarding">Pre-boarding</SelectItem>
                  <SelectItem value="first-week">First Week</SelectItem>
                  <SelectItem value="first-month">First Month</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* New Hires List */}
        {filteredNewHires.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No New Hires Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' 
                    ? 'No new hires match your current filters. Try adjusting your search criteria.'
                    : 'No new hires in the onboarding process. New hires will appear here when candidates are hired.'
                  }
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Hire
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredNewHires.map((hire) => (
              <Card key={hire.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{hire.name}</CardTitle>
                        <Badge className={statusColors[hire.status as keyof typeof statusColors]}>
                          {hire.status.charAt(0).toUpperCase() + hire.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </div>
                      <CardDescription className="text-base font-medium text-gray-700">
                        {hire.position} • {hire.department}
                      </CardDescription>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Start Date: {new Date(hire.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>Manager: {hire.manager}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Overall Progress</div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${hire.overallProgress}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{hire.overallProgress}%</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Email: </span>
                      <span>{hire.email}</span>
                    </div>
                    <div>
                      <span className="font-medium">Phone: </span>
                      <span>{hire.phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Location: </span>
                      <span>{hire.location}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-sm mb-1">Next Milestone:</div>
                    <div className="text-sm text-blue-700">{hire.nextMilestone}</div>
                  </div>

                  {/* Tasks */}
                  <div>
                    <h4 className="font-medium text-sm mb-3">Onboarding Tasks</h4>
                    <div className="space-y-2">
                      {hire.tasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {getTaskIcon(task.type)}
                            <div>
                              <div className="text-sm font-medium">{task.title}</div>
                              <div className="text-xs text-gray-600">{task.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={taskStatusColors[task.status as keyof typeof taskStatusColors]} variant="outline">
                              {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {hire.tasks.length > 3 && (
                        <div className="text-sm text-gray-500 text-center py-2">
                          +{hire.tasks.length - 3} more tasks
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" className="flex-1">
                      Update Progress
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Statistics */}
        {newHires.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Onboarding Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(statusColors).map(([status, colorClass]) => {
                  const count = newHires.filter(hire => hire.status === status).length;
                  return (
                    <div key={status} className="text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-gray-600 capitalize">
                        {status.replace('-', ' ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
