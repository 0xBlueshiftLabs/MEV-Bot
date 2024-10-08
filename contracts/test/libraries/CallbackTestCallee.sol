// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { CallbackTest } from "./CallbackTest.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICreditBorrowCallback } from "../../core/interfaces/callback/ICreditBorrowCallback.sol";
import { ICreditLendCallback } from "../../core/interfaces/callback/ICreditLendCallback.sol";
import { ICreditMintCallback } from "../../core/interfaces/callback/ICreditMintCallback.sol";
import { ICreditPayCallback } from "../../core/interfaces/callback/ICreditPayCallback.sol";

contract CallbackTestCallee {
    CallbackTest public immutable callbackTestContract;

    constructor(address callbackTest) {
        callbackTestContract = CallbackTest(callbackTest);
    }

    function mint(
        IERC20 asset,
        IERC20 collateral,
        uint256 assetIn,
        uint112 collateralIn,
        bytes calldata data
    ) external returns (bool) {
        callbackTestContract.mint(asset, collateral, assetIn, collateralIn, data);
        return true;
    }

    function lend(IERC20 asset, uint256 assetIn, bytes calldata data) external returns (bool) {
        callbackTestContract.lend(asset, assetIn, data);
        return true;
    }

    function borrow(IERC20 collateral, uint112 collateralIn, bytes calldata data) external returns (bool) {
        callbackTestContract.borrow(collateral, collateralIn, data);
        return true;
    }

    function pay(IERC20 asset, uint128 assetIn, bytes calldata data) external returns (bool) {
        callbackTestContract.pay(asset, assetIn, data);
        return true;
    }

    function creditMintCallback(uint256 assetIn, uint112 collateralIn, bytes calldata data) external {}

    function creditLendCallback(uint256 assetIn, bytes calldata data) external {}

    function creditBorrowCallback(uint112 collateralIn, bytes calldata data) external {}

    function creditPayCallback(uint128 assetIn, bytes calldata data) external {}
}
