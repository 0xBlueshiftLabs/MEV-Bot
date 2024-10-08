// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

/// @title Callback for ICreditPair#mint
/// @notice Any contract that calls ICreditPair#mint must implement this interface
interface ICreditMintCallback {
    /// @notice Called to `msg.sender` after initiating a mint from ICreditPair#mint.
    /// @dev In the implementation you must pay the asset token and collateral token owed for the mint transaction.
    /// The caller of this method must be checked to be a CreditPair deployed by the canonical CreditFactory.
    /// @param assetIn The amount of asset tokens owed due to the pool for the mint transaction.
    /// @param collateralIn The amount of collateral tokens owed due to the pool for the min transaction.
    /// @param data Any data passed through by the caller via the ICreditPair#mint call
    function creditMintCallback(uint256 assetIn, uint112 collateralIn, bytes calldata data) external;
}
