// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

/// @title Callback for ICreditPair#borrow
/// @notice Any contract that calls ICreditPair#borrow must implement this interface
interface ICreditBorrowCallback {
    /// @notice Called to `msg.sender` after initiating a borrow from ICreditPair#borrow.
    /// @dev In the implementation you must pay the collateral token owed for the borrow transaction.
    /// The caller of this method must be checked to be a CreditPair deployed by the canonical CreditFactory.
    /// @param collateralIn The amount of asset tokens owed due to the pool for the borrow transaction
    /// @param data Any data passed through by the caller via the ICreditPair#borrow call
    function creditBorrowCallback(uint112 collateralIn, bytes calldata data) external;
}
