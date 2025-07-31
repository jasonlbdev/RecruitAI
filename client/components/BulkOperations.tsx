import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Briefcase, 
  FileText, 
  Trash2, 
  Mail, 
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface BulkOperationsProps {
  type: 'candidates' | 'jobs' | 'applications';
  selectedItems: string[];
  onOperationComplete: () => void;
}

export default function BulkOperations({ type, selectedItems, onOperationComplete }: BulkOperationsProps) {
  const [operation, setOperation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const operations = {
    candidates: [
      { value: 'update_status', label: 'Update Status', icon: CheckCircle },
      { value: 'send_email', label: 'Send Email', icon: Mail },
      { value: 'export', label: 'Export Data', icon: Download },
      { value: 'delete', label: 'Delete Selected', icon: Trash2 }
    ],
    jobs: [
      { value: 'update_status', label: 'Update Status', icon: CheckCircle },
      { value: 'send_email', label: 'Send Email', icon: Mail },
      { value: 'export', label: 'Export Data', icon: Download },
      { value: 'delete', label: 'Delete Selected', icon: Trash2 }
    ],
    applications: [
      { value: 'update_status', label: 'Update Status', icon: CheckCircle },
      { value: 'assign_reviewer', label: 'Assign Reviewer', icon: Users },
      { value: 'send_email', label: 'Send Email', icon: Mail },
      { value: 'export', label: 'Export Data', icon: Download },
      { value: 'delete', label: 'Delete Selected', icon: Trash2 }
    ]
  };

  const handleBulkOperation = async () => {
    if (!operation || selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select an operation and items",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: operation,
          entityType: type,
          entityIds: selectedItems,
          params: getOperationParams(operation)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setResults(result.data.results);
        toast({
          title: "Success",
          description: `Bulk operation completed. ${result.data.totalProcessed} items processed.`
        });
        onOperationComplete();
      } else {
        toast({
          title: "Error",
          description: result.error || "Bulk operation failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk operation",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getOperationParams = (op: string) => {
    switch (op) {
      case 'update_status':
        return { status: 'new' };
      case 'send_email':
        return { templateId: 'application-received' };
      case 'assign_reviewer':
        return { reviewerId: 'default-reviewer' };
      default:
        return {};
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'candidates':
        return <Users className="h-4 w-4" />;
      case 'jobs':
        return <Briefcase className="h-4 w-4" />;
      case 'applications':
        return <FileText className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTypeIcon()}
          Bulk Operations
          <Badge variant="secondary">{selectedItems.length} selected</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={operation} onValueChange={setOperation}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select operation" />
            </SelectTrigger>
            <SelectContent>
              {operations[type].map((op) => {
                const Icon = op.icon;
                return (
                  <SelectItem key={op.value} value={op.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {op.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleBulkOperation} 
            disabled={isProcessing || !operation}
            className="whitespace-nowrap"
          >
            {isProcessing ? 'Processing...' : 'Execute'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Results:</h4>
            <div className="space-y-1">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>ID {result.id}: {result.success ? 'Success' : result.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 