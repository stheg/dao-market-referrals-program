//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./StakingPlatform.sol";
import "./Whitelist.sol";

contract WStakingPlatform is Whitelist, StakingPlatform {
    error ExternalCallRestricted(string message);

    mapping(address => bool) private _internalCall;

    constructor(address stakingToken, address rewardToken)
        StakingPlatform(stakingToken, rewardToken)
    {}

    modifier onlyInternalCall(string memory message) {
        if (!_internalCall[msg.sender]) {
            revert ExternalCallRestricted(message);
        }
        _;
    }

    /// @notice Stake based on whitelist 
    function wstake(uint128 amount, bytes32[] memory proof)
        public
        virtual
        senderFromWhitelist(proof)
    {
        _internalCall[msg.sender] = true;
        stake(amount);
        _internalCall[msg.sender] = false;
    }

    /// @notice `wstake` function should be used for external calls
    function stake(uint128 amount)
        public
        virtual
        override
        onlyInternalCall("Use stake with proof")
    {
        super.stake(amount);
    }
}
