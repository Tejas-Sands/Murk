'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import '@mysten/dapp-kit/dist/index.css';
// Configure network connections
const { networkConfig, useNetworkVariable } = createNetworkConfig({
  localnet: { url: 'http://127.0.0.1:9000', network: 'localnet' as any },
  devnet: { url: 'https://fullnode.devnet.sui.io:443', network: 'devnet' as any },
  testnet: { url: 'https://fullnode.testnet.sui.io:443', network: 'testnet' as any },
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443', network: 'mainnet' as any },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
