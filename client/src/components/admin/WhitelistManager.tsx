
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhitelistEntry {
  email: string;
  added_by: string;
  added_at: string;
}

export const WhitelistManager: React.FC = () => {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const fetchWhitelist = async () => {
    try {
      const response = await fetch('/api/admin/whitelist');
      const data = await response.json();
      if (data.success) {
        setWhitelist(data.whitelist);
      }
    } catch (error) {
      console.error('Error fetching whitelist:', error);
    }
  };

  const addEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Email added',
          description: `${newEmail} can now access the chatbot`
        });
        
        setNewEmail('');
        fetchWhitelist();
      } else {
        toast({
          title: 'Failed to add email',
          description: data.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to add email',
        description: 'Network error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const removeEmail = async (email: string) => {
    if (!confirm(`Remove ${email} from whitelist?`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Email removed',
          description: `${email} no longer has access`
        });
        
        fetchWhitelist();
      } else {
        toast({
          title: 'Failed to remove email',
          description: data.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to remove email',
        description: 'Network error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-gray-100">Whitelist Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add new email */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Add email to whitelist"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && addEmail()}
              className="bg-slate-800 border-slate-600 text-gray-100"
              disabled={loading}
            />
            <Button onClick={addEmail} disabled={loading}>
              <UserPlus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Whitelist entries */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {whitelist.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No emails in whitelist</p>
            ) : (
              whitelist.map((entry) => (
                <div
                  key={entry.email}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-100">{entry.email}</span>
                    <span className="text-xs text-gray-500">
                      Added {new Date(entry.added_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeEmail(entry.email)}
                    disabled={loading}
                    className="text-red-400 hover:text-red-300"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
