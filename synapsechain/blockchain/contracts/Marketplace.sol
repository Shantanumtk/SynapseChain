// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./KnowledgeNFT.sol";
import "./RewardToken.sol";

/// @title Marketplace — List and buy KnowledgeNFTs with ETH
contract Marketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    KnowledgeNFT public immutable knowledgeNFT;
    RewardToken  public immutable rewardToken;
    uint256 public constant REWARD_PER_SALE = 100 * 10 ** 18;
    uint256 public constant FEE_BPS = 250;
    address public immutable feeRecipient;

    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event Delisted(uint256 indexed tokenId);

    constructor(address _nft, address _reward, address _feeRecipient) {
        knowledgeNFT = KnowledgeNFT(_nft);
        rewardToken  = RewardToken(_reward);
        feeRecipient = _feeRecipient;
    }

    function list(uint256 tokenId, uint256 price) external {
        require(knowledgeNFT.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            knowledgeNFT.isApprovedForAll(msg.sender, address(this)) ||
            knowledgeNFT.getApproved(tokenId) == address(this), "Not approved"
        );
        listings[tokenId] = Listing(msg.sender, price, true);
        emit Listed(tokenId, msg.sender, price);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing storage l = listings[tokenId];
        require(l.active, "Not listed");
        require(msg.value >= l.price, "Insufficient ETH");
        l.active = false;
        uint256 fee = (l.price * FEE_BPS) / 10000;
        uint256 sellerAmount = l.price - fee;
        knowledgeNFT.transferFrom(l.seller, msg.sender, tokenId);
        payable(l.seller).transfer(sellerAmount);
        payable(feeRecipient).transfer(fee);
        if (msg.value > l.price) payable(msg.sender).transfer(msg.value - l.price);
        emit Sold(tokenId, msg.sender, l.price);
    }

    function delist(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not seller");
        listings[tokenId].active = false;
        emit Delisted(tokenId);
    }
}
