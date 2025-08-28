import { NextRequest } from 'next/server';
import { POST as applyCode } from '../apply-ai-code/route';

// This route proxies streaming requests to the standard apply-ai-code logic
export async function POST(req: NextRequest) {
  return applyCode(req);
}
