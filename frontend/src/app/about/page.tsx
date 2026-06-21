'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, EyeOff, Zap, Network, Code, ArrowRight } from 'lucide-react';
import Header from '../../components/Header';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';

export default function AboutPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-16"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-bold text-primary mb-2">
              <Shield className="h-4 w-4" />
              About Murk Protocol
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
              Re-engineering <br/>
              <span className="text-gradient-hero">Financial Privacy</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">
              Murk is a decentralized payment and messaging protocol bridging the Sui blockchain with encrypted peer-to-peer communication. We believe that public ledgers do not necessitate public exposure of your financial operations.
            </p>
          </motion.div>

          {/* Core Problem & Solution */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-8">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-6">
                <EyeOff className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">The Problem</h3>
              <p className="text-text-secondary leading-relaxed">
                Public blockchains like Sui offer incredible speed, composability, and finality. However, their transparency means that business logic, supplier relationships, and settlement amounts are visible to competitors and the public. Existing privacy solutions are often too slow, expensive, or complex for standard B2B invoice settlements.
              </p>
            </GlassCard>

            <GlassCard className="p-8 border-primary/20 bg-primary/5">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-6">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">The Solution</h3>
              <p className="text-text-secondary leading-relaxed">
                Murk Protocol splits the transaction lifecycle. We utilize Elliptic-Curve Diffie-Hellman (ECDH) to establish secure, encrypted communication channels between payers and payees off-chain, while anchoring cryptographically verifiable commitments of those settlements on the high-speed Sui ledger.
              </p>
            </GlassCard>
          </motion.div>

          {/* How It Works */}
          <motion.div variants={itemVariants} className="pt-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="p-6 text-center flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-6">
                  <span className="text-lg font-data font-bold text-text-secondary">01</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-3">Key Exchange</h4>
                <p className="text-sm text-text-secondary">
                  Users publish ECDH public keys to their Murk Profile. This allows any two parties to derive a shared secret instantly.
                </p>
              </GlassCard>

              <GlassCard className="p-6 text-center flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-6">
                  <span className="text-lg font-data font-bold text-primary">02</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-3">Encrypted Draft</h4>
                <p className="text-sm text-text-secondary">
                  The payee drafts an invoice. The amount and description are encrypted. Only a reference ID and ZK commitment are published on-chain.
                </p>
              </GlassCard>

              <GlassCard className="p-6 text-center flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-6">
                  <span className="text-lg font-data font-bold text-secondary">03</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-3">On-Chain Settlement</h4>
                <p className="text-sm text-text-secondary">
                  The payer decrypts the invoice, verifies it, and settles via Sui. The protocol issues a Settlement Receipt acting as a verifiable proof of payment.
                </p>
              </GlassCard>
            </div>
          </motion.div>

          {/* Why Sui */}
          <motion.div variants={itemVariants} className="glass-panel p-10 rounded-3xl border border-secondary/20 relative overflow-hidden group">
            <div className="absolute -inset-24 bg-secondary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-6 w-6 text-secondary" />
                  <h3 className="text-2xl font-bold text-white">Built on Sui</h3>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  Murk relies on Sui's object-centric model. Every invoice and receipt is a distinct object, allowing for parallel processing, dynamic access control, and immediate finality. This architecture ensures that Murk can handle enterprise-grade invoicing volumes without breaking a sweat or incurring massive gas fees.
                </p>
              </div>
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                  <Network className="h-5 w-5 text-secondary" />
                  <div>
                    <div className="text-xs text-text-secondary font-bold uppercase">Consensus</div>
                    <div className="text-sm font-data font-bold text-white">Object-centric</div>
                  </div>
                </div>
                <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                  <Code className="h-5 w-5 text-secondary" />
                  <div>
                    <div className="text-xs text-text-secondary font-bold uppercase">Language</div>
                    <div className="text-sm font-data font-bold text-white">Sui Move</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={itemVariants} className="text-center pt-8">
            <h3 className="text-2xl font-bold text-white mb-6">Ready to secure your settlements?</h3>
            <Link href="/dashboard">
              <Button variant="primary" className="px-8 py-4 text-base">
                Launch Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </motion.div>

        </motion.div>
      </main>
      
      <footer className="py-6 border-t border-white/5 text-center text-xs text-text-secondary font-data bg-bg-base/80 backdrop-blur-md relative z-10">
        <p>MURK PROTOCOL // DIGITAL LIQUIDITY ENGINE // RUNNING ON SUI</p>
      </footer>
    </div>
  );
}
