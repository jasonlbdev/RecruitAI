import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, FilterIcon, RefreshCwIcon } from 'lucide-react';

interface AuditLog {
  id: number;
  entity_type: 'job' | 'candidate' | 'application' | 'system';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  user_id?: string;
  user_email?: string;
  changes?: any;
  metadata?: any;
  created_at: string;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: string;
  entityId?: string;
}

export default function AuditLogModal({ isOpen, onClose, entityType, entityId }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    entity_type: entityType || '',
    action: '',
    user_id: '',
    start_date: '',
    end_date: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });

  const loadAuditLogs = async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.action) params.append('action', filters.action);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const offset = reset ? 0 : pagination.offset;
      params.append('limit', pagination.limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        const newLogs = data.data.logs;
        
        setLogs(reset ? newLogs : [...logs, ...newLogs]);
        setPagination(data.data.pagination);
      } else {
        console.error('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs(true);
    }
  }, [isOpen, entityType, entityId]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadAuditLogs(true);
  };

  const handleResetFilters = () => {
    setFilters({
      entity_type: entityType || '',
      action: '',
      user_id: '',
      start_date: '',
      end_date: ''
    });
    loadAuditLogs(true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
      loadAuditLogs(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      case 'export': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'job': return 'bg-blue-100 text-blue-800';
      case 'candidate': return 'bg-green-100 text-green-800';
      case 'application': return 'bg-purple-100 text-purple-800';
      case 'system': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatChanges = (changes: any) => {
    if (!changes) return 'No changes recorded';
    
    if (typeof changes === 'object') {
      return Object.entries(changes)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
    }
    
    return JSON.stringify(changes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Audit Logs
            {entityType && entityId && (
              <span className="text-sm text-gray-500">
                ({entityType}: {entityId})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 border rounded-lg">
          <div>
            <Label htmlFor="entity-type">Entity Type</Label>
            <Select value={filters.entity_type} onValueChange={(value) => handleFilterChange('entity_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="candidate">Candidate</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="action">Action</Label>
            <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="export">Export</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="user-id">User ID</Label>
            <Input
              id="user-id"
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              placeholder="Filter by user"
            />
          </div>

          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>

          <div className="flex gap-2 items-end">
            <Button onClick={handleApplyFilters} disabled={loading}>
              <FilterIcon className="h-4 w-4 mr-2" />
              Apply
            </Button>
            <Button variant="outline" onClick={handleResetFilters} disabled={loading}>
              Reset
            </Button>
          </div>
        </div>

        {/* Logs List */}
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getActionColor(log.action)}>
                      {log.action.toUpperCase()}
                    </Badge>
                    <Badge className={getEntityTypeColor(log.entity_type)}>
                      {log.entity_type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">ID: {log.entity_id}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(log.created_at)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">User:</span> {log.user_email || log.user_id || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">IP:</span> {log.metadata?.ip_address || 'Unknown'}
                  </div>
                </div>

                {log.changes && (
                  <div className="text-sm">
                    <span className="font-medium">Changes:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono">
                      {formatChanges(log.changes)}
                    </div>
                  </div>
                )}

                {log.metadata && Object.keys(log.metadata).length > 2 && (
                  <div className="text-sm">
                    <span className="font-medium">Metadata:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                      {Object.entries(log.metadata)
                        .filter(([key]) => !['ip_address', 'timestamp'].includes(key))
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {logs.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No audit logs found
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <RefreshCwIcon className="h-6 w-6 animate-spin mx-auto" />
                <p className="mt-2">Loading...</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Pagination */}
        {pagination.hasMore && (
          <div className="flex justify-center pt-4">
            <Button onClick={loadMore} disabled={loading}>
              Load More
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-gray-500">
            Showing {logs.length} of {pagination.total} logs
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 