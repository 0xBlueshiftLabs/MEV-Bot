// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { SafeCast } from "../../core/libraries/SafeCast.sol";

import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";

library PayMath {
    using SafeCast for uint256;

    function givenMaxAssetsIn(
        IPair pair,
        uint256 maturity,
        ICreditPositionManager creditPositionManager,
        uint256[] memory cpIds,
        uint112[] memory maxAssetsIn
    ) internal view returns (uint256[] memory ids, uint112[] memory assetsIn, uint112[] memory collateralsOut) {
        uint256 length = cpIds.length;
        ids = new uint256[](length);

        for (uint256 j; j < length; ) {
            require(
                creditPositionManager.getPositionType(cpIds[j]) == ICreditPositionManager.PositionType.DEBT,
                "E524"
            );
            ids[j] = creditPositionManager.getDebtId(cpIds[j]);

            unchecked {
                ++j;
            }
        }

        assetsIn = maxAssetsIn;
        collateralsOut = new uint112[](length);

        for (uint256 i; i < length; ) {
            IPair.Due memory due = pair.dueOf(maturity, address(this), ids[i]);

            if (assetsIn[i] > due.debt) assetsIn[i] = due.debt;
            if (msg.sender == creditPositionManager.ownerOf(cpIds[i])) {
                uint256 _collateralOut = due.collateral;
                if (due.debt != 0) {
                    _collateralOut *= assetsIn[i];
                    _collateralOut /= due.debt;
                }
                collateralsOut[i] = _collateralOut.toUint112();
            }

            unchecked {
                ++i;
            }
        }
    }
}
