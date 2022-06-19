//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ReferralProgram.sol";

interface IERC20MintableBurnable is IERC20 {
    function mint(address to, uint amount) external;
    function burn(address from, uint amount) external;
}

contract ACDMPlatform is ReferralProgram {

    struct Listing {
        uint amount;
        uint price;
    }

    error NotEnoughEtherProvided();
    error RequestedAmountExceedsListedAmount();
    error ItIsNotSaleRound();
    error ItIsNotTradeRound();

    uint private _roundPrice = 10000 gwei;
    uint private _roundAmount = 100000;
    uint private _tradingVolume;
    uint64 private _roundStartDate;
    uint8 private _roundDuration;// in days
    bool private _tradeRound;
    bool private _changing;
    address private _token;
    mapping(address => mapping(uint => Listing)) private _listings;
    mapping(address => uint) private _counter;

    constructor(address token) {
        _token = token;
        _roundStartDate = uint64(block.timestamp);
    }

    function changeRound() external {
        require(!_changing);
        require(_roundFinished());

        _changing = true;
        
        if (_tradeRound) {
            _roundAmount = _tradingVolume / _roundPrice;

            IERC20MintableBurnable(_token).mint(address(this), _roundAmount);
        } else {
            IERC20MintableBurnable(_token).burn(address(this), _roundAmount);

            _roundPrice = _roundPrice * 103 / 100 + 4000 gwei;
            _tradingVolume = 0;
        }

        _tradeRound = !_tradeRound;
        _changing = false;
    }

    function buy(uint amount) external payable {
        if (_roundAmount < amount) revert RequestedAmountExceedsListedAmount();
        if (_tradeRound || _roundFinished()) revert ItIsNotSaleRound();
        
        uint totalPrice = amount * _roundPrice;
        if (msg.value < totalPrice) revert NotEnoughEtherProvided();
        
        _roundAmount -= amount;
        _transferToken(address(this), msg.sender, amount);
        
        _refundIfPossible(totalPrice);

        _applyReferralProgram(msg.sender, totalPrice, _tradeRound);
    }

    function buy(address seller, uint64 id, uint amount) external payable {
        Listing storage item = _listings[seller][id];
        if (item.amount < amount) revert RequestedAmountExceedsListedAmount();
        _checkIfTradeRound();

        uint totalPrice = item.price * amount;
        if (msg.value < totalPrice) revert NotEnoughEtherProvided();

        item.amount -= amount;
        _transferToken(address(this), msg.sender, amount);
        
        _tradingVolume += totalPrice;
        payable(seller).transfer(totalPrice);

        _refundIfPossible(totalPrice);

        _applyReferralProgram(msg.sender, totalPrice, _tradeRound);
    }

    function list(uint amount, uint price) external {
        _checkIfTradeRound();

        _transferToken(msg.sender, address(this), amount);

        uint id = _counter[msg.sender]++;
        _listings[msg.sender][id] = Listing(amount, price);
    }

    function unlist(uint id) external {
        _checkIfTradeRound();

        Listing storage item = _listings[msg.sender][id];
        uint amount = item.amount;
        item.amount = 0;

        _transferToken(address(this), msg.sender, amount);
    }

    function _checkIfTradeRound() private {
        if (!_tradeRound || _roundFinished()) revert ItIsNotTradeRound();
    }

    function _roundFinished() private view returns (bool) {
        return block.timestamp > _roundStartDate + _roundDuration * (1 days);
    }

    function _transferToken(address from, address to, uint amount) private {
        IERC20(_token).transferFrom(from, to, amount);
    }

    function _refundIfPossible(uint totalPrice) private {
        if (msg.value > totalPrice)
            payable(msg.sender).transfer(msg.value - totalPrice);
    }
}
