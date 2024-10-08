// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/Uniswap.sol";

import "hardhat/console.sol";

contract TestSwap {
    using SafeERC20 for IERC20;

    address weth;
    address uniswapV2Router;

    constructor(address _weth, address _uniswapV2Router) {
        weth = _weth;
        uniswapV2Router = _uniswapV2Router;
    }

    function swap(address _tokenIn, address _tokenOut, uint256 _amountIn, uint256 _amountOutMin, address _to) external {
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        IERC20(_tokenIn).safeApprove(uniswapV2Router, _amountIn);

        address[] memory path;

        if (_tokenIn == weth) {
            path = new address[](2);
            path[0] = weth;
            path[1] = _tokenOut;
        } else if (_tokenOut == weth) {
            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = weth;
        } else {
            path = new address[](3);
            path[0] = _tokenIn;
            path[1] = weth;
            path[2] = _tokenOut;
        }

        IUniswapV2Router(uniswapV2Router).swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            path,
            _to,
            block.timestamp
        );
    }
}
