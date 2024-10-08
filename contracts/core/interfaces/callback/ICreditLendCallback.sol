// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

/// @title Callback for ICreditPair#lend
/// @notice Any contract that calls ICreditPair#lend must implement this interface
interface ICreditLendCallback {
    /// @notice Called to `msg.sender` after initiating a lend from ICreditPair#lend.
    /// @dev In the implementation you must pay the asset token owed for the lend transaction.
    /// The caller of this method must be checked to be a CreditPair deployed by the canonical CreditFactory.
    /// @param assetIn The amount of asset tokens owed due to the pool for the lend transaction
    /// @param data Any data passed through by the caller via the ICreditPair#lend call
    function creditLendCallback(uint256 assetIn, bytes calldata data) external;
}
