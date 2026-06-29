"use client";

type TagChipsProps = {
  tags: string[];
  selectedTag: string | null;
  onTagClick: (tag: string | null) => void;
};

export function TagChips({ tags, selectedTag, onTagClick }: TagChipsProps) {
  if (tags.length === 0) return null;

  return (
    <div aria-label="Filter by tag" className="tag-chips" role="group">
      {tags.map((tag) => {
        const isSelected = tag === selectedTag;
        return (
          <button
            key={tag}
            aria-pressed={isSelected}
            className={`tag-chip ${isSelected ? "tag-chip--active" : ""}`}
            type="button"
            onClick={() => onTagClick(isSelected ? null : tag)}
          >
            {tag}
          </button>
        );
      })}
      {selectedTag && (
        <button
          aria-label="Clear tag filter"
          className="tag-chip tag-chip--clear"
          type="button"
          onClick={() => onTagClick(null)}
        >
          ✕
        </button>
      )}
    </div>
  );
}
