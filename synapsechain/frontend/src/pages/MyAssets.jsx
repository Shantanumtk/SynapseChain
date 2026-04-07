import { useState, useEffect } from "react";
import { BrowserProvider, formatEther } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { useContracts } from "../hooks/useContracts";
import { api } from "../hooks/useApi";
import { useChainData } from "../hooks/useChainData";
import StatusBadge from "../components/StatusBadge";
import TxnModal from "../components/TxnModal";
import ScoreMeter from "../components/ScoreMeter";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

export default function MyAssets() {
  const { address, balance, provider, connect } = useWallet();
  const [signer, setSigner] = useState(null);
  const { myLicenses: chainLicenses, ownedNFTs, loading: chainLoading, refetch } = useChainData(provider);

  // Mock owned data — in prod, read from chain events filtered by address
  // myNFTs computed from ownedNFTs below
  const titleMap = (() => { try { return JSON.parse(localStorage.getItem("sc_nft_titles") || "{}"); } catch { return {}; } })();
  const myNFTs = address && ownedNFTs
    ? Object.entries(ownedNFTs)
        .filter(([, owner]) => owner?.toLowerCase() === address.toLowerCase())
        .map(([tokenId]) => {
          const meta = titleMap[Number(tokenId)] || {};
          return {
            tokenId:     Number(tokenId),
            title:       meta.title || "Knowledge Asset #" + tokenId,
            description: meta.description || "",
            score:       meta.score || 0,
            contentHash: "on-chain",
            mintedAt:    new Date().toISOString().split("T")[0],
          };
        })
    : [];
  // myLicenses now from useChainData hook
  const [rewardBalance, setRB]      = useState("0");

  const [revokeModal, setRevoke]    = useState(null);
  const [revokeLoading, setRL]      = useState(false);
  const [txStatus, setTx]           = useState("");
  const [tab, setTab]               = useState("nfts");

  async function getSigner() {
    if (signer) return signer;
    const p = new BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    setSigner(s);
    return s;
  }

  async function handleRevoke(license) {
    setRevoke(license);
  }

  async function confirmRevoke() {
    setRL(true);
    try {
      // Use Consent Agent to validate + get txn payload
      const agentResult = await api.revokeLicense({
        license_token_id:   revokeModal.tokenId,
        requester_address:  address,
      });

      if (!agentResult.is_valid) {
        setTx(`❌ ${agentResult.validation_reason}`);
        setRevoke(null);
        return;
      }

      // Agent built the txn — send it via MetaMask
      const s = await getSigner();
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [agentResult.txn_payload],
      });

      setTx(`✅ License #${revokeModal.tokenId} revoked. Tx: ${txHash.slice(0, 12)}…`);
      setRevoke(null);
      await refetch();
      setTimeout(() => refetch(), 2000);
    } catch (e) {
      setTx(`❌ ${e.message}`);
    } finally {
      setRL(false);
    }
  }

  // myNFTs is computed from ownedNFTs (chain Transfer events) — no useState needed

  // Licenses come from chain via useChainData
  const myLicenses = chainLicenses.filter(
    l => address && (
      l.dataOwner?.toLowerCase() === address.toLowerCase() ||
      l.aiBuyer?.toLowerCase()   === address.toLowerCase()
    )
  );

  if (!address) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">My Assets</h1>
        <p className="text-subtle">Connect your wallet to view your assets.</p>
        <button onClick={connect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-semibold">My Assets</h1>

      {/* Wallet summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Wallet",        value: `${address.slice(0,6)}…${address.slice(-4)}`, mono: true },
          { label: "ETH Balance",   value: `${Number(balance).toFixed(4)} ETH`,          mono: true },
          { label: "SYNR Tokens",   value: `${rewardBalance} SYNR`,                      mono: true },
          { label: "Knowledge NFTs", value: myNFTs.length,                               mono: false },
        ].map(({ label, value, mono }) => (
          <div key={label} className="card">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className={`font-medium ${mono ? "font-mono text-sm" : "text-lg"}`}>{value}</p>
          </div>
        ))}
      </div>

      {txStatus && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${txStatus.startsWith("✅") ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}>
          {txStatus}
          <button onClick={() => setTx("")} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {["nfts", "licenses", "history"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? "border-accent text-accent" : "border-transparent text-subtle hover:text-text"
            }`}
          >
            {t === "nfts" ? `Knowledge NFTs (${myNFTs.length})` : t === "licenses" ? `Data Licenses (${myLicenses.length})` : "Transaction History"}
          </button>
        ))}
      </div>

      {/* NFTs tab */}
      {tab === "nfts" && (
        myNFTs.length === 0 ? (
          <EmptyState icon="◇" title="No knowledge NFTs" description="Mint your first knowledge asset on the Knowledge Market." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myNFTs.map(nft => (
              <div key={nft.tokenId} className="card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-sm">{nft.title}</h3>
                    <p className="text-xs text-muted font-mono mt-0.5">Token #{nft.tokenId}</p>
                  </div>
                </div>
                <ScoreMeter score={nft.score} />
                <div className="flex justify-between text-xs text-muted">
                  <span>Minted {nft.mintedAt}</span>
                  <span className="font-mono truncate max-w-[100px]">{nft.contentHash}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Licenses tab */}
      {tab === "licenses" && (
        myLicenses.length === 0 ? (
          <EmptyState icon="◈" title="No data licenses" description="List your data on the Data Licensing page to start earning." />
        ) : (
          <div className="space-y-3">
            {myLicenses.map(l => (
              <div key={l.tokenId} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted font-mono">License #{l.tokenId}</span>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-sm text-text">{l.useCase}</p>
                    <p className="text-xs text-muted mt-0.5">
                      AI Buyer: <span className="font-mono">{l.aiBuyer}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{l.compensation} ETH</div>
                    <div className="text-xs text-muted">{l.durationDays} days</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted">Created {l.createdAt}</span>
                  {l.status === "active" && (
                    <button onClick={() => handleRevoke(l)} className="btn-danger text-xs py-1">
                      Revoke Consent
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "history" && (() => {
        const titleMap2 = (() => { try { return JSON.parse(localStorage.getItem("sc_nft_titles") || "{}"); } catch { return {}; } })();
        const txns = [];
        Object.entries(ownedNFTs || {}).forEach(([tokenId, owner]) => {
          if (owner?.toLowerCase() === address?.toLowerCase()) {
            const meta = titleMap2[Number(tokenId)] || {};
            txns.push({ type: "Minted NFT", detail: meta.title || "Knowledge Asset #" + tokenId, tokenId: Number(tokenId), dir: "out" });
          }
        });
        myLicenses.forEach(l => {
          if (l.dataOwner?.toLowerCase() === address?.toLowerCase()) {
            txns.push({ type: "License Created", detail: l.useCase + " · " + l.compensation + " ETH received", tokenId: l.tokenId, dir: "in" });
            if (l.status === "revoked") txns.push({ type: "License Revoked", detail: "License #" + l.tokenId + " revoked", tokenId: l.tokenId, dir: "out" });
          }
          if (l.aiBuyer?.toLowerCase() === address?.toLowerCase()) {
            txns.push({ type: "License Purchased", detail: l.useCase + " · " + l.compensation + " ETH sent", tokenId: l.tokenId, dir: "out" });
          }
        });
        if (txns.length === 0) return (
          <div key="empty"><EmptyState icon="◎" title="No transactions yet" description="Your on-chain activity will appear here." /></div>
        );
        return (
          <div key="history" className="space-y-2">
            {txns.map((t, i) => (
              <div key={i} className="card flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.dir === "in" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>
                    {t.dir === "in" ? "↓" : "↑"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{t.type}</p>
                    <p className="text-xs text-subtle">{t.detail}</p>
                  </div>
                </div>
                <span className="text-xs text-muted font-mono">#{t.tokenId}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {revokeModal && (
        <TxnModal
          title="Revoke License Consent"
          description={`Revoke license #${revokeModal.tokenId} for "${revokeModal.useCase}". The Consent Agent will validate this on-chain before MetaMask sends the transaction. This action is permanent and will be logged on the blockchain.`}
          onConfirm={confirmRevoke}
          onClose={() => setRevoke(null)}
          loading={revokeLoading}
        />
      )}
    </div>
  );
}
