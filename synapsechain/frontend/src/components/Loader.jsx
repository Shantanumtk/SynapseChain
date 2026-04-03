export default function Loader({ text = "Loading…" }) {
  return (
    <div className="flex items-center gap-2 text-subtle text-sm">
      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span>{text}</span>
    </div>
  );
}
