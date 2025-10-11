import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Clock, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  duration_minutes: number;
  meeting_link: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Meetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetings();

    const channel = supabase
      .channel("meetings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => {
        fetchMeetings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*, profiles(username, avatar_url)")
        .order("meeting_date", { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
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
          <DialogContent className="bg-card border-border">
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
              <div className="space-y-2">
                <Label htmlFor="meeting-description">Description</Label>
                <Textarea
                  id="meeting-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional details..."
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
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
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
                <Label htmlFor="meeting-link">Meeting Link (optional)</Label>
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
            <p className="text-muted-foreground">No meetings scheduled yet. Be the first to schedule one!</p>
          </Card>
        ) : (
          meetings.map((meeting) => (
            <Card key={meeting.id} className="p-6 bg-card border-border hover:shadow-premium transition-shadow">
              <div className="flex items-start gap-4">
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
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{meeting.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Organized by {meeting.profiles.username}
                  </p>
                  {meeting.description && (
                    <p className="text-foreground mb-3">{meeting.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.meeting_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(meeting.meeting_date).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} ({meeting.duration_minutes} min)
                    </div>
                  </div>
                  {meeting.meeting_link && (
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-primary hover:underline"
                    >
                      Join Meeting →
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Meetings;