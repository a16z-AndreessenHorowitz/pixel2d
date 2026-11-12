import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers'
import {
  CONTRACT_ADDRESSES,
  PIXEL_TOKEN_ABI,
  CHAIN_CONFIG,
} from './abis/contracts'
import { showGameAlert } from '../components/NotificationModal'

export interface Web3State {
  account: string | null
  chainId: number | null
  isCorrectNetwork: boolean
  isConnecting: boolean
  ethBalance: string
  pixelBalance: string
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
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const isCorrectNetwork = chainId === CHAIN_CONFIG.chainId

  // Refresh balances
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
    } catch (err: any) {
      console.warn('Could not refresh on-chain balances (contract might not be on current network):', err?.message)
    }
  }, [account])

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

  // Connect Wallet & Mandatory MetaMask Signature Verification (SIWE)
  const connectWallet = useCallback(async (): Promise<string | null> => {
    const eth = getMetaMaskProvider()
    if (!eth) {
      const msg =
        'Không tìm thấy tiện ích ví MetaMask! Vui lòng cài đặt extension MetaMask hoặc kiểm tra xem bạn có đang ở tab ẩn danh (Incognito) hay không.'
      setError(msg)
      showGameAlert({
        title: 'Ví MetaMask',
        message: msg,
        type: 'warning',
        icon: '🦊',
      })
      return null
    }

    setIsConnecting(true)
    setError(null)

    try {
      // 1. Luôn kích hoạt Popup MetaMask bằng wallet_requestPermissions
      try {
        await eth.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        })
      } catch (permErr: any) {
        if (permErr?.code === 4001) {
          throw new Error('Bạn đã hủy yêu cầu kết nối trên ví MetaMask.')
        }
      }

      const accounts = (await eth.request({
        method: 'eth_requestAccounts',
      })) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('Không tìm thấy tài khoản MetaMask nào')
      }

      const selectedAddress = accounts[0].toLowerCase()

      // 2. Bắt buộc kích hoạt Popup Ký Xác Thực (Signature Verification) trên MetaMask
      const nonceRes = await fetch(
        `http://localhost:4000/api/auth/nonce?address=${selectedAddress}`,
      )
        .then((r) => r.json())
        .catch(() => null)
      const nonce = nonceRes?.nonce || `pixel2d-${Date.now()}`

      const message = `Pixel2D GameFi Authentication\nAddress: ${selectedAddress}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`
      const provider = new BrowserProvider(eth)
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)

      // 3. Gửi chữ ký lên Backend để đăng ký / đồng bộ User trong MongoDB Atlas
      const authRes = await fetch('http://localhost:4000/api/auth/login-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: selectedAddress,
          signature,
          message,
        }),
      }).then((r) => r.json())

      if (!authRes.success) {
        throw new Error(authRes.error || 'Xác thực chữ ký ví MetaMask thất bại')
      }

      setAccount(selectedAddress)

      const authUser = {
        id: authRes.user.id,
        username: authRes.user.username,
        wallet_address: selectedAddress,
        address: selectedAddress,
        token: authRes.token,
      }

      try {
        localStorage.setItem('pixel_wallet_address', selectedAddress)
        localStorage.removeItem('pixel_wallet_disconnected')
        localStorage.setItem('pixel_farm_user', JSON.stringify(authUser))
        localStorage.setItem('pixel_farm_jwt', authRes.token)
        window.dispatchEvent(
          new CustomEvent('auth-user-changed', {
            detail: { user: authUser, token: authRes.token },
          }),
        )
      } catch {
        // ignore storage errors
      }

      const network = await provider.getNetwork()
      setChainId(Number(network.chainId))

      return selectedAddress
    } catch (err: any) {
      console.error('Wallet connection error:', err)

      let friendlyMsg = err?.message || 'Lỗi kết nối ví MetaMask'
      if (err?.code === -32002) {
        friendlyMsg =
          'Yêu cầu kết nối ví MetaMask đang chờ xử lý! Vui lòng bấm vào icon con Cáo 🦊 của MetaMask trên thanh tiện ích trình duyệt để mở khóa và bấm Tiếp theo/Kết nối.'
      } else if (
        err?.code === 4001 ||
        friendlyMsg.includes('User rejected') ||
        friendlyMsg.includes('user rejected')
      ) {
        friendlyMsg = 'Bạn đã hủy yêu cầu kết nối hoặc xác thực chữ ký trên ví MetaMask.'
      }

      setError(friendlyMsg)
      showGameAlert({
        title: 'Thông Báo Ví',
        message: friendlyMsg,
        type: 'info',
        icon: '🦊',
      })
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
      localStorage.removeItem('pixel_farm_user')
      localStorage.removeItem('pixel_farm_jwt')
      window.dispatchEvent(
        new CustomEvent('auth-user-changed', {
          detail: { user: null, token: null },
        }),
      )
    } catch {
      // ignore storage errors
    }
  }, [])

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

  // Auto-connect check on page reload (F5) only if user was already verified with JWT
  useEffect(() => {
    const eth = getMetaMaskProvider()
    if (!eth) return

    const checkAuthorizedAccount = async () => {
      try {
        const wasDisconnected = localStorage.getItem('pixel_wallet_disconnected') === 'true'
        const hasJwt = Boolean(localStorage.getItem('pixel_farm_jwt'))
        const savedAddress = localStorage.getItem('pixel_wallet_address')

        // Nếu người dùng đã ngắt kết nối hoặc chưa có JWT xác thực, giữ nguyên trạng thái chưa kết nối
        if (wasDisconnected || !hasJwt || !savedAddress) {
          setAccount(null)
          return
        }

        const provider = new BrowserProvider(eth)
        const accounts: string[] = await provider.send('eth_accounts', [])
        if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
          const active = accounts[0].toLowerCase()
          setAccount(active)
          const network = await provider.getNetwork()
          setChainId(Number(network.chainId))
        } else {
          disconnect()
        }
      } catch (err: any) {
        console.warn('Silent auto-reconnect failed:', err?.message)
      }
    }

    checkAuthorizedAccount()
  }, [disconnect])

  // Listen to MetaMask account / chain events
  useEffect(() => {
    const eth = getMetaMaskProvider()
    if (!eth || !eth.on) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        disconnect()
      } else if (account && accounts[0].toLowerCase() !== account.toLowerCase()) {
        disconnect()
      }
    }

    const handleChainChanged = (newChainHex: string) => {
      // Cập nhật chainId trong state mà KHÔNG reload lại toàn bộ trang web
      const newChain = typeof newChainHex === 'string' ? parseInt(newChainHex, 16) : Number(newChainHex)
      setChainId(newChain)
      refreshBalances()
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
