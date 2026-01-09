import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Search, MessageSquare, Plus, Check, CheckCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  other_user?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message?: string;
  unread?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string | null;
  read_at: string | null;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [searchMember, setSearchMember] = useState("");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchMembers();
      
      // Subscribe to new messages
      const channel = supabase
        .channel("messages-realtime")
        .on("postgres_changes", { 
          event: "INSERT", 
          schema: "public", 
          table: "messages" 
        }, (payload: any) => {
          if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
            setMessages(prev => [...prev, payload.new as Message]);
          }
          fetchConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, selectedConversation]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .neq("id", currentUserId)
      .limit(100);
    if (data) setMembers(data);
  };

  const fetchConversations = async () => {
    try {
      // Get conversations where user is a participant
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (partError) throw partError;

      const conversationIds = participations?.map(p => p.conversation_id) || [];
      
      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get conversation details with other participants
      const conversationsWithUsers: Conversation[] = [];
      
      for (const convId of conversationIds) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", convId)
          .single();

        if (!conv) continue;

        // Get other participant
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select(`
            user_id,
            profile:profiles!conversation_participants_user_id_fkey(id, username, full_name, avatar_url)
          `)
          .eq("conversation_id", convId)
          .neq("user_id", currentUserId)
          .single();

        // Get last message
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, read_at, sender_id")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const profile = otherParticipant?.profile;
        const otherUser = Array.isArray(profile) ? profile[0] : profile;

        conversationsWithUsers.push({
          ...conv,
          other_user: otherUser ? {
            id: otherUser.id,
            username: otherUser.username,
            full_name: otherUser.full_name,
            avatar_url: otherUser.avatar_url,
          } : undefined,
          last_message: lastMsg?.content,
          unread: lastMsg?.sender_id !== currentUserId && !lastMsg?.read_at,
        });
      }

      setConversations(conversationsWithUsers);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
  };

  const startNewConversation = async (otherUserId: string) => {
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(c => c.other_user?.id === otherUserId);
      if (existingConv) {
        setSelectedConversation(existingConv);
        await fetchMessages(existingConv.id);
        setNewConversationOpen(false);
        return;
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants
      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConv.id, user_id: currentUserId },
          { conversation_id: newConv.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      await fetchConversations();
      
      const member = members.find(m => m.id === otherUserId);
      setSelectedConversation({
        ...newConv,
        other_user: member ? {
          id: member.id,
          username: member.username,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
        } : undefined,
      });
      setMessages([]);
      setNewConversationOpen(false);
    } catch (error: any) {
      toast({
        title: "Error starting conversation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredMembers = members.filter(m =>
    m.username.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.full_name?.toLowerCase().includes(searchMember.toLowerCase())
  );

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex h-full gap-4">
          {/* Conversations List */}
          <Card className="w-80 flex-shrink-0 bg-card border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Messages</h2>
                <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>New Conversation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Search members..."
                        value={searchMember}
                        onChange={(e) => setSearchMember(e.target.value)}
                        className="bg-secondary border-border"
                      />
                      <ScrollArea className="h-60">
                        <div className="space-y-2">
                          {filteredMembers.slice(0, 20).map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                              onClick={() => startNewConversation(member.id)}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.avatar_url || ""} />
                                <AvatarFallback>{member.username.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.full_name || member.username}</p>
                                <p className="text-sm text-muted-foreground">@{member.username}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation?.id === conv.id
                          ? "bg-primary/20"
                          : "hover:bg-secondary"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.other_user?.avatar_url || ""} />
                        <AvatarFallback>
                          {conv.other_user?.username?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conv.other_user?.full_name || conv.other_user?.username || "Unknown"}
                        </p>
                        {conv.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.last_message}
                          </p>
                        )}
                      </div>
                      {conv.unread && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 bg-card border-border flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation.other_user?.avatar_url || ""} />
                    <AvatarFallback>
                      {selectedConversation.other_user?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedConversation.other_user?.full_name || selectedConversation.other_user?.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{selectedConversation.other_user?.username}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              <span>
                                {msg.created_at && formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </span>
                              {isOwn && (
                                msg.read_at ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="flex-1 bg-secondary border-border"
                    />
                    <Button onClick={sendMessage} className="bg-primary hover:bg-primary/90">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Select a conversation</p>
                  <p className="text-sm">or start a new one</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
