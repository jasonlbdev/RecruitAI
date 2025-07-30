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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  MessageSquareIcon,
  CalendarIcon,
  UserIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CandidateNote {
  id: number;
  candidate_id: string;
  note: string;
  note_type: 'general' | 'interview' | 'feedback' | 'follow_up' | 'technical';
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at?: string;
}

interface CandidateNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
}

export default function CandidateNotesModal({ 
  isOpen, 
  onClose, 
  candidateId, 
  candidateName 
}: CandidateNotesModalProps) {
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [newNote, setNewNote] = useState({
    note: '',
    note_type: 'general' as const
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });
  const { toast } = useToast();

  const loadNotes = async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('candidate_id', candidateId);
      
      const offset = reset ? 0 : pagination.offset;
      params.append('limit', pagination.limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/candidate-notes?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        const newNotes = data.data.notes;
        
        setNotes(reset ? newNotes : [...notes, ...newNotes]);
        setPagination(data.data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to load notes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotes(true);
    }
  }, [isOpen, candidateId]);

  const handleAddNote = async () => {
    if (!newNote.note.trim()) {
      toast({
        title: "Error",
        description: "Note content is required",
        variant: "destructive"
      });
      return;
    }

    setIsAddingNote(true);
    try {
      const response = await fetch('/api/candidate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          note: newNote.note,
          note_type: newNote.note_type
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNotes([data.data, ...notes]);
        setNewNote({ note: '', note_type: 'general' });
        toast({
          title: "Success",
          description: "Note added successfully"
        });
      } else {
        throw new Error('Failed to add note');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive"
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleEditNote = async (noteId: number, updatedNote: string, noteType: string) => {
    setIsEditingNote(true);
    try {
      const response = await fetch(`/api/candidate-notes?id=${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: updatedNote,
          note_type: noteType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(notes.map(note => 
          note.id === noteId ? data.data : note
        ));
        setEditingNoteId(null);
        toast({
          title: "Success",
          description: "Note updated successfully"
        });
      } else {
        throw new Error('Failed to update note');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive"
      });
    } finally {
      setIsEditingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/candidate-notes?id=${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotes(notes.filter(note => note.id !== noteId));
        toast({
          title: "Success",
          description: "Note deleted successfully"
        });
      } else {
        throw new Error('Failed to delete note');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive"
      });
    }
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
      loadNotes(false);
    }
  };

  const getNoteTypeColor = (noteType: string) => {
    switch (noteType) {
      case 'interview': return 'bg-blue-100 text-blue-800';
      case 'feedback': return 'bg-green-100 text-green-800';
      case 'follow_up': return 'bg-purple-100 text-purple-800';
      case 'technical': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="h-5 w-5" />
            Candidate Notes - {candidateName}
          </DialogTitle>
        </DialogHeader>

        {/* Add Note Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="note-type">Note Type</Label>
                <Select 
                  value={newNote.note_type} 
                  onValueChange={(value: any) => setNewNote(prev => ({ ...prev, note_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="note-content">Note Content</Label>
              <Textarea
                id="note-content"
                value={newNote.note}
                onChange={(e) => setNewNote(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Enter your note here..."
                rows={3}
              />
            </div>
            <Button onClick={handleAddNote} disabled={isAddingNote || !newNote.note.trim()}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {isAddingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </CardContent>
        </Card>

        {/* Notes List */}
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getNoteTypeColor(note.note_type)}>
                        {note.note_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <UserIcon className="h-3 w-3" />
                        {note.created_by_email || note.created_by || 'Unknown'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingNoteId(editingNoteId === note.id ? null : note.id)}
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={note.note}
                        onChange={(e) => {
                          setNotes(notes.map(n => 
                            n.id === note.id ? { ...n, note: e.target.value } : n
                          ));
                        }}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditNote(note.id, note.note, note.note_type)}
                          disabled={isEditingNote}
                        >
                          {isEditingNote ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingNoteId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDate(note.created_at)}
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span> (edited {formatDate(note.updated_at)})</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {notes.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No notes found for this candidate
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
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
            Showing {notes.length} of {pagination.total} notes
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 