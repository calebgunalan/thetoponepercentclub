import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Plus,
  Search,
  Heart,
  Bookmark,
  ExternalLink,
  Video,
  FileText,
  Book,
  Lightbulb,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Resource {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  content: string | null;
  resource_type: string;
  category: string;
  thumbnail_url: string | null;
  external_url: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

const resourceTypes = [
  { value: "article", label: "Article", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "book_summary", label: "Book Summary", icon: Book },
  { value: "insight", label: "Insight", icon: Lightbulb },
];

const categories = [
  "Mindset",
  "Business",
  "Productivity",
  "Finance",
  "Health",
  "Leadership",
  "Personal Growth",
];

const Learn = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    content: "",
    resource_type: "article",
    category: "Mindset",
    external_url: "",
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from("learning_resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch author profiles separately
      const authorIds = [...new Set(data?.map(d => d.author_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", authorIds);
      
      const resourcesWithProfiles = (data || []).map(resource => ({
        ...resource,
        profiles: profiles?.find(p => p.id === resource.author_id) as any
      }));
      
      setResources(resourcesWithProfiles);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("learning_resources").insert({
        author_id: user.id,
        title: newResource.title,
        description: newResource.description,
        content: newResource.content,
        resource_type: newResource.resource_type,
        category: newResource.category,
        external_url: newResource.external_url || null,
      });

      if (error) throw error;

      toast({
        title: "Resource shared!",
        description: "Your knowledge has been shared with the community.",
      });

      setIsModalOpen(false);
      setNewResource({
        title: "",
        description: "",
        content: "",
        resource_type: "article",
        category: "Mindset",
        external_url: "",
      });
      fetchResources();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || resource.category === categoryFilter;
    const matchesType =
      typeFilter === "all" || resource.resource_type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeIcon = (type: string) => {
    const typeConfig = resourceTypes.find((t) => t.value === type);
    return typeConfig?.icon || FileText;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Learning Hub</h1>
            <p className="text-muted-foreground">
              Expand your knowledge with resources shared by top achievers
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Share Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle>Share a Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newResource.title}
                    onChange={(e) =>
                      setNewResource({ ...newResource, title: e.target.value })
                    }
                    placeholder="e.g., 10 Habits of Highly Successful People"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select
                      value={newResource.resource_type}
                      onValueChange={(value) =>
                        setNewResource({ ...newResource, resource_type: value })
                      }
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {resourceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={newResource.category}
                      onValueChange={(value) =>
                        setNewResource({ ...newResource, category: value })
                      }
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newResource.description}
                    onChange={(e) =>
                      setNewResource({
                        ...newResource,
                        description: e.target.value,
                      })
                    }
                    placeholder="Brief description of this resource..."
                    className="bg-secondary border-border"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>External URL (optional)</Label>
                  <Input
                    value={newResource.external_url}
                    onChange={(e) =>
                      setNewResource({
                        ...newResource,
                        external_url: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={newResource.content}
                    onChange={(e) =>
                      setNewResource({ ...newResource, content: e.target.value })
                    }
                    placeholder="Write your article, summary, or insights here..."
                    className="bg-secondary border-border"
                    rows={6}
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-gold text-primary-foreground"
                  disabled={!newResource.title}
                >
                  Share Resource
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6 bg-card border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40 bg-secondary border-border">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40 bg-secondary border-border">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {resourceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Resources Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 bg-card border-border animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4 mb-4" />
                <div className="h-3 bg-secondary rounded w-full mb-2" />
                <div className="h-3 bg-secondary rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const TypeIcon = getTypeIcon(resource.resource_type);
              return (
                <Card
                  key={resource.id}
                  className="p-6 bg-card border-border hover:shadow-premium transition-all hover:border-primary/30"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="outline" className="border-border">
                        {resource.category}
                      </Badge>
                    </div>
                    {resource.external_url && (
                      <a
                        href={resource.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  <h3 className="font-semibold mb-2 line-clamp-2">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {resource.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={resource.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {resource.profiles?.username?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {resource.profiles?.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                        <Heart className="h-4 w-4" />
                        {resource.likes_count}
                      </button>
                      <button className="text-muted-foreground hover:text-primary">
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && filteredResources.length === 0 && (
          <Card className="p-12 text-center bg-card border-border">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share knowledge with the community!
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Share Resource
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Learn;
