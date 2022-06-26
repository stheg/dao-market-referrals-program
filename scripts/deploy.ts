import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { getFactory, getRouter, provideLiquidityETH } from "./provide-liquidity";
import { deployERC20Token } from "./test-deployment";

async function main() {
    const [owner] = await ethers.getSigners();

    const acdmToken = await deployERC20Token("ACDM", 6, owner);
    const rewardToken = await deployERC20Token("SToken", 18, owner);

    const liquidityAmount = BigNumber.from("10000");
    await rewardToken.mint(owner.address, liquidityAmount);

    const voteToken = await provideLiquidityETH(
        owner,
        rewardToken,
        BigNumber.from(liquidityAmount),
        ethers.utils.parseEther("0.00001").mul(liquidityAmount),
        await getFactory(owner),
        await getRouter(owner)
    );

    const factory = await ethers.getContractFactory("ACDMPlatform", owner);
    const contract = await factory.deploy(
        acdmToken.address,
        owner.address, 
        voteToken.address,
        rewardToken.address
    );
    await contract.deployed();
    await contract.grantRole(await contract.CONFIGURATOR_ROLE(), contract.address);
    await acdmToken.mint(contract.address, await contract.getSaleRoundAmount());

    console.log("ACDM Token deployed to: " + acdmToken.address);
    console.log("Reward Token deployed to: " + rewardToken.address);
    console.log("Vote Token deployed to: " + voteToken.address);
    console.log("ACDMPlatform deployed to: " + contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
