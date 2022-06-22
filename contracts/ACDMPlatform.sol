//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./ReferralProgram.sol";
import "./DAO.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ACDMPlatform is ReentrancyGuard, ReferralProgram, DAO {
    struct Listing {
        uint128 amount;
        uint128 price;
    }

    error NotEnoughEtherProvided();
    error RequestedAmountExceedsListedAmount();
    error ItIsNotSaleRound();
    error ItIsNotTradeRound();
    error TooEarly();

    uint256 private _tradingVolume;
    uint128 private _roundPrice = 10000 gwei;
    uint128 private _roundAmount = 100000;
    uint64 private _roundStartDate;
    uint24 private _roundDuration = 3 days; // 194 days max
    bool private _tradeRound;
    address private _acdmToken;
    mapping(address => mapping(uint256 => Listing)) private _listings;
    mapping(address => uint256) private _counter;

    constructor(
        address acdmToken,
        address chairperson,
        address voteToken,
        address rewardToken
    ) DAO(chairperson, voteToken, rewardToken) {
        _acdmToken = acdmToken;
        _roundStartDate = uint64(block.timestamp);
    }

    function setRoundDuration(uint24 durationInSeconds)
        external
        onlyRole(CONFIGURATOR_ROLE)
    {
        _roundDuration = durationInSeconds;
    }

    function finishRound() external nonReentrant {
        if (!_roundFinished()) revert TooEarly();

        if (_tradeRound) {
            _roundAmount = uint128(_tradingVolume / _roundPrice);

            IERC20MintableBurnable(_acdmToken).mint(
                address(this),
                _roundAmount
            );
        } else {
            IERC20MintableBurnable(_acdmToken).burn(
                address(this),
                _roundAmount
            );

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

    function buy(
        address seller,
        uint64 id,
        uint128 amount
    ) external payable {
        Listing storage item = _listings[seller][id];
        if (item.amount < amount) revert RequestedAmountExceedsListedAmount();
        _checkIfTradeRound();

        uint256 totalPrice = item.price * amount;
        if (msg.value < totalPrice) revert NotEnoughEtherProvided();

        item.amount -= amount;
        _transferToken(address(this), msg.sender, amount);

        _tradingVolume += totalPrice;
        payable(seller).transfer(totalPrice);

        _refundIfPossible(totalPrice);

        _applyReferralProgram(msg.sender, totalPrice, _tradeRound);
    }

    function list(uint128 amount, uint128 price) external {
        _checkIfTradeRound();

        _transferToken(msg.sender, address(this), amount);

        uint256 id = _counter[msg.sender]++;
        _listings[msg.sender][id] = Listing(amount, price);
    }

    function unlist(uint256 id) external {
        _checkIfTradeRound();

        Listing storage item = _listings[msg.sender][id];
        uint256 amount = item.amount;
        item.amount = 0;

        _transferToken(address(this), msg.sender, amount);
    }

    function _checkIfTradeRound() private {
        if (!_tradeRound || _roundFinished()) revert ItIsNotTradeRound();
    }

    function _roundFinished() private view returns (bool) {
        return block.timestamp > _roundStartDate + _roundDuration;
    }

    function _transferToken(
        address from,
        address to,
        uint256 amount
    ) private {
        IERC20(_acdmToken).transferFrom(from, to, amount);
    }

    function _refundIfPossible(uint256 totalPrice) private {
        if (msg.value > totalPrice)
            payable(msg.sender).transfer(msg.value - totalPrice);
    }
}
