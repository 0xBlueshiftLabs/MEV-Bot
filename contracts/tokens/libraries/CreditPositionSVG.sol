// SPDX-License-Identifier: BUSL-1.1
/* solhint-disable quotes, max-line-length */

import "../interfaces/ICreditPositionManager.sol";

pragma solidity =0.8.20;

library CreditPositionSVG {
    struct SVGParams {
        Input[] inputs;
        string color;
        string title;
    }

    struct Input {
        string id;
        string input;
        string info;
        string xTitle;
        string yTitle;
        string xInfo;
        string yInfo;
        bool rotate;
        bool bold;
        string fillInfo;
    }

    string constant BEGINNING =
        string('<svg width="417" height="609" viewBox="0 0 417 609" fill="none" xmlns="http://www.w3.org/2000/svg">');

    string constant END =
        string(
            '<g filter="url(#filter0_d_1838_20465)"><path d="M341.412 20.5206H370.418C382.568 20.5206 392.418 30.3704 392.418 42.5206V101.959" stroke="#FFBD13" stroke-miterlimit="1.41421" stroke-linecap="round"/></g><g filter="url(#filter1_d_1838_20465)"><path d="M341.412 20.5205H370.418C382.568 20.5205 392.418 30.3702 392.418 42.5205V101.959" stroke="#FFBD13" stroke-miterlimit="1.41421" stroke-linecap="round"/></g><g filter="url(#filter2_d_1838_20465)"><path d="M315.241 20.5205H370.418C382.568 20.5205 392.418 30.3702 392.418 42.5205V122.998" stroke="#FFBD13" stroke-miterlimit="1.41421" stroke-linecap="round"/></g><g filter="url(#filter3_d_1838_20465)"><path d="M315.241 20.5205H370.418C382.568 20.5205 392.418 30.3702 392.418 42.5205V122.998" class="S" stroke-width="2" stroke-miterlimit="1.41421" stroke-linecap="round"/></g><path d="M1 25C1 16.7157 7.71573 10 16 10H200L315.611 10C322.318 10 327.758 15.431 327.769 22.1378C327.782 29.9479 334.117 36.2723 341.927 36.2723H362.791C371.075 36.2723 377.791 42.988 377.791 51.2723V105.501C377.791 111.917 382.974 117.128 389.39 117.162C394.706 117.191 399 121.508 399 126.824V309V593C399 601.284 392.284 608 384 608H16C7.71574 608 1 601.284 1 593V25Z" fill="black" stroke="#2B2D2F" stroke-width="2"/><use href="#pair" /><use href="#title" /><use href="#tokenid" /><use href="#firstdata"/><use href="#seconddata"/><use href="#maturity" /><rect x="112.864" y="213.734" width="173.392" height="173.392" rx="86.696" fill="#0F0F0F"/><g filter="url(#filter4_d_1838_20465)"><path d="M276.262 301.273C276.262 321.837 268.08 340.49 254.794 354.153M200.403 377.132C175.785 377.132 153.905 365.405 140.046 347.232C130.32 334.478 124.544 318.55 124.544 301.273M164.689 234.331C175.332 228.64 187.491 225.414 200.403 225.414C237.182 225.414 267.847 251.587 274.79 286.323M276.266 301.273C276.266 321.837 268.084 340.489 254.797 354.153" class="S" stroke-width="2.70925" stroke-linecap="round"/></g><g opacity="0.3"><path fill-rule="evenodd" clip-rule="evenodd" d="M192.652 235.79C185.642 236.553 177.16 239.117 170.412 242.513C165.627 244.921 158.745 249.581 156.475 251.95L155.12 253.364L161.181 259.439L167.242 265.513L169.146 263.974C186.716 249.765 210.812 249.191 228.394 262.561L232.204 265.458L238.256 259.369L244.308 253.279L241.961 251.133C234.99 244.757 223.985 239.288 213.314 236.899C209.139 235.965 197.025 235.314 192.652 235.79ZM191.481 266.311C187.758 267.125 180.645 270.562 178.094 272.781L176.216 274.415L182.248 280.483L188.28 286.551L191.589 284.855C194.775 283.223 194.76 282.826 199.558 282.826C202.75 282.826 204.941 283.205 207.966 284.876L211.07 286.592L217.123 280.504L223.176 274.415L221.298 272.781C218.842 270.646 211.796 267.261 207.817 266.307C203.938 265.375 195.753 265.378 191.481 266.311ZM171.511 279.511C163.611 289.857 162.336 304.583 168.308 316.5C169.271 318.422 170.849 320.899 171.815 322.005L173.572 324.016L179.71 317.907L185.848 311.797L184.725 310.145C181.168 304.91 181.167 296.163 184.723 290.929L185.844 289.28L179.863 283.285C176.573 279.988 173.729 277.291 173.544 277.291C173.358 277.291 172.443 278.29 171.511 279.511ZM195.437 295.722C192.42 298.494 192.424 302.73 195.446 305.383C198.321 307.908 201.735 307.771 204.366 305.024C206.921 302.357 206.74 298.282 203.954 295.722C202.498 294.385 201.971 294.196 199.696 294.196C197.42 294.196 196.894 294.385 195.437 295.722ZM210.027 315.164C208.475 316.365 205.295 317.599 202.395 318.125C198.869 318.764 195.067 318.092 191.112 316.128L188.164 314.665L182.307 320.507C179.086 323.721 176.45 326.575 176.45 326.85C176.45 327.405 182.792 331.652 185.387 332.834C192.228 335.951 202.039 336.599 209.371 334.419C214.785 332.809 222.867 328.281 222.923 326.827C222.933 326.565 220.247 323.67 216.954 320.394C211.262 314.732 210.92 314.474 210.027 315.164ZM229.432 337.803C213.033 351.385 188.156 351.69 170.868 338.518C169.043 337.128 167.384 335.991 167.18 335.991C166.976 335.991 164.179 338.627 160.965 341.85L155.121 347.708L156.511 349.176C160.575 353.47 171.716 359.955 179.287 362.436C186.576 364.824 190.154 365.331 199.696 365.331C209.238 365.331 212.817 364.823 220.105 362.435C227.716 359.941 236.608 354.851 242.584 349.569L244.49 347.885L238.355 341.703C234.982 338.303 232.194 335.538 232.16 335.558C232.126 335.578 230.899 336.588 229.432 337.803Z" class="M"/><path d="M135.328 290.441C137.122 279.114 142.607 267.147 149.853 258.755C151.089 257.323 152.242 256.152 152.417 256.152C152.84 256.152 164.255 267.55 164.255 267.972C164.255 268.153 163.091 269.846 161.669 271.736C157.59 277.156 155.101 282.34 153.143 289.494C151.827 294.301 151.954 307.169 153.369 312.505C154.734 317.647 158.863 326.016 161.886 329.765C163.189 331.381 164.255 332.863 164.255 333.059C164.255 333.256 161.617 336.048 158.392 339.265L152.53 345.113L150.617 343.249C144.752 337.535 138.265 324.576 135.802 313.655C134.645 308.521 134.396 296.325 135.328 290.441Z" class="M"/><path d="M225.148 276.717L229.571 272.316C232.003 269.896 234.239 267.911 234.539 267.904C235.691 267.879 240.665 274.896 243.19 280.108C251.27 296.788 248.484 317.995 236.436 331.524L234.763 333.402L230.269 328.95C227.797 326.502 225.775 324.318 225.775 324.098C225.775 323.878 226.481 322.818 227.344 321.741C231.806 316.176 234.683 307.848 234.694 300.464C234.704 293.697 231.084 283.604 226.911 278.762L225.148 276.717Z" class="M"/></g><defs><filter id="filter0_d_1838_20465" x="317.912" y="1.02063" width="98.0062" height="128.438" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4"/><feGaussianBlur stdDeviation="11.5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.741176 0 0 0 0 0.905882 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1838_20465"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1838_20465" result="shape"/></filter><filter id="filter1_d_1838_20465" x="317.912" y="1.02051" width="98.0062" height="128.438" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4"/><feGaussianBlur stdDeviation="11.5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.741176 0 0 0 0 0.905882 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1838_20465"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1838_20465" result="shape"/></filter><filter id="filter2_d_1838_20465" x="291.741" y="1.02051" width="124.177" height="149.477" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4"/><feGaussianBlur stdDeviation="11.5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.741176 0 0 0 0 0.905882 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1838_20465"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1838_20465" result="shape"/></filter><filter id="filter3_d_1838_20465" x="291.241" y="0.520508" width="125.177" height="150.477" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4"/><feGaussianBlur stdDeviation="11.5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.741176 0 0 0 0 0.905882 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1838_20465"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1838_20465" result="shape"/></filter><filter id="filter4_d_1838_20465" x="115.062" y="215.932" width="170.686" height="170.683" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="4.06387"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.741176 0 0 0 0 0.905882 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1838_20465"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1838_20465" result="shape"/></filter></defs></svg>'
        );

    // slither-disable-next-line encode-packed-collision
    function constructSVG(SVGParams memory params) public pure returns (string memory) {
        return string(abi.encodePacked(BEGINNING, generateStyles(params), generatesDefs(params), END));
    }

    function generatesDefs(SVGParams memory params) internal pure returns (string memory) {
        string memory textFields;

        for (uint i = 0; i < params.inputs.length; i++) {
            textFields = string(abi.encodePacked(textFields, generateTextField(params.inputs[i])));
        }

        return string(abi.encodePacked("<defs>", params.title, textFields, "</defs>"));
    }

    function generateStyles(SVGParams memory params) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<style type="text/css" >.M{fill:',
                    params.color,
                    "}.S{stroke:",
                    params.color,
                    "}</style>"
                )
            );
    }

    function generateTextField(Input memory input) internal pure returns (string memory) {
        string memory titleField = string(
            abi.encodePacked(
                '<g opacity="0.8" id="',
                input.id,
                '">',
                '<text transform="translate(',
                input.xTitle,
                " ",
                input.yTitle,
                input.rotate ? ') rotate(-90)" ' : ')" ',
                ' fill="#F4F4F4" xml:space="preserve" style="white-space: pre" font-family="Courier New" font-size="16" font-weight="bold" letter-spacing="0em"><tspan x="0" y="16.2578">',
                input.input,
                "</tspan></text>"
            )
        );

        string memory infoField = string(
            abi.encodePacked(
                '<text transform="translate(',
                input.xInfo,
                " ",
                input.yInfo,
                input.rotate ? ') rotate(-90)" ' : ')" ',
                'fill="',
                input.fillInfo,
                '" xml:space="preserve" style="white-space: pre" font-family="Courier New" font-size="16" letter-spacing="0em"',
                input.bold ? ' font-weight="bold" ' : "",
                '><tspan x="0" y="16.2578">',
                input.info,
                "</tspan></text>",
                "</g>"
            )
        );

        return string(abi.encodePacked(titleField, infoField));
    }
}
