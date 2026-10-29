import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, Contract, formatEther } from 'ethers'
import {
  CONTRACT_ADDRESSES,
  PIXEL_TOKEN_ABI,
  FARM_ITEM_NFT_ABI,
  CHAIN_CONFIG,
} from './abis/contracts'

export interface Web3State {
  account: string | null
  chainId: number | null
  isCorrectNetwork: boolean
  isConnecting: boolean
  ethBalance: string
  pixelBalance: string
  ownedNfts: [boolean, boolean, boolean, boolean]
  error: string | null
}

export function useWeb3() {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [ethBalance, setEthBalance] = useState<string>('0.00')
  const [pixelBalance, setPixelBalance] = useState<string>('0')
  const [ownedNfts, setOwnedNfts] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ])
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const isCorrectNetwork = chainId === CHAIN_CONFIG.chainId

  // Helper to dispatch React -> Phaser buff event
  const dispatchBuffEvent = useCallback((nfts: [boolean, boolean, boolean, boolean]) => {
    window.dispatchEvent(
      new CustomEvent('web3-buff-updated', {
        detail: {
          hasGoldSickle: nfts[0],
          hasGoldWateringCan: nfts[1],
          hasGoldHoe: nfts[2],
          hasGoldenFish: nfts[3],
        },
      }),
    )
  }, [])

  // Refresh balances & NFT state
  const refreshBalances = useCallback(async () => {
    if (!account || !window.ethereum) return

    try {
      const provider = new BrowserProvider(window.ethereum as any)
      const currentNetwork = await provider.getNetwork()
      setChainId(Number(currentNetwork.chainId))

      // 1. ETH Balance
      const ethWei = await provider.getBalance(account)
      setEthBalance(Number(formatEther(ethWei)).toFixed(4))

      // 2. $PIXEL Token Balance
      const tokenContract = new Contract(
        CONTRACT_ADDRESSES.PIXEL_TOKEN,
        PIXEL_TOKEN_ABI,
        provider,
      )
      const tokenBal = await tokenContract.balanceOf(account)
      setPixelBalance(Math.floor(Number(formatEther(tokenBal))).toString())

      // 3. NFT Ownership Batch View
      const nftContract = new Contract(
        CONTRACT_ADDRESSES.FARM_ITEM_NFT,
        FARM_ITEM_NFT_ABI,
        provider,
      )
      const rawOwned = await nftContract.getOwnedItems(account)
      const parsedNfts: [boolean, boolean, boolean, boolean] = [
        Boolean(rawOwned[0]),
        Boolean(rawOwned[1]),
        Boolean(rawOwned[2]),
        Boolean(rawOwned[3]),
      ]
      setOwnedNfts(parsedNfts)
      dispatchBuffEvent(parsedNfts)
    } catch (err: any) {
      console.warn('Could not refresh on-chain balances (contract might not be on current network):', err?.message)
    }
  }, [account, dispatchBuffEvent])

  // Switch network helper
  const switchNetwork = useCallback(async (targetChainId: number = CHAIN_CONFIG.chainId) => {
    if (!window.ethereum) return
    const hexChainId = '0x' + targetChainId.toString(16)

    try {
      await (window.ethereum as any).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      })
    } catch (switchError: any) {
      // 4902: Unrecognized chain, prompt to add
      if (switchError.code === 4902) {
        if (targetChainId === 31337) {
          await (window.ethereum as any).request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: 'Hardhat Localhost',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://127.0.0.1:8545'],
              },
            ],
          })
        } else if (targetChainId === 80002) {
          await (window.ethereum as any).request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                blockExplorerUrls: ['https://amoy.polygonscan.com'],
              },
            ],
          })
        }
      } else {
        throw switchError
      }
    }
  }, [])

  // Connect Wallet
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('Vui lòng cài đặt ví MetaMask để kết nối!')
      return null
    }

    setIsConnecting(true)
    setError(null)

    try {
      const provider = new BrowserProvider(window.ethereum as any)
      const accounts = await provider.send('eth_requestAccounts', [])
      if (!accounts || accounts.length === 0) {
        throw new Error('Không tìm thấy tài khoản MetaMask nào')
      }

      const selectedAddress = accounts[0].toLowerCase()
      setAccount(selectedAddress)

      const network = await provider.getNetwork()
      setChainId(Number(network.chainId))

      return selectedAddress
    } catch (err: any) {
      console.error('Wallet connection error:', err)
      setError(err?.message || 'Lỗi kết nối ví MetaMask')
      return null
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    setAccount(null)
    setEthBalance('0.00')
    setPixelBalance('0')
    setOwnedNfts([false, false, false, false])
    dispatchBuffEvent([false, false, false, false])
  }, [dispatchBuffEvent])

  // Claim Faucet (100 $PIXEL)
  const claimFaucet = useCallback(async () => {
    if (!account || !window.ethereum) throw new Error('Chưa kết nối ví')
    const provider = new BrowserProvider(window.ethereum as any)
    const signer = await provider.getSigner()
    const tokenContract = new Contract(
      CONTRACT_ADDRESSES.PIXEL_TOKEN,
      PIXEL_TOKEN_ABI,
      signer,
    )
    const tx = await tokenContract.claimFaucet()
    await tx.wait()
    await refreshBalances()
    return tx.hash
  }, [account, refreshBalances])

  // 1-Click Mint NFT
  const mintNft = useCallback(
    async (itemType: number) => {
      if (!account || !window.ethereum) throw new Error('Chưa kết nối ví')
      const provider = new BrowserProvider(window.ethereum as any)
      const signer = await provider.getSigner()
      const nftContract = new Contract(
        CONTRACT_ADDRESSES.FARM_ITEM_NFT,
        FARM_ITEM_NFT_ABI,
        signer,
      )

      // 1-Click Mint: calls contract directly, burns $PIXEL automatically
      const tx = await nftContract.mintWithToken(itemType)
      const receipt = await tx.wait()
      await refreshBalances()
      return receipt.hash
    },
    [account, refreshBalances],
  )

  // Claim farming rewards via Backend ECDSA signature
  const claimFarmingReward = useCallback(
    async (
      amount: number,
      nonce: number,
      deadline: number,
      signature: string,
    ) => {
      if (!account || !window.ethereum) throw new Error('Chưa kết nối ví')
      const provider = new BrowserProvider(window.ethereum as any)
      const signer = await provider.getSigner()
      const tokenContract = new Contract(
        CONTRACT_ADDRESSES.PIXEL_TOKEN,
        PIXEL_TOKEN_ABI,
        signer,
      )

      const tx = await tokenContract.claimFarmingReward(
        amount,
        nonce,
        deadline,
        signature,
      )
      const receipt = await tx.wait()
      await refreshBalances()
      return receipt.hash
    },
    [account, refreshBalances],
  )

  // Auto-refresh on account or network change
  useEffect(() => {
    if (!account) return
    const timer = setTimeout(() => {
      refreshBalances()
    }, 0)
    return () => clearTimeout(timer)
  }, [account, refreshBalances])

  // Listen to MetaMask account / chain events
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAccount(accounts[0].toLowerCase())
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    ;(window.ethereum as any).on('accountsChanged', handleAccountsChanged)
    ;(window.ethereum as any).on('chainChanged', handleChainChanged)

    return () => {
      ;(window.ethereum as any).removeListener?.('accountsChanged', handleAccountsChanged)
      ;(window.ethereum as any).removeListener?.('chainChanged', handleChainChanged)
    }
  }, [disconnect])

  return {
    account,
    chainId,
    isCorrectNetwork,
    isConnecting,
    ethBalance,
    pixelBalance,
    ownedNfts,
    error,
    connectWallet,
    disconnect,
    switchNetwork,
    refreshBalances,
    claimFaucet,
    mintNft,
    claimFarmingReward,
  }
}
