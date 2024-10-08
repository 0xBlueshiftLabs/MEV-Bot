// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

/// @title Callback for ICreditPair#pay
/// @notice Any contract that calls ICreditPair#pay must implement this interface
interface ICreditPayCallback {
    /// @notice Called to `msg.sender` after initiating a pay from ICreditPair#pay.
    /// @dev In the implementation you must pay the asset token owed for the pay transaction.
    /// The caller of this method must be checked to be a CreditPair deployed by the canonical CreditFactory.
    /// @param assetIn The amount of asset tokens owed due to the pool for the pay transaction
    /// @param data Any data passed through by the caller via the ICreditPair#pay call
    function creditPayCallback(uint128 assetIn, bytes calldata data) external;
}
