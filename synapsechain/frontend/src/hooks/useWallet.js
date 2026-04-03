import { useState, useCallback, useEffect } from "react";
import { BrowserProvider, formatEther } from "ethers";

export function useWallet() {
  const [address, setAddress]   = useState(null);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance]   = useState(null);
  const [chainId, setChainId]   = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]       = useState(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not found. Please install it.");
      return;
    }
    try {
      setConnecting(true);
      setError(null);
      const _provider = new BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const signer  = await _provider.getSigner();
      const addr    = await signer.getAddress();
      const bal     = await _provider.getBalance(addr);
      const network = await _provider.getNetwork();
      setAddress(addr);
      setProvider(_provider);
      setBalance(formatEther(bal));
      setChainId(Number(network.chainId));
    } catch (e) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setBalance(null);
    setChainId(null);
  }, []);

  // Auto-reconnect if already authorized
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts.length > 0) connect();
      });
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) disconnect();
        else connect();
      });
      window.ethereum.on("chainChanged", () => connect());
    }
  }, []);

  return { address, provider, balance, chainId, connecting, error, connect, disconnect };
}
