interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <input
      type="text"
      placeholder="Search challenges..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text
                 placeholder:text-muted focus:outline-none focus:border-accent transition-colors font-[inherit]"
    />
  );
}
