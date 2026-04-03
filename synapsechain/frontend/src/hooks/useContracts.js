import { Contract, parseEther } from "ethers";
import { CONTRACT_ADDRESSES } from "../utils/contractAddresses";

// ABIs — only the functions the frontend needs
const KNOWLEDGE_NFT_ABI = [
  "function mint(address to, string tokenURI_, string contentHash) returns (uint256)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function assets(uint256) view returns (address creator, uint8 qualityScore, string contentHash, uint256 mintedAt)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
];

const MARKETPLACE_ABI = [
  "function list(uint256 tokenId, uint256 price)",
  "function buy(uint256 tokenId) payable",
  "function delist(uint256 tokenId)",
  "function listings(uint256) view returns (address seller, uint256 price, bool active)",
];

const LICENSE_MARKETPLACE_ABI = [
  "function listData(string description, uint256 minCompensation) returns (uint256)",
  "function executeDeal(uint256 listingId, string useCase, uint256 duration) payable returns (uint256)",
  "function dataListings(uint256) view returns (address owner, string description, uint256 minCompensation, bool active)",
];

const DATA_LICENSE_ABI = [
  "function revokeLicense(uint256 tokenId)",
  "function licenses(uint256) view returns (address dataOwner, address aiBuyer, string useCase, uint256 duration, uint256 compensation, uint256 createdAt, uint8 status)",
  "function isActive(uint256 tokenId) view returns (bool)",
];

const BOUNTY_BOARD_ABI = [
  "function postBounty(string description) payable returns (uint256)",
  "function fulfillBounty(uint256 bountyId, address fulfiller)",
  "function cancelBounty(uint256 bountyId)",
  "function bounties(uint256) view returns (address poster, string description, uint256 reward, uint8 status, address fulfiller, uint256 postedAt)",
  "function totalBounties() view returns (uint256)",
];

const REWARD_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
];

export function useContracts(signer) {
  if (!signer || !CONTRACT_ADDRESSES.KnowledgeNFT) return {};

  return {
    knowledgeNFT:       new Contract(CONTRACT_ADDRESSES.KnowledgeNFT,       KNOWLEDGE_NFT_ABI,       signer),
    marketplace:        new Contract(CONTRACT_ADDRESSES.Marketplace,        MARKETPLACE_ABI,        signer),
    licenseMarketplace: new Contract(CONTRACT_ADDRESSES.LicenseMarketplace, LICENSE_MARKETPLACE_ABI, signer),
    dataLicense:        new Contract(CONTRACT_ADDRESSES.DataLicense,        DATA_LICENSE_ABI,        signer),
    bountyBoard:        new Contract(CONTRACT_ADDRESSES.BountyBoard,        BOUNTY_BOARD_ABI,        signer),
    rewardToken:        new Contract(CONTRACT_ADDRESSES.RewardToken,        REWARD_TOKEN_ABI,        signer),
  };
}
