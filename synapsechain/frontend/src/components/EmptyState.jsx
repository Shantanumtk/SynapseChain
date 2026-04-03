export default function EmptyState({ icon = "○", title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3 opacity-20">{icon}</div>
      <h3 className="font-medium text-text mb-1">{title}</h3>
      <p className="text-subtle text-sm max-w-xs">{description}</p>
    </div>
  );
}
