import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";

const NAV = [
  { to: "/",         label: "Knowledge Market" },
  { to: "/license",  label: "Data Licensing"   },
  { to: "/bounties", label: "Bounty Board"      },
  { to: "/assets",   label: "My Assets"         },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { address, balance, connecting, connect, disconnect } = useWallet();

  return (
    <nav className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold">S</div>
          <span className="font-semibold text-text">SynapseChain</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname === to
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-subtle hover:text-text hover:bg-border/50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-2">
          {address ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-subtle font-mono">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                <span className="text-xs text-muted">{Number(balance).toFixed(3)} ETH</span>
              </div>
              <button onClick={disconnect} className="btn-secondary text-xs py-1.5">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={connecting} className="btn-primary text-sm py-1.5">
              {connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
