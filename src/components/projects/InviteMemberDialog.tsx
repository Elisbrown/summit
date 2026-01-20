'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, UserPlus, Users, Building, Mail, Check } from 'lucide-react';

interface User {
  id: number;
  name: string | null;
  email: string;
}

interface Client {
  id: number;
  name: string;
  email: string | null;
}

interface InviteMemberDialogProps {
  projectId: number;
  existingMemberIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
}

const emailInviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'member', 'viewer']),
});

export function InviteMemberDialog({
  projectId,
  existingMemberIds,
  open,
  onOpenChange,
  onMemberAdded,
}: InviteMemberDialogProps) {
  const [tab, setTab] = useState<'users' | 'clients' | 'email'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [searchTerm, setSearchTerm] = useState('');

  const emailForm = useForm({
    resolver: zodResolver(emailInviteSchema),
    defaultValues: {
      email: '',
      role: 'member' as const,
    },
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchClients();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleAddUser = async (userId: number) => {
    try {
      setAdding(userId);
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: selectedRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add member');
      }

      toast.success('Member added');
      onMemberAdded();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setAdding(null);
    }
  };

  const handleAddClient = async (clientId: number) => {
    try {
      setAdding(clientId);
      const response = await fetch(`/api/projects/${projectId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add client');
      }

      toast.success('Client added');
      onMemberAdded();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add client');
    } finally {
      setAdding(null);
    }
  };

  const handleEmailInvite = async (values: z.infer<typeof emailInviteSchema>) => {
    try {
      setLoading(true);
      
      // Check if user exists with this email
      const existingUser = users.find(u => u.email.toLowerCase() === values.email.toLowerCase());
      
      if (existingUser) {
        // Add existing user
        await handleAddUser(existingUser.id);
        emailForm.reset();
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send invitation');
      }

      toast.success(`Invitation sent to ${values.email}`);
      emailForm.reset();
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const filteredUsers = users.filter(user => 
    !existingMemberIds.includes(user.id) &&
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members
          </DialogTitle>
        </DialogHeader>

        {/* Role Selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Add as:</span>
          <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          {(tab === 'users' || tab === 'clients') && (
            <Input
              placeholder={`Search ${tab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-4"
            />
          )}

          <TabsContent value="users" className="mt-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No available users to add
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name || user.email}</p>
                        {user.name && (
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddUser(user.id)}
                      disabled={adding === user.id}
                    >
                      {adding === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  No clients found
                </p>
              ) : (
                filteredClients.map((client) => (
                  <div 
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(client.name, client.email || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.email && (
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="mr-2">Client</Badge>
                    <Button
                      size="sm"
                      onClick={() => handleAddClient(client.id)}
                      disabled={adding === client.id}
                    >
                      {adding === client.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailInvite)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter email address..." 
                          type="email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                          <SelectItem value="member">Member - Can edit</SelectItem>
                          <SelectItem value="viewer">Viewer - Read only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Invitation
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
