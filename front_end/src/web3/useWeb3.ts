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

/**
 * Helper tìm provider MetaMask chính xác (kể cả khi cài đồng thời Phantom, Coinbase, OKX...)
 */
export function getMetaMaskProvider(): any {
  if (typeof window === 'undefined') return null
  const eth = (window as any).ethereum
  if (!eth) return null

  // Hỗ trợ trường hợp có nhiều ví extension cùng cài đặt (EIP-5749 / EIP-6963)
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const mm = eth.providers.find((p: any) => p.isMetaMask)
    if (mm) return mm
    return eth.providers[0]
  }

  return eth
}

export function useWeb3() {
  const [account, setAccount] = useState<string | null>(() => {
    try {
      const wasDisconnected = localStorage.getItem('pixel_wallet_disconnected') === 'true'
      if (wasDisconnected) return null
      return localStorage.getItem('pixel_wallet_address')
    } catch {
      return null
    }
  })
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
    const eth = getMetaMaskProvider()
    if (!account || !eth) return

    try {
      const provider = new BrowserProvider(eth)
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
    const eth = getMetaMaskProvider()
    if (!eth) return
    const hexChainId = '0x' + targetChainId.toString(16)

    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      })
    } catch (switchError: any) {
      // 4902: Unrecognized chain, prompt to add
      if (switchError.code === 4902) {
        if (targetChainId === 31337) {
          await eth.request({
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
          await eth.request({
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
  const connectWallet = useCallback(async (): Promise<string | null> => {
    const eth = getMetaMaskProvider()
    if (!eth) {
      const msg = 'Không tìm thấy tiện ích ví MetaMask! Vui lòng cài đặt extension MetaMask hoặc kiểm tra xem bạn có đang ở tab ẩn danh (Incognito) hay không.'
      setError(msg)
      alert(msg)
      return null
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Gọi trực tiếp theo chuẩn EIP-1193 để đảm bảo trình duyệt kích hoạt extension popup
      const accounts = (await eth.request({
        method: 'eth_requestAccounts',
      })) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('Không tìm thấy tài khoản MetaMask nào')
      }

      const selectedAddress = accounts[0].toLowerCase()
      setAccount(selectedAddress)

      try {
        localStorage.setItem('pixel_wallet_address', selectedAddress)
        localStorage.removeItem('pixel_wallet_disconnected')
      } catch {
        // ignore storage errors
      }

      const provider = new BrowserProvider(eth)
      const network = await provider.getNetwork()
      setChainId(Number(network.chainId))

      return selectedAddress
    } catch (err: any) {
      console.error('Wallet connection error:', err)

      let friendlyMsg = err?.message || 'Lỗi kết nối ví MetaMask'
      if (err?.code === -32002) {
        friendlyMsg = 'Yêu cầu kết nối ví MetaMask đang chờ xử lý! Vui lòng bấm vào icon con Cáo 🦊 của MetaMask trên thanh tiện ích trình duyệt (hoặc biểu tượng mảnh ghép 🧩) để mở khóa và bấm Tiếp theo/Kết nối.'
      } else if (err?.code === 4001) {
        friendlyMsg = 'Bạn đã hủy yêu cầu kết nối ví MetaMask.'
      }

      setError(friendlyMsg)
      alert(friendlyMsg)
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
    try {
      localStorage.removeItem('pixel_wallet_address')
      localStorage.setItem('pixel_wallet_disconnected', 'true')
    } catch {
      // ignore storage errors
    }
  }, [dispatchBuffEvent])

  // Claim Faucet (100 $PIXEL)
  const claimFaucet = useCallback(async () => {
    const eth = getMetaMaskProvider()
    if (!account || !eth) throw new Error('Chưa kết nối ví')
    const provider = new BrowserProvider(eth)
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
      const eth = getMetaMaskProvider()
      if (!account || !eth) throw new Error('Chưa kết nối ví')
      const provider = new BrowserProvider(eth)
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
      const eth = getMetaMaskProvider()
      if (!account || !eth) throw new Error('Chưa kết nối ví')
      const provider = new BrowserProvider(eth)
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

  // Auto-connect check on page reload (F5) via silent eth_accounts
  useEffect(() => {
    const eth = getMetaMaskProvider()
    if (!eth) return

    const checkAuthorizedAccount = async () => {
      try {
        const wasDisconnected = localStorage.getItem('pixel_wallet_disconnected') === 'true'
        if (wasDisconnected) return

        const provider = new BrowserProvider(eth)
        const accounts: string[] = await provider.send('eth_accounts', [])
        if (accounts && accounts.length > 0) {
          const active = accounts[0].toLowerCase()
          setAccount(active)
          localStorage.setItem('pixel_wallet_address', active)
          const network = await provider.getNetwork()
          setChainId(Number(network.chainId))
        } else {
          // No active account in MetaMask
          setAccount(null)
          localStorage.removeItem('pixel_wallet_address')
        }
      } catch (err: any) {
        console.warn('Silent auto-reconnect failed:', err?.message)
      }
    }

    checkAuthorizedAccount()
  }, [])

  // Listen to MetaMask account / chain events
  useEffect(() => {
    const eth = getMetaMaskProvider()
    if (!eth || !eth.on) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        const active = accounts[0].toLowerCase()
        setAccount(active)
        try {
          localStorage.setItem('pixel_wallet_address', active)
          localStorage.removeItem('pixel_wallet_disconnected')
        } catch {
          // ignore
        }
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    eth.on('accountsChanged', handleAccountsChanged)
    eth.on('chainChanged', handleChainChanged)

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged)
      eth.removeListener?.('chainChanged', handleChainChanged)
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
