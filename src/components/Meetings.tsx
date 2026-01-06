import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Clock, User, Users, ExternalLink, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  duration_minutes: number;
  meeting_link: string | null;
  meeting_type: string | null;
  category: string | null;
  max_attendees: number | null;
  created_at: string;
  organizer_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Attendee {
  user_id: string;
  status: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const MEETING_TYPES = [
  { value: "open", label: "Open to All" },
  { value: "mastermind", label: "Mastermind Session" },
  { value: "workshop", label: "Workshop" },
  { value: "networking", label: "Networking" },
  { value: "coaching", label: "Coaching Call" },
];

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "business", label: "Business" },
  { value: "mindset", label: "Mindset" },
  { value: "productivity", label: "Productivity" },
  { value: "finance", label: "Finance" },
];

const Meetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendees, setAttendees] = useState<Record<string, Attendee[]>>({});
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingType, setMeetingType] = useState("open");
  const [category, setCategory] = useState("general");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchMeetings();

    const channel = supabase
      .channel("meetings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => {
        fetchMeetings();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_attendees" }, () => {
        fetchMeetings();
        fetchUserRegistrations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    if (user) {
      fetchUserRegistrations();
    }
  };

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*, profiles(username, avatar_url)")
        .gte("meeting_date", new Date().toISOString())
        .order("meeting_date", { ascending: true });

      if (error) throw error;
      setMeetings(data || []);

      if (data) {
        data.forEach((meeting) => fetchAttendees(meeting.id));
      }
    } catch (error: any) {
      toast({
        title: "Error loading meetings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from("meeting_attendees")
        .select("*, profiles(username, avatar_url)")
        .eq("meeting_id", meetingId);

      if (error) throw error;
      setAttendees((prev) => ({ ...prev, [meetingId]: data || [] }));
    } catch (error) {
      console.error("Error fetching attendees:", error);
    }
  };

  const fetchUserRegistrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("meeting_attendees")
        .select("meeting_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setUserRegistrations(new Set(data?.map((r) => r.meeting_id) || []));
    } catch (error) {
      console.error("Error fetching registrations:", error);
    }
  };

  const handleRegister = async (meetingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to register for meetings.",
          variant: "destructive",
        });
        return;
      }

      const meeting = meetings.find((m) => m.id === meetingId);
      const currentAttendees = attendees[meetingId]?.length || 0;

      if (meeting?.max_attendees && currentAttendees >= meeting.max_attendees) {
        toast({
          title: "Meeting is full",
          description: "This meeting has reached its maximum capacity.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("meeting_attendees").insert({
        meeting_id: meetingId,
        user_id: user.id,
        status: "registered",
      });

      if (error) throw error;

      toast({
        title: "Registered!",
        description: "You have been registered for this meeting.",
      });

      fetchAttendees(meetingId);
      fetchUserRegistrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnregister = async (meetingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("meeting_attendees")
        .delete()
        .eq("meeting_id", meetingId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Unregistered",
        description: "You have been removed from this meeting.",
      });

      fetchAttendees(meetingId);
      fetchUserRegistrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const meetingDateTime = `${meetingDate}T${meetingTime}:00`;

      const { error } = await supabase.from("meetings").insert({
        organizer_id: user.id,
        title,
        description,
        meeting_date: meetingDateTime,
        duration_minutes: parseInt(duration),
        meeting_link: meetingLink || null,
        meeting_type: meetingType,
        category,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      });

      if (error) throw error;

      toast({
        title: "Meeting scheduled",
        description: "Your meeting has been added successfully.",
      });

      setTitle("");
      setDescription("");
      setMeetingDate("");
      setMeetingTime("");
      setDuration("60");
      setMeetingLink("");
      setMeetingType("open");
      setCategory("general");
      setMaxAttendees("");
      setOpen(false);
      fetchMeetings();
    } catch (error: any) {
      toast({
        title: "Error scheduling meeting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isRegistered = (meetingId: string) => userRegistrations.has(meetingId);
  const isOrganizer = (meeting: Meeting) => meeting.organizer_id === currentUserId;

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading meetings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meetings</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Schedule a Meeting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">Title</Label>
                <Input
                  id="meeting-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Strategy Session"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meeting Type</Label>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting-description">Description</Label>
                <Textarea
                  id="meeting-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What will you discuss?"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Date</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-time">Time</Label>
                  <Input
                    id="meeting-time"
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                    min="15"
                    step="15"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-attendees">Max Attendees</Label>
                  <Input
                    id="max-attendees"
                    type="number"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(e.target.value)}
                    placeholder="Unlimited"
                    min="2"
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting-link">Meeting Link</Label>
                <Input
                  id="meeting-link"
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/..."
                  className="bg-secondary border-border"
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Schedule Meeting
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {meetings.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No upcoming meetings. Be the first to schedule one!</p>
          </Card>
        ) : (
          meetings.map((meeting) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 bg-card border-border hover:shadow-premium transition-shadow">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0">
                        {meeting.profiles.avatar_url ? (
                          <img
                            src={meeting.profiles.avatar_url}
                            alt={meeting.profiles.username}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-semibold text-foreground">{meeting.title}</h3>
                          {meeting.meeting_type && (
                            <Badge variant="secondary" className="capitalize">
                              {meeting.meeting_type.replace("_", " ")}
                            </Badge>
                          )}
                          {meeting.category && (
                            <Badge variant="outline" className="capitalize">
                              {meeting.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Organized by {meeting.profiles.username}
                        </p>
                      </div>
                    </div>

                    {meeting.description && (
                      <p className="text-foreground mb-3">{meeting.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(meeting.meeting_date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(meeting.meeting_date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} ({meeting.duration_minutes} min)
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {attendees[meeting.id]?.length || 0}
                        {meeting.max_attendees && ` / ${meeting.max_attendees}`} attending
                      </div>
                    </div>

                    {attendees[meeting.id] && attendees[meeting.id].length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex -space-x-2">
                          {attendees[meeting.id].slice(0, 5).map((attendee) => (
                            <Avatar key={attendee.user_id} className="h-6 w-6 border-2 border-card">
                              <AvatarImage src={attendee.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {attendee.profiles.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {attendees[meeting.id].length > 5 && (
                            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs border-2 border-card">
                              +{attendees[meeting.id].length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 lg:items-end">
                    {!isOrganizer(meeting) && (
                      <>
                        {isRegistered(meeting.id) ? (
                          <Button
                            variant="outline"
                            onClick={() => handleUnregister(meeting.id)}
                            className="border-destructive text-destructive hover:bg-destructive/10"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel Registration
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleRegister(meeting.id)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Register
                          </Button>
                        )}
                      </>
                    )}

                    {meeting.meeting_link && (isRegistered(meeting.id) || isOrganizer(meeting)) && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 text-primary hover:underline text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Join Meeting
                      </a>
                    )}

                    {isOrganizer(meeting) && (
                      <Badge className="bg-primary/10 text-primary">Organizer</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Meetings;
