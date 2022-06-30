import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { delay } from "../../scripts/misc";
import { IERC20MintableBurnable, IUniswapV2Pair, StakingPlatform } from "../../typechain-types";
import { deployStakingPlatform } from "../../scripts/test-deployment";
import { provideLiquidityForTests } from "../../scripts/provide-liquidity";

describe("unstake", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let rewardTokenOwner: SignerWithAddress;
    let staker: SignerWithAddress;
    let contract: StakingPlatform;
    let stakingToken: IUniswapV2Pair;
    let rewardToken: IERC20MintableBurnable;
    let availableLpTokenBalance: BigNumber;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        rewardTokenOwner = accounts[0];
        owner = accounts[1];
        staker = accounts[2];

        [stakingToken, rewardToken] =
            await provideLiquidityForTests(staker, rewardTokenOwner);

        availableLpTokenBalance = await stakingToken.balanceOf(staker.address);

        contract = await deployStakingPlatform(
            stakingToken.address, 
            rewardToken.address,
            owner
        );
        contract = contract.connect(staker);

        await rewardToken.connect(rewardTokenOwner)
            .mint(contract.address, BigNumber.from("1000000000000000"));
    });

    it("should revert if staked amount = 0", async () => {
        const tx = contract.unstake();
        await expect(tx).to.be.revertedWith("Cannot unstake yet");
    });

    it("should revert if too early", async () => {
        //environment
        const halfOfAmount = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * halfOfAmount);
        await contract.stake(halfOfAmount);
        //current test settings
        const unstakeDelay = await contract.getUnstakeDelay();
        await delay(unstakeDelay, -60);//-60 seconds
        //action
        const tx = contract.unstake();
        //checks
        await expect(tx).to.be.revertedWith("Cannot unstake yet");
    });

    it("should reset staked amount to 0", async () => {
        //environment
        const halfOfAmount = Math.floor(availableLpTokenBalance.toNumber() / 2);
        await stakingToken.approve(contract.address, 2 * halfOfAmount);
        await contract.stake(halfOfAmount);
        //current test settings
        const unstakeDelay = await contract.getUnstakeDelay();
        await delay(unstakeDelay, 60);//+60 seconds
        //action
        await contract.unstake();
        //checks
        let [stakedAmount, , ,] = await contract.getDetails();
        expect(stakedAmount.toNumber()).eq(0);
    });

    it("should calculate reward", async () => {
        //environment
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);
        //current test settings
        const rewardPercentage = await contract.getRewardPercentage();
        const rewardDelay = await contract.getRewardDelay();
        const unstakeDelay = await contract.getUnstakeDelay();
        await delay(unstakeDelay, 60);//+60 seconds
        const periods = Math.floor(
            unstakeDelay.toNumber() / rewardDelay.toNumber()
        );
        let expectedReward =
            Math.floor(oneThird * periods * rewardPercentage.toNumber() / 100);
        //action
        await contract.unstake();
        //checks
        let [, actualReward, ,] = await contract.getDetails();
        expect(actualReward.toNumber()).eq(expectedReward);
    });

    it("shouldn't calculate reward if too early", async () => {
        
        await contract.connect(owner).grantRole(await contract.CONFIGURATOR_ROLE(), owner.address);

        //current test settings
        const rewardDelay = await contract.getRewardDelay();
        const moreThanUnstakeDelayLessThanRewardDelay = 
            rewardDelay.sub(60);//-60 seconds
        const newUnstakeDelay = 
            moreThanUnstakeDelayLessThanRewardDelay.toNumber() - 60;
        await contract.connect(owner).setUnstakeDelay(newUnstakeDelay);
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);
        await contract.stake(oneThird);

        await delay(moreThanUnstakeDelayLessThanRewardDelay);
        //action
        let expectedReward = 0;
        await contract.unstake();
        //checks
        let [, actualReward, ,] = await contract.getDetails();
        expect(actualReward.toNumber()).eq(expectedReward);
    });

    it("should accumulate rewards", async () => {
        const rewardPercentage = await contract.getRewardPercentage();
        const rewardDelay = await contract.getRewardDelay();
        const unstakeDelay = await contract.getUnstakeDelay();
        const periods = Math.floor(
            unstakeDelay.toNumber() / rewardDelay.toNumber()
        );
        const oneThird = Math.floor(availableLpTokenBalance.toNumber() / 3);
        await stakingToken.approve(contract.address, 3 * oneThird);

        //stake #1
        await contract.stake(oneThird);
        await delay(rewardDelay, 30);
        //stake #2 should calculate reward
        await contract.stake(oneThird);
        let [, actualReward, ,] = await contract.getDetails();
        let expectedReward = actualReward.toNumber() +
            Math.floor(2*oneThird * periods * rewardPercentage.toNumber() / 100);
        
        await delay(unstakeDelay, 30);
        //stake #3 should calculate again and increase prev amount
        await contract.unstake();
        [, actualReward, ,] = await contract.getDetails();
        expect(actualReward.toNumber()).eq(expectedReward);
    });
});