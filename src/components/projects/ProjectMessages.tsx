'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  replyToId?: number | null;
  replyTo?: {
    id: number;
    content: string;
    user: {
      name: string | null;
    } | null;
  } | null;
  user: {
    name: string | null;
    email: string;
  } | null;
}

interface ProjectMessagesProps {
  projectId: number;
}

export function ProjectMessages({ projectId }: ProjectMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/messages?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      setMessages((data.data || []).reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, replyingTo]);

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    // Focus logic could be added here if we had a ref to input
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const payload: any = { content: newMessage.trim() };
      if (replyingTo) {
        payload.replyToId = replyingTo.id;
      }

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      setReplyingTo(null);
      if (!currentUserId && data.userId) {
        setCurrentUserId(data.userId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const scrollToMessage = (id: number) => {
    // Simple implementation - could be improved with refs map
    const element = document.getElementById(`message-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-accent/20');
      setTimeout(() => element.classList.remove('bg-accent/20'), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-350px)] min-h-[400px]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = currentUserId === message.userId;
            const showAvatar = index === 0 || 
              messages[index - 1].userId !== message.userId;

            return (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''} group transition-colors duration-500 rounded-lg p-1`}
              >
                {showAvatar ? (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(message.user?.name || null, message.user?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8" />
                )}

                <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : ''}`}>
                  {showAvatar && (
                    <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm font-medium">
                        {message.user?.name || message.user?.email || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageDate(message.createdAt)}
                      </span>
                    </div>
                  )}
                  
                  <div className="relative">
                     <div
                        className={`rounded-lg px-3 py-2 shadow-sm ${
                        isCurrentUser
                           ? 'bg-primary text-primary-foreground'
                           : 'bg-muted border'
                        }`}
                     >
                        {/* Reply Context Bubble */}
                        {message.replyTo && (
                          <div 
                            className={`mb-2 rounded text-xs p-2 border-l-4 cursor-pointer ${
                              isCurrentUser 
                                ? 'bg-primary-foreground/10 border-primary-foreground/50' 
                                : 'bg-background/50 border-primary/50'
                            }`}
                            onClick={() => scrollToMessage(message.replyTo!.id)}
                          >
                            <p className="font-semibold opacity-90 mb-0.5">
                              {message.replyTo.user?.name || 'User'}
                            </p>
                            <p className="opacity-80 line-clamp-1">
                              {message.replyTo.content}
                            </p>
                          </div>
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                     </div>
                     
                     <div className={`absolute top-0 opacity-0 group-hover:opacity-100 flex items-center ${isCurrentUser ? '-left-8' : '-right-8'}`}>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-6 w-6"
                         onClick={() => handleReply(message)}
                         title="Reply"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                       </Button>
                     </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="border-t p-4 bg-background z-10">
        {replyingTo && (
           <div className="mb-2 p-2 bg-muted/50 rounded-md border-l-4 border-primary flex justify-between items-start animate-in slide-in-from-bottom-2">
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-semibold text-primary mb-0.5">
                    Replying to {replyingTo.user?.name || replyingTo.user?.email || 'User'}
                 </p>
                 <p className="text-xs text-muted-foreground line-clamp-1">
                    {replyingTo.content}
                 </p>
              </div>
              <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-5 w-5 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                 onClick={cancelReply}
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </Button>
           </div>
        )}
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
