// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

interface IDistributor {
    event UpdateEmissionRate(uint256 emissionRate);

    /**
     * @notice Returns the emission rate of the token
     * @return The emission rate of the token
     */
    function emissionRate() external view returns (uint256);

    /**
     * @notice Returns the amount of tokens that have been distributed for farming
     * @return The amount of tokens that have been distributed for farming
     */
    function claimFarmingCredit(uint256 amount) external returns (uint256);

    /**
     * @notice Returns the amount of tokens that have been distributed for staking
     */
    function claimAllStakingCredit() external;

    /**
     * @notice Update the emission rate
     * @return The new, updated, credit emission rate
     * @dev Before updating, all pools needs to be updated in the Farming contract
     * to make reward even on all pools.
     *
     * The emission rate is variable (% of staked liquidity) and do not allow to have pools being updated
     * at different time as nothing guarantees that the same emission rate applies.
     */
    function updateCreditEmissionRate() external returns (uint256);

    /**
     * @notice Returns the amount of credit tokens currently in circulation.
     * @return The amount of tokens in circulation.
     */
    function getCirculatingSupply() external view returns (uint256);
}
