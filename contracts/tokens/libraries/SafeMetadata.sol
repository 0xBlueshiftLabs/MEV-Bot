// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

library SafeMetadata {
    function isSafeString(string memory str) public pure returns (bool) {
        bytes memory b = bytes(str);

        for (uint256 i; i < b.length; i++) {
            bytes1 char = b[i];
            if (
                !(char >= 0x30 && char <= 0x39) && //9-0
                !(char >= 0x41 && char <= 0x5A) && //A-Z
                !(char >= 0x61 && char <= 0x7A) && //a-z
                !(char == 0x2E) &&
                !(char == 0x20) // ." "
            ) return false;
        }
        return true;
    }

    function safeName(IERC20 token) internal view returns (string memory) {
        (bool success, bytes memory data) = address(token).staticcall(
            abi.encodeWithSelector(IERC20Metadata.name.selector)
        );
        return success ? returnDataToString(data) : "Token";
    }

    function safeSymbol(IERC20 token) internal view returns (string memory) {
        (bool _success, bytes memory data) = address(token).staticcall(
            abi.encodeWithSelector(IERC20Metadata.symbol.selector)
        );
        string memory tokenSymbol = _success ? returnDataToString(data) : "TKN";

        bool success = isSafeString(tokenSymbol);
        return success ? tokenSymbol : "TKN";
    }

    function safeDecimals(IERC20 token) internal view returns (uint8) {
        (bool success, bytes memory data) = address(token).staticcall(
            abi.encodeWithSelector(IERC20Metadata.decimals.selector)
        );
        return success && data.length == 32 ? abi.decode(data, (uint8)) : 18;
    }

    function returnDataToString(bytes memory data) private pure returns (string memory) {
        if (data.length >= 64) {
            return abi.decode(data, (string));
        } else if (data.length == 32) {
            uint8 i;
            while (i < 32 && data[i] != 0) {
                unchecked {
                    ++i;
                }
            }
            bytes memory bytesArray = new bytes(i);
            uint256 length = bytesArray.length;
            for (i = 0; i < length; ) {
                bytesArray[i] = data[i];
                unchecked {
                    ++i;
                }
            }
            return string(bytesArray);
        } else {
            return "???";
        }
    }
}
