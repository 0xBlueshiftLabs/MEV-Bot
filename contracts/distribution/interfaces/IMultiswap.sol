// SPDX-License-Identifier: MIT
pragma solidity =0.8.20;

struct route {
    address from;
    address to;
    bool stable;
}

interface IMultiswap {
    /// @notice Swaps an asset to up to 5 other assets according to predetermined weights
    /// @param _token           The asset to swap (address(0) if ETH)
    /// @param _amount          The amount to swap (0 if _token is ETH)
    /// @param _weights         The respective weights to be attributed to each assets (in basis points, 10000 = 100%)
    /// @param _swapData        An array of data to be passed to each swap
    /// @return amountsOut An array with the respective amounts of assets received
    function multiswap(
        address _token,
        uint _amount,
        bytes[] memory _swapData,
        uint[] calldata _weights
    ) external payable returns (uint[] memory);
}
