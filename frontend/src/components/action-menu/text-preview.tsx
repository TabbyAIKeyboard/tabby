"use client";

interface TextPreviewProps {
  text: string;
  maxLength?: number;
}

export function TextPreview({ text, maxLength = 100 }: TextPreviewProps) {
  const truncatedText =
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  return (
    <div className="border-b bg-muted/30 px-4 py-3">
      <p className="text-sm text-muted-foreground line-clamp-2 font-mono">
        {truncatedText}
      </p>
    </div>
  );
}
