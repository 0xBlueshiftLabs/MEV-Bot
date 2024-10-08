// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ICreditMintCallback } from "../interfaces/callback/ICreditMintCallback.sol";
import { ICreditLendCallback } from "../interfaces/callback/ICreditLendCallback.sol";
import { ICreditBorrowCallback } from "../interfaces/callback/ICreditBorrowCallback.sol";
import { ICreditPayCallback } from "../interfaces/callback/ICreditPayCallback.sol";
import { SafeBalance } from "./SafeBalance.sol";
import { SafeCast } from "./SafeCast.sol";

library Callback {
    using SafeBalance for IERC20;
    using SafeCast for uint256;

    function mint(
        IERC20 asset,
        IERC20 collateral,
        uint256 assetIn,
        uint112 collateralIn,
        bytes calldata data
    ) internal {
        uint256 assetReserve = asset.safeBalance();
        uint256 collateralReserve = collateral.safeBalance();
        ICreditMintCallback(msg.sender).creditMintCallback(assetIn, collateralIn, data);
        uint256 _assetReserve = asset.safeBalance();
        uint256 _collateralReserve = collateral.safeBalance();
        require(_assetReserve >= assetReserve + assetIn, "E304");
        require(_collateralReserve >= collateralReserve + collateralIn, "E305");
    }

    function lend(IERC20 asset, uint256 assetIn, bytes calldata data) internal {
        uint256 assetReserve = asset.safeBalance();
        ICreditLendCallback(msg.sender).creditLendCallback(assetIn, data);
        uint256 _assetReserve = asset.safeBalance();
        require(_assetReserve >= assetReserve + assetIn, "E304");
    }

    function borrow(IERC20 collateral, uint112 collateralIn, bytes calldata data) internal {
        uint256 collateralReserve = collateral.safeBalance();
        ICreditBorrowCallback(msg.sender).creditBorrowCallback(collateralIn, data);
        uint256 _collateralReserve = collateral.safeBalance();
        require(_collateralReserve >= collateralReserve + collateralIn, "E305");
    }

    function pay(IERC20 asset, uint128 assetIn, bytes calldata data) internal {
        uint256 assetReserve = asset.safeBalance();
        ICreditPayCallback(msg.sender).creditPayCallback(assetIn, data);
        uint256 _assetReserve = asset.safeBalance();
        require(_assetReserve >= assetReserve + assetIn, "E304");
    }
}
