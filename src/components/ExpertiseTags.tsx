import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpertiseTagsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  editable?: boolean;
}

const SUGGESTED_TAGS = [
  "Business",
  "Marketing",
  "Finance",
  "Leadership",
  "Productivity",
  "Mindset",
  "Sales",
  "Investing",
  "Real Estate",
  "Tech",
  "Health",
  "Fitness",
];

const ExpertiseTags = ({ tags, onTagsChange, editable = true }: ExpertiseTagsProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 6) {
      onTagsChange([...tags, trimmedTag]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const availableSuggestions = SUGGESTED_TAGS.filter((tag) => !tags.includes(tag));

  if (!editable) {
    return (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="bg-primary/10 text-primary flex items-center gap-1"
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {tags.length < 6 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Add expertise..."
              className="bg-secondary border-border"
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {showSuggestions && availableSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.slice(0, 6).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => addTag(tag)}
                >
                  + {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{tags.length}/6 expertise areas</p>
    </div>
  );
};

export default ExpertiseTags;
