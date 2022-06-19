//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

contract ReferralProgram {

    struct User {
        uint64 regDate;
        address referral; 
    }

    error RegisteredAlready();
    error ReferralIsNotRegistered();

    uint private constant _100_PERCENT = 10000; // 100%

    uint16 private _ref1PercentOnSale = 500; // 5%
    uint16 private _ref2PercentOnSale = 300; // 3%
    uint16 private _ref1PercentOnTrade = 250; // 2.5%
    uint16 private _ref2PercentOnTrade = 250; // 2.5% 
    mapping(address => User) private _accounts;

    function register(address referral) external {
        if (_accounts[msg.sender].regDate > 0) revert RegisteredAlready();
        if (referral != address(0) && _accounts[referral].regDate == 0)
            revert ReferralIsNotRegistered();

        _accounts[msg.sender] = User(uint64(block.timestamp), referral);
    }

    function _applyReferralProgram(
        address buyer, 
        uint totalSpentEther, 
        bool tradeRound
    ) internal {
        address ref1 = _accounts[buyer].referral;
        if (ref1 == address(0)) return;

        uint percent1 = tradeRound ? _ref1PercentOnTrade : _ref1PercentOnSale;
        uint reward1 = totalSpentEther * percent1 / _100_PERCENT;

        payable(ref1).transfer(reward1);

        address ref2 = _accounts[ref1].referral;
        if (ref2 == address(0)) return;

        uint percent2 = tradeRound ? _ref2PercentOnTrade : _ref2PercentOnSale;
        uint reward2 = totalSpentEther * percent2 / _100_PERCENT;

        payable(ref2).transfer(reward2);
    } 
}