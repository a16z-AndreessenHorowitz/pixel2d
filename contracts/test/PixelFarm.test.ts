import { expect } from 'chai'
import { ethers } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { PixelFarmToken, FarmItemNFT } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('🌾 Pixel2D GameFi Smart Contracts Test Suite', function () {
  let pixelToken: PixelFarmToken
  let farmNft: FarmItemNFT
  let owner: SignerWithAddress
  let backendSigner: SignerWithAddress
  let player1: SignerWithAddress
  let player2: SignerWithAddress
  let fakeSigner: SignerWithAddress

  const BASE_URI = 'https://api.pixel2d.game/metadata/items/'

  beforeEach(async function () {
    ;[owner, backendSigner, player1, player2, fakeSigner] = await ethers.getSigners()

    // 1. Deploy PixelFarmToken
    const TokenFactory = await ethers.getContractFactory('PixelFarmToken')
    pixelToken = await TokenFactory.deploy(owner.address, backendSigner.address)
    await pixelToken.waitForDeployment()

    // 2. Deploy FarmItemNFT
    const NFTFactory = await ethers.getContractFactory('FarmItemNFT')
    farmNft = await NFTFactory.deploy(owner.address, await pixelToken.getAddress(), BASE_URI)
    await farmNft.waitForDeployment()

    // 3. Grant BURNER_ROLE to FarmItemNFT contract
    const BURNER_ROLE = await pixelToken.BURNER_ROLE()
    await pixelToken.grantRole(BURNER_ROLE, await farmNft.getAddress())
  })

  describe('1️⃣ Deployment & Initial Configuration', function () {
    it('Should set proper roles and initial admin supply', async function () {
      const SIGNER_ROLE = await pixelToken.SIGNER_ROLE()
      const BURNER_ROLE = await pixelToken.BURNER_ROLE()

      expect(await pixelToken.hasRole(SIGNER_ROLE, backendSigner.address)).to.be.true
      expect(await pixelToken.hasRole(BURNER_ROLE, await farmNft.getAddress())).to.be.true

      const ownerBalance = await pixelToken.balanceOf(owner.address)
      expect(ownerBalance).to.equal(ethers.parseEther('10000'))
    })

    it('Should link FarmItemNFT to PixelFarmToken correctly', async function () {
      expect(await farmNft.pixelToken()).to.equal(await pixelToken.getAddress())
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
  })

  describe('3️⃣ ECDSA Backend Signature Reward Claiming', function () {
    async function createClaimSignature(
      signer: SignerWithAddress,
      player: string,
      amount: number,
      nonce: number,
      deadline: number,
    ) {
      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'uint256'],
        [player, amount, nonce, deadline],
      )
      return await signer.signMessage(ethers.getBytes(messageHash))
    }

    it('Should allow player to claim reward with valid backend signature', async function () {
      const amount = 50 // 50 Coins -> 50 $PIXEL
      const nonce = 1001
      const deadline = (await time.latest()) + 3600

      const signature = await createClaimSignature(
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

      const signature = await createClaimSignature(
        backendSigner,
        player1.address,
        amount,
        nonce,
        deadline,
      )

      await pixelToken
        .connect(player1)
        .claimFarmingReward(amount, nonce, deadline, signature)

      // Time travel past cooldown so cooldown error does not mask replay check
      await time.increase(301)

      const secondSignature = await createClaimSignature(
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

      const fakeSig = await createClaimSignature(
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

      const sig = await createClaimSignature(
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
      const amount = 101 // cap is 100
      const nonce = 5005
      const deadline = (await time.latest()) + 3600

      const sig = await createClaimSignature(
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

      const sig1 = await createClaimSignature(backendSigner, player1.address, 20, 6001, deadline)
      await pixelToken.connect(player1).claimFarmingReward(20, 6001, deadline, sig1)

      const sig2 = await createClaimSignature(backendSigner, player1.address, 20, 6002, deadline)
      await expect(
        pixelToken.connect(player1).claimFarmingReward(20, 6002, deadline, sig2),
      ).to.be.revertedWith('Claim cooldown is active')

      // Advance time by 301 seconds
      await time.increase(301)

      await expect(
        pixelToken.connect(player1).claimFarmingReward(20, 6002, deadline, sig2),
      ).to.emit(pixelToken, 'RewardClaimed')
    })
  })

  describe('4️⃣ 1-Click NFT Minting & Buff Bridge', function () {
    beforeEach(async function () {
      // Give player1 300 $PIXEL via faucet + reward
      await pixelToken.connect(player1).claimFaucet() // 100 $PIXEL
      await pixelToken.connect(owner).transfer(player1.address, ethers.parseEther('200')) // +200 $PIXEL
    })

    it('Should 1-Click Mint NFT by burning $PIXEL WITHOUT prior approve()', async function () {
      const initialBalance = await pixelToken.balanceOf(player1.address)
      expect(initialBalance).to.equal(ethers.parseEther('300'))

      // Item 1 = Gold Watering Can (price: 100 $PIXEL)
      const itemPrice = ethers.parseEther('100')

      // Direct mint call - NO approve() called!
      await expect(farmNft.connect(player1).mintWithToken(1))
        .to.emit(farmNft, 'ItemMinted')
        .withArgs(player1.address, 1, 1, itemPrice)
        .and.to.emit(pixelToken, 'TokensBurnedBySpender')
        .withArgs(player1.address, await farmNft.getAddress(), itemPrice)

      // Balance decreased by 100 $PIXEL
      expect(await pixelToken.balanceOf(player1.address)).to.equal(ethers.parseEther('200'))

      // Player owns NFT tokenId 1
      expect(await farmNft.ownerOf(1)).to.equal(player1.address)
      expect(await farmNft.tokenItemType(1)).to.equal(1)
    })

    it('Should correctly report getOwnedItems for React->Phaser buff bridge', async function () {
      // Initially owns none
      let owned = await farmNft.getOwnedItems(player1.address)
      expect(owned[0]).to.be.false
      expect(owned[1]).to.be.false
      expect(owned[2]).to.be.false
      expect(owned[3]).to.be.false

      // Mint Item 1: Gold Watering Can
      await farmNft.connect(player1).mintWithToken(1)

      owned = await farmNft.getOwnedItems(player1.address)
      expect(owned[0]).to.be.false
      expect(owned[1]).to.be.true // Gold Watering Can owned! (-20% grow time active)
      expect(owned[2]).to.be.false
      expect(owned[3]).to.be.false

      // Mint Item 0: Gold Sickle (price 50 $PIXEL)
      await farmNft.connect(player1).mintWithToken(0)

      owned = await farmNft.getOwnedItems(player1.address)
      expect(owned[0]).to.be.true // Gold Sickle owned!
      expect(owned[1]).to.be.true // Gold Watering Can owned!
      expect(owned[2]).to.be.false
      expect(owned[3]).to.be.false
    })

    it('Should prevent double purchasing the same item type', async function () {
      await farmNft.connect(player1).mintWithToken(1)
      await expect(farmNft.connect(player1).mintWithToken(1)).to.be.revertedWith(
        'You already own this item type',
      )
    })

    it('Should revert if player has insufficient $PIXEL balance', async function () {
      // player2 has 0 balance
      await expect(farmNft.connect(player2).mintWithToken(0)).to.be.revertedWith(
        'Insufficient $PIXEL balance',
      )
    })

    it('Should return correct tokenURI metadata link', async function () {
      await farmNft.connect(player1).mintWithToken(1)
      expect(await farmNft.tokenURI(1)).to.equal('https://api.pixel2d.game/metadata/items/1.json')
    })
  })
})
