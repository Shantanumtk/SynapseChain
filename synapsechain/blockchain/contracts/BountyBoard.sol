// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BountyBoard — Post bounties for knowledge; auto-release on fulfillment
contract BountyBoard is ReentrancyGuard {
    enum BountyStatus { Open, Fulfilled, Cancelled }

    struct Bounty {
        address poster;
        string description;
        uint256 reward;
        BountyStatus status;
        address fulfiller;
        uint256 postedAt;
    }

    uint256 private _bountyIds;
    mapping(uint256 => Bounty) public bounties;

    event BountyPosted(uint256 indexed id, address indexed poster, uint256 reward);
    event BountyFulfilled(uint256 indexed id, address indexed fulfiller, uint256 reward);
    event BountyCancelled(uint256 indexed id);

    function postBounty(string calldata description) external payable returns (uint256) {
        require(msg.value > 0, "Reward required");
        _bountyIds++;
        bounties[_bountyIds] = Bounty(
            msg.sender, description, msg.value,
            BountyStatus.Open, address(0), block.timestamp
        );
        emit BountyPosted(_bountyIds, msg.sender, msg.value);
        return _bountyIds;
    }

    function fulfillBounty(uint256 bountyId, address fulfiller) external nonReentrant {
        Bounty storage b = bounties[bountyId];
        require(b.status == BountyStatus.Open, "Not open");
        b.status = BountyStatus.Fulfilled;
        b.fulfiller = fulfiller;
        payable(fulfiller).transfer(b.reward);
        emit BountyFulfilled(bountyId, fulfiller, b.reward);
    }

    function cancelBounty(uint256 bountyId) external nonReentrant {
        Bounty storage b = bounties[bountyId];
        require(b.poster == msg.sender, "Not poster");
        require(b.status == BountyStatus.Open, "Not open");
        b.status = BountyStatus.Cancelled;
        payable(msg.sender).transfer(b.reward);
        emit BountyCancelled(bountyId);
    }

    function totalBounties() external view returns (uint256) { return _bountyIds; }
}
