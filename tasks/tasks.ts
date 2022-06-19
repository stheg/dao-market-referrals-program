import { task } from "hardhat/config";

task("deposit", "Transfers vote-tokens to the contract to use them in votings")
    .addParam("contract", "Address of the contract")
    .addParam("amount", "Amount of tokens to be deposited")
    .addFlag("approve", "Auto-approve requested amount before deposit action")
    .addOptionalParam("user", "User address")
    .setAction(async (args, hre) => {
        // let [owner, user1, user2] = await hre.ethers.getSigners();
        // if (args.user)
        //     user1 = await hre.ethers.getSigner(args.user);

        // const contract = 
        //     await hre.ethers.getContractAt("MADAO", args.contract, user1);
        
        // const voteToken = await hre.ethers.getContractAt(
        //     "IERC20", 
        //     await contract.getVoteToken(), 
        //     user1
        // );
        
        // if (args.approve)
        //     await voteToken.approve(contract.address, args.amount);

        // await contract.deposit(args.amount);

        console.log("done");
    });
