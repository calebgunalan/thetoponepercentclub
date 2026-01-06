import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Linkedin, Twitter, Globe, Instagram } from "lucide-react";

interface SocialLinksData {
  linkedin?: string;
  twitter?: string;
  website?: string;
  instagram?: string;
}

interface SocialLinksProps {
  links: SocialLinksData;
  onLinksChange: (links: SocialLinksData) => void;
  editable?: boolean;
}

const SocialLinks = ({ links, onLinksChange, editable = true }: SocialLinksProps) => {
  const handleChange = (key: keyof SocialLinksData, value: string) => {
    onLinksChange({ ...links, [key]: value });
  };

  if (!editable) {
    const hasLinks = Object.values(links).some((link) => link);
    if (!hasLinks) return null;

    return (
      <div className="flex gap-3">
        {links.linkedin && (
          <a
            href={links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Linkedin className="h-5 w-5" />
          </a>
        )}
        {links.twitter && (
          <a
            href={links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Twitter className="h-5 w-5" />
          </a>
        )}
        {links.instagram && (
          <a
            href={links.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="h-5 w-5" />
          </a>
        )}
        {links.website && (
          <a
            href={links.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Globe className="h-5 w-5" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </Label>
        <Input
          value={links.linkedin || ""}
          onChange={(e) => handleChange("linkedin", e.target.value)}
          placeholder="https://linkedin.com/in/..."
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Twitter className="h-4 w-4" />
          Twitter/X
        </Label>
        <Input
          value={links.twitter || ""}
          onChange={(e) => handleChange("twitter", e.target.value)}
          placeholder="https://twitter.com/..."
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Instagram className="h-4 w-4" />
          Instagram
        </Label>
        <Input
          value={links.instagram || ""}
          onChange={(e) => handleChange("instagram", e.target.value)}
          placeholder="https://instagram.com/..."
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Website
        </Label>
        <Input
          value={links.website || ""}
          onChange={(e) => handleChange("website", e.target.value)}
          placeholder="https://..."
          className="bg-secondary border-border"
        />
      </div>
    </div>
  );
};

export default SocialLinks;
