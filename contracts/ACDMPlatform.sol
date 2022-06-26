//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./ReferralProgram.sol";
import "./DAO.sol";
import "./interfaces/IERC20MintableBurnable.sol";

contract ACDMPlatform is DAO, ReferralProgram {
    struct Listing {
        uint128 amount;
        uint128 price;
    }

    error NotEnoughEtherProvided();
    error RequestedAmountExceedsListedAmount();
    error ItIsNotSaleRound();
    error ItIsNotTradeRound();
    error TooEarly();
    error NoSuchListing(address seller, uint256 listingId);

    uint256 private _tradingVolume;
    uint128 private _roundPrice = 10000 gwei;
    uint128 private _roundAmount = 100000;
    uint64 private _roundStartDate;
    uint24 private _roundDuration = 3 days; // 194 days max
    bool private _tradeRound;
    address private _acdmToken;
    mapping(address => mapping(uint256 => Listing)) private _listings;
    mapping(address => uint256) private _listingCounter;

    constructor(
        address acdmToken,
        address chairperson,
        address voteToken,
        address rewardToken
    ) DAO(chairperson, voteToken, rewardToken) {
        _acdmToken = acdmToken;
        _roundStartDate = uint64(block.timestamp);
    }

    modifier onlyTradeRound() {
        if (!_tradeRound || _roundFinished()) revert ItIsNotTradeRound();
        _;
    }

    modifier listingExists(address seller, uint256 listingId) {
        if (listingId >= _listingCounter[seller]) 
            revert NoSuchListing(seller, listingId);
        _;
    }

    function getACDMToken() external view returns (address) {
        return _acdmToken;
    }

    function getSaleRoundPrice() external view returns (uint256) {
        return _roundPrice;
    }

    function getSaleRoundAmount() external view returns (uint256) {
        return _roundAmount;
    }

    function getRoundDuration() external view returns (uint256) {
        return _roundDuration;
    }

    function getListingDetails(address seller, uint256 listingId)
        external
        view
        returns (Listing memory)
    {
        return _listings[seller][listingId];
    }

    function getListingCounter(address seller) external view returns (uint256) {
        return _listingCounter[seller];
    }

    function setRoundDuration(uint24 durationInSeconds)
        external
        onlyRole(CONFIGURATOR_ROLE)
    {
        _roundDuration = durationInSeconds;
    }

    function finishRound() external {
        if (!_roundFinished()) revert TooEarly();
        _roundStartDate = uint64(block.timestamp);

        if (_tradeRound) {
            _roundAmount = uint128(_tradingVolume / _roundPrice);

            IERC20MintableBurnable(_acdmToken).mint(
                address(this),
                _roundAmount
            );
        } else {
            IERC20MintableBurnable(_acdmToken).burn(_roundAmount);

            _roundPrice = (_roundPrice * 103) / 100 + 4000 gwei;
            _tradingVolume = 0;
        }

        _tradeRound = !_tradeRound;
    }

    function buy(uint128 amount) external payable {
        if (_roundAmount < amount) revert RequestedAmountExceedsListedAmount();
        if (_tradeRound || _roundFinished()) revert ItIsNotSaleRound();

        uint256 totalPrice = amount * _roundPrice;
        if (msg.value < totalPrice) revert NotEnoughEtherProvided();

        _roundAmount -= amount;
        _transferToken(address(this), msg.sender, amount);

        _refundIfPossible(totalPrice);

        _applyReferralProgram(msg.sender, totalPrice, _tradeRound);
    }

    function buyListed(
        address seller,
        uint128 listingId,
        uint128 amount
    ) external payable onlyTradeRound listingExists(seller, listingId) {
        Listing storage item = _listings[seller][listingId];
        if (item.amount < amount) revert RequestedAmountExceedsListedAmount();

        uint256 totalPrice = item.price * amount;
        if (msg.value < totalPrice) revert NotEnoughEtherProvided();

        item.amount -= amount;
        _transferToken(address(this), msg.sender, amount);

        _tradingVolume += totalPrice;
        uint256 totalReward = _applyReferralProgram(
            seller,
            totalPrice,
            _tradeRound
        );
        payable(seller).transfer(totalPrice - totalReward);

        _refundIfPossible(totalPrice);
    }

    function list(uint128 amount, uint128 price) external onlyTradeRound {
        _transferToken(msg.sender, address(this), amount);

        uint256 listingId = _listingCounter[msg.sender]++;
        _listings[msg.sender][listingId] = Listing(amount, price);
    }

    function unlist(uint256 listingId)
        external
        onlyTradeRound
        listingExists(msg.sender, listingId)
    {
        Listing storage item = _listings[msg.sender][listingId];
        uint256 amount = item.amount;
        item.amount = 0;

        _transferToken(address(this), msg.sender, amount);
    }

    function _roundFinished() private view returns (bool) {
        return block.timestamp > _roundStartDate + _roundDuration;
    }

    function _transferToken(
        address from,
        address to,
        uint256 amount
    ) private {
        if (from == address(this)) IERC20(_acdmToken).transfer(to, amount);
        else IERC20(_acdmToken).transferFrom(from, to, amount);
    }

    function _refundIfPossible(uint256 totalPrice) private {
        if (msg.value > totalPrice)
            payable(msg.sender).transfer(msg.value - totalPrice);
    }
}
