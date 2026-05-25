import { NextRequest, NextResponse } from 'next/server';
import { datasetRegistry } from '@/lib/onchain';

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const dataset = datasetRegistry.find((item) => item.slug === params.slug);
  if (!dataset) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  return NextResponse.json({ dataset });
}
