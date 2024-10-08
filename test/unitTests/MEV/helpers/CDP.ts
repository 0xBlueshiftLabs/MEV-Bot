import { BigNumber } from "ethers";

export function calculateCdp(
  x: BigNumber,
  z: BigNumber,
  assetPrice: BigNumber,
  collateralPrice: BigNumber,
  assetDecimals: number,
  collateralDecimals: number
) {
  return BigNumber.from(100)
    .mul(z.mul(collateralPrice).mul((10 ** assetDecimals).toString()))
    .div(x.mul(assetPrice))
    .div((10 ** collateralDecimals).toString());
}
