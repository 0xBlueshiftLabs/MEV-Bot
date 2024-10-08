// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { Math } from "../../core/libraries/Math.sol";
import { FullMath } from "../../core/libraries/FullMath.sol";
import { SafeCast } from "../../core/libraries/SafeCast.sol";
import { SquareRoot } from "./SquareRoot.sol";
import { ConstantProduct } from "./ConstantProduct.sol";

library BorrowMath {
    using Math for uint256;
    using SquareRoot for uint256;
    using FullMath for uint256;
    using ConstantProduct for IPair;
    using ConstantProduct for ConstantProduct.CP;
    using SafeCast for uint256;

    uint256 private constant BASE = 0x10000000000;

    function givenPercent(
        IPair pair,
        uint256 maturity,
        uint112 assetOut,
        uint40 percent
    ) internal view returns (uint112 xDecrease, uint112 yIncrease, uint112 zIncrease) {
        ConstantProduct.CP memory cp = pair.get(maturity);

        xDecrease = getX(pair, maturity, assetOut);

        uint256 xReserve = cp.x;
        xReserve -= xDecrease;

        if (percent <= 0x80000000) {
            uint256 yMin = xDecrease;
            yMin *= cp.y;
            yMin = yMin.divUp(xReserve);
            yMin = yMin.shiftRightUp(4);

            uint256 yMid = cp.y;
            yMid *= cp.y;
            yMid = yMid.mulDivUp(cp.x, xReserve);
            yMid = yMid.sqrtUp();
            yMid -= cp.y;

            uint256 _yIncrease = yMid;
            _yIncrease -= yMin;
            _yIncrease *= percent;
            _yIncrease = _yIncrease.shiftRightUp(31);
            _yIncrease += yMin;
            yIncrease = _yIncrease.toUint112();

            uint256 yReserve = cp.y;
            yReserve += _yIncrease;

            uint256 zReserve = cp.x;
            zReserve *= cp.y;
            uint256 denominator = xReserve;
            denominator *= yReserve;
            zReserve = zReserve.mulDivUp(cp.z, denominator);

            uint256 _zIncrease = zReserve;
            _zIncrease -= cp.z;
            zIncrease = _zIncrease.toUint112();
        } else {
            percent = 0x100000000 - percent;

            uint256 zMid = cp.z;
            zMid *= cp.z;
            zMid = zMid.mulDivUp(cp.x, xReserve);
            zMid = zMid.sqrtUp();
            zMid -= cp.z;

            uint256 _zIncrease = zMid;
            _zIncrease *= percent;
            _zIncrease = _zIncrease.shiftRightUp(31);
            zIncrease = _zIncrease.toUint112();

            uint256 zReserve = cp.z;
            zReserve += _zIncrease;

            uint256 yReserve = cp.x;
            yReserve *= cp.z;
            uint256 denominator = xReserve;
            denominator *= zReserve;
            yReserve = yReserve.mulDivUp(cp.y, denominator);

            uint256 _yIncrease = yReserve;
            _yIncrease -= cp.y;
            yIncrease = _yIncrease.toUint112();
        }
    }

    /// Giving x from the assetOut by adding the fee
    /// @dev xDecrease = (assetOut * (d * totalFee + BASE)) / BASE
    /// @param pair Pair to get the fee from
    /// @param maturity Maturity of the pool
    /// @param assetOut Amount of asset out which include only principal. The pools needs to have enough to pay for fees too
    function getX(IPair pair, uint256 maturity, uint112 assetOut) private view returns (uint112 xDecrease) {
        uint256 totalFee = pair.lpFee();
        totalFee += pair.protocolFee();
        totalFee += pair.stakingFee();

        uint256 numerator = maturity;
        numerator -= block.timestamp;
        numerator *= totalFee;
        numerator += BASE;

        uint256 _xDecrease = assetOut;
        _xDecrease *= numerator;
        _xDecrease = _xDecrease.divUp(BASE);
        xDecrease = _xDecrease.toUint112();
    }
}
