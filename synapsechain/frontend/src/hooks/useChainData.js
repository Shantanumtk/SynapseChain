import { useState, useEffect } from "react";
import { Contract, formatEther } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/contractAddresses.js";

const MARKETPLACE_ABI = [
  "event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event Sold(uint256 indexed tokenId, address indexed buyer, uint256 price)",
  "event Delisted(uint256 indexed tokenId)",
  "function listings(uint256) view returns (address seller, uint256 price, bool active)",
];

const NFT_ABI = [
  "function assets(uint256) view returns (address creator, uint8 qualityScore, string contentHash, uint256 mintedAt)",
];

const LICENSE_MARKETPLACE_ABI = [
  "event DataListed(uint256 indexed listingId, address indexed owner)",
  "function dataListings(uint256) view returns (address owner, string description, uint256 minCompensation, bool active)",
];

const DATA_LICENSE_ABI = [
  "event LicenseCreated(uint256 indexed tokenId, address indexed owner, address indexed buyer)",
  "function licenses(uint256) view returns (address dataOwner, address aiBuyer, string useCase, uint256 duration, uint256 compensation, uint256 createdAt, uint8 status)",
];

const BOUNTY_ABI = [
  "function bounties(uint256) view returns (address poster, string description, uint256 reward, uint8 status, address fulfiller, uint256 postedAt)",
  "function totalBounties() view returns (uint256)",
];

export function useChainData(provider) {
  const [nftListings, setNftListings]   = useState([]);
  const [dataListings, setDataListings] = useState([]);
  const [bounties, setBounties]         = useState([]);
  const [myLicenses, setMyLicenses]     = useState([]);
  const [ownedNFTs, setOwnedNFTs]       = useState({});
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  async function fetchAll() {
    if (!provider || !CONTRACT_ADDRESSES.Marketplace) return;
    setLoading(true);
    setError(null);
    try {
      const marketplace = new Contract(CONTRACT_ADDRESSES.Marketplace, MARKETPLACE_ABI, provider);
      const nftContract = new Contract(CONTRACT_ADDRESSES.KnowledgeNFT, NFT_ABI, provider);

      const listedEvents   = await marketplace.queryFilter(marketplace.filters.Listed());
      const soldEvents     = await marketplace.queryFilter(marketplace.filters.Sold());
      const delistedEvents = await marketplace.queryFilter(marketplace.filters.Delisted());

      const soldIds     = new Set(soldEvents.map(e => e.args.tokenId.toString()));
      const delistedIds = new Set(delistedEvents.map(e => e.args.tokenId.toString()));

      const activeNFTs = await Promise.all(
        listedEvents
          .filter(e => !soldIds.has(e.args.tokenId.toString()) && !delistedIds.has(e.args.tokenId.toString()))
          .map(async (e) => {
            const tokenId = e.args.tokenId.toString();
            try {
              const listing = await marketplace.listings(tokenId);
              if (!listing.active) return null;
              const asset = await nftContract.assets(tokenId);
              const titleMap = JSON.parse(localStorage.getItem("sc_nft_titles") || "{}");
              const meta = titleMap[tokenId] || {};
              return {
                tokenId:     Number(tokenId),
                seller:      listing.seller,
                price:       Number(formatEther(listing.price)).toFixed(4),
                score:       Number(asset.qualityScore),
                contentHash: asset.contentHash,
                title:       meta.title || "Knowledge Asset #" + tokenId,
                description: meta.description || "On-chain asset " + asset.contentHash.slice(0, 10) + "...",
              };
            } catch { return null; }
          })
      );
      setNftListings(activeNFTs.filter(Boolean));

      const licenseMarket  = new Contract(CONTRACT_ADDRESSES.LicenseMarketplace, LICENSE_MARKETPLACE_ABI, provider);
      const dataListedEvts = await licenseMarket.queryFilter(licenseMarket.filters.DataListed());

      const fetchedData = await Promise.all(
        dataListedEvts.map(async (e) => {
          const id = e.args.listingId.toString();
          try {
            const dl = await licenseMarket.dataListings(id);
            if (!dl.active) return null;
            return {
              id:              Number(id),
              owner:           dl.owner,
              description:     dl.description,
              minCompensation: formatEther(dl.minCompensation),
              active:          dl.active,
              allowedUseCases: ["Model Training"],
              durationDays:    "180",
            };
          } catch { return null; }
        })
      );
      setDataListings(fetchedData.filter(Boolean));

      const bountyBoard = new Contract(CONTRACT_ADDRESSES.BountyBoard, BOUNTY_ABI, provider);
      const total = await bountyBoard.totalBounties();

      const fetchedBounties = await Promise.all(
        Array.from({ length: Number(total) }, (_, i) => i + 1).map(async (id) => {
          try {
            const b = await bountyBoard.bounties(id);
            return {
              id,
              poster:      b.poster,
              description: b.description,
              reward:      formatEther(b.reward),
              status:      ["open", "fulfilled", "cancelled"][Number(b.status)] || "open",
              fulfiller:   b.fulfiller,
              postedAt:    new Date(Number(b.postedAt) * 1000).toISOString(),
            };
          } catch { return null; }
        })
      );
      setBounties(fetchedBounties.filter(Boolean));

      const dataLicense = new Contract(CONTRACT_ADDRESSES.DataLicense, DATA_LICENSE_ABI, provider);
      const licenseEvts = await dataLicense.queryFilter(dataLicense.filters.LicenseCreated());

      const fetchedLicenses = await Promise.all(
        licenseEvts.map(async (e) => {
          const tokenId = e.args.tokenId.toString();
          try {
            const l = await dataLicense.licenses(tokenId);
            return {
              tokenId:      Number(tokenId),
              dataOwner:    l.dataOwner,
              aiBuyer:      l.aiBuyer,
              useCase:      l.useCase,
              durationDays: Math.floor(Number(l.duration) / 86400),
              compensation: formatEther(l.compensation),
              createdAt:    new Date(Number(l.createdAt) * 1000).toISOString().split("T")[0],
              status:       ["active", "revoked", "expired"][Number(l.status)] || "active",
            };
          } catch { return null; }
        })
      );
      setMyLicenses(fetchedLicenses.filter(Boolean));

      // ── Owned NFTs via Transfer events ──────────────────────────────────
      const transferContract = new Contract(
        CONTRACT_ADDRESSES.KnowledgeNFT,
        ["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"],
        provider
      );
      const transfers = await transferContract.queryFilter(transferContract.filters.Transfer());
      const ownerMap = {};
      for (const t of transfers) {
        ownerMap[t.args.tokenId.toString()] = t.args.to;
      }
      setOwnedNFTs(ownerMap);

    } catch (e) {
      setError(e.message);
      console.error("useChainData error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (provider) fetchAll();
  }, [provider]);

  return { nftListings, dataListings, bounties, myLicenses, ownedNFTs, loading, error, refetch: fetchAll };
}
