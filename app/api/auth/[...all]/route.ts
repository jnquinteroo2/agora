import { auth } from '@/src/auth/config'
import type { NextRequest } from 'next/server'

export const GET = (req: NextRequest) => auth.handler(req)
export const POST = (req: NextRequest) => auth.handler(req)
