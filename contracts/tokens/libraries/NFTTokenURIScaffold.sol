// SPDX-License-Identifier: BUSL-1.1
/* solhint-disable quotes, max-line-length */

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

import { IPair } from "../../core/interfaces/IPair.sol";
import { ICreditPositionManager } from "../interfaces/ICreditPositionManager.sol";
import { SafeMetadata } from "./SafeMetadata.sol";
import { DateTime } from "./DateTime.sol";
import { CreditPositionSVG } from "./CreditPositionSVG.sol";

import "./Base64.sol";

library NFTTokenURIScaffold {
    using SafeMetadata for IERC20;
    using Strings for uint256;

    struct NFTParams {
        uint256 tokenId;
        IPair pair;
        uint256 maturity;
        ICreditPositionManager.PositionType positionType;
        uint256 liquidityAmount;
        uint256 debtRequired;
        uint256 collateralLocked;
        uint256 loanAmount;
        uint256 coverageAmount;
    }

    string constant DEBT_COLOR = "#FFBD13";
    string constant CREDIT_COLOR = "#98FFFF";
    string constant LIQUIDITY_COLOR = "#FFBDE7";

    string constant DEBT_TITLE =
        string(
            '<g id="title"><path d="M38.8145 69.6602V68.1855H40.2988V66.7012H41.7734V50.4023H40.2988V48.9277H38.8145V47.4434H28.4434V69.6602H38.8145ZM24 74.1035V43H41.7734V44.4746H43.2578V45.959H44.7422V47.4434H46.2168V69.6602H44.7422V71.1445H43.2578V72.6289H41.7734V74.1035H24Z" class="M"/><path d="M55.123 74.1035V72.6289H53.6387V71.1445H52.1641V69.6602H50.6797V47.4434H52.1641V45.959H53.6387V44.4746H55.123V43H72.8965V47.4434H58.082V48.9277H56.6074V50.4023H55.123V56.3301H68.4531V60.7734H55.123V66.7012H56.6074V68.1855H58.082V69.6602H72.8965V74.1035H55.123Z" class="M"/><path d="M92.1738 69.6602V68.1855H93.6582V66.7012H95.1328V63.7422H93.6582V62.2578H92.1738V60.7734H81.8027V69.6602H92.1738ZM92.1738 56.3301V54.8457H93.6582V53.3711H95.1328V50.4023H93.6582V48.9277H92.1738V47.4434H81.8027V56.3301H92.1738ZM77.3594 74.1035V43H95.1328V44.4746H96.6172V45.959H98.1016V47.4434H99.5762V56.3301H98.1016V57.8145H96.6172V59.2891H98.1016V60.7734H99.5762V69.6602H98.1016V71.1445H96.6172V72.6289H95.1328V74.1035H77.3594Z" class="M"/><path d="M112.926 74.1035V47.4434H104.039V43H126.256V47.4434H117.369V74.1035H112.926Z" class="M"/></g>'
        );
    string constant CREDIT_TITLE =
        string(
            '<g id="title"><path d="M28.4434 74.1035V72.6289H26.959V71.1445H25.4844V69.6602H24V47.4434H25.4844V45.959H26.959V44.4746H28.4434V43H41.7734V44.4746H43.2578V45.959H44.7422V47.4434H46.2168V51.8867H41.7734V50.4023H40.2988V48.9277H38.8145V47.4434H31.4023V48.9277H29.9277V50.4023H28.4434V66.7012H29.9277V68.1855H31.4023V69.6602H38.8145V68.1855H40.2988V66.7012H41.7734V65.2168H46.2168V69.6602H44.7422V71.1445H43.2578V72.6289H41.7734V74.1035H28.4434Z" class="M"/><path d="M65.4941 56.3301V54.8457H66.9785V53.3711H68.4531V50.4023H66.9785V48.9277H65.4941V47.4434H55.123V56.3301H65.4941ZM50.6797 74.1035V43H68.4531V44.4746H69.9375V45.959H71.4219V47.4434H72.8965V56.3301H71.4219V57.8145H69.9375V59.2891H68.4531V60.7734H64.0098V62.2578H65.4941V63.7422H66.9785V65.2168H68.4531V66.7012H69.9375V68.1855H71.4219V69.6602H72.8965V74.1035H68.4531V72.6289H66.9785V71.1445H65.4941V69.6602H64.0098V68.1855H62.5352V66.7012H61.0508V65.2168H59.5664V63.7422H58.082V62.2578H56.6074V60.7734H55.123V74.1035H50.6797Z" class="M"/><path d="M81.8027 74.1035V72.6289H80.3184V71.1445H78.8438V69.6602H77.3594V47.4434H78.8438V45.959H80.3184V44.4746H81.8027V43H99.5762V47.4434H84.7617V48.9277H83.2871V50.4023H81.8027V56.3301H95.1328V60.7734H81.8027V66.7012H83.2871V68.1855H84.7617V69.6602H99.5762V74.1035H81.8027Z" class="M"/><path d="M118.854 69.6602V68.1855H120.338V66.7012H121.812V50.4023H120.338V48.9277H118.854V47.4434H108.482V69.6602H118.854ZM104.039 74.1035V43H121.812V44.4746H123.297V45.959H124.781V47.4434H126.256V69.6602H124.781V71.1445H123.297V72.6289H121.812V74.1035H104.039Z" class="M"/><path d="M130.719 74.1035V69.6602H139.605V47.4434H130.719V43H152.936V47.4434H144.049V69.6602H152.936V74.1035H130.719Z" class="M"/><path d="M166.285 74.1035V47.4434H157.398V43H179.615V47.4434H170.729V74.1035H166.285Z" class="M"/></g>'
        );
    string constant LIQUIDITY_TITLE =
        string(
            '<g id="title"><path d="M24 74.1035V43H28.4434V69.6602H46.2168V74.1035H24Z" class="M"/><path d="M50.6797 74.1035V69.6602H59.5664V47.4434H50.6797V43H72.8965V47.4434H64.0098V69.6602H72.8965V74.1035H50.6797Z" class="M"/>    <path d="M90.6895 69.6602V68.1855H89.2148V66.7012H87.7305V65.2168H86.2461V60.7734H90.6895V62.2578H92.1738V63.7422H93.6582V65.2168H95.1328V50.4023H93.6582V48.9277H92.1738V47.4434H84.7617V48.9277H83.2871V50.4023H81.8027V66.7012H83.2871V68.1855H84.7617V69.6602H90.6895ZM81.8027 74.1035V72.6289H80.3184V71.1445H78.8438V69.6602H77.3594V47.4434H78.8438V45.959H80.3184V44.4746H81.8027V43H95.1328V44.4746H96.6172V45.959H98.1016V47.4434H99.5762V65.2168H98.1016V66.7012H96.6172V68.1855H98.1016V69.6602H99.5762V74.1035H95.1328V72.6289H93.6582V71.1445H92.1738V72.6289H90.6895V74.1035H81.8027Z" class="M"/>    <path d="M108.482 74.1035V72.6289H106.998V71.1445H105.523V69.6602H104.039V43H108.482V66.7012H109.967V68.1855H111.441V69.6602H118.854V68.1855H120.338V66.7012H121.812V43H126.256V69.6602H124.781V71.1445H123.297V72.6289H121.812V74.1035H108.482Z" class="M"/>    <path d="M130.719 74.1035V69.6602H139.605V47.4434H130.719V43H152.936V47.4434H144.049V69.6602H152.936V74.1035H130.719Z" class="M"/>    <path d="M172.213 69.6602V68.1855H173.697V66.7012H175.172V50.4023H173.697V48.9277H172.213V47.4434H161.842V69.6602H172.213ZM157.398 74.1035V43H175.172V44.4746H176.656V45.959H178.141V47.4434H179.615V69.6602H178.141V71.1445H176.656V72.6289H175.172V74.1035H157.398Z" class="M"/>    <path d="M184.078 74.1035V69.6602H192.965V47.4434H184.078V43H206.295V47.4434H197.408V69.6602H206.295V74.1035H184.078Z" class="M"/>    <path d="M219.645 74.1035V47.4434H210.758V43H232.975V47.4434H224.088V74.1035H219.645Z" class="M"/>    <path d="M246.324 74.1035V59.2891H244.84V57.8145H243.365V56.3301H241.881V54.8457H240.396V53.3711H238.922V51.8867H237.438V43H241.881V48.9277H243.365V50.4023H244.84V51.8867H246.324V53.3711H247.809V54.8457H249.293V53.3711H250.768V51.8867H252.252V50.4023H253.736V48.9277H255.211V43H259.654V51.8867H258.18V53.3711H256.695V54.8457H255.211V56.3301H253.736V57.8145H252.252V59.2891H250.768V74.1035H246.324Z" class="M"/></g>'
        );

    function tokenURI(NFTParams memory params) public view returns (string memory) {
        //slither-disable-start uninitialized-local
        string memory uri;
        string memory description;
        //slither-disable-end uninitialized-local

        CreditPositionSVG.Input memory pairInput = CreditPositionSVG.Input({
            id: "pair",
            input: "Pair",
            info: string(
                abi.encodePacked(
                    parseSymbol(IERC20(params.pair.asset()).safeSymbol()),
                    "/",
                    parseSymbol(IERC20(params.pair.collateral()).safeSymbol())
                )
            ),
            xTitle: "23",
            yTitle: "377",
            xInfo: "23",
            yInfo: "320",
            rotate: true,
            bold: false,
            fillInfo: "#F4F4F4"
        });

        CreditPositionSVG.Input memory tokenIdInput = CreditPositionSVG.Input({
            id: "tokenid",
            input: "Token ID",
            info: params.tokenId.toString(),
            xTitle: "24",
            yTitle: "96",
            xInfo: "113",
            yInfo: "96",
            rotate: false,
            bold: false,
            fillInfo: "#F4F4F4"
        });

        if (params.positionType == ICreditPositionManager.PositionType.LIQUIDITY) {
            description = constructLiquidityDescription(params);

            CreditPositionSVG.Input[] memory inputs = new CreditPositionSVG.Input[](4);

            inputs[0] = pairInput;
            inputs[1] = CreditPositionSVG.Input({
                id: "firstdata",
                input: "LP Amount",
                info: weiToPrecisionString(params.liquidityAmount, params.pair.asset().safeDecimals()),
                xTitle: "24",
                yTitle: "532",
                xInfo: "200",
                yInfo: "532",
                rotate: false,
                bold: false,
                fillInfo: "#F2F2F2"
            });
            inputs[2] = CreditPositionSVG.Input({
                id: "maturity",
                input: "Maturity",
                info: getReadableDateString(params.maturity),
                xTitle: "362",
                yTitle: "500",
                xInfo: "362",
                yInfo: "400",
                rotate: true,
                bold: true,
                fillInfo: LIQUIDITY_COLOR
            });
            inputs[3] = tokenIdInput;
            uri = constructTokenSVG(inputs, LIQUIDITY_COLOR, LIQUIDITY_TITLE);
        } else if (params.positionType == ICreditPositionManager.PositionType.DEBT) {
            description = constructDebtDescription(params);

            CreditPositionSVG.Input[] memory inputs = new CreditPositionSVG.Input[](5);

            inputs[0] = pairInput;
            inputs[1] = CreditPositionSVG.Input({
                id: "firstdata",
                input: "Debt",
                info: string(
                    abi.encodePacked(
                        weiToPrecisionString(params.debtRequired, params.pair.asset().safeDecimals()),
                        " ",
                        parseSymbol(IERC20(params.pair.asset()).safeSymbol())
                    )
                ),
                xTitle: "24",
                yTitle: "532",
                xInfo: "200",
                yInfo: "532",
                rotate: false,
                bold: false,
                fillInfo: "#F2F2F2"
            });
            inputs[2] = CreditPositionSVG.Input({
                id: "seconddata",
                input: "Collateral",
                info: string(
                    abi.encodePacked(
                        weiToPrecisionString(params.collateralLocked, params.pair.collateral().safeDecimals()),
                        " ",
                        parseSymbol(IERC20(params.pair.collateral()).safeSymbol())
                    )
                ),
                xTitle: "24",
                yTitle: "566",
                xInfo: "200",
                yInfo: "566",
                rotate: false,
                bold: false,
                fillInfo: "#F2F2F2"
            });
            inputs[3] = CreditPositionSVG.Input({
                id: "maturity",
                input: "Maturity",
                info: getReadableDateString(params.maturity),
                xTitle: "362",
                yTitle: "500",
                xInfo: "362",
                yInfo: "400",
                rotate: true,
                bold: true,
                fillInfo: DEBT_COLOR
            });
            inputs[4] = tokenIdInput;
            uri = constructTokenSVG(inputs, DEBT_COLOR, DEBT_TITLE);
        } else if (params.positionType == ICreditPositionManager.PositionType.CREDIT) {
            description = constructCreditDescription(params);
            CreditPositionSVG.Input[] memory inputs = new CreditPositionSVG.Input[](5);

            inputs[0] = pairInput;
            inputs[1] = CreditPositionSVG.Input({
                id: "firstdata",
                input: "Loan",
                info: string(
                    abi.encodePacked(
                        weiToPrecisionString(params.loanAmount, params.pair.asset().safeDecimals()),
                        " ",
                        parseSymbol(IERC20(params.pair.asset()).safeSymbol())
                    )
                ),
                xTitle: "24",
                yTitle: "532",
                xInfo: "200",
                yInfo: "532",
                rotate: false,
                bold: false,
                fillInfo: "#F2F2F2"
            });
            inputs[2] = CreditPositionSVG.Input({
                id: "seconddata",
                input: "Coverage",
                info: string(
                    abi.encodePacked(
                        weiToPrecisionString(params.coverageAmount, params.pair.collateral().safeDecimals()),
                        " ",
                        parseSymbol(IERC20(params.pair.collateral()).safeSymbol())
                    )
                ),
                xTitle: "24",
                yTitle: "566",
                xInfo: "200",
                yInfo: "566",
                rotate: false,
                bold: false,
                fillInfo: "#F2F2F2"
            });
            inputs[3] = CreditPositionSVG.Input({
                id: "maturity",
                input: "Maturity",
                info: getReadableDateString(params.maturity),
                xTitle: "362",
                yTitle: "500",
                xInfo: "362",
                yInfo: "400",
                rotate: true,
                bold: true,
                fillInfo: CREDIT_COLOR
            });
            inputs[4] = tokenIdInput;

            uri = constructTokenSVG(inputs, CREDIT_COLOR, CREDIT_TITLE);
        }

        string memory name = "Credit Position";

        return (constructTokenURI(name, description, uri));
    }

    function constructDebtDescription(NFTParams memory params) internal view returns (string memory) {
        string memory description = string(
            abi.encodePacked(
                "This credit position represents a debt of ",
                weiToPrecisionString(params.debtRequired, params.pair.asset().safeDecimals()),
                " ",
                params.pair.asset().safeSymbol(),
                " borrowed against a collateral of ",
                weiToPrecisionString(params.collateralLocked, params.pair.collateral().safeDecimals()),
                " ",
                params.pair.collateral().safeSymbol(),
                ". This position will expire on ",
                params.maturity.toString(),
                " unix epoch time.\\nThe owner of this NFT has the option to pay the debt before maturity time to claim the locked collateral. In case the owner choose to default on the debt payment, the collateral will be forfeited."
            )
        );

        description = string(
            abi.encodePacked(
                description,
                "\\n\\nAsset Address: ",
                addressToString(address(params.pair.asset())),
                "\\n\\nCollateral Address: ",
                addressToString(address(params.pair.collateral())),
                "\\n\\nTotal Debt: ",
                weiToPrecisionLongString(params.debtRequired, params.pair.asset().safeDecimals()),
                " ",
                IERC20(params.pair.asset()).safeSymbol(),
                "\\n\\nCollateral Locked: ",
                weiToPrecisionLongString(params.collateralLocked, params.pair.collateral().safeDecimals()),
                " ",
                IERC20(params.pair.collateral()).safeSymbol()
            )
        );

        return description;
    }

    function constructLiquidityDescription(NFTParams memory params) internal view returns (string memory) {
        string memory description = string(
            abi.encodePacked(
                "This credit position represents a liquidity of ",
                weiToPrecisionString(params.liquidityAmount, 18),
                " in the ",
                params.pair.asset().safeSymbol(),
                "/",
                params.pair.collateral().safeSymbol(),
                " pool. ",
                "This position will expire on ",
                params.maturity.toString(),
                " unix epoch time.\\nThe owner of this NFT has the option to burn the liquidity after maturity time to claim liquidity in the pool + fees."
            )
        );
        description = string(
            abi.encodePacked(
                description,
                "\\n\\nAsset Address: ",
                addressToString(address(params.pair.asset())),
                "\\n\\nCollateral Address: ",
                addressToString(address(params.pair.collateral())),
                "\\n\\nTotal liquidity amount: ",
                weiToPrecisionLongString(params.liquidityAmount, 18)
            )
        );
        return description;
    }

    function constructCreditDescription(NFTParams memory params) internal view returns (string memory) {
        string memory description = string(
            abi.encodePacked(
                "This credit position represents a credit of ",
                weiToPrecisionString(params.loanAmount, params.pair.asset().safeDecimals()),
                " ",
                params.pair.asset().safeSymbol(),
                " with an coverage of ",
                weiToPrecisionString(params.coverageAmount, params.pair.collateral().safeDecimals()),
                " ",
                params.pair.collateral().safeSymbol(),
                " in the ",
                params.pair.asset().safeSymbol(),
                "/",
                params.pair.collateral().safeSymbol(),
                " pool. ",
                "This position will expire on ",
                params.maturity.toString(),
                " unix epoch time.\\nThe owner of this NFT has the option to get the loans after maturity time."
            )
        );

        description = string(
            abi.encodePacked(
                description,
                "\\n\\nAsset Address: ",
                addressToString(address(params.pair.asset())),
                "\\n\\nCollateral Address: ",
                addressToString(address(params.pair.collateral())),
                "\\n\\nTotal loans: ",
                weiToPrecisionLongString(params.loanAmount, params.pair.asset().safeDecimals()),
                "\\n\\nTotal coverage: ",
                weiToPrecisionLongString(params.coverageAmount, params.pair.collateral().safeDecimals())
            )
        );

        return description;
    }

    function constructTokenURI(
        string memory name,
        string memory description,
        string memory imageSVG
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name,
                                '", "description":"',
                                description,
                                '", "image": "',
                                "data:image/svg+xml;base64,",
                                Base64.encode(bytes(imageSVG)),
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function constructTokenSVG(
        CreditPositionSVG.Input[] memory inputs,
        string memory color,
        string memory title
    ) internal pure returns (string memory) {
        CreditPositionSVG.SVGParams memory params = CreditPositionSVG.SVGParams({
            inputs: inputs,
            color: color,
            title: title
        });
        return CreditPositionSVG.constructSVG(params);
    }

    function weiToPrecisionLongString(uint256 weiAmt, uint256 decimal) public pure returns (string memory) {
        if (decimal == 0) {
            return string(abi.encodePacked(weiAmt.toString(), ".00"));
        }
        require(decimal >= 4, "Should have either greater than or equal to 4 decimal places or 0 decimal places");

        uint256 significantDigits = weiAmt / (10 ** decimal);
        uint256 precisionDigits = weiAmt % (10 ** (decimal));

        if (precisionDigits == 0) {
            return string(abi.encodePacked(significantDigits.toString(), ".00"));
        }

        string memory precisionDigitsString = toStringTrimmed(precisionDigits);
        uint256 lengthDiff = decimal - bytes(precisionDigits.toString()).length;
        for (uint256 i; i < lengthDiff; ) {
            precisionDigitsString = string(abi.encodePacked("0", precisionDigitsString));
            unchecked {
                ++i;
            }
        }

        return string(abi.encodePacked(significantDigits.toString(), ".", precisionDigitsString));
    }

    function weiToPrecisionString(uint256 weiAmt, uint256 decimal) public pure returns (string memory) {
        if (decimal == 0) {
            return string(abi.encodePacked(weiAmt.toString(), ".00"));
        }
        require(decimal >= 4, "Should have either greater than or equal to 4 decimal places or 0 decimal places");

        uint256 significantDigits = weiAmt / (10 ** decimal);
        if (significantDigits > 1e9) {
            string memory weiAmtString = weiAmt.toString();
            uint256 len = bytes(weiAmtString).length - 9;
            weiAmt = weiAmt / (10 ** len);
            return string(abi.encodePacked(weiAmt.toString(), "..."));
        }
        uint256 precisionDigits = weiAmt % (10 ** (decimal));
        precisionDigits = precisionDigits / (10 ** (decimal - 4));

        if (precisionDigits == 0) {
            return string(abi.encodePacked(significantDigits.toString(), ".00"));
        }

        string memory precisionDigitsString = toStringTrimmed(precisionDigits);
        uint256 lengthDiff = 4 - bytes(precisionDigits.toString()).length;
        for (uint256 i; i < lengthDiff; ) {
            precisionDigitsString = string(abi.encodePacked("0", precisionDigitsString));
            unchecked {
                ++i;
            }
        }

        return string(abi.encodePacked(significantDigits.toString(), ".", precisionDigitsString));
    }

    function toStringTrimmed(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        //slither-disable-start uninitialized-local
        uint256 digits;
        uint256 flag;
        //slither-disable-end uninitialized-local
        while (temp != 0) {
            if (flag == 0 && temp % 10 == 0) {
                temp /= 10;
                continue;
            } else if (flag == 0 && temp % 10 != 0) {
                flag++;
                digits++;
            } else {
                digits++;
            }

            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        flag = 0;
        while (value != 0) {
            if (flag == 0 && value % 10 == 0) {
                value /= 10;
                continue;
            } else if (flag == 0 && value % 10 != 0) {
                flag++;
                digits -= 1;
                buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            } else {
                digits -= 1;
                buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            }

            value /= 10;
        }
        return string(buffer);
    }

    function addressToString(address _addr) public pure returns (string memory) {
        bytes memory data = abi.encodePacked(_addr);
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i; i < data.length; ) {
            str[2 + i * 2] = alphabet[uint256(uint8(data[i] >> 4))];
            str[3 + i * 2] = alphabet[uint256(uint8(data[i] & 0x0f))];
            unchecked {
                ++i;
            }
        }
        return string(str);
    }

    function getSlice(uint256 begin, uint256 end, string memory text) public pure returns (string memory) {
        bytes memory a = new bytes(end - begin + 1);
        for (uint256 i; i <= end - begin; ) {
            a[i] = bytes(text)[i + begin - 1];
            unchecked {
                ++i;
            }
        }
        return string(a);
    }

    function parseSymbol(string memory symbol) public pure returns (string memory) {
        if (bytes(symbol).length > 5) {
            return getSlice(1, 5, symbol);
        }
        return symbol;
    }

    function getMonthString(uint256 _month) public pure returns (string memory) {
        string[12] memory months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[_month];
    }

    function getReadableDateString(uint256 timestamp) public pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day, uint256 hour, uint256 minute, uint256 second) = DateTime
            .timestampToDateTime(timestamp);

        string memory result = string(
            abi.encodePacked(
                day.toString(),
                " ",
                getMonthString(month - 1),
                " ",
                year.toString(),
                ", ",
                padWithZero(hour),
                ":",
                padWithZero(minute),
                ":",
                padWithZero(second),
                " UTC"
            )
        );
        return result;
    }

    function padWithZero(uint256 value) public pure returns (string memory) {
        if (value < 10) {
            return string(abi.encodePacked("0", value.toString()));
        }
        return value.toString();
    }
}
