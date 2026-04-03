import { useState } from "react";
import { BrowserProvider, parseEther, formatEther } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { useContracts } from "../hooks/useContracts";
import { api } from "../hooks/useApi";
import { useChainData } from "../hooks/useChainData";
import StatusBadge from "../components/StatusBadge";
import TxnModal from "../components/TxnModal";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

export default function BountyBoard() {
  const { address, provider, connect } = useWallet();
  const [signer, setSigner]  = useState(null);
  const { bounties: chainBounties, loading: chainLoading, refetch } = useChainData(provider);

  const [localBounties, setLocalBounties] = useState([]);
  const [postModal, setPostModal]   = useState(false);
  const bounties = [
    ...chainBounties,
    ...localBounties.filter(l => !chainBounties.find(c => c.id === l.id))
  ];
  const [postForm, setPostForm]     = useState({ description: "", reward: "0.05" });
  const [postLoading, setPL]        = useState(false);

  const [matching, setMatching]     = useState(null);  // bountyId being matched
  const [matchResult, setMR]        = useState({});    // bountyId -> result
  const [matchLoading, setML]       = useState(null);

  const [fulfillModal, setFulfill]  = useState(null);
  const [fulfillLoading, setFL]     = useState(false);
  const [txStatus, setTx]           = useState("");

  // Mock knowledge assets available on platform (in prod, read from chain events)
  const [assets] = useState([
    { id: 1, title: "GPT Fine-tuning Guide", description: "Complete guide to fine-tuning language models with RLHF", quality_score: 8 },
    { id: 2, title: "DeFi Smart Contract Patterns", description: "Security patterns and best practices for DeFi contracts", quality_score: 9 },
    { id: 3, title: "Medical NLP Dataset", description: "Annotated clinical notes dataset for NLP tasks", quality_score: 7 },
  ]);

  async function getSigner() {
    if (signer) return signer;
    const p = new BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    setSigner(s);
    return s;
  }

  async function handlePost() {
    setPL(true);
    try {
      const s = await getSigner();
      const c = useContracts(s);
      const tx  = await c.bountyBoard.postBounty(postForm.description, {
        value: parseEther(postForm.reward),
      });
      const rec = await tx.wait();
      const id  = rec.logs[0]?.topics[1] ? parseInt(rec.logs[0].topics[1], 16) : bounties.length + 1;
      setLocalBounties(prev => [...prev, {
        id, description: postForm.description,
        reward: postForm.reward,
        status: "open", poster: address,
        postedAt: new Date().toISOString(),
      }]);
      setTx(`✅ Bounty #${id} posted with ${postForm.reward} ETH reward`);
      setPostModal(false);
      setPostForm({ description: "", reward: "0.05" });
    } catch (e) {
      setTx(`❌ ${e.message}`);
    } finally {
      setPL(false);
    }
  }

  async function handleMatch(bounty) {
    setML(bounty.id);
    try {
      const result = await api.matchBounty({
        bounty_id:         bounty.id,
        bounty_description: bounty.description,
        bounty_reward_eth: Number(bounty.reward),
        available_assets:  assets,
      });
      setMR(prev => ({ ...prev, [bounty.id]: result }));
    } catch (e) {
      setTx(`❌ Match failed: ${e.message}`);
    } finally {
      setML(null);
    }
  }

  async function confirmFulfill() {
    setFL(true);
    try {
      const s = await getSigner();
      const c = useContracts(s);
      const match  = matchResult[fulfillModal.id];
      const fulfiller = address; // in prod, this is the knowledge provider
      const tx = await c.bountyBoard.fulfillBounty(fulfillModal.id, fulfiller);
      await tx.wait();
      setLocalBounties(prev => prev.map(b =>
        b.id === fulfillModal.id ? { ...b, status: "fulfilled" } : b
      ));
      setTx(`✅ Bounty #${fulfillModal.id} fulfilled — ${fulfillModal.reward} ETH released`);
      setFulfill(null);
    } catch (e) {
      setTx(`❌ ${e.message}`);
    } finally {
      setFL(false);
    }
  }

  async function handleCancel(bounty) {
    try {
      const s = await getSigner();
      const c = useContracts(s);
      const tx = await c.bountyBoard.cancelBounty(bounty.id);
      await tx.wait();
      setLocalBounties(prev => prev.map(b =>
        b.id === bounty.id ? { ...b, status: "cancelled" } : b
      ));
      setTx(`✅ Bounty #${bounty.id} cancelled — ETH refunded`);
    } catch (e) {
      setTx(`❌ ${e.message}`);
    }
  }

  if (!address) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Bounty Board</h1>
        <p className="text-subtle">Connect your wallet to post and fulfill bounties.</p>
        <button onClick={connect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bounty Board</h1>
          <p className="text-subtle text-sm mt-1">Post bounties for knowledge. Agent auto-matches providers.</p>
        </div>
        <button onClick={() => setPostModal(true)} className="btn-primary">+ Post Bounty</button>
      </div>

      {txStatus && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${txStatus.startsWith("✅") ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}>
          {txStatus}
          <button onClick={() => setTx("")} className="ml-2 opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {bounties.length === 0 ? (
        <EmptyState icon="◎" title="No bounties yet" description="Post a bounty to request specific knowledge from the community." />
      ) : (
        <div className="space-y-4">
          {bounties.map(b => (
            <div key={b.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted font-mono">#{b.id}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-text">{b.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-lg font-semibold">{b.reward} ETH</div>
                  <div className="text-xs text-muted">reward</div>
                </div>
              </div>

              {/* Match result */}
              {matchResult[b.id] && (
                <div className="bg-bg rounded-lg p-3 border border-border space-y-2">
                  <p className="text-xs font-medium text-subtle">Agent Match Result</p>
                  {matchResult[b.id].matches.length > 0 ? (
                    <>
                      <p className="text-xs text-text">{matchResult[b.id].match_reasoning}</p>
                      <div className="space-y-1">
                        {matchResult[b.id].matches.slice(0, 3).map(m => {
                          const asset = assets.find(a => a.id === m.asset_id);
                          return (
                            <div key={m.asset_id} className="flex justify-between items-center text-xs">
                              <span className="text-subtle">{asset?.title || `Asset #${m.asset_id}`}</span>
                              <span className="font-mono text-accent">{(m.relevance_score * 100).toFixed(0)}% match</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted">No matching assets found.</p>
                  )}
                </div>
              )}

              {b.status === "open" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMatch(b)}
                    disabled={matchLoading === b.id}
                    className="btn-secondary text-xs py-1.5"
                  >
                    {matchLoading === b.id ? <Loader text="Matching…" /> : "Run Agent Match"}
                  </button>
                  {matchResult[b.id]?.best_match_id && (
                    <button onClick={() => setFulfill(b)} className="btn-primary text-xs py-1.5">
                      Fulfill Bounty
                    </button>
                  )}
                  {b.poster.toLowerCase() === address.toLowerCase() && (
                    <button onClick={() => handleCancel(b)} className="btn-danger text-xs py-1.5">
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post bounty modal */}
      {postModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full space-y-4">
            <h3 className="font-semibold">Post New Bounty</h3>
            <textarea
              className="input resize-none h-28"
              placeholder="Describe the knowledge you need (be specific — the agent will use this to match assets)"
              value={postForm.description}
              onChange={e => setPostForm(f => ({ ...f, description: e.target.value }))}
            />
            <div>
              <label className="text-xs text-muted mb-1 block">Reward (ETH) — escrowed on-chain</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={postForm.reward}
                onChange={e => setPostForm(f => ({ ...f, reward: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPostModal(false)} className="btn-secondary" disabled={postLoading}>Cancel</button>
              <button onClick={handlePost} className="btn-primary" disabled={postLoading}>
                {postLoading ? "Waiting…" : `Post for ${postForm.reward} ETH`}
              </button>
            </div>
          </div>
        </div>
      )}

      {fulfillModal && (
        <TxnModal
          title="Fulfill Bounty"
          description={`Release ${fulfillModal.reward} ETH to the best matching knowledge provider for bounty #${fulfillModal.id}.`}
          onConfirm={confirmFulfill}
          onClose={() => setFulfill(null)}
          loading={fulfillLoading}
        />
      )}
    </div>
  );
}
