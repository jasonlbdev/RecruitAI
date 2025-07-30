import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FilterIcon, 
  XIcon, 
  SearchIcon,
  MapPinIcon,
  DollarSignIcon,
  BriefcaseIcon,
  GraduationCapIcon
} from 'lucide-react';

interface FilterOptions {
  search: string;
  location: string;
  experienceMin: number;
  experienceMax: number;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  jobType: string;
  isRemote: boolean;
  status: string;
  dateRange: string;
}

interface AdvancedFiltersProps {
  type: 'candidates' | 'jobs' | 'applications';
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const defaultFilters: FilterOptions = {
  search: '',
  location: '',
  experienceMin: 0,
  experienceMax: 20,
  salaryMin: 0,
  salaryMax: 200000,
  skills: [],
  jobType: '',
  isRemote: false,
  status: '',
  dateRange: ''
};

export default function AdvancedFilters({
  type,
  filters,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onToggle
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters(defaultFilters);
    onClearFilters();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.location) count++;
    if (localFilters.experienceMin > 0 || localFilters.experienceMax < 20) count++;
    if (localFilters.salaryMin > 0 || localFilters.salaryMax < 200000) count++;
    if (localFilters.skills.length > 0) count++;
    if (localFilters.jobType) count++;
    if (localFilters.isRemote) count++;
    if (localFilters.status) count++;
    if (localFilters.dateRange) count++;
    return count;
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={onToggle}
        className="flex items-center gap-2"
      >
        <FilterIcon className="h-4 w-4" />
        Filters
        {getActiveFilterCount() > 0 && (
          <Badge variant="secondary" className="ml-1">
            {getActiveFilterCount()}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Advanced Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Search by name, skills, company..."
              value={localFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPinIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="location"
              placeholder="City, State, or Remote"
              value={localFilters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Experience Range */}
        <div>
          <Label>Experience (Years)</Label>
          <div className="space-y-2">
            <Slider
              value={[localFilters.experienceMin, localFilters.experienceMax]}
              onValueChange={(value) => {
                handleFilterChange('experienceMin', value[0]);
                handleFilterChange('experienceMax', value[1]);
              }}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{localFilters.experienceMin} years</span>
              <span>{localFilters.experienceMax} years</span>
            </div>
          </div>
        </div>

        {/* Salary Range */}
        <div>
          <Label>Salary Range</Label>
          <div className="space-y-2">
            <Slider
              value={[localFilters.salaryMin, localFilters.salaryMax]}
              onValueChange={(value) => {
                handleFilterChange('salaryMin', value[0]);
                handleFilterChange('salaryMax', value[1]);
              }}
              max={200000}
              step={5000}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>${localFilters.salaryMin.toLocaleString()}</span>
              <span>${localFilters.salaryMax.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Job Type */}
        {type === 'jobs' && (
          <div>
            <Label htmlFor="jobType">Job Type</Label>
            <Select
              value={localFilters.jobType}
              onValueChange={(value) => handleFilterChange('jobType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="full-time">Full Time</SelectItem>
                <SelectItem value="part-time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status */}
        {type === 'applications' && (
          <div>
            <Label htmlFor="status">Application Status</Label>
            <Select
              value={localFilters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="interviewed">Interviewed</SelectItem>
                <SelectItem value="offered">Offered</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range */}
        <div>
          <Label htmlFor="dateRange">Date Range</Label>
          <Select
            value={localFilters.dateRange}
            onValueChange={(value) => handleFilterChange('dateRange', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Remote Work */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remote"
            checked={localFilters.isRemote}
            onCheckedChange={(checked) => handleFilterChange('isRemote', checked)}
          />
          <Label htmlFor="remote">Remote work only</Label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters
          </Button>
          <Button variant="outline" onClick={handleClearFilters}>
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 