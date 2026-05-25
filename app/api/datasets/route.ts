import { NextResponse } from 'next/server';
import { datasetsByCategory } from '@/lib/onchain';

export async function GET() {
  return NextResponse.json({ categories: datasetsByCategory });
}
