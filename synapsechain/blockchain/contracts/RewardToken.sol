// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RewardToken — ERC-20 distributed proportional to knowledge quality scores
contract RewardToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    event RewardMinted(address indexed to, uint256 amount, uint256 knowledgeTokenId);

    constructor() ERC20("SynapseReward", "SYNR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mintReward(address to, uint256 amount, uint256 knowledgeTokenId)
        external onlyRole(MINTER_ROLE)
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit RewardMinted(to, amount, knowledgeTokenId);
    }
}
