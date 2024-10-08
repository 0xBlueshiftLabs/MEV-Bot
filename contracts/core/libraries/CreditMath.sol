// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../interfaces/IPair.sol";
import { Math } from "./Math.sol";
import { FullMath } from "./FullMath.sol";
import { ConstantProductLib } from "./ConstantProductLib.sol";
import { SafeCast } from "./SafeCast.sol";
import { BlockNumber } from "./BlockNumber.sol";

/**
 * @title Credit Math Library
 * @notice This library contains all the math functions used by the Credit protocol.
 * @dev This library is used by the CreditPair contract.
 */
library CreditMath {
    using Math for uint256;
    using FullMath for uint256;
    using ConstantProductLib for IPair.State;
    using SafeCast for uint256;

    uint256 private constant BASE = 0x10000000000;

    function mint(
        uint256 maturity,
        IPair.State memory state,
        uint112 xIncrease,
        uint112 yIncrease,
        uint112 zIncrease
    ) external view returns (uint256 liquidityOut, IPair.Due memory dueOut, uint256 lpFeeStoredIncrease) {
        if (state.totalLiquidity == 0) {
            liquidityOut = xIncrease;
            liquidityOut <<= 16;
        } else {
            uint256 fromX = state.totalLiquidity.mulDiv(xIncrease, state.x);
            uint256 fromY = state.totalLiquidity.mulDiv(yIncrease, state.y);
            uint256 fromZ = state.totalLiquidity.mulDiv(zIncrease, state.z);

            require(fromY <= fromX, "E214");
            require(fromZ <= fromX, "E215");

            liquidityOut = fromY <= fromZ ? fromY : fromZ;

            lpFeeStoredIncrease = state.lpFeeStored.mulDivUp(liquidityOut, state.totalLiquidity);
        }

        uint256 _debtIn = maturity;
        _debtIn -= block.timestamp;
        _debtIn *= yIncrease;
        _debtIn = _debtIn.shiftRightUp(32);
        _debtIn += xIncrease;
        dueOut.debt = _debtIn.toUint112();

        uint256 _collateralIn = maturity;
        _collateralIn -= block.timestamp;
        _collateralIn *= zIncrease;
        _collateralIn = _collateralIn.shiftRightUp(25);
        _collateralIn += zIncrease;
        dueOut.collateral = _collateralIn.toUint112();

        dueOut.startBlock = BlockNumber.get();
    }

    function burn(
        IPair.State memory state,
        uint256 liquidityIn
    ) external pure returns (uint128 assetOut, uint128 collateralOut, uint256 lpFeeOut) {
        uint256 totalAsset = state.reserves.asset;
        uint256 totalCollateral = state.reserves.collateral;
        uint256 totalLoan = state.totalClaims.loanPrincipal;
        totalLoan += state.totalClaims.loanInterest;

        if (totalAsset >= totalLoan) {
            uint256 _assetOut = totalAsset;
            unchecked {
                _assetOut -= totalLoan;
            }
            _assetOut = _assetOut.mulDiv(liquidityIn, state.totalLiquidity);
            assetOut = _assetOut.toUint128();

            // TODO: check if the removal of the debt for LP is going to change anything here
            // seems like LP are getting their collateral back here
            // But still need to check if LPs are getting back all what they should (even without the debt token)
            uint256 _collateralOut = totalCollateral;
            _collateralOut = _collateralOut.mulDiv(liquidityIn, state.totalLiquidity);
            collateralOut = _collateralOut.toUint128();
        } else {
            uint256 deficit = totalLoan;
            unchecked {
                deficit -= totalAsset;
            }

            uint256 totalCoverage = state.totalClaims.coveragePrincipal;
            totalCoverage += state.totalClaims.coverageInterest;

            if (totalCollateral * totalLoan > deficit * totalCoverage) {
                uint256 _collateralOut = totalCollateral;
                uint256 subtrahend = deficit;
                subtrahend *= totalCoverage;
                subtrahend = subtrahend.divUp(totalLoan);
                _collateralOut -= subtrahend;
                _collateralOut = _collateralOut.mulDiv(liquidityIn, state.totalLiquidity);
                collateralOut = _collateralOut.toUint128();
            }
        }

        lpFeeOut = state.lpFeeStored.mulDiv(liquidityIn, state.totalLiquidity);
    }

    function lend(
        uint256 maturity,
        IPair.State memory state,
        uint112 xIncrease,
        uint112 yDecrease,
        uint112 zDecrease,
        uint256 lpFee,
        uint256 protocolFee,
        uint256 stakingFee
    )
        external
        view
        returns (
            IPair.Claims memory claimsOut,
            uint256 lpFeeStoredIncrease,
            uint256 protocolFeeStoredIncrease,
            uint256 stakingFeeStoredIncrease
        )
    {
        lendCheck(state, xIncrease, yDecrease, zDecrease);
        claimsOut.loanPrincipal = xIncrease;
        claimsOut.loanInterest = getLoanInterest(maturity, yDecrease);
        claimsOut.coveragePrincipal = getCoveragePrincipal(state, xIncrease);
        claimsOut.coverageInterest = getCoverageInterest(maturity, zDecrease);

        (lpFeeStoredIncrease, protocolFeeStoredIncrease, stakingFeeStoredIncrease) = lendGetFees(
            maturity,
            xIncrease,
            lpFee,
            protocolFee,
            stakingFee
        );
    }

    function lendCheck(IPair.State memory state, uint112 xIncrease, uint112 yDecrease, uint112 zDecrease) private pure {
        uint112 xReserve = state.x + xIncrease;
        uint112 yReserve = state.y - yDecrease;
        uint112 zReserve = state.z - zDecrease;
        state.checkConstantProduct(xReserve, yReserve, zReserve);

        uint256 yMin = xIncrease;
        yMin *= state.y;
        yMin /= xReserve;
        yMin >>= 4;
        require(yDecrease >= yMin, "E217");
    }

    function getLoanInterest(uint256 maturity, uint112 yDecrease) private view returns (uint112 loanInterestOut) {
        uint256 _loanInterestOut = maturity;
        _loanInterestOut -= block.timestamp;
        _loanInterestOut *= yDecrease;
        _loanInterestOut >>= 32;
        loanInterestOut = _loanInterestOut.toUint112();
    }

    function getCoveragePrincipal(
        IPair.State memory state,
        uint112 xIncrease
    ) private pure returns (uint112 coveragePrincipalOut) {
        uint256 _coveragePrincipalOut = state.z;
        _coveragePrincipalOut *= xIncrease;
        uint256 denominator = state.x;
        denominator += xIncrease;
        _coveragePrincipalOut /= denominator;
        coveragePrincipalOut = _coveragePrincipalOut.toUint112();
    }

    function getCoverageInterest(
        uint256 maturity,
        uint112 zDecrease
    ) private view returns (uint112 coverageInterestOut) {
        uint256 _coverageInterestOut = maturity;
        _coverageInterestOut -= block.timestamp;
        _coverageInterestOut *= zDecrease;
        _coverageInterestOut >>= 25;
        coverageInterestOut = _coverageInterestOut.toUint112();
    }

    function lendGetFees(
        uint256 maturity,
        uint112 xIncrease,
        uint256 lpFee,
        uint256 protocolFee,
        uint256 stakingFee
    )
        private
        view
        returns (uint256 lpFeeStoredIncrease, uint256 protocolFeeStoredIncrease, uint256 stakingFeeStoredIncrease)
    {
        uint256 totalFee = lpFee;
        totalFee += protocolFee;
        totalFee += stakingFee;

        uint256 numerator = maturity;
        numerator -= block.timestamp;
        numerator *= totalFee;
        numerator += BASE;

        uint256 adjusted = xIncrease;
        adjusted *= numerator;
        adjusted = adjusted.divUp(BASE);
        uint256 totalFeeStoredIncrease = adjusted;
        unchecked {
            totalFeeStoredIncrease -= xIncrease;
        }

        lpFeeStoredIncrease = totalFeeStoredIncrease;
        lpFeeStoredIncrease *= lpFee;
        lpFeeStoredIncrease /= totalFee;

        protocolFeeStoredIncrease = totalFeeStoredIncrease;
        protocolFeeStoredIncrease *= protocolFee;
        protocolFeeStoredIncrease /= totalFee;

        unchecked {
            stakingFeeStoredIncrease = totalFeeStoredIncrease;
            stakingFeeStoredIncrease -= lpFeeStoredIncrease;
            stakingFeeStoredIncrease -= protocolFeeStoredIncrease;
        }
    }

    function withdraw(
        IPair.State memory state,
        IPair.Claims memory claimsIn
    ) external pure returns (IPair.Tokens memory tokensOut) {
        uint256 totalAsset = state.reserves.asset;
        uint256 totalLoanPrincipal = state.totalClaims.loanPrincipal;
        uint256 totalLoanInterest = state.totalClaims.loanInterest;
        uint256 totalLoan = totalLoanPrincipal;
        totalLoan += totalLoanInterest;

        if (totalAsset >= totalLoan) {
            tokensOut.asset = claimsIn.loanPrincipal;
            tokensOut.asset += claimsIn.loanInterest;
        } else {
            if (totalAsset >= totalLoanPrincipal) {
                uint256 remaining = totalAsset;
                unchecked {
                    remaining -= totalLoanPrincipal;
                }
                uint256 _assetOut = claimsIn.loanInterest;
                _assetOut *= remaining;
                _assetOut /= totalLoanInterest;
                _assetOut += claimsIn.loanPrincipal;
                tokensOut.asset = _assetOut.toUint128();
            } else {
                uint256 _assetOut = claimsIn.loanPrincipal;
                _assetOut *= totalAsset;
                _assetOut /= totalLoanPrincipal;
                tokensOut.asset = _assetOut.toUint128();
            }

            uint256 deficit = totalLoan;
            unchecked {
                deficit -= totalAsset;
            }

            uint256 totalCoveragePrincipal = state.totalClaims.coveragePrincipal;
            totalCoveragePrincipal *= deficit;
            uint256 totalCoverageInterest = state.totalClaims.coverageInterest;
            totalCoverageInterest *= deficit;
            uint256 totalCoverage = totalCoveragePrincipal;
            totalCoverage += totalCoverageInterest;

            uint256 totalCollateral = state.reserves.collateral;
            totalCollateral *= totalLoan;

            if (totalCollateral >= totalCoverage) {
                uint256 _collateralOut = claimsIn.coveragePrincipal;
                _collateralOut += claimsIn.coverageInterest;
                _collateralOut *= deficit;
                _collateralOut /= totalLoan;
                tokensOut.collateral = _collateralOut.toUint128();
            } else if (totalCollateral >= totalCoveragePrincipal) {
                uint256 remaining = totalCollateral;
                unchecked {
                    remaining -= totalCoveragePrincipal;
                }
                uint256 _collateralOut = claimsIn.coverageInterest;
                _collateralOut *= deficit;
                uint256 denominator = totalCoverageInterest;
                denominator *= totalLoan;
                _collateralOut = _collateralOut.mulDiv(remaining, denominator);
                uint256 addend = claimsIn.coveragePrincipal;
                addend *= deficit;
                addend /= totalLoan;
                _collateralOut += addend;
                tokensOut.collateral = _collateralOut.toUint128();
            } else {
                uint256 _collateralOut = claimsIn.coveragePrincipal;
                _collateralOut *= deficit;
                uint256 denominator = totalCoveragePrincipal;
                denominator *= totalLoan;
                _collateralOut = _collateralOut.mulDiv(totalCollateral, denominator);
                tokensOut.collateral = _collateralOut.toUint128();
            }
        }
    }

    function borrow(
        uint256 maturity,
        IPair.State memory state,
        uint112 xDecrease,
        uint112 yIncrease,
        uint112 zIncrease,
        uint256 lpFee,
        uint256 protocolFee,
        uint256 stakingFee
    )
        external
        view
        returns (
            IPair.Due memory dueOut,
            uint256 lpFeeStoredIncrease,
            uint256 protocolFeeStoredIncrease,
            uint256 stakingFeeStoredIncrease
        )
    {
        borrowCheck(state, xDecrease, yIncrease, zIncrease);

        dueOut.debt = getDebt(maturity, xDecrease, yIncrease);
        dueOut.collateral = getCollateral(maturity, state, xDecrease, zIncrease);
        dueOut.startBlock = BlockNumber.get();

        (lpFeeStoredIncrease, protocolFeeStoredIncrease, stakingFeeStoredIncrease) = borrowGetFees(
            maturity,
            xDecrease,
            lpFee,
            protocolFee,
            stakingFee
        );
    }

    function borrowCheck(
        IPair.State memory state,
        uint112 xDecrease,
        uint112 yIncrease,
        uint112 zIncrease
    ) private pure {
        uint112 xReserve = state.x - xDecrease;
        uint112 yReserve = state.y + yIncrease;
        uint112 zReserve = state.z + zIncrease;
        state.checkConstantProduct(xReserve, yReserve, zReserve);

        uint256 yMax = xDecrease;
        yMax *= state.y;
        yMax = yMax.divUp(xReserve);
        require(yIncrease <= yMax, "E214");

        uint256 zMax = xDecrease;
        zMax *= state.z;
        zMax = zMax.divUp(xReserve);
        require(zIncrease <= zMax, "E215");

        uint256 yMin = yMax;
        yMin = yMin.shiftRightUp(4);
        require(yIncrease >= yMin, "E217");
    }

    function getDebt(uint256 maturity, uint112 xDecrease, uint112 yIncrease) private view returns (uint112 debtIn) {
        uint256 _debtIn = maturity;
        _debtIn -= block.timestamp;
        _debtIn *= yIncrease;
        _debtIn = _debtIn.shiftRightUp(32);
        _debtIn += xDecrease;
        debtIn = _debtIn.toUint112();
    }

    function getCollateral(
        uint256 maturity,
        IPair.State memory state,
        uint112 xDecrease,
        uint112 zIncrease
    ) private view returns (uint112 collateralIn) {
        uint256 _collateralIn = maturity;
        _collateralIn -= block.timestamp;
        _collateralIn *= zIncrease;
        _collateralIn = _collateralIn.shiftRightUp(25);
        uint256 minimum = state.z;
        minimum *= xDecrease;
        uint256 denominator = state.x;
        denominator -= xDecrease;
        minimum = minimum.divUp(denominator);
        _collateralIn += minimum;
        collateralIn = _collateralIn.toUint112();
    }

    function borrowGetFees(
        uint256 maturity,
        uint112 xDecrease,
        uint256 lpFee,
        uint256 protocolFee,
        uint256 stakingFee
    )
        private
        view
        returns (uint256 lpFeeStoredIncrease, uint256 protocolFeeStoredIncrease, uint256 stakingFeeStoredIncrease)
    {
        uint256 totalFee = lpFee;
        totalFee += protocolFee;
        totalFee += stakingFee;

        uint256 denominator = maturity;
        denominator -= block.timestamp;
        denominator *= totalFee;
        denominator += BASE;

        uint256 adjusted = xDecrease;
        adjusted *= BASE;
        adjusted /= denominator;
        uint256 totalFeeStoredIncrease = xDecrease;
        unchecked {
            totalFeeStoredIncrease -= adjusted;
        }

        lpFeeStoredIncrease = totalFeeStoredIncrease;
        lpFeeStoredIncrease *= lpFee;
        lpFeeStoredIncrease /= totalFee;

        protocolFeeStoredIncrease = totalFeeStoredIncrease;
        protocolFeeStoredIncrease *= protocolFee;
        protocolFeeStoredIncrease /= totalFee;

        unchecked {
            stakingFeeStoredIncrease = totalFeeStoredIncrease;
            stakingFeeStoredIncrease -= lpFeeStoredIncrease;
            stakingFeeStoredIncrease -= protocolFeeStoredIncrease;
        }
    }
}
