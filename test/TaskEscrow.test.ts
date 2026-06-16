import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("TaskEscrow", function () {
  async function deployFixture() {
    const [owner, customer, hustler] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    // Deploy as Mock USDC with 6 decimals — matching Celo Sepolia USDC
    const token = await MockToken.deploy("Mock USDC", "USDC", 6);
    await token.waitForDeployment();

    const Escrow = await ethers.getContractFactory("TaskEscrow");
    const escrow = await Escrow.deploy(await token.getAddress(), owner.address, 250);
    await escrow.waitForDeployment();

    // Mint 10,000 USDC (6 decimals)
    await token.mint(customer.address, ethers.parseUnits("10000", 6));
    await token.connect(customer).approve(await escrow.getAddress(), ethers.MaxUint256);

    return { owner, customer, hustler, token, escrow };
  }

  it("creates escrow and releases payment to hustler", async function () {
    const { customer, hustler, token, escrow } = await loadFixture(deployFixture);
    // 5,000 USDC (6 decimals)
    const amount = ethers.parseUnits("5000", 6);
    const taskRef = ethers.id("task-123");

    await expect(escrow.connect(customer).createEscrow(taskRef, amount))
      .to.emit(escrow, "EscrowCreated")
      .withArgs(1, taskRef, customer.address, amount);

    await escrow.connect(customer).assignHustler(1, hustler.address);

    const fee = (amount * 250n) / 10_000n;
    const payout = amount - fee;

    await expect(escrow.connect(customer).releaseEscrow(1))
      .to.emit(escrow, "EscrowReleased")
      .withArgs(1, hustler.address, payout, fee);

    expect(await token.balanceOf(hustler.address)).to.equal(payout);
  });

  it("cancels funded escrow and refunds customer", async function () {
    const { customer, token, escrow } = await loadFixture(deployFixture);
    // 3,000 USDC (6 decimals)
    const amount = ethers.parseUnits("3000", 6);
    const taskRef = ethers.id("task-cancel");

    await escrow.connect(customer).createEscrow(taskRef, amount);
    await escrow.connect(customer).cancelEscrow(1);

    // Customer should get back their full 10,000 USDC
    expect(await token.balanceOf(customer.address)).to.equal(ethers.parseUnits("10000", 6));
  });
});
