import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";

export function toDate(i: BigNumber) { return new Date(i.toNumber() * 1000); }

export async function delay(delayInSeconds:BigNumber,extraSeconds:number=0) {
    await network.provider.send(
        "evm_increaseTime",
        [delayInSeconds.toNumber() + extraSeconds]//+extra seconds
    );
}

export async function setTimeInBlockchain(delay:number = 500) {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const nextTimestamp = blockBefore.timestamp + delay;
    await network.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);

    return nextTimestamp;
}