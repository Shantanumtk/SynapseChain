import { useState, useEffect, useRef } from "react";
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

const CATEGORIES = ["All", "AI/ML", "Finance", "Science", "Engineering", "Medicine", "Law", "Other"];
const MINT_CATEGORIES = CATEGORIES.filter(c => c !== "All");

export default function KnowledgeMarket() {
  const { address, provider, connect } = useWallet();
  const [signer, setSigner] = useState(null);
  const { nftListings: chainListings, loading: chainLoading, refetch } = useChainData(provider);
  const contracts = useContracts(signer);
  const fileRef = useRef(null);

  // Upload form
  const [form, setForm]       = useState({ title: "", description: "", category: "AI/ML", content: "", fileName: "" });
  const [evaluation, setEval] = useState(null);
  const [evalLoading, setEL]  = useState(false);
  const [evalError, setEE]    = useState("");

  // Search & filter
  const [search, setSearch]         = useState("");
  const [filterCategory, setFilter] = useState("All");

  // Mint modal
  const [showMint, setShowMint]   = useState(false);
  const [mintLoading, setML]      = useState(false);
  const [mintedId, setMintedId]   = useState(null);

  const [localListings, setLocalListings] = useState([]);
  const [buyModal, setBuyModal]   = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const listings = chainListings.map(cl => {
    const local = localListings.find(l => l.tokenId === cl.tokenId);
    return local ? { ...cl, title: local.title || cl.title, description: local.description || cl.description } : cl;
  });
  const [buyLoading, setBL]       = useState(false);
  const [txStatus, setTxStatus]   = useState("");

  // Filtered listings
  const filteredListings = listings.filter(l => {
    const matchSearch = !search ||
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || l.category === filterCategory;
    return matchSearch && matchCat;
  });

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

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setForm(f => ({
        ...f,
        fileName: file.name,
        content: text,
        // Auto-fill title from filename if empty
        title: f.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
    };
    reader.readAsText(file);
  }

  async function handleEvaluate() {
    if (!form.title || !form.description || !form.content) {
      setEE("Please fill in title, description, and upload a file.");
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
      // Step 1 — upload file to IPFS
      setTxStatus("⏳ Step 1/3 — Uploading file to IPFS...");
      let tokenURI    = `ipfs://synapsechain-${Date.now()}`;
      let contentHash = `0x${Date.now().toString(16).padEnd(64, "0")}`;

      if (form.fileName && fileRef.current?.files[0]) {
        const formData = new FormData();
        formData.append("file", fileRef.current.files[0]);
        try {
          const uploadRes = await fetch("/api/nft/upload", {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            tokenURI    = uploadData.token_uri;
            contentHash = uploadData.content_hash;
            setTxStatus(`⏳ Step 1/3 — Pinned to IPFS ✓ CID: ${uploadData.cid.slice(0, 20)}...`);
          } else {
            setTxStatus("⚠️ IPFS upload failed — using fallback hash");
          }
        } catch {
          setTxStatus("⚠️ IPFS node unreachable — using fallback hash");
        }
      }

      // Step 2 — backend mints NFT using deployer key
      setTxStatus("⏳ Step 2/3 — Minting NFT...");
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
      setTxStatus(`⏳ Step 2/3 — NFT minted! Token ID: ${tokenId}`);

      const titleMap = JSON.parse(localStorage.getItem("sc_nft_titles") || "{}");
      titleMap[tokenId] = { title: form.title, description: form.description, score: evaluation.score, category: form.category };
      localStorage.setItem("sc_nft_titles", JSON.stringify(titleMap));

      const s = await getSigner();
      const { Contract } = ethers;
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

      // Round to 6 decimal places to avoid floating point artifacts
      const cleanPrice = Math.round(evaluation.suggested_price_eth * 1e6) / 1e6;
      const priceWei = parseEther(cleanPrice.toString());

      // Small delay to ensure mint tx is indexed by Ganache
      await new Promise(r => setTimeout(r, 1000));

      const approveTx = await nftContract.setApprovalForAll(addresses.Marketplace, true);
      await approveTx.wait();
      setTxStatus("⏳ Step 3/3 — Listing NFT in MetaMask...");
      const listTx = await marketContract.list(tokenId, priceWei);
      await listTx.wait();

      setLocalListings(prev => [...prev, {
        tokenId,
        title:       form.title,
        description: form.description,
        category:    form.category,
        score:       evaluation.score,
        price:       evaluation.suggested_price_eth,
        seller:      address,
      }]);
      setTxStatus(`✅ NFT minted and listed at ${evaluation.suggested_price_eth} ETH`);
      setForm({ title: "", description: "", category: "AI/ML", content: "", fileName: "" });
      setEval(null);
      if (fileRef.current) fileRef.current.value = "";
      await refetch();
    } catch (e) {
      setTxStatus(`❌ ${e.message || JSON.stringify(e)}`);
    } finally {
      setML(false);
    }
  }

  async function confirmBuy() {
    setBL(true);
    try {
      const s = await getSigner();
      const c = useContracts(s);
      // Add small buffer for floating point price artifacts
      const buyPrice = parseEther(buyModal.price.toString());
      const tx = await c.marketplace.buy(buyModal.tokenId, {
        value: buyPrice + BigInt(1000),
      });
      await tx.wait();
      setLocalListings(prev => prev.filter(l => l.tokenId !== buyModal.tokenId));
      setTxStatus(`✅ Purchased NFT #${buyModal.tokenId}`);
      setBuyModal(null);
      await refetch();
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
              {MINT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <textarea
              className="input resize-none h-20"
              placeholder="Description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />

            {/* File upload */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Knowledge File (.txt, .md, .pdf text)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors text-center
                  ${form.fileName ? "border-accent/40 bg-accent/5" : "border-border hover:border-accent/40 hover:bg-surface"}`}
              >
                {form.fileName ? (
                  <div className="space-y-1">
                    <div className="text-xs text-accent font-medium truncate">{form.fileName}</div>
                    <div className="text-xs text-muted">{form.content.length.toLocaleString()} chars loaded</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-2xl opacity-20">↑</div>
                    <div className="text-xs text-subtle">Click to upload file</div>
                    <div className="text-xs text-muted">.txt · .md · .csv · .json</div>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,.py,.js,.ts,.sol"
                className="hidden"
                onChange={handleFileChange}
              />
              {form.fileName && (
                <button
                  onClick={() => { setForm(f => ({ ...f, fileName: "", content: "" })); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-muted hover:text-danger mt-1"
                >
                  ✕ Remove file
                </button>
              )}
            </div>
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
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input text-sm flex-1"
              placeholder="Search listings…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterCategory === c
                      ? "bg-accent text-white"
                      : "bg-surface border border-border text-subtle hover:text-text"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filteredListings.length === 0 ? (
            listings.length === 0
              ? <EmptyState icon="◇" title="No listings yet" description="Upload a knowledge asset to create the first listing." />
              : <EmptyState icon="◇" title="No results" description="Try a different search or category filter." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredListings.map(l => (
                <div key={l.tokenId} className="card space-y-3 cursor-pointer hover:border-accent/40 transition-colors" onClick={() => setDetailModal(l)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-sm">{l.title}</h3>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        {l.seller.slice(0, 6)}…{l.seller.slice(-4)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-text">{l.price} ETH</span>
                      {l.category && l.category !== "All" && (
                        <div className="text-xs text-muted mt-0.5">{l.category}</div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-subtle line-clamp-2">{l.description}</p>
                  <ScoreMeter score={l.score} />
                  {l.seller.toLowerCase() !== address.toLowerCase() ? (
                    <button onClick={e => { e.stopPropagation(); setBuyModal(l); }} className="btn-primary w-full text-sm py-1.5">
                      Buy for {l.price} ETH
                    </button>
                  ) : (
                    <span className="text-xs text-muted">Your listing</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {detailModal && (
        <div
          onClick={e => e.target === e.currentTarget && setDetailModal(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="card max-w-lg w-full space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{detailModal.title}</h3>
                <p className="text-xs text-muted font-mono mt-1">Token #{detailModal.tokenId}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="text-muted hover:text-text text-xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg rounded-lg p-3 border border-border">
                <p className="text-xs text-muted mb-1">Price</p>
                <p className="font-mono text-sm text-text">{detailModal.price} ETH</p>
              </div>
              <div className="bg-bg rounded-lg p-3 border border-border">
                <p className="text-xs text-muted mb-1">Category</p>
                <p className="text-sm text-text">{detailModal.category || "—"}</p>
              </div>
              <div className="bg-bg rounded-lg p-3 border border-border">
                <p className="text-xs text-muted mb-1">Seller</p>
                <p className="font-mono text-xs text-text">{detailModal.seller.slice(0,6)}…{detailModal.seller.slice(-4)}</p>
              </div>
            </div>
            <ScoreMeter score={detailModal.score} />
            <div>
              <p className="text-xs text-muted mb-1">Description</p>
              <p className="text-sm text-subtle">{detailModal.description}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Content Hash</p>
              <p className="font-mono text-xs text-subtle break-all">{detailModal.contentHash}</p>
            </div>
            {detailModal.seller.toLowerCase() !== address.toLowerCase() ? (
              <button
                onClick={() => { setDetailModal(null); setBuyModal(detailModal); }}
                className="btn-primary w-full"
              >
                Buy for {detailModal.price} ETH
              </button>
            ) : (
              <p className="text-xs text-muted text-center">This is your listing</p>
            )}
          </div>
        </div>
      )}

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