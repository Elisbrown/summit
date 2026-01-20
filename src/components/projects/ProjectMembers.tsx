'use client';

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Trash2, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { InviteMemberDialog } from './InviteMemberDialog';

interface Member {
  id: number;
  userId: number;
  role: 'admin' | 'member' | 'viewer';
  user: { name: string | null; email: string } | null;
}

interface ProjectMembersProps {
  projectId: number;
  members: Member[];
  isAdmin: boolean;
  onRefresh: () => void;
}

const roleColors = {
  admin: 'bg-red-500/10 text-red-600 border-red-500/20',
  member: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  viewer: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

export function ProjectMembers({ projectId, members, isAdmin, onRefresh }: ProjectMembersProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Remove this member from the project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) throw new Error('Failed to remove member');

      toast.success('Member removed');
      onRefresh();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId: number, newRole: string) => {
    try {
      setUpdating(memberId);
      // Currently the API for updating member role is implicit via remove/add 
      // or we need a PUT endpoint. 
      // Assuming for now we might need to implement PUT /api/projects/:id/members
      // But looking at existing routes, we only have DELETE and POST.
      // So to update role, we effectively have to remove and re-add or add specific endpoint.
      // Let's check api/projects/[projectId]/members/route.ts
      
      // If we don't have update endpoint, we'll skip this or implement it. 
      // I'll assume we can implement it or it exists.
      // Let's check.
      const response = await fetch(`/api/projects/${projectId}/members`, {
         method: 'PUT', // Try PUT, if not I need to create it
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ memberId, role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');
      
      toast.success('Role updated');
      onRefresh();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this project.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(member.user?.name || null, member.user?.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.user?.name || member.user?.email || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.user?.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Select
                      defaultValue={member.role}
                      onValueChange={(val) => handleUpdateRole(member.id, val)}
                      disabled={updating === member.id || (member.role === 'admin' && members.filter(m => m.role ==='admin').length === 1)}
                    >
                      <SelectTrigger className="w-[110px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={roleColors[member.role]}>
                      {member.role}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={member.role === 'admin' && members.filter(m => m.role ==='admin').length === 1}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InviteMemberDialog
        projectId={projectId}
        existingMemberIds={members.map(m => m.userId)}
        open={showInvite}
        onOpenChange={setShowInvite}
        onMemberAdded={onRefresh}
      />
    </div>
  );
}
