import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers'
import {
  CONTRACT_ADDRESSES,
  PIXEL_TOKEN_ABI,
  CHAIN_CONFIG,
} from './abis/contracts'

export interface Web3State {
  account: string | null
  chainId: number | null
  isCorrectNetwork: boolean
  isConnecting: boolean
  ethBalance: string
  pixelBalance: string
  error: string | null
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
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const isCorrectNetwork = chainId === CHAIN_CONFIG.chainId

  // Refresh balances
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
    } catch (err: any) {
      console.warn('Could not refresh on-chain balances (contract might not be on current network):', err?.message)
    }
  }, [account])

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
        } else if (targetChainId === 11155111) {
          await (window.ethereum as any).request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: 'Ethereum Sepolia Testnet',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
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
      try {
        localStorage.setItem('pixel_wallet_address', selectedAddress)
        localStorage.removeItem('pixel_wallet_disconnected')
      } catch {
        // ignore storage errors
      }

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
    try {
      localStorage.removeItem('pixel_wallet_address')
      localStorage.setItem('pixel_wallet_disconnected', 'true')
    } catch {
      // ignore storage errors
    }
  }, [])

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

  // Deposit $PIXEL tokens to System Treasury Vault
  const depositTokens = useCallback(
    async (amount: number, vaultAddress: string) => {
      if (!account || !window.ethereum) throw new Error('Chưa kết nối ví')
      const provider = new BrowserProvider(window.ethereum as any)
      const signer = await provider.getSigner()
      const tokenContract = new Contract(
        CONTRACT_ADDRESSES.PIXEL_TOKEN,
        PIXEL_TOKEN_ABI,
        signer,
      )

      const nonce = Math.floor(Date.now() / 1000) * 100 + Math.floor(Math.random() * 100)
      const amountWei = parseEther(amount.toString())

      // Call depositToVault on contract
      const tx = await tokenContract.depositToVault(vaultAddress, amountWei, nonce)
      const receipt = await tx.wait()
      await refreshBalances()
      return receipt.hash
    },
    [account, refreshBalances],
  )

  // Claim farming rewards via Backend EIP-712 signature
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

  // Auto-connect check on page reload (F5) via silent eth_accounts
  useEffect(() => {
    if (!window.ethereum) return

    const checkAuthorizedAccount = async () => {
      try {
        const wasDisconnected = localStorage.getItem('pixel_wallet_disconnected') === 'true'
        if (wasDisconnected) return

        const provider = new BrowserProvider(window.ethereum as any)
        const accounts: string[] = await provider.send('eth_accounts', [])
        if (accounts && accounts.length > 0) {
          const active = accounts[0].toLowerCase()
          setAccount(active)
          localStorage.setItem('pixel_wallet_address', active)
          const network = await provider.getNetwork()
          setChainId(Number(network.chainId))
        } else {
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
    if (!window.ethereum) return

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
    error,
    connectWallet,
    disconnect,
    switchNetwork,
    refreshBalances,
    claimFaucet,
    depositTokens,
    claimFarmingReward,
  }
}
