// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { Math } from "../../core/libraries/Math.sol";
import { FullMath } from "../../core/libraries/FullMath.sol";
import { SafeCast } from "../../core/libraries/SafeCast.sol";
import { SquareRoot } from "./SquareRoot.sol";
import { ConstantProduct } from "./ConstantProduct.sol";

library LendMath {
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
        uint112 assetIn,
        uint40 percent
    ) internal view returns (uint112 xIncrease, uint112 yDecrease, uint112 zDecrease) {
        ConstantProduct.CP memory cp = pair.get(maturity);

        xIncrease = getX(pair, maturity, assetIn);

        uint256 xReserve = cp.x;
        xReserve += xIncrease;

        if (percent <= 0x80000000) {
            uint256 yMin = xIncrease;
            yMin *= cp.y;
            yMin /= xReserve;
            yMin >>= 4;

            uint256 yMid = cp.y;
            uint256 subtrahend = cp.y;
            subtrahend *= cp.y;
            subtrahend = subtrahend.mulDivUp(cp.x, xReserve);
            subtrahend = subtrahend.sqrtUp();
            yMid -= subtrahend;

            uint256 _yDecrease = yMid;
            _yDecrease -= yMin;
            _yDecrease *= percent;
            _yDecrease >>= 31;
            _yDecrease += yMin;
            yDecrease = _yDecrease.toUint112();

            uint256 yReserve = cp.y;
            yReserve -= _yDecrease;

            uint256 zReserve = cp.x;
            zReserve *= cp.y;
            uint256 denominator = xReserve;
            denominator *= yReserve;
            zReserve = zReserve.mulDivUp(cp.z, denominator);

            uint256 _zDecrease = cp.z;
            _zDecrease -= zReserve;
            zDecrease = _zDecrease.toUint112();
        } else {
            percent = 0x100000000 - percent;

            uint256 zMid = cp.z;
            uint256 subtrahend = cp.z;
            subtrahend *= cp.z;
            subtrahend = subtrahend.mulDivUp(cp.x, xReserve);
            subtrahend = subtrahend.sqrtUp();
            zMid -= subtrahend;

            uint256 _zDecrease = zMid;
            _zDecrease *= percent;
            _zDecrease >>= 31;
            zDecrease = _zDecrease.toUint112();

            uint256 zReserve = cp.z;
            zReserve -= _zDecrease;

            uint256 yReserve = cp.x;
            yReserve *= cp.z;
            uint256 denominator = xReserve;
            denominator *= zReserve;
            yReserve = yReserve.mulDivUp(cp.y, denominator);

            uint256 _yDecrease = cp.y;
            _yDecrease -= yReserve;
            yDecrease = _yDecrease.toUint112();
        }
    }

    function getX(IPair pair, uint256 maturity, uint112 assetIn) private view returns (uint112 xIncrease) {
        uint256 totalFee = pair.lpFee();
        totalFee += pair.protocolFee();
        totalFee += pair.stakingFee();

        uint256 denominator = maturity;
        denominator -= block.timestamp;
        denominator *= totalFee;
        denominator += BASE;

        uint256 _xIncrease = assetIn;
        _xIncrease *= BASE;
        _xIncrease /= denominator;
        xIncrease = _xIncrease.toUint112();
    }
}
