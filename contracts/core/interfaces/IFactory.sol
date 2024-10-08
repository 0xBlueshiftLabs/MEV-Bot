// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IPair } from "./IPair.sol";

/// @title Credit Factory Interface
interface IFactory {
    /* ===== EVENT ===== */

    /// @dev Emits when a new Credit Pair contract is created.
    /// @param asset The address of the ERC20 being lent and borrowed.
    /// @param collateral The address of the ERC20 used as collateral.
    /// @param pair The address of the Credit Pair contract created.
    event CreatePair(IERC20 indexed asset, IERC20 indexed collateral, IPair pair);

    /// @dev Emits when a new staking fee collector.
    /// @param stakingFeeCollector The address of the stakingFeeCollector.
    event SetStakingFeeCollector(address indexed stakingFeeCollector);

    /// @dev Emits when a new protocol fee collector.
    /// @param protocolFeeCollector The address of the protocolFeeCollector.
    event SetProtocolFeeCollector(address indexed protocolFeeCollector);

    /* ===== VIEW ===== */

    /// @dev Return the lpFee per second earned by liquidity providers.
    /// @dev Must be downcasted to uint16.
    /// @return The lpFee following UQ0.40 format.
    function lpFee() external view returns (uint256);

    /// @dev Return the protocol fee per second earned by the owner.
    /// @dev Must be downcasted to uint16.
    /// @return The protocol fee per second following UQ0.40 format.
    function protocolFee() external view returns (uint256);

    /// @dev Return the staking fee per second earned by the owner.
    /// @dev Must be downcasted to uint16.
    /// @return The staking fee per second following UQ0.40 format.
    function stakingFee() external view returns (uint256);

    /// @dev Returns the address of a deployed pair.
    /// @param asset The address of the ERC20 being lent and borrowed.
    /// @param collateral The address of the ERC20 used as collateral.
    /// @return pair The address of the Credit Pair contract.
    function getPair(IERC20 asset, IERC20 collateral) external view returns (IPair pair);

    /// @dev Return the beacon address for Pair contract.
    /// @return The beacon address for Pair contract.
    function beacon() external view returns (address);

    /// @return Return the staking fee collector address.
    function stakingFeeCollector() external view returns (address);

    /// @return Return the protocol fee collector address.
    function protocolFeeCollector() external view returns (address);

    /* ===== UPDATE ===== */

    /// @dev Creates a Credit Pool based on ERC20 pair parameters.
    /// @dev Cannot create a Credit Pool with the same pair parameters.
    /// @param asset The address of the ERC20 being lent and borrowed.
    /// @param collateral The address of the ERC20 as the collateral.
    /// @return pair The address of the Credit Pair contract.
    function createPair(IERC20 asset, IERC20 collateral) external returns (IPair pair);

    /// @dev Set the staking fee collector of the factory.
    /// @param _stakingFeeCollector the chosen staking fee collector.
    function setStakingFeeCollector(address _stakingFeeCollector) external;

    /// @dev Set the protocol fee collector of the factory.
    /// @param _protocolFeeCollector the chosen protocol fee collector.
    function setProtocolFeeCollector(address _protocolFeeCollector) external;
}
