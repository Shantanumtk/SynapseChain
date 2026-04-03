// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DataLicense — ERC-721 token representing an AI data licensing agreement
contract DataLicense is ERC721, Ownable {
    uint256 private _tokenIds;

    enum LicenseStatus { Active, Revoked, Expired }

    struct License {
        address dataOwner;
        address aiBuyer;
        string useCase;
        uint256 duration;
        uint256 compensation;
        uint256 createdAt;
        LicenseStatus status;
    }

    mapping(uint256 => License) public licenses;

    event LicenseCreated(uint256 indexed tokenId, address indexed owner, address indexed buyer);
    event LicenseRevoked(uint256 indexed tokenId, address indexed revokedBy, uint256 timestamp);

    constructor() ERC721("SynapseDataLicense", "SYNDL") Ownable(msg.sender) {}

    function createLicense(
        address dataOwner,
        address aiBuyer,
        string calldata useCase,
        uint256 duration,
        uint256 compensation
    ) external onlyOwner returns (uint256) {
        _tokenIds++;
        uint256 newId = _tokenIds;
        _safeMint(aiBuyer, newId);
        licenses[newId] = License(dataOwner, aiBuyer, useCase, duration, compensation, block.timestamp, LicenseStatus.Active);
        emit LicenseCreated(newId, dataOwner, aiBuyer);
        return newId;
    }

    function revokeLicense(uint256 tokenId) external {
        require(licenses[tokenId].dataOwner == msg.sender, "Not data owner");
        require(licenses[tokenId].status == LicenseStatus.Active, "Not active");
        licenses[tokenId].status = LicenseStatus.Revoked;
        emit LicenseRevoked(tokenId, msg.sender, block.timestamp);
    }

    function isActive(uint256 tokenId) external view returns (bool) {
        License memory l = licenses[tokenId];
        return l.status == LicenseStatus.Active &&
               block.timestamp <= l.createdAt + l.duration;
    }
}
