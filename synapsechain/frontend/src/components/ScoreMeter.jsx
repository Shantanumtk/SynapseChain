export default function ScoreMeter({ score }) {
  const pct   = (score / 10) * 100;
  const color = score >= 8 ? "bg-success" : score >= 5 ? "bg-accent" : "bg-warning";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-subtle">
        <span>Quality Score</span>
        <span className="font-mono font-medium text-text">{score}/10</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
