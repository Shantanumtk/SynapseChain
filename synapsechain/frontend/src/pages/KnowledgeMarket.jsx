import { useState, useEffect } from "react";
import * as ethers from "ethers"
import { BrowserProvider, parseEther, formatEther } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { useContracts } from "../hooks/useContracts";
import { api } from "../hooks/useApi";
import { useChainData } from "../hooks/useChainData";
import { CONTRACT_ADDRESSES } from "../utils/contractAddresses.js";
import ScoreMeter from "../components/ScoreMeter";
import TxnModal from "../components/TxnModal";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

const CATEGORIES = ["AI/ML", "Finance", "Science", "Engineering", "Medicine", "Law", "Other"];

export default function KnowledgeMarket() {
  const { address, provider, connect } = useWallet();
  const [signer, setSigner] = useState(null);
  const { nftListings: chainListings, loading: chainLoading, refetch } = useChainData(provider);
  const contracts = useContracts(signer);

  // Upload form
  const [form, setForm]       = useState({ title: "", description: "", category: "AI/ML", content: "" });
  const [evaluation, setEval] = useState(null);
  const [evalLoading, setEL]  = useState(false);
  const [evalError, setEE]    = useState("");

  // Mint modal
  const [showMint, setShowMint]   = useState(false);
  const [mintLoading, setML]      = useState(false);
  const [mintedId, setMintedId]   = useState(null);

  // Listings (would come from chain events in prod — using local state for demo)
  const [localListings, setLocalListings] = useState([]);
  const [buyModal, setBuyModal]   = useState(null);
  // Merge on-chain listings with locally added ones (deduped by tokenId)
  // Chain is source of truth — local only fills in metadata (title/description)
  const listings = chainListings.map(cl => {
    const local = localListings.find(l => l.tokenId === cl.tokenId);
    return local ? { ...cl, title: local.title || cl.title, description: local.description || cl.description } : cl;
  });
  const [buyLoading, setBL]       = useState(false);
  const [txStatus, setTxStatus]   = useState("");

  async function getSigner() {
    if (signer) return signer;
    const _provider = new BrowserProvider(window.ethereum);
    const _signer   = await _provider.getSigner();
    setSigner(_signer);
    return _signer;
  }

  useEffect(() => {
    if (provider) refetch();
  }, [provider]);

  async function handleEvaluate() {
    if (!form.title || !form.description || !form.content) {
      setEE("Please fill in all fields.");
      return;
    }
    setEL(true); setEE(""); setEval(null);
    try {
      const result = await api.evaluateNFT({
        title:           form.title,
        description:     form.description,
        content_preview: form.content.slice(0, 500),
        category:        form.category,
      });
      setEval(result);
      setShowMint(true);
    } catch (e) {
      setEE(e.message);
    } finally {
      setEL(false);
    }
  }

  async function handleMint() {
    setML(true);
    try {
      const tokenURI    = `ipfs://synapsechain-${Date.now()}`;
      const contentHash = `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}`;

      // Step 1 — backend mints NFT using deployer key (Marketplace owner)
      const mintRes = await fetch("/api/nft/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to:            address,
          token_uri:     tokenURI,
          content_hash:  contentHash,
          quality_score: evaluation.score,
        }),
      });
      const mintData = await mintRes.json();
      if (!mintRes.ok) throw new Error(mintData.detail || "Mint failed");

      const tokenId = mintData.token_id;
      setMintedId(tokenId);
      setShowMint(false);
      setTxStatus(`✅ NFT minted! Token ID: ${tokenId}`);
      // Save title + score mapping for display
      const titleMap = JSON.parse(localStorage.getItem("sc_nft_titles") || "{}");
      titleMap[tokenId] = { title: form.title, description: form.description, score: evaluation.score };
      localStorage.setItem("sc_nft_titles", JSON.stringify(titleMap));

      // Step 2 — user approves + lists via MetaMask
      const s = await getSigner();
      const { Contract, parseEther: pe } = ethers;
      const addresses = CONTRACT_ADDRESSES;

      const nftContract = new Contract(
        addresses.KnowledgeNFT,
        [
          "function setApprovalForAll(address operator, bool approved)",
          "function isApprovedForAll(address owner, address operator) view returns (bool)"
        ],
        s
      );

      const marketContract = new Contract(
        addresses.Marketplace,
        ["function list(uint256 tokenId, uint256 price)"],
        s
      );

      const priceWei = parseEther(evaluation.suggested_price_eth.toFixed(18));
      const approveTx = await nftContract.setApprovalForAll(addresses.Marketplace, true);
      await approveTx.wait();
      setTxStatus("⏳ Step 2/2 — Listing NFT in MetaMask...");
      const listTx = await marketContract.list(tokenId, priceWei);
      await listTx.wait();

      setLocalListings(prev => [...prev, {
        tokenId,
        title:       form.title,
        description: form.description,
        score:       evaluation.score,
        price:       evaluation.suggested_price_eth,
        seller:      address,
      }]);
      setTxStatus(`✅ NFT minted and listed at ${evaluation.suggested_price_eth} ETH`);
      setForm({ title: "", description: "", category: "AI/ML", content: "" });
      setEval(null);
    } catch (e) {
      setTxStatus(`❌ ${e.message || JSON.stringify(e)}`);
    } finally {
      setML(false);
    }
  }

  async function handleBuy(listing) {
    setBuyModal(listing);
  }

  async function confirmBuy() {
    setBL(true);
    try {
      const s = await getSigner();
      const c = useContracts(s);
      const tx = await c.marketplace.buy(buyModal.tokenId, {
        value: parseEther(buyModal.price.toString()),
      });
      await tx.wait();
      setLocalListings(prev => prev.filter(l => l.tokenId !== buyModal.tokenId));
      setTxStatus(`✅ Purchased NFT #${buyModal.tokenId}`);
      setBuyModal(null);
    } catch (e) {
      setTxStatus(`❌ ${e.message || JSON.stringify(e)}`);
    } finally {
      setBL(false);
    }
  }

  if (!address) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Knowledge Market</h1>
        <p className="text-subtle">Connect your wallet to browse and list knowledge NFTs.</p>
        <button onClick={connect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge Market</h1>
        <p className="text-subtle text-sm mt-1">Tokenize your expertise as NFTs and sell to other users.</p>
      </div>

      {txStatus && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${txStatus.startsWith("✅") ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}>
          {txStatus}
          <button onClick={() => setTxStatus("")} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload + Evaluate */}
        <div className="lg:col-span-1 card space-y-4">
          <h2 className="font-semibold">Upload Knowledge Asset</h2>

          <div className="space-y-3">
            <input
              className="input"
              placeholder="Title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <select
              className="input"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <textarea
              className="input resize-none h-20"
              placeholder="Description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <textarea
              className="input resize-none h-28 font-mono text-xs"
              placeholder="Paste content preview (first 500 chars used for quality evaluation)"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>

          {evalError && <p className="text-danger text-xs">{evalError}</p>}

          {evaluation && (
            <div className="space-y-2 bg-bg rounded-lg p-3 border border-border">
              <ScoreMeter score={evaluation.score} />
              <p className="text-xs text-subtle">{evaluation.reasoning}</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Suggested price</span>
                <span className="font-mono text-text">{evaluation.suggested_price_eth} ETH</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Reward tokens</span>
                <span className="font-mono text-accent">+{evaluation.reward_tokens} SYNR</span>
              </div>
            </div>
          )}

          <button onClick={handleEvaluate} disabled={evalLoading} className="btn-primary w-full">
            {evalLoading ? <Loader text="AI evaluating…" /> : "Evaluate & Price"}
          </button>
        </div>

        {/* Listings */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold">Listed NFTs</h2>
          {listings.length === 0 ? (
            <EmptyState icon="◇" title="No listings yet" description="Upload a knowledge asset to create the first listing." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listings.map(l => (
                <div key={l.tokenId} className="card space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-sm">{l.title}</h3>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        {l.seller.slice(0, 6)}…{l.seller.slice(-4)}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-text">{l.price} ETH</span>
                  </div>
                  <p className="text-xs text-subtle line-clamp-2">{l.description}</p>
                  <ScoreMeter score={l.score} />
                  {l.seller.toLowerCase() !== address.toLowerCase() && (
                    <button onClick={() => handleBuy(l)} className="btn-primary w-full text-sm py-1.5">
                      Buy for {l.price} ETH
                    </button>
                  )}
                  {l.seller.toLowerCase() === address.toLowerCase() && (
                    <span className="text-xs text-muted">Your listing</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMint && evaluation && (
        <TxnModal
          title="Mint Knowledge NFT"
          description={`Mint "${form.title}" as an ERC-721 NFT and list it at ${evaluation.suggested_price_eth} ETH. Quality score: ${evaluation.score}/10.`}
          onConfirm={handleMint}
          onClose={() => setShowMint(false)}
          loading={mintLoading}
        />
      )}

      {buyModal && (
        <TxnModal
          title="Purchase Knowledge NFT"
          description={`Buy "${buyModal.title}" for ${buyModal.price} ETH. This will transfer the NFT to your wallet.`}
          onConfirm={confirmBuy}
          onClose={() => setBuyModal(null)}
          loading={buyLoading}
        />
      )}
    </div>
  );
}
