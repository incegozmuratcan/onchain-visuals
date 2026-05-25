import { NextResponse } from 'next/server';
import { datasetRegistry } from '@/lib/onchain';

export async function GET() {
  return NextResponse.json({
    sources: Array.from(new Set(datasetRegistry.map((d) => d.primarySource))).map((source) => ({
      source,
      datasets: datasetRegistry.filter((d) => d.primarySource === source).length,
      active: datasetRegistry.filter((d) => d.primarySource === source && d.status === 'active').length,
    })),
  });
}
