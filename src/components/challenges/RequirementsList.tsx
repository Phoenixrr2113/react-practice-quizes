interface RequirementsListProps {
  requirements: string[];
}

export function RequirementsList({ requirements }: RequirementsListProps) {
  return (
    <div className="pt-5">
      <h3 className="m-0 mb-3 text-[13px] font-bold uppercase tracking-widest text-[#555]">
        Requirements
      </h3>
      <div className="flex flex-col gap-2">
        {requirements.map((r, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-[#ccc] leading-normal font-ui">
            <span className="text-accent font-bold shrink-0">→</span>
            <span>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
