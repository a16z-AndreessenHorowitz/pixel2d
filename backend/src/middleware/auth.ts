import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { CONFIG } from '../config/index.js'
import type { AuthenticatedRequest, JwtPayload } from '../types/index.js'

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Thiếu Authorization Bearer token' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as JwtPayload
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' })
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as JwtPayload
      req.user = decoded
    } catch {
      // Ignore error for optional auth
    }
  }
  next()
}
