import * as LiquidityMath from "../librariesPeriphery/LiquidityMath";
import { LiquidityGivenAssetParams, NewLiquidityParams, RemoveLiquidityParams } from "../types";
const MAXUINT112: bigint = 2n ** 112n;

export function newLiquiditySuccess(newLiquidityParams: NewLiquidityParams, currentTime: bigint, maturity: bigint) {
  if (newLiquidityParams.assetIn <= 0 || newLiquidityParams.debtIn - newLiquidityParams.assetIn <= 0) {
    return false;
  }
  const maybeLiqudityParams = LiquidityMath.getNewLiquidityParams(
    newLiquidityParams.assetIn,
    newLiquidityParams.debtIn,
    newLiquidityParams.collateralIn,
    currentTime,
    maturity
  );
  if (maybeLiqudityParams != false) {
    const { xIncreaseNewLiquidity, yIncreaseNewLiquidity, zIncreaseNewLiquidity } = maybeLiqudityParams;

    if (
      !(
        xIncreaseNewLiquidity > 0n &&
        xIncreaseNewLiquidity < MAXUINT112 &&
        yIncreaseNewLiquidity > 0n &&
        zIncreaseNewLiquidity > 0n &&
        yIncreaseNewLiquidity < MAXUINT112 &&
        zIncreaseNewLiquidity < MAXUINT112
      )
    ) {
      return false;
    }
    const collateral = LiquidityMath.getCollateralAddLiquidity(
      { x: newLiquidityParams.assetIn, y: yIncreaseNewLiquidity, z: zIncreaseNewLiquidity },
      maturity,
      currentTime
    );
    const debt = LiquidityMath.getDebtAddLiquidity(
      { x: newLiquidityParams.assetIn, y: yIncreaseNewLiquidity, z: zIncreaseNewLiquidity },
      maturity,
      currentTime
    );
    if (!(collateral > 0n && debt > 0n && collateral < MAXUINT112 && debt < MAXUINT112)) {
      return false;
    }
    return true;
  }
  return false;
}

export function newLiquidityError(newLiquidityParams: NewLiquidityParams, currentTime: bigint, maturity: bigint) {
  if (newLiquidityParams.assetIn < 0 || newLiquidityParams.debtIn - newLiquidityParams.assetIn <= 0) {
    return { data: newLiquidityParams, error: "E516" };
  }
  const maybeNewLiquidityParams = LiquidityMath.getNewLiquidityParams(
    newLiquidityParams.assetIn,
    newLiquidityParams.debtIn,
    newLiquidityParams.collateralIn,
    currentTime,
    maturity
  );
  if (maybeNewLiquidityParams != false) {
    const { xIncreaseNewLiquidity, yIncreaseNewLiquidity, zIncreaseNewLiquidity } = maybeNewLiquidityParams;

    if (!(yIncreaseNewLiquidity < MAXUINT112 && zIncreaseNewLiquidity < MAXUINT112)) {
      return { data: newLiquidityParams, error: "" };
    }

    if (!(yIncreaseNewLiquidity > 0n && zIncreaseNewLiquidity > 0n)) {
      return { data: newLiquidityParams, error: "" };
    }

    return { data: newLiquidityParams, error: "" };
  }
}

export function addLiquiditySuccess(
  liquidityParams: { newLiquidityParams: NewLiquidityParams; liquidityGivenAssetParams: LiquidityGivenAssetParams },
  currentTimeNL: bigint,
  currentTimeAL: bigint,
  maturity: bigint
) {
  const { newLiquidityParams, liquidityGivenAssetParams } = liquidityParams;

  if (
    liquidityGivenAssetParams.assetIn <= 0 ||
    liquidityGivenAssetParams.maxDebt <= 0 ||
    liquidityGivenAssetParams.maxCollateral <= 0 ||
    liquidityGivenAssetParams.minLiquidity <= 0
  ) {
    return false;
  }
  const maybeParams = LiquidityMath.getNewLiquidityParams(
    newLiquidityParams.assetIn,
    newLiquidityParams.debtIn,
    newLiquidityParams.collateralIn,
    currentTimeNL,
    maturity
  );
  if (maybeParams != false) {
    const { yIncreaseNewLiquidity, zIncreaseNewLiquidity } = maybeParams;
    const state = { x: newLiquidityParams.assetIn, y: yIncreaseNewLiquidity, z: zIncreaseNewLiquidity };
    const { yIncreaseAddLiquidity, zIncreaseAddLiquidity } = LiquidityMath.getLiquidityGivenAssetParams(
      state,
      liquidityGivenAssetParams.assetIn,
      0n
    );

    if (
      !(
        yIncreaseAddLiquidity > 0n &&
        zIncreaseAddLiquidity > 0n &&
        yIncreaseAddLiquidity + state.y < MAXUINT112 &&
        zIncreaseAddLiquidity + state.z < MAXUINT112 &&
        liquidityGivenAssetParams.assetIn + state.x < MAXUINT112
      )
    ) {
      return false;
    }

    const delState = { x: liquidityGivenAssetParams.assetIn, y: yIncreaseAddLiquidity, z: zIncreaseAddLiquidity };
    const liquidityNew = LiquidityMath.getInitialLiquidity(state.x);
    const debt = LiquidityMath.getDebtAddLiquidity(delState, maturity, currentTimeAL);
    const collateral = LiquidityMath.getCollateralAddLiquidity(delState, maturity, currentTimeAL);
    const liquidityAdd = LiquidityMath.getLiquidity(state, delState, currentTimeAL, maturity);

    if (
      typeof liquidityAdd == "string" ||
      liquidityGivenAssetParams.maxDebt < debt ||
      liquidityGivenAssetParams.maxCollateral < collateral ||
      liquidityGivenAssetParams.minLiquidity >= liquidityAdd ||
      debt > MAXUINT112 ||
      collateral > MAXUINT112
    )
      return false;

    return true;
  }
  return false;
}

