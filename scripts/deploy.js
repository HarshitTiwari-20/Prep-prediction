import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Set platform fee wallet (default to deployer for testing)
  const feeWallet = process.env.FEE_WALLET || deployer.address;
  console.log("Fee wallet set to:", feeWallet);

  // 1. Deploy Mock Tokens for testing on X Layer Testnet
  console.log("Deploying Mock USDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  console.log("Mock USDT deployed to:", await usdt.getAddress());

  console.log("Deploying Mock USDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("Mock USDC deployed to:", await usdc.getAddress());

  console.log("Deploying Mock SOL...");
  const MockSOL = await hre.ethers.getContractFactory("MockSOL");
  const sol = await MockSOL.deploy();
  await sol.waitForDeployment();
  console.log("Mock SOL deployed to:", await sol.getAddress());

  console.log("Deploying Mock TON...");
  const MockTON = await hre.ethers.getContractFactory("MockTON");
  const ton = await MockTON.deploy();
  await ton.waitForDeployment();
  console.log("Mock TON deployed to:", await ton.getAddress());

  // 2. Deploy PredictionPool contract
  console.log("Deploying PredictionPool...");
  const PredictionPool = await hre.ethers.getContractFactory("PredictionPool");
  const pool = await PredictionPool.deploy(feeWallet);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("PredictionPool deployed to:", poolAddress);

  console.log("Deployment finished successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
