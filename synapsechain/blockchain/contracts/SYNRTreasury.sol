// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RewardToken.sol";

/// @title SYNRTreasury — burn SYNR tokens to receive ETH at a fixed rate
contract SYNRTreasury {
    RewardToken public immutable synrToken;

    /// 1 SYNR (1e18 units) = 0.001 ETH
    uint256 public constant SYNR_RATE = 1e15;

    event Converted(address indexed user, uint256 synrBurned, uint256 ethPaid);
    event Funded(address indexed from, uint256 amount);

    constructor(address _synrToken) {
        synrToken = RewardToken(_synrToken);
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    function fund() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /// @notice Preview how much ETH you receive for a given SYNR amount
    function ethForSynr(uint256 synrAmount) public pure returns (uint256) {
        return (synrAmount * SYNR_RATE) / 1e18;
    }

    /// @notice Burn synrAmount SYNR (requires prior approve) and receive ETH
    function convert(uint256 synrAmount) external {
        require(synrAmount > 0, "Amount must be > 0");
        uint256 ethAmount = ethForSynr(synrAmount);
        require(ethAmount > 0, "ETH payout too small");
        require(address(this).balance >= ethAmount, "Insufficient treasury balance");
        synrToken.burnFrom(msg.sender, synrAmount);
        payable(msg.sender).transfer(ethAmount);
        emit Converted(msg.sender, synrAmount, ethAmount);
    }

    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