export function addLiquidityError(
  liquidityParams: { newLiquidityParams: NewLiquidityParams; liquidityGivenAssetParams: LiquidityGivenAssetParams },
  currentTimeNL: bigint,
  currentTimeAL: bigint,
  maturity: bigint
) {
  const { newLiquidityParams, liquidityGivenAssetParams } = liquidityParams;

  if (
    liquidityGivenAssetParams.assetIn <= 0 ||
    liquidityGivenAssetParams.maxDebt <= 0 ||
    liquidityGivenAssetParams.maxCollateral <= 0 ||
    liquidityGivenAssetParams.minLiquidity <= 0
  ) {
    return { data: liquidityParams, error: "" };
  }
  const maybeParams = LiquidityMath.getNewLiquidityParams(
    newLiquidityParams.assetIn,
    newLiquidityParams.debtIn,
    newLiquidityParams.collateralIn,
    currentTimeNL,
    maturity
  );
  if (maybeParams != false) {
    const { xIncreaseNewLiquidity, yIncreaseNewLiquidity, zIncreaseNewLiquidity } = maybeParams;
    const state = { x: xIncreaseNewLiquidity, y: yIncreaseNewLiquidity, z: zIncreaseNewLiquidity };
    const { yIncreaseAddLiquidity, zIncreaseAddLiquidity } = LiquidityMath.getLiquidityGivenAssetParams(
      state,
      liquidityGivenAssetParams.assetIn,
      0n
    );

    if (
      !(
        yIncreaseAddLiquidity + state.y < MAXUINT112 &&
        zIncreaseAddLiquidity + state.z < MAXUINT112 &&
        liquidityGivenAssetParams.assetIn + state.x < MAXUINT112
      )
    ) {
      return { data: liquidityParams, error: "" };
    }

    if (!(yIncreaseAddLiquidity > 0n && zIncreaseAddLiquidity > 0n)) {
      return { data: liquidityParams, error: "" };
    }

    const delState = { x: liquidityGivenAssetParams.assetIn, y: yIncreaseAddLiquidity, z: zIncreaseAddLiquidity };
    const liquidityNew = LiquidityMath.getInitialLiquidity(state.x);
    const debt = LiquidityMath.getDebtAddLiquidity(delState, maturity, currentTimeAL);
    const collateral = LiquidityMath.getCollateralAddLiquidity(delState, maturity, currentTimeAL);
    const liquidityAdd = LiquidityMath.getLiquidity(state, delState, currentTimeAL, maturity);

    if (debt > MAXUINT112 || collateral > MAXUINT112) {
      return { data: liquidityParams, error: "" };
    }

    if (liquidityGivenAssetParams.minLiquidity > liquidityAdd) {
      return { data: liquidityParams, error: "E511" };
    }

    if (liquidityGivenAssetParams.maxDebt < debt) {
      return { data: liquidityParams, error: "E512" };
    }

    if (liquidityGivenAssetParams.maxCollateral < collateral) {
      return { data: liquidityParams, error: "E513" };
    }

    return { data: liquidityParams, error: "" };
  }
  return { data: liquidityParams, error: "" };
}
export function removeLiquiditySuccess(
  liquidityParams: { newLiquidityParams: NewLiquidityParams; creditPositionId: bigint },
  currentTime: bigint,
  maturity: bigint
) {
  const { newLiquidityParams, creditPositionId } = liquidityParams;

  const maybeNewLiquidityParams = LiquidityMath.getNewLiquidityParams(
    newLiquidityParams.assetIn,
    newLiquidityParams.debtIn,
    newLiquidityParams.collateralIn,
    currentTime,
    maturity
  );
  if (maybeNewLiquidityParams != false) {
    return true;
  }
  return false;
}

export function removeLiquidityError(
  liquidityParams: { newLiquidityParams: NewLiquidityParams; removeLiquidityParams: RemoveLiquidityParams },
  currentTime: bigint,
  maturity: bigint
) {
  if (liquidityParams.removeLiquidityParams.liquidityIn === 0n) {
    return { data: liquidityParams, error: "E205" };
  }

  const { newLiquidityParams, removeLiquidityParams } = liquidityParams;
  if (removeLiquidityParams.liquidityIn <= 0) return { data: liquidityParams, error: "" };
  const maybeNewLiquidityParams = LiquidityMath.getNewLiquidityParams(
    newLiquidityParams.assetIn,
    newLiquidityParams.debtIn,
    newLiquidityParams.collateralIn,
    currentTime,
    maturity
  );
  if (maybeNewLiquidityParams != false) {
    const { yIncreaseNewLiquidity, zIncreaseNewLiquidity } = maybeNewLiquidityParams;
    const state = { x: newLiquidityParams.assetIn, y: yIncreaseNewLiquidity, z: zIncreaseNewLiquidity };
    const liquidity = LiquidityMath.getInitialLiquidity(state.x);
    if (removeLiquidityParams.liquidityIn > liquidity) return { data: liquidityParams, error: "panic code 0x11" };
  }
  return { data: liquidityParams, error: "" };
}

export default {
  addLiquiditySuccess,
  newLiquiditySuccess,
  // removeLiquiditySuccess,
};
