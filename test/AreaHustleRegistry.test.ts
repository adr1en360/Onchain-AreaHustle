import { expect } from "chai";
import { ethers } from "hardhat";

describe("AreaHustleRegistry", function () {
  it("registers customer and hustler profiles", async function () {
    const [customer, hustler] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("AreaHustleRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    await registry.connect(customer).register(1, "Ada Customer");
    await registry.connect(hustler).register(2, "Emeka Hustler");

    expect(await registry.isRegistered(customer.address)).to.equal(true);
    expect(await registry.isRegistered(hustler.address)).to.equal(true);

    const profile = await registry.getProfile(customer.address);
    expect(profile[0]).to.equal(1n);
    expect(profile[2]).to.equal("Ada Customer");
  });

  it("rejects duplicate registration", async function () {
    const [user] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("AreaHustleRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    await registry.connect(user).register(1, "Once");
    await expect(registry.connect(user).register(1, "Twice")).to.be.revertedWith("Already registered");
  });
});
