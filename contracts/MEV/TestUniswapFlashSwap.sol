// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/Uniswap.sol";

import "hardhat/console.sol";

interface IUniswapV2Callee {
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}

contract TestUniswapFlashSwap is IUniswapV2Callee {
    using SafeERC20 for IERC20;

    address weth;
    address factory;

    constructor(address _weth, address _factory) {
        weth = _weth;
        factory = _factory;
    }

    function testFlashSwap(address _tokenBorrow, uint _amount) external {
        address pair = IUniswapV2Factory(factory).getPair(_tokenBorrow, weth);
        require(pair != address(0), "Pair does not exist");

        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        uint amount0Out = _tokenBorrow == token0 ? _amount : 0;
        uint amount1Out = _tokenBorrow == token1 ? _amount : 0;

        // need to pass some data to trigger uniswapV2Call
        bytes memory data = abi.encode(_tokenBorrow, _amount);

        console.log("USDC balance of contract: ", IERC20(_tokenBorrow).balanceOf(address(this)));

        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), data);
    }

    // called by pair contract
    function uniswapV2Call(address _sender, uint _amount0, uint _amount1, bytes calldata _data) external override {
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        address pair = IUniswapV2Factory(factory).getPair(token0, token1);
        require(msg.sender == pair, "!pair");
        require(_sender == address(this), "!sender");

        (address tokenBorrowed, uint amount) = abi.decode(_data, (address, uint));

        // about 0.3%
        uint fee = ((amount * 3) / 997) + 1;
        uint amountToRepay = amount + fee;

        console.log("USDC balance of contract: ", IERC20(tokenBorrowed).balanceOf(address(this)));

        // do stuff here
        // console.log("amount", amount);
        // console.log("amount0", _amount0);
        // console.log("amount1", _amount1);
        console.log("fee", fee);
        console.log("amount to repay", amountToRepay);

        IERC20(tokenBorrowed).safeTransfer(pair, amountToRepay);

        console.log("USDC balance of contract: ", IERC20(tokenBorrowed).balanceOf(address(this)));
    }
}
