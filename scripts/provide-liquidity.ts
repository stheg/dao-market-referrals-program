import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IERC20, IERC20MintableBurnable, IUniswapV2Factory, IUniswapV2Pair, IUniswapV2Router02 } from "../typechain-types";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { deployERC20Token } from "./test-deployment";

export async function getFactory(
    signer:SignerWithAddress, 
    atAddress:string | undefined = undefined
):Promise<IUniswapV2Factory> {
    return await ethers.getContractAt(
        "IUniswapV2Factory",
        atAddress ?? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        signer
    ) as IUniswapV2Factory;
}

export async function getRouter(
    signer:SignerWithAddress, 
    atAddress:string | undefined = undefined
):Promise<IUniswapV2Router02> {
    return await ethers.getContractAt(
        "IUniswapV2Router02",
        atAddress ?? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        signer
    ) as IUniswapV2Router02;
}

export async function provideLiquidity(
    provider:SignerWithAddress, 
    tokenA:IERC20,
    amountA:number,
    tokenB:IERC20,
    amountB:number,
    uniFactory: IUniswapV2Factory,
    uniRouter: IUniswapV2Router02
): Promise<IUniswapV2Pair> {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const deadline = blockBefore.timestamp + 30;//+30 sec

    await tokenA.connect(provider).approve(uniRouter.address, amountA);
    await tokenB.connect(provider).approve(uniRouter.address, amountB);

    await uniRouter.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        amountA,
        amountB,
        provider.address,
        deadline
    );

    let lpTokenAddr = await uniFactory.getPair(tokenA.address, tokenB.address);
    const lpToken = await ethers.getContractAt(
        "IUniswapV2Pair",
        lpTokenAddr,
        provider
    ) as IUniswapV2Pair;

    return lpToken;
}

export async function provideLiquidityETH(
    liqProvider: SignerWithAddress,
    token: IERC20,
    tokenAmount: BigNumber,
    ethAmount: BigNumber,
    uniFactory: IUniswapV2Factory,
    uniRouter: IUniswapV2Router02
): Promise<IUniswapV2Pair> {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const deadline = blockBefore.timestamp + 180;

    await token.connect(liqProvider).approve(uniRouter.address, tokenAmount);

    await uniRouter.addLiquidityETH(
        token.address,
        tokenAmount,
        tokenAmount,
        ethAmount,
        liqProvider.address,
        deadline
    ,{value:ethAmount});

    const wethTokenAddr = await uniRouter.WETH();

    let lpTokenAddr = await uniFactory.getPair(token.address, wethTokenAddr);
    const lpToken = await ethers.getContractAt(
        "IUniswapV2Pair",
        lpTokenAddr,
        liqProvider
    ) as IUniswapV2Pair;

    return lpToken;
}

export async function provideLiquidityForTests(staker: SignerWithAddress, rewardTokenOwner: SignerWithAddress): Promise<[IUniswapV2Pair, IERC20MintableBurnable]> {
    const liquidityAmount = BigNumber.from("10000");

    const rewardToken = await deployERC20Token("SToken", 18, rewardTokenOwner);
    await rewardToken.mint(staker.address, liquidityAmount);

    const stakingToken = await provideLiquidityETH(
        staker,
        rewardToken,
        BigNumber.from(liquidityAmount),
        ethers.utils.parseEther("0.00001").mul(liquidityAmount),
        await getFactory(staker),
        await getRouter(staker)
    );
    return [stakingToken, rewardToken];
}