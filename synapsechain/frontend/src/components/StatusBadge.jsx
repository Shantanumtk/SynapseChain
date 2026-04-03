export default function StatusBadge({ status }) {
  const map = {
    active:    "bg-success/10 text-success",
    revoked:   "bg-danger/10 text-danger",
    expired:   "bg-muted/10 text-muted",
    open:      "bg-accent/10 text-accent",
    fulfilled: "bg-success/10 text-success",
    cancelled: "bg-muted/10 text-muted",
    agreed:    "bg-success/10 text-success",
    failed:    "bg-danger/10 text-danger",
  };
  return (
    <span className={`badge ${map[status?.toLowerCase()] ?? "bg-border text-subtle"}`}>
      {status}
    </span>
  );
}
