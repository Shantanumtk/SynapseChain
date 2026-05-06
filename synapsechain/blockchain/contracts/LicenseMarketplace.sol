// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DataLicense.sol";
import "./RewardToken.sol";

/// @title LicenseMarketplace — Human-to-AI data licensing with on-chain consent
contract LicenseMarketplace is ReentrancyGuard {
    DataLicense  public immutable dataLicense;
    RewardToken  public immutable rewardToken;
    uint256 public constant REWARD_PER_LICENSE = 500 * 10 ** 18;

    struct DataListing {
        address owner;
        string description;
        uint256 minCompensation;
        bool active;
    }

    uint256 private _listingIds;
    mapping(uint256 => DataListing) public dataListings;

    event DataListed(uint256 indexed listingId, address indexed owner);
    event LicenseDeal(uint256 indexed licenseTokenId, uint256 indexed listingId, address buyer);

    constructor(address _license, address _reward) {
        dataLicense = DataLicense(_license);
        rewardToken  = RewardToken(_reward);
    }

    function listData(string calldata description, uint256 minCompensation) external returns (uint256) {
        _listingIds++;
        dataListings[_listingIds] = DataListing(msg.sender, description, minCompensation, true);
        emit DataListed(_listingIds, msg.sender);
        return _listingIds;
    }

    function executeDeal(
        uint256 listingId,
        string calldata useCase,
        uint256 duration
    ) external payable nonReentrant returns (uint256) {
        DataListing storage dl = dataListings[listingId];
        require(dl.active, "Not active");
        require(msg.value >= dl.minCompensation, "Underpaid");
        uint256 licenseId = dataLicense.createLicense(
            dl.owner, msg.sender, useCase, duration, msg.value
        );
        payable(dl.owner).transfer(msg.value);
        rewardToken.mintReward(dl.owner, REWARD_PER_LICENSE, licenseId);
        emit LicenseDeal(licenseId, listingId, msg.sender);
        return licenseId;
    }
}
