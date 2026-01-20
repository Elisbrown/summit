'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageSquare, Kanban as KanbanIcon, FileText, Loader2, Calendar, Users } from 'lucide-react';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { ProjectGantt } from '@/components/projects/ProjectGantt';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Send, Reply } from 'lucide-react';

interface Project {
  id: number;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  boards: any[];
  members: any[];
  // ... other fields
}

export default function ClientProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.projectId);
  
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  
  // Custom Message State for Clients (Re-implementing simplified version to avoid huge refactor of ProjectMessages)
  // Ideally we refactor ProjectMessages to be generic, but for speed/safety we clone logic for Portal API.
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  const fetchProject = async () => {
    try {
      const [projRes, boardsRes] = await Promise.all([
        fetch(`/api/portal/projects/${projectId}`),
        fetch(`/api/portal/projects/${projectId}/boards`)
      ]);

      if (!projRes.ok) throw new Error('Failed to fetch project');
      
      const projData = await projRes.json();
      const boardsData = boardsRes.ok ? await boardsRes.json() : { data: [] };
      
      setProject(projData);
      setBoards(boardsData.data || []);
    } catch (error) {
       console.error(error);
       toast.error('Failed to load project');
    } finally {
       setLoading(false);
    }
  };

  const fetchMessages = async () => {
      try {
          const res = await fetch(`/api/portal/projects/${projectId}/messages`);
          if(res.ok) {
              const data = await res.json();
              setMessages((data.data || []).reverse());
          }
      } catch(e) { console.error(e); }
  };

  const fetchFiles = async () => {
      try {
          const res = await fetch(`/api/portal/projects/${projectId}/files`);
          if(res.ok) {
              const data = await res.json();
              setFiles(data.data || []);
          }
      } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchMessages(); // polling could be added
      fetchFiles();
    }
  }, [projectId]);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<any>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newMessage.trim()) return;
      setSendingMsg(true);
      try {
          const res = await fetch(`/api/portal/projects/${projectId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                content: newMessage,
                replyToId: replyingTo?.id || undefined,
              }),
          });
          if(res.ok) {
              const msg = await res.json();
              setMessages(prev => [...prev, msg]);
              setNewMessage('');
              setReplyingTo(null);
          }
      } catch(e) {
          toast.error('Failed to send');
      } finally {
          setSendingMsg(false);
      }
  };

  if (loading) return <div className="flex justify-center h-96 items-center"><Loader2 className="animate-spin" /></div>;
  if (!project) return <div className="p-8">Project not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/portal/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <Badge variant="outline" className="ml-auto capitalize">{project.status}</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
            <TabsTrigger value="board"><KanbanIcon className="w-4 h-4 mr-2"/> Board</TabsTrigger>
            <TabsTrigger value="gantt"><Calendar className="w-4 h-4 mr-2"/> Gantt</TabsTrigger>
            <TabsTrigger value="messages"><MessageSquare className="w-4 h-4 mr-2"/> Messages</TabsTrigger>
            <TabsTrigger value="members"><Users className="w-4 h-4 mr-2"/> Members</TabsTrigger>
            <TabsTrigger value="files"><FileText className="w-4 h-4 mr-2"/> Files</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-6">
             {/* Full interactive Board for clients */}
             <KanbanBoard projectId={projectId} boards={boards} onRefresh={fetchProject} isAdmin={true} apiBase="/api/portal" />
        </TabsContent>

        <TabsContent value="gantt" className="mt-6">
             <ProjectGantt projectId={projectId} boards={boards} onRefresh={fetchProject} />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
             <div className="flex flex-col h-[600px] border rounded-lg bg-white">
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {messages.map((msg: any) => (
                         <div key={msg.id} id={`msg-${msg.id}`} className={`flex gap-3 group px-4 ${msg.clientId ? 'flex-row-reverse' : ''}`}>
                             <Avatar className="h-8 w-8 mt-1"><AvatarFallback>{(msg.user?.name || 'U')[0]}</AvatarFallback></Avatar>
                             
                             <div className={`relative max-w-[70%] rounded-lg p-3 ${msg.clientId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                 <p className="text-xs opacity-70 mb-1" suppressHydrationWarning>
                                   {msg.user?.name} · {format(new Date(msg.createdAt), 'p')}
                                 </p>
                                 
                                 {/* Reply Quote */}
                                 {msg.replyTo && (
                                   <div 
                                     className={`text-xs p-2 rounded mb-2 border-l-2 ${msg.clientId ? 'bg-primary-foreground/10 border-primary-foreground/50' : 'bg-background border-gray-400'}`}
                                     onClick={() => {
                                       const el = document.getElementById(`msg-${msg.replyTo.id}`);
                                       el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                     }}
                                     style={{ cursor: 'pointer' }}
                                   >
                                     <span className="font-medium">{msg.replyTo.user?.name}</span>
                                     <p className="truncate opacity-80">{msg.replyTo.content}</p>
                                   </div>
                                 )}
                                 
                                 <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                 
                                 {/* Reply Button - Absolute positioned, visible on hover */}
                                 <div className={`absolute top-0 opacity-0 group-hover:opacity-100 flex items-center transition-opacity ${msg.clientId ? '-left-8' : '-right-8'}`}>
                                     <Button 
                                         type="button"
                                         variant="ghost" 
                                         size="icon" 
                                         className="h-6 w-6 rounded-full bg-background border shadow-sm"
                                         onClick={() => setReplyingTo(msg)}
                                         title="Reply"
                                     >
                                         <Reply className="h-3 w-3" />
                                     </Button>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
                 
                 {/* Reply Preview */}
                 {replyingTo && (
                   <div className="px-4 py-2 border-t bg-muted/50 flex items-center justify-between">
                     <div className="text-sm">
                       <span className="text-muted-foreground">Replying to </span>
                       <span className="font-medium">{replyingTo.user?.name}</span>
                       <span className="text-muted-foreground ml-2 truncate">{replyingTo.content.substring(0, 50)}...</span>
                     </div>
                     <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>✕</Button>
                   </div>
                 )}
                 
                 <div className="p-4 border-t">
                     <form onSubmit={handleSendMessage} className="flex gap-2">
                         <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={replyingTo ? `Reply to ${replyingTo.user?.name}...` : "Type a message..."} disabled={sendingMsg} />
                         <Button type="submit" disabled={sendingMsg || !newMessage.trim()}><Send className="w-4 h-4"/></Button>
                     </form>
                 </div>
             </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {project.members?.map((m: any) => (
                     <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                         <Avatar><AvatarFallback>{(m.user?.name || 'U')[0]}</AvatarFallback></Avatar>
                         <div>
                             <p className="font-medium">{m.user?.name}</p>
                             <p className="text-sm text-muted-foreground capitalize">{m.role}</p>
                         </div>
                     </div>
                 ))}
             </div>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
             <div className="bg-white rounded-lg border divide-y">
                 {files.length === 0 ? (
                     <div className="p-8 text-center text-muted-foreground">No files uploaded yet.</div>
                 ) : (
                     files.map((file: any) => (
                         <div key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                             <div className="flex items-center gap-3">
                                 <FileText className="h-8 w-8 text-blue-500" />
                                 <div>
                                     <p className="font-medium text-sm">{file.name}</p>
                                     <p className="text-xs text-muted-foreground">
                                         {file.size ? Math.round(file.size / 1024) + ' KB' : ''} · Uploaded by {file.uploadedBy}
                                     </p>
                                 </div>
                             </div>
                             <Button variant="outline" size="sm" asChild>
                                 <a href={file.url} target="_blank" rel="noopener noreferrer">Download</a>
                             </Button>
                         </div>
                     ))
                 )}
             </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
