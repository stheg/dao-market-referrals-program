import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { IERC20MintableBurnable, StakingPlatform } from "../typechain-types";

export async function testDeployERC20(name: string, dec:number, owner: SignerWithAddress)
    : Promise<IERC20MintableBurnable> {
    const contractFactory =
        await ethers.getContractFactory("Token", owner);
    const contract = await contractFactory.deploy(name, name, dec) as IERC20MintableBurnable;
    await contract.deployed();
    return contract;
}

export async function deployStakingPlatform(
    tokenToStakeAddr:string, 
    rewardTokenAddr:string, 
    owner:SignerWithAddress
):Promise<StakingPlatform> {
    const contractFactory = 
        await ethers.getContractFactory("StakingPlatform", owner);
    const contract = await contractFactory.deploy(tokenToStakeAddr, rewardTokenAddr) as StakingPlatform;
    
    await contract.deployed();
    
    return contract;
}