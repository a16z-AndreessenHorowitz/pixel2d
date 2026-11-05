import { expect } from 'chai'
import { ethers } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { PixelFarmToken } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('🌾 PixelFarmToken ($PIXEL) ERC-20 Smart Contract Test Suite', function () {
  let pixelToken: PixelFarmToken
  let owner: SignerWithAddress
  let backendSigner: SignerWithAddress
  let player1: SignerWithAddress
  let player2: SignerWithAddress
  let fakeSigner: SignerWithAddress
  let vault: SignerWithAddress

  let contractAddress: string
  let chainId: bigint

  // EIP-712 Helper to sign typed claim voucher
  async function createEip712ClaimSignature(
    signer: SignerWithAddress,
    player: string,
    amount: number,
    nonce: number,
    deadline: number,
  ) {
    const domain = {
      name: 'PixelFarmToken',
      version: '1',
      chainId: chainId,
      verifyingContract: contractAddress,
    }

    const types = {
      ClaimFarmingReward: [
        { name: 'player', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }

    const value = {
      player,
      amount,
      nonce,
      deadline,
    }

    return await signer.signTypedData(domain, types, value)
  }

  beforeEach(async function () {
    ;[owner, backendSigner, player1, player2, fakeSigner, vault] = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('PixelFarmToken')
    pixelToken = await TokenFactory.deploy(owner.address, backendSigner.address)
    await pixelToken.waitForDeployment()

    contractAddress = await pixelToken.getAddress()
    const network = await ethers.provider.getNetwork()
    chainId = network.chainId
  })

  describe('1️⃣ Deployment & Initial Configuration', function () {
    it('Should set proper ERC-20 name, symbol, and decimals', async function () {
      expect(await pixelToken.name()).to.equal('Pixel Farm Token')
      expect(await pixelToken.symbol()).to.equal('PIXEL')
      expect(await pixelToken.decimals()).to.equal(18)
    })

    it('Should grant DEFAULT_ADMIN_ROLE to deployer and SIGNER_ROLE to backend signer', async function () {
      const DEFAULT_ADMIN_ROLE = await pixelToken.DEFAULT_ADMIN_ROLE()
      const SIGNER_ROLE = await pixelToken.SIGNER_ROLE()

      expect(await pixelToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true
      expect(await pixelToken.hasRole(SIGNER_ROLE, backendSigner.address)).to.be.true
      expect(await pixelToken.hasRole(SIGNER_ROLE, player1.address)).to.be.false
    })

    it('Should mint initial supply of 10,000 $PIXEL to admin', async function () {
      const balance = await pixelToken.balanceOf(owner.address)
      expect(balance).to.equal(ethers.parseEther('10000'))
      expect(await pixelToken.totalSupply()).to.equal(ethers.parseEther('10000'))
    })
  })

  describe('2️⃣ Daily Testnet Faucet', function () {
    it('Should allow player to claim 100 $PIXEL faucet', async function () {
      expect(await pixelToken.balanceOf(player1.address)).to.equal(0n)

      await expect(pixelToken.connect(player1).claimFaucet())
        .to.emit(pixelToken, 'FaucetClaimed')
        .withArgs(player1.address, ethers.parseEther('100'))

      expect(await pixelToken.balanceOf(player1.address)).to.equal(ethers.parseEther('100'))
    })

    it('Should prevent claiming faucet twice within cooldown period', async function () {
      await pixelToken.connect(player1).claimFaucet()
      await expect(pixelToken.connect(player1).claimFaucet()).to.be.revertedWith(
        'Faucet cooldown is active',
      )
    })

    it('Should allow claiming faucet again after cooldown expires', async function () {
      await pixelToken.connect(player1).claimFaucet()
      await time.increase(3601) // 1 hour + 1 second
      await expect(pixelToken.connect(player1).claimFaucet()).to.emit(pixelToken, 'FaucetClaimed')
      expect(await pixelToken.balanceOf(player1.address)).to.equal(ethers.parseEther('200'))
    })
  })

  describe('3️⃣ EIP-712 Backend Signature Reward Claiming', function () {
    it('Should allow player to claim reward with valid EIP-712 backend signature', async function () {
      const amount = 50 // 50 Coins -> 50 $PIXEL
      const nonce = 1001
      const deadline = (await time.latest()) + 3600

      const signature = await createEip712ClaimSignature(
        backendSigner,
        player1.address,
        amount,
        nonce,
        deadline,
      )

      await expect(
        pixelToken
          .connect(player1)
          .claimFarmingReward(amount, nonce, deadline, signature),
      )
        .to.emit(pixelToken, 'RewardClaimed')
        .withArgs(player1.address, amount, nonce)

      expect(await pixelToken.balanceOf(player1.address)).to.equal(ethers.parseEther('50'))
      expect(await pixelToken.usedNonces(nonce)).to.be.true
    })

    it('Should reject claim if nonce has already been used (Anti-Replay Attack)', async function () {
      const amount = 30
      const nonce = 2002
      const deadline = (await time.latest()) + 3600

      const signature = await createEip712ClaimSignature(
        backendSigner,
        player1.address,
        amount,
        nonce,
        deadline,
      )

      await pixelToken
        .connect(player1)
        .claimFarmingReward(amount, nonce, deadline, signature)

      await time.increase(301) // bypass cooldown

      const secondSignature = await createEip712ClaimSignature(
        backendSigner,
        player1.address,
        amount,
        nonce,
        deadline + 3600,
      )

      await expect(
        pixelToken
          .connect(player1)
          .claimFarmingReward(amount, nonce, deadline + 3600, secondSignature),
      ).to.be.revertedWith('Nonce already used')
    })

    it('Should reject claim signed by an unauthorized entity', async function () {
      const amount = 20
      const nonce = 3003
      const deadline = (await time.latest()) + 3600

      const fakeSig = await createEip712ClaimSignature(
        fakeSigner,
        player1.address,
        amount,
        nonce,
        deadline,
      )

      await expect(
        pixelToken
          .connect(player1)
          .claimFarmingReward(amount, nonce, deadline, fakeSig),
      ).to.be.revertedWith('Invalid backend signature')
    })

    it('Should reject claim with expired deadline', async function () {
      const amount = 10
      const nonce = 4004
      const pastDeadline = (await time.latest()) - 100

      const sig = await createEip712ClaimSignature(
        backendSigner,
        player1.address,
        amount,
        nonce,
        pastDeadline,
      )

      await expect(
        pixelToken
          .connect(player1)
          .claimFarmingReward(amount, nonce, pastDeadline, sig),
      ).to.be.revertedWith('Claim signature has expired')
    })

    it('Should reject claim exceeding maxClaimCap (100 Coins)', async function () {
      const amount = 101
      const nonce = 5005
      const deadline = (await time.latest()) + 3600

      const sig = await createEip712ClaimSignature(
        backendSigner,
        player1.address,
        amount,
        nonce,
        deadline,
      )

      await expect(
        pixelToken
          .connect(player1)
          .claimFarmingReward(amount, nonce, deadline, sig),
      ).to.be.revertedWith('Amount exceeds max claim cap')
    })

    it('Should enforce 300-second cooldown between claims', async function () {
      const deadline = (await time.latest()) + 3600

      const sig1 = await createEip712ClaimSignature(backendSigner, player1.address, 20, 6001, deadline)
      await pixelToken.connect(player1).claimFarmingReward(20, 6001, deadline, sig1)

      const sig2 = await createEip712ClaimSignature(backendSigner, player1.address, 20, 6002, deadline)
      await expect(
        pixelToken.connect(player1).claimFarmingReward(20, 6002, deadline, sig2),
      ).to.be.revertedWith('Claim cooldown is active')

      await time.increase(301)
      await expect(
        pixelToken.connect(player1).claimFarmingReward(20, 6002, deadline, sig2),
      ).to.emit(pixelToken, 'RewardClaimed')
    })

    it('Should reject signature meant for a different chain or verifying contract (Domain Separation)', async function () {
      const amount = 25
      const nonce = 7001
      const deadline = (await time.latest()) + 3600

      // Sign with a fake chainId 99999
      const wrongDomain = {
        name: 'PixelFarmToken',
        version: '1',
        chainId: 99999n,
        verifyingContract: contractAddress,
      }
      const types = {
        ClaimFarmingReward: [
          { name: 'player', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      }
      const wrongSig = await backendSigner.signTypedData(wrongDomain, types, {
        player: player1.address,
        amount,
        nonce,
        deadline,
      })

      await expect(
        pixelToken.connect(player1).claimFarmingReward(amount, nonce, deadline, wrongSig),
      ).to.be.revertedWith('Invalid backend signature')
    })
  })

  describe('4️⃣ Vault Deposit Functionality', function () {
    beforeEach(async function () {
      // Give player1 100 $PIXEL via faucet
      await pixelToken.connect(player1).claimFaucet()
    })

    it('Should allow player to deposit tokens to system vault and emit TokensDeposited', async function () {
      const depositAmount = ethers.parseEther('50')
      const nonce = 8888

      await expect(
        pixelToken.connect(player1).depositToVault(vault.address, depositAmount, nonce),
      )
        .to.emit(pixelToken, 'TokensDeposited')
        .withArgs(player1.address, vault.address, depositAmount, nonce)

      expect(await pixelToken.balanceOf(player1.address)).to.equal(ethers.parseEther('50'))
      expect(await pixelToken.balanceOf(vault.address)).to.equal(depositAmount)
    })

    it('Should revert deposit if vault address is zero or amount is zero', async function () {
      await expect(
        pixelToken.connect(player1).depositToVault(ethers.ZeroAddress, ethers.parseEther('10'), 9991),
      ).to.be.revertedWith('Vault cannot be zero address')

      await expect(
        pixelToken.connect(player1).depositToVault(vault.address, 0, 9992),
      ).to.be.revertedWith('Amount must be greater than zero')
    })
  })

  describe('5️⃣ Admin Parameter Updates', function () {
    it('Should allow admin to update maxClaimCap and emit event', async function () {
      await expect(pixelToken.connect(owner).setMaxClaimCap(200))
        .to.emit(pixelToken, 'ClaimCapUpdated')
        .withArgs(100, 200)
      expect(await pixelToken.maxClaimCap()).to.equal(200)
    })

    it('Should allow admin to update cooldownSeconds and emit event', async function () {
      await expect(pixelToken.connect(owner).setCooldownSeconds(600))
        .to.emit(pixelToken, 'CooldownUpdated')
        .withArgs(300, 600)
      expect(await pixelToken.cooldownSeconds()).to.equal(600)
    })

    it('Should revert if non-admin attempts to update configuration', async function () {
      await expect(
        pixelToken.connect(player1).setMaxClaimCap(500),
      ).to.be.revertedWithCustomError(pixelToken, 'AccessControlUnauthorizedAccount')
    })
  })
})
