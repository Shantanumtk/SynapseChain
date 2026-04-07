// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title KnowledgeNFT — ERC-721 for knowledge assets (papers, tutorials, datasets)
contract KnowledgeNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    struct KnowledgeAsset {
        address creator;
        uint8 qualityScore;
        string contentHash;
        uint256 mintedAt;
    }

    mapping(uint256 => KnowledgeAsset) public assets;

    event KnowledgeMinted(uint256 indexed tokenId, address indexed creator, string contentHash);
    event QualityScoreSet(uint256 indexed tokenId, uint8 score);

    constructor() ERC721("SynapseKnowledge", "SYNK") Ownable(msg.sender) {}

    function mint(address to, string calldata tokenURI_, string calldata contentHash)
        external onlyOwner returns (uint256)
    {
        _tokenIds++;
        uint256 newId = _tokenIds;
        _safeMint(to, newId);
        _setTokenURI(newId, tokenURI_);
        assets[newId] = KnowledgeAsset(to, 0, contentHash, block.timestamp);
        emit KnowledgeMinted(newId, to, contentHash);
        return newId;
    }

    function setQualityScore(uint256 tokenId, uint8 score) external onlyOwner {
        require(score >= 1 && score <= 10, "Score out of range");
        assets[tokenId].qualityScore = score;
        emit QualityScoreSet(tokenId, score);
    }

    function totalSupply() external view returns (uint256) { return _tokenIds; }
}
