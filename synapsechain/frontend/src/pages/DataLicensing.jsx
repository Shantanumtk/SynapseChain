import { useState } from "react";
import { BrowserProvider, parseEther, formatEther } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { useContracts } from "../hooks/useContracts";
import { api } from "../hooks/useApi";
import { useChainData } from "../hooks/useChainData";
import StatusBadge from "../components/StatusBadge";
import TxnModal from "../components/TxnModal";
import Loader from "../components/Loader";
import NegotiationModal from "../components/NegotiationModal";
import EmptyState from "../components/EmptyState";

const USE_CASES = ["Model Training", "Fine-tuning", "Evaluation", "Research", "Analytics"];

export default function DataLicensing() {
  const { address, provider, connect } = useWallet();
  const [signer, setSigner]  = useState(null);
  const { dataListings: chainListings, loading: chainLoading, refetch } = useChainData(provider);

  // Seller form
  const [sellerForm, setSF] = useState({
    description: "", minCompensation: "0.01", durationDays: "180",
    allowedUseCases: ["Model Training"],
  });

  // Buyer form (simulate AI company request)
  const [buyerForm, setBF] = useState({
    listingId: "", useCase: "Model Training",
    budget: "0.02", durationDays: "90",
  });

  // Negotiation
  const [negotiating, setNeg]     = useState(false);
  const [showNegModal, setNegModal] = useState(false);
  const [negotiation, setResult]  = useState(null);
  const [negError, setNegError]   = useState("");

  // Listings
  const [localListings, setLocalListings] = useState([]);
  const [listModal, setListModal] = useState(false);
  const listings = [
    ...chainListings,
    ...localListings.filter(l => !chainListings.find(c => c.id === l.id))
  ];
  const [listLoading, setLL]      = useState(false);
  const [dealModal, setDealModal] = useState(null);
  const [dealLoading, setDL]      = useState(false);
  const [txStatus, setTx]         = useState("");

  async function getSigner() {
    if (signer) return signer;
    const p = new BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    setSigner(s);
    return s;
  }

  function toggleUseCase(uc) {
    setSF(f => ({
      ...f,
      allowedUseCases: f.allowedUseCases.includes(uc)
        ? f.allowedUseCases.filter(u => u !== uc)
        : [...f.allowedUseCases, uc],
    }));
  }

  async function handleNegotiate() {
    if (!buyerForm.listingId) { setNegError("Enter a listing ID"); return; }
    const listing = listings.find(l => l.id === Number(buyerForm.listingId));
    if (!listing) { setNegError("Listing not found"); return; }
    setNeg(true); setNegError(""); setResult(null);
    try {
      const result = await api.negotiateLicense({
        seller_description:            listing.description,
        seller_min_compensation_eth:   Number(listing.minCompensation),
        seller_preferred_duration_days: Number(listing.durationDays),
        seller_allowed_use_cases:      listing.allowedUseCases,
        buyer_use_case:                buyerForm.useCase,
        buyer_budget_eth:              Number(buyerForm.budget),
        buyer_requested_duration_days: Number(buyerForm.durationDays),
      });
      setResult(result);
      if (result.status === "agreed") setDealModal({ listing, result });
    } catch (e) {
      setNegError(e.message);
    } finally {
      setNeg(false);
    }
  }

  async function handleListData() {
    setLL(true);
    try {
      const s = await getSigner();
      const c = useContracts(s);
      const minWei = parseEther(sellerForm.minCompensation);
      const tx  = await c.licenseMarketplace.listData(sellerForm.description, minWei);
      const rec = await tx.wait();
      const id  = rec.logs[0]?.topics[1] ? parseInt(rec.logs[0].topics[1], 16) : listings.length + 1;
      setLocalListings(prev => [...prev, {
        id, description: sellerForm.description,
        minCompensation: sellerForm.minCompensation,
        durationDays:    sellerForm.durationDays,
        allowedUseCases: sellerForm.allowedUseCases,
        owner: address, active: true,
      }]);
      setTx(`✅ Data listed with ID #${id}`);
      setListModal(false);
      await refetch();
    } catch (e) {
      setTx(`❌ ${e.message}`);
    } finally {
      setLL(false);
    }
  }

  async function confirmDeal() {
    setDL(true);
    try {
      const s = await getSigner();
      const c = useContracts(s);
      const val      = parseEther(dealModal.result.agreed_compensation_eth.toString());
      const duration = dealModal.result.agreed_duration_days * 86400;
      const tx  = await c.licenseMarketplace.executeDeal(
        dealModal.listing.id,
        dealModal.result.agreed_use_case,
        duration,
        { value: val }
      );
      await tx.wait();
      setTx(`✅ License deal executed for ${dealModal.result.agreed_compensation_eth} ETH`);
      setDealModal(null);
      setResult(null);
      await refetch();
    } catch (e) {
      setTx(`❌ ${e.message}`);
    } finally {
      setDL(false);
    }
  }

  if (!address) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Data Licensing</h1>
        <p className="text-subtle">Connect your wallet to list and license data assets.</p>
        <button onClick={connect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Licensing</h1>
          <p className="text-subtle text-sm mt-1">License your data to AI companies with on-chain consent.</p>
        </div>
        <button onClick={() => setListModal(true)} className="btn-primary">+ List Data Asset</button>
      </div>

      {txStatus && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${txStatus.startsWith("✅") ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}>
          {txStatus}
          <button onClick={() => setTx("")} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active listings */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold">Active Data Listings</h2>
          {listings.length === 0 ? (
            <EmptyState icon="◈" title="No data listings" description="List your data asset to start receiving licensing offers." />
          ) : (
            <div className="space-y-3">
              {listings.map(l => (
                <div key={l.id} className="card space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-muted font-mono">Listing #{l.id}</span>
                      <p className="text-sm text-text mt-0.5">{l.description}</p>
                    </div>
                    <StatusBadge status={l.active ? "active" : "revoked"} />
                  </div>
                  <div className="flex gap-4 text-xs text-subtle">
                    <span>Min: <span className="font-mono text-text">{l.minCompensation} ETH</span></span>
                    <span>Duration: <span className="text-text">{l.durationDays} days</span></span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {l.allowedUseCases.map(uc => (
                      <span key={uc} className="badge bg-accent/10 text-accent">{uc}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Buyer — Negotiate */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-sm">Simulate AI Buyer Request</h2>
            <input
              className="input text-sm"
              placeholder="Listing ID"
              value={buyerForm.listingId}
              onChange={e => setBF(f => ({ ...f, listingId: e.target.value }))}
            />
            <select
              className="input text-sm"
              value={buyerForm.useCase}
              onChange={e => setBF(f => ({ ...f, useCase: e.target.value }))}
            >
              {USE_CASES.map(u => <option key={u}>{u}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input text-sm"
                placeholder="Budget (ETH)"
                value={buyerForm.budget}
                onChange={e => setBF(f => ({ ...f, budget: e.target.value }))}
              />
              <input
                className="input text-sm"
                placeholder="Days"
                value={buyerForm.durationDays}
                onChange={e => setBF(f => ({ ...f, durationDays: e.target.value }))}
              />
            </div>
            {negError && <p className="text-danger text-xs">{negError}</p>}
            <button
              onClick={() => {
                const listing = listings.find(l => l.id === Number(buyerForm.listingId));
                if (!listing) { setNegError("Listing not found"); return; }
                setNegError("");
                setNegModal(true);
              }}
              className="btn-primary w-full text-sm"
            >
              Start Negotiation
            </button>
          </div>

          {negotiation && (
            <div className="card space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Negotiation Result</span>
                <StatusBadge status={negotiation.status} />
              </div>
              {/* Show negotiation conversation */}
          {negotiation.messages && negotiation.messages.length > 0 && (
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {negotiation.messages.map((m, i) => (
                <div key={i} className={`text-xs p-2 rounded ${m.role === "assistant" ? "bg-accent/10 text-subtle" : "bg-border/50 text-muted"}`}>
                  <span className="font-medium text-xs opacity-60">{m.role === "assistant" ? "Agent" : "System"}: </span>
                  {m.content.slice(0, 200)}{m.content.length > 200 ? "…" : ""}
                </div>
              ))}
            </div>
          )}
          {negotiation.status === "agreed" ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Compensation</span>
                    <span className="font-mono text-text">{negotiation.agreed_compensation_eth} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Duration</span>
                    <span className="text-text">{negotiation.agreed_duration_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Rounds</span>
                    <span className="text-text">{negotiation.negotiation_rounds}</span>
                  </div>
                  <p className="text-subtle pt-1">{negotiation.agreed_use_case}</p>
                  <button onClick={() => setDealModal({ listing: listings.find(l => l.id === Number(buyerForm.listingId)), result: negotiation })} className="btn-primary w-full mt-2">
                    Execute Deal via MetaMask
                  </button>
                </div>
              ) : (
                <p className="text-xs text-danger">{negotiation.error || "Negotiation failed"}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* List data modal */}
      {listModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full space-y-4">
            <h3 className="font-semibold">List Data Asset</h3>
            <textarea
              className="input resize-none h-24"
              placeholder="Describe your data asset (what it is, how it can be used)"
              value={sellerForm.description}
              onChange={e => setSF(f => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input text-sm"
                placeholder="Min ETH"
                value={sellerForm.minCompensation}
                onChange={e => setSF(f => ({ ...f, minCompensation: e.target.value }))}
              />
              <input
                className="input text-sm"
                placeholder="Duration (days)"
                value={sellerForm.durationDays}
                onChange={e => setSF(f => ({ ...f, durationDays: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted mb-2">Allowed use cases</p>
              <div className="flex flex-wrap gap-2">
                {USE_CASES.map(uc => (
                  <button
                    key={uc}
                    onClick={() => toggleUseCase(uc)}
                    className={`badge cursor-pointer transition-colors ${sellerForm.allowedUseCases.includes(uc) ? "bg-accent/20 text-accent" : "bg-border text-subtle hover:text-text"}`}
                  >
                    {uc}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setListModal(false)} className="btn-secondary" disabled={listLoading}>Cancel</button>
              <button onClick={handleListData} className="btn-primary" disabled={listLoading}>
                {listLoading ? "Waiting…" : "List on Chain"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNegModal && (
        <NegotiationModal
          listing={listings.find(l => l.id === Number(buyerForm.listingId))}
          buyerForm={{ ...buyerForm, buyerAddress: address }}
          apiCall={api.negotiateLicense}
          onClose={() => setNegModal(false)}
          onExecute={(result) => {
            setNegModal(false);
            setResult(result);
            const listing = listings.find(l => l.id === Number(buyerForm.listingId));
            setDealModal({ listing, result });
          }}
        />
      )}
      {dealModal && (
        <TxnModal
          title="Execute License Deal"
          description={`Send ${dealModal.result.agreed_compensation_eth} ETH to license this data for ${dealModal.result.agreed_duration_days} days. Use case: ${dealModal.result.agreed_use_case}`}
          onConfirm={confirmDeal}
          onClose={() => setDealModal(null)}
          loading={dealLoading}
        />
      )}
    </div>
  );
}
