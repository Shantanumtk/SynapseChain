import { useState, useEffect, useRef } from "react";
import StatusBadge from "./StatusBadge";

export default function NegotiationModal({ onClose, onExecute, buyerForm, listing, apiCall }) {
  const [messages, setMessages]     = useState([]);
  const [status, setStatus]         = useState("negotiating");
  const [result, setResult]         = useState(null);
  const [streaming, setStreaming]   = useState(true);
  const [currentMsg, setCurrentMsg] = useState("Agent analyzing terms...");
  const bottomRef                   = useRef(null);

  useEffect(() => { startNegotiation(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, currentMsg]);

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function addMsg(role, content) {
    setMessages(prev => [...prev, { role, content }]);
  }

  async function startNegotiation() {
    setStreaming(true);
    addMsg("system", "Negotiation started for Listing #" + listing.id + "\n" + listing.description);
    await sleep(500);
    addMsg("system", "Buyer: " + buyerForm.useCase + " · " + buyerForm.budget + " ETH · " + buyerForm.durationDays + " days");
    await sleep(800);
    setCurrentMsg("Agent negotiating with GPT-4o-mini...");

    try {
      // Check if already licensed this listing
      const existingLicenses = JSON.parse(localStorage.getItem("sc_executed_deals") || "[]");
      const alreadyBought = existingLicenses.find(
        d => d.listingId === listing.id && d.buyer === buyerForm.buyerAddress
      );
      if (alreadyBought) {
        addMsg("system", "⚠️ You already have an active license for this listing.");
        setStatus("failed");
        setResult({ error: "License already exists for this listing" });
        setStreaming(false);
        return;
      }

      const res = await apiCall({
        seller_description:            listing.description,
        seller_min_compensation_eth:   Number(listing.minCompensation),
        seller_preferred_duration_days: Number(listing.durationDays || 180),
        seller_allowed_use_cases:      listing.allowedUseCases || ["Model Training"],
        buyer_use_case:                buyerForm.useCase,
        buyer_budget_eth:              Number(buyerForm.budget),
        buyer_requested_duration_days: Number(buyerForm.durationDays),
      });

      setCurrentMsg("");
      if (res.messages && res.messages.length > 0) {
        for (const msg of res.messages) {
          await sleep(300);
          addMsg(msg.role === "assistant" ? "agent" : "system", msg.content);
        }
      }
      await sleep(400);
      setResult(res);
      setStatus(res.status);
      if (res.status === "agreed") {
        const existingDeals = JSON.parse(localStorage.getItem("sc_executed_deals") || "[]");
        existingDeals.push({ listingId: listing.id, buyer: buyerForm.buyerAddress, ts: Date.now() });
        localStorage.setItem("sc_executed_deals", JSON.stringify(existingDeals));
      }
    } catch (e) {
      setCurrentMsg("");
      addMsg("system", "Error: " + e.message);
      setStatus("failed");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}
    >
      <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:"16px", width:"100%", maxWidth:"540px", display:"flex", flexDirection:"column", maxHeight:"85vh" }}>

        {/* Header */}
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #27272a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"14px", fontWeight:500, color:"#e4e4e7" }}>License Negotiation</div>
            <div style={{ fontSize:"11px", color:"#71717a", marginTop:"2px" }}>Listing #{listing.id} · {listing.description?.slice(0,45)}...</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            {streaming && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#6366f1", animation:"pulse 1s infinite" }} />}
            <StatusBadge status={status} />
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#71717a", cursor:"pointer", fontSize:"20px", lineHeight:1, padding:"0 4px" }}>×</button>
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:"10px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display:"flex", justifyContent: m.role === "agent" ? "flex-start" : "flex-end" }}>
              <div style={{
                maxWidth:"88%", padding:"10px 13px", fontSize:"12px", lineHeight:"1.55",
                borderRadius: m.role === "agent" ? "4px 12px 12px 12px" : "12px 12px 4px 12px",
                background: m.role === "agent" ? "#0e0e10" : "rgba(99,102,241,0.1)",
                border: m.role === "agent" ? "1px solid #27272a" : "1px solid rgba(99,102,241,0.25)",
                color: m.role === "agent" ? "#a1a1aa" : "#e4e4e7",
                whiteSpace: "pre-wrap",
              }}>
                <div style={{ fontSize:"10px", color:"#52525b", marginBottom:"4px", fontWeight:500 }}>
                  {m.role === "agent" ? "🤖 Negotiation Agent" : "⚙️ System"}
                </div>
                {m.content}
              </div>
            </div>
          ))}

          {currentMsg && (
            <div style={{ display:"flex", justifyContent:"flex-start" }}>
              <div style={{ padding:"10px 13px", borderRadius:"4px 12px 12px 12px", background:"#0e0e10", border:"1px solid #27272a", display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ width:"13px", height:"13px", border:"2px solid #6366f1", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                <span style={{ fontSize:"12px", color:"#71717a" }}>{currentMsg}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Agreed */}
        {status === "agreed" && result && (
          <div style={{ padding:"14px 18px", borderTop:"1px solid #27272a", background:"rgba(34,197,94,0.04)" }}>
            <div style={{ fontSize:"12px", color:"#22c55e", fontWeight:500, marginBottom:"10px" }}>
              ✅ Agreement reached in {result.negotiation_rounds} round{result.negotiation_rounds !== 1 ? "s" : ""}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"12px" }}>
              {[
                { label:"Compensation", value: result.agreed_compensation_eth + " ETH" },
                { label:"Duration",     value: result.agreed_duration_days + " days" },
                { label:"Use Case",     value: result.agreed_use_case },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize:"10px", color:"#71717a", marginBottom:"2px" }}>{label}</div>
                  <div style={{ fontSize:"12px", color:"#e4e4e7", fontFamily:"monospace" }}>{value}</div>
                </div>
              ))}
            </div>
            {result.agreed_restrictions?.length > 0 && (
              <div style={{ fontSize:"11px", color:"#71717a", marginBottom:"12px" }}>
                {result.agreed_restrictions.join(" · ")}
              </div>
            )}
            <div style={{ display:"flex", gap:"8px" }}>
              <button
                onClick={() => onExecute(result)}
                style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", borderRadius:"8px", padding:"10px", fontSize:"13px", fontWeight:500, cursor:"pointer" }}
              >
                Execute Deal via MetaMask
              </button>
              <button
                onClick={onClose}
                style={{ background:"transparent", color:"#71717a", border:"1px solid #27272a", borderRadius:"8px", padding:"10px 16px", fontSize:"13px", cursor:"pointer" }}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Failed */}
        {status === "failed" && (
          <div style={{ padding:"14px 18px", borderTop:"1px solid #27272a" }}>
            <div style={{ fontSize:"12px", color:"#ef4444", marginBottom:"10px" }}>❌ {result?.error || "Negotiation failed"}</div>
            <button
              onClick={onClose}
              style={{ width:"100%", background:"transparent", color:"#a1a1aa", border:"1px solid #27272a", borderRadius:"8px", padding:"10px", fontSize:"13px", cursor:"pointer" }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
