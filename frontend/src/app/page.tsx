'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ArrowRight, Menu, X, Sparkles, Check, Globe,
  Shield, Key, Lock, Eye, RefreshCw, ExternalLink, HelpCircle
} from 'lucide-react';
import ParticleField from '../components/3d/ParticleField';
import IdentityModal from '../components/IdentityModal';
import MurkyMascot from '../components/ui/MurkyMascot';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MurkLogo } from '../components/ui/MurkLogo';
import { generateECDHKeypair, encryptAmount, computeCommitment, decryptAmount } from '../lib/confidential';

const translations = {
  en: {
    navHome: "Home",
    navPipeline: "ZK Configurator",
    navAudit: "Move Inspector",
    navAbout: "About Us",
    navApp: "Launch App",
    heroSub: "ENTERPRISE PRIVACY SHIELD // DECENTRALIZED PRIVATE INVOICE PROTOCOL",
    heroDesc: "Zero-Knowledge client-side amount hiding, audit proofs, and decoupled payments built natively on the Sui network.",
    launchWorkspace: "Launch Secure Workspace",
    learnMore: "Read Dev Specs",
    featuresLabel: "CORE PROTOCOLS",
    featuresSub: "cryptographic building blocks",
    featuresDesc: "Every layer is designed for complete transaction confidentiality while preserving auditing compliance.",
    feature1Title: "1. Client-Side Encryption",
    feature1Desc: "Invoices are encrypted using ephemeral P-256 ECDH shared secrets combined with AES-GCM-256 before touching the validator mempool.",
    feature2Title: "2. Off-Chain / On-Chain Settlement",
    feature2Desc: "Disputes and payment transfers are resolved using decoupled smart contract logic, hiding actual dollar-amount flows.",
    feature3Title: "3. Cryptographic Commitments",
    feature3Desc: "Bind payment amounts to on-chain commitments. Allows proving settlement details to verified tax or compliance entities.",
    feature4Title: "4. Trustless Reputation Profiling",
    feature4Desc: "Calculate trust score ratings using zero-knowledge statistical tallies, proving a solid credit score without leaking cash reserves.",
    visualizerLabel: "INTERACTIVE ZK WORKSPACE",
    visualizerSub: "verify client-side pipeline in real time",
    step1Title: "Step 1: Keypair Generation",
    step1Desc: "Generate persistent or ephemeral local key pairs for ECDH secure handshake.",
    genKeyBtn: "Generate Key Pair",
    step2Title: "Step 2: Client-side Encryption & Commitment",
    step2Desc: "Input an invoice amount and the peer public key. Generate ciphertexts, IVs, and ZK hashes.",
    encryptBtn: "Encrypt & Bind",
    step3Title: "Step 3: ZK Verification",
    step3Desc: "Input the original value and salt to verify it matches the commitment.",
    verifyBtn: "Verify ZK Proof",
    audienceLabel: "BUILT FOR PRIVACY MAXIMALISTS & ENTERPRISES",
    audienceSub: "and everyone who settles business on-chain",
    persona1Title: "The Privacy Purist",
    persona1Desc: "Encrypts every morning coffee invoice and gas payment. Doesn't want competitors or exes reading their wallet.",
    persona2Title: "The Modern Freelancer",
    persona2Desc: "Bills international clients instantly in USDC or SUI without exposing billing rates to competitor agencies.",
    persona3Title: "The Web3 Enterprise",
    persona3Desc: "Requires standard audit trails for corporate taxes but refuses to broadcast proprietary revenue volumes.",
    sponsorsLabel: "POWERED BY CYBERSECURE ECOSYSTEMS",
    sponsorsSub: "bringing state-of-the-art cryptography to Sui",
    newsletterLabel: "SUBSCRIBE TO MURK LABS",
    newsletterSub: "cryptographically signed communications",
    newsletterPlaceholder: "Enter developer email",
    newsletterBtn: "Subscribe",
    newsletterSuccess: "Subscription registered successfully!",
    guestHonor: "MURK PROTOCOL ENTERPRISE SUITE",
    guestHonorSub: "Non-Custodial Move Settlement VM",
  },
  hr: {
    navHome: "Početna",
    navPipeline: "ZK Konfigurator",
    navAudit: "Move Inspektor",
    navAbout: "O nama",
    navApp: "Pokreni Aplikaciju",
    heroSub: "KORPORATIVNI ŠTIT PRIVATNOSTI // DECENTRALIZIRANI PROTOKOL ZA RAČUNE",
    heroDesc: "Skrivanje iznosa na strani klijenta s nultim znanjem, revizijski dokazi i odvojena plaćanja izgrađena nativno na Sui mreži.",
    launchWorkspace: "Pokreni Siguran Radni Prostor",
    learnMore: "Pročitaj Specifikacije",
    featuresLabel: "KLJUČNI PROTOKOLI",
    featuresSub: "kriptografski gradivni blokovi",
    featuresDesc: "Svaki sloj je dizajniran za potpunu povjerljivost transakcija uz istovremeno očuvanje usklađenosti s revizijom.",
    feature1Title: "1. Enkripcija na strani klijenta",
    feature1Desc: "Računi se kriptiraju pomoću efemernih P-256 ECDH zajedničkih tajni u kombinaciji s AES-GCM-256 prije nego što dodirnu validatorski mempool.",
    feature2Title: "2. Izvanlančana i On-Chain Nagodba",
    feature2Desc: "Sporovi i prijenosi plaćanja rješavaju se pomoću odvojene logike pametnih ugovora, skrivajući stvarni tijek novca.",
    feature3Title: "3. Kriptografske Obveze",
    feature3Desc: "Povežite iznose plaćanja s obvezama na lancu. Omogućuje dokazivanje detalja nagodbe verificiranim poreznim ili revizijskim tijelima.",
    feature4Title: "4. Profiliranje Reputacije bez Povjerenja",
    feature4Desc: "Izračunajte ocjene reputacije koristeći statističke izračune s nultim znanjem, dokazujući kreditnu sposobnost bez otkrivanja novčanih rezervi.",
    visualizerLabel: "INTERAKTIVNI ZK RADNI PROSTOR",
    visualizerSub: "provjerite kriptografski cjevovod u stvarnom vremenu",
    step1Title: "Korak 1: Generiranje parova ključeva",
    step1Desc: "Generirajte trajne ili efemerne lokalne parove ključeva za sigurno ECDH rukovanje.",
    genKeyBtn: "Generiraj par ključeva",
    step2Title: "Korak 2: Klijentska enkripcija i obveza",
    step2Desc: "Unesite iznos računa i javni ključ klijenta. Generirajte šifrirane tekstove, IV-ove i ZK hasheve.",
    encryptBtn: "Kriptiraj i Poveži",
    step3Title: "Korak 3: ZK Provjera",
    step3Desc: "Unesite izvornu vrijednost i sol kako biste provjerili odgovara li hash obvezi.",
    verifyBtn: "Potvrdi ZK Dokaz",
    audienceLabel: "IZGRAĐENO ZA PRIVATNE ELITISTE I PODUZEĆA",
    audienceSub: "i sve one koji poslovanje obavljaju na lancu",
    persona1Title: "Zagovornik Privatnosti",
    persona1Desc: "Kriptira svaki račun za jutarnju kavu i plaćanje plina. Ne želi da konkurenti ili bivši čitaju njegov novčanik.",
    persona2Title: "Moderni Freelancer",
    persona2Desc: "Brzo naplaćuje klijentima u USDC-u ili SUI-u bez izlaganja svojih satnica konkurentskim agencijama.",
    persona3Title: "Web3 Poduzeće",
    persona3Desc: "Zahtijeva standardne revizijske tragove za korporativne poreze, ali odbija javno objaviti obujam prihoda.",
    sponsorsLabel: "PODRŽANO OD STRANE CYBER-SIGURNOG EKOSUSTAVA",
    sponsorsSub: "donosimo najsuvremeniju kriptografiju na Sui",
    newsletterLabel: "PRETPLATITE SE NA MURK LABS",
    newsletterSub: "kriptografski potpisana komunikacija",
    newsletterPlaceholder: "Unesite e-poštu developera",
    newsletterBtn: "Pretplati se",
    newsletterSuccess: "Pretplata uspješno registrirana!",
    guestHonor: "MURK PROTOKOL POSLOVNI SUSTAV",
    guestHonorSub: "Sustav nagodbe bez skrbništva",
  }
};

const partnerItems = [
  { name: "Sui Blockchain", role: "L1 Network", logo: "/logo.png" },
  { name: "Mysten Labs", role: "Core Move VM", logo: "/logo.png" },
  { name: "XMTP Chat", role: "Secure Comm", logo: "/logo.png" },
  { name: "ZK Cryptography", role: "P-256 Engine", logo: "/logo.png" }
];

export default function MurkLandingPage() {
  const [lang, setLang] = useState<'en' | 'hr'>('en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [activeFeatureId, setActiveFeatureId] = useState(1);

  // Automatically open onboarding modal if redirect query param is present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth_required') === 'true') {
        setIsIdentityModalOpen(true);
      }
    }
  }, []);
  
  // Newsletter
  const [email, setEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Custom Cursor state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  // ZK Workspace Cryptographic State
  const [mascotPose, setMascotPose] = useState<'shield' | 'scan' | 'code' | 'keygen' | 'wink'>('shield');
  const [localKeys, setLocalKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [keygenLoading, setKeygenLoading] = useState(false);

  // Encrypt Form
  const [encryptAmountVal, setEncryptAmountVal] = useState<number>(1000);
  const [peerPublicKey, setPeerPublicKey] = useState('');
  const [encryptedResult, setEncryptedResult] = useState<{ ciphertext: string; iv: string; commitment: string; salt: string } | null>(null);
  const [encryptLoading, setEncryptLoading] = useState(false);

  // Verify Form
  const [verifyAmount, setVerifyAmount] = useState<number>(1000);
  const [verifySalt, setVerifySalt] = useState('');
  const [verifyCommitment, setVerifyCommitment] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const t = translations[lang];

  // Mouse move handler for custom cursor reticle in Hero
  const handleHeroMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleGenKeypair = async () => {
    setKeygenLoading(true);
    setMascotPose('keygen');
    try {
      const keys = await generateECDHKeypair();
      setLocalKeys(keys);
      // Pre-fill peer public key with a self-connection key for simple testing
      setPeerPublicKey(keys.publicKey);
    } catch (err) {
      console.error(err);
    } finally {
      setKeygenLoading(false);
      setMascotPose('shield');
    }
  };

  const handleEncryptAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localKeys) {
      alert("Please generate local keypair first in Step 1.");
      return;
    }
    if (!peerPublicKey) {
      alert("Please provide client peer public key.");
      return;
    }
    setEncryptLoading(true);
    setMascotPose('scan');
    try {
      // 1. Generate salt
      const randBytes = window.crypto.getRandomValues(new Uint8Array(16));
      const salt = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 2. Encrypt
      const enc = await encryptAmount(encryptAmountVal, localKeys.privateKey, peerPublicKey);
      
      // 3. Commitment
      const commit = await computeCommitment(encryptAmountVal, salt);

      setEncryptedResult({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        commitment: commit,
        salt: salt
      });

      // Auto fill verification step
      setVerifyAmount(encryptAmountVal);
      setVerifySalt(salt);
      setVerifyCommitment(commit);
    } catch (err) {
      console.error(err);
    } finally {
      setEncryptLoading(false);
      setMascotPose('code');
    }
  };

  const handleVerifyCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setMascotPose('scan');
    try {
      const computed = await computeCommitment(verifyAmount, verifySalt);
      if (computed === verifyCommitment) {
        setVerificationResult({
          success: true,
          message: lang === 'en' 
            ? "✓ ZK commitment is binding and valid. The amount is correct!" 
            : "✓ ZK obveza je obvezujuća i valjana. Iznos je točan!"
        });
      } else {
        setVerificationResult({
          success: false,
          message: lang === 'en'
            ? "✗ Invalid proof. Amount or salt mismatch with on-chain commitment."
            : "✗ Nevaljani dokaz. Neslaganje iznosa ili soli s obvezom na lancu."
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyLoading(false);
      setMascotPose('wink');
      setTimeout(() => setMascotPose('shield'), 3000);
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setNewsletterSubscribed(true);
      setEmail('');
      setMascotPose('wink');
      setTimeout(() => {
        setNewsletterSubscribed(false);
        setMascotPose('shield');
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080A] text-[#F0F2F5] font-sans selection:bg-brand/30 selection:text-white overflow-x-hidden relative">
      
      {/* 1. DUAL NAVIGATION */}
      <header className="fixed top-0 inset-x-0 bg-[#07080A]/90 backdrop-blur-md border-b border-border-subtle z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 cursor-pointer group">
            <MurkLogo size={42} glow={true} />
            <span className="font-display text-2xl tracking-tighter text-white group-hover:text-brand transition-colors">
              M<span className="font-italic-accent text-brand lowercase">u</span>rk
            </span>
          </a>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-wider">
            <a href="#" className="hover:text-brand transition-colors">{t.navHome}</a>
            <a href="#pipeline" className="hover:text-brand transition-colors">{t.navPipeline}</a>
            <a href="#audit" className="hover:text-brand transition-colors">{t.navAudit}</a>
            <a href="#about" className="hover:text-brand transition-colors">{t.navAbout}</a>
          </nav>

          {/* Nav Right (Language + Launch App CTA) */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setLang(prev => prev === 'en' ? 'hr' : 'en')}
              className="flex items-center gap-1.5 text-xs font-mono font-bold text-content-secondary hover:text-white transition-colors cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang.toUpperCase()}
            </button>

            <Button 
              onClick={() => setIsIdentityModalOpen(true)}
              variant="primary" 
              className="py-2.5 px-5 text-xs font-bold font-mono tracking-wider border border-brand/20"
            >
              {t.navApp}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-4 md:hidden">
            <button 
              onClick={() => setLang(prev => prev === 'en' ? 'hr' : 'en')}
              className="text-xs font-mono font-bold text-content-secondary hover:text-white transition-colors"
            >
              {lang.toUpperCase()}
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-white/5 rounded-lg text-content-secondary hover:text-white transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Side Slide-out Drawer Menu (Mobile) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-surface border-l border-border-subtle z-50 p-8 flex flex-col justify-between"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl tracking-tighter text-white">
                    M<span className="font-italic-accent text-brand lowercase">u</span>rk Menu
                  </span>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-lg text-content-secondary hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-6 font-mono text-sm uppercase tracking-wider">
                  <a 
                    href="#" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-brand transition-colors py-2 border-b border-border-subtle/50"
                  >
                    {t.navHome}
                  </a>
                  <a 
                    href="#pipeline" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-brand transition-colors py-2 border-b border-border-subtle/50"
                  >
                    {t.navPipeline}
                  </a>
                  <a 
                    href="#audit" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-brand transition-colors py-2 border-b border-border-subtle/50"
                  >
                    {t.navAudit}
                  </a>
                  <a 
                    href="#about" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-brand transition-colors py-2 border-b border-border-subtle/50"
                  >
                    {t.navAbout}
                  </a>
                </nav>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsIdentityModalOpen(true);
                  }}
                  variant="primary" 
                  className="w-full py-3 text-xs font-mono font-bold tracking-wider"
                >
                  {t.navApp}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section 
        className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-6 pt-28 overflow-hidden z-10"
        onMouseMove={handleHeroMouseMove}
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        {/* React Three Fiber sparse drifting blue particle network */}
        <ParticleField />

        {/* Custom Animated Tracking Cursor Scanner */}
        {isHoveringHero && (
          <div
            className="absolute pointer-events-none w-28 h-28 border border-dashed border-brand/30 rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-out z-20"
            style={{ left: mousePos.x, top: mousePos.y }}
          >
            {/* Crosshair reticle look */}
            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-ping" />
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-brand/10 -translate-x-1/2" />
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-brand/10 -translate-y-1/2" />
            <span className="absolute -top-7 text-[8px] font-mono tracking-widest text-brand font-bold uppercase whitespace-nowrap bg-black/80 px-2 py-0.5 border border-brand/20 rounded">
              ZK-PROVER ACTIVE
            </span>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          {/* Subtitle */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-subtle border border-brand/20 text-xs font-mono font-bold text-brand uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            {t.heroSub}
          </div>

          {/* Heading Treatment with Italic Oblique offsets */}
          <h1 className="text-5xl md:text-8xl font-display font-black tracking-tight leading-none text-content-primary">
            M<span className="italic text-brand inline-block transform -rotate-6 scale-110 mx-0.5 select-none">U</span>RK 
            {" "}P<span className="italic text-secondary inline-block transform rotate-6 scale-110 mx-0.5 select-none">R</span>OTOCOL
          </h1>

          {/* Hero Description */}
          <p className="text-base md:text-xl text-content-secondary max-w-2xl mx-auto font-sans leading-relaxed">
            {t.heroDesc}
          </p>

          {/* Hero CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              onClick={() => setIsIdentityModalOpen(true)}
              variant="primary" 
              className="py-4.5 px-8 text-xs font-bold font-mono tracking-widest border border-brand/20"
            >
              {t.launchWorkspace}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => {
                const el = document.getElementById('pipeline');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              variant="secondary" 
              className="py-4.5 px-8 text-xs font-mono font-bold tracking-widest border border-white/5"
            >
              {t.learnMore}
            </Button>
          </div>
        </div>

        {/* 3. HERO WAVE SVG DIVIDER */}
        <div className="absolute bottom-0 inset-x-0 w-full overflow-hidden leading-none z-10">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-16 text-[#0D0E10] fill-current">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,57.08,12.06,86.9,20.4,153,38.83,219.34,68.49,321.39,56.44Z"></path>
          </svg>
        </div>
      </section>

      {/* 4. INFINITE MARQUEE STRIP WITH MASCOTS */}
      <div className="relative py-7 bg-surface border-y border-border-subtle overflow-hidden z-10">
        <div className="animate-marquee flex whitespace-nowrap gap-16 py-1">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-12 text-[10px] md:text-xs font-mono tracking-widest font-bold text-content-secondary select-none">
              <MurkyMascot 
                pose={(i % 4 === 0) ? 'shield' : (i % 4 === 1) ? 'scan' : (i % 4 === 2) ? 'code' : 'keygen'} 
                className="w-9 h-9 animate-mascot-wiggle" 
              />
              <span>MURK PRIVATE SETTLEMENT CONTRACT</span>
              <span className="text-brand">•</span>
              <span>ZERO-KNOWLEDGE BINDING COMMITS</span>
              <span className="text-secondary">•</span>
              <span>P-256 ECDH SHIELDS ACTIVE</span>
              <span className="text-positive">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. INTERACTIVE ACCORDION FEATURE LIST */}
      <section id="about" className="py-24 bg-[#0D0E10] border-b border-border-subtle relative z-10 overflow-hidden">
        {/* Dynamic active row background radial glow */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-700 ease-in-out opacity-25"
          style={{
            background: activeFeatureId === 1 
              ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.12) 0%, transparent 60%)'
              : activeFeatureId === 2
              ? 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.12) 0%, transparent 60%)'
              : activeFeatureId === 3
              ? 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.12) 0%, transparent 60%)'
              : 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.12) 0%, transparent 60%)'
          }}
        />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
          {/* Left info column */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-center">
            <div className="text-xs font-mono font-bold text-brand uppercase tracking-wider">
              {t.featuresLabel}
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight uppercase leading-none text-content-primary">
              {t.featuresSub}
            </h2>
            <p className="text-base text-content-secondary leading-relaxed font-sans">
              {t.featuresDesc}
            </p>
            
            {/* Mascot avatar that wiggles depending on selection */}
            <div className="hidden lg:flex items-center gap-4 p-4.5 rounded-3xl bg-elevated/45 border border-border-subtle/50 w-fit">
              <MurkyMascot 
                pose={activeFeatureId === 1 ? 'shield' : activeFeatureId === 2 ? 'code' : activeFeatureId === 3 ? 'scan' : 'keygen'} 
                className="w-12 h-12" 
              />
              <div className="text-left font-mono">
                <div className="text-[10px] text-content-tertiary uppercase font-bold">Mascot Status</div>
                <div className="text-xs text-white font-bold uppercase tracking-wider">
                  {activeFeatureId === 1 ? 'Shielding Shield' : activeFeatureId === 2 ? 'Compiling Contracts' : activeFeatureId === 3 ? 'Scanning Commitments' : 'Deriving Keys'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Accordion selector column */}
          <div className="lg:col-span-7 space-y-4 flex flex-col justify-center">
            {[
              { id: 1, title: t.feature1Title, desc: t.feature1Desc, color: "border-l-4 border-brand bg-brand/5" },
              { id: 2, title: t.feature2Title, desc: t.feature2Desc, color: "border-l-4 border-secondary bg-secondary/5" },
              { id: 3, title: t.feature3Title, desc: t.feature3Desc, color: "border-l-4 border-positive bg-positive/5" },
              { id: 4, title: t.feature4Title, desc: t.feature4Desc, color: "border-l-4 border-caution bg-caution/5" }
            ].map((item) => {
              const isActive = activeFeatureId === item.id;
              return (
                <div 
                  key={item.id}
                  onMouseEnter={() => setActiveFeatureId(item.id)}
                  onClick={() => setActiveFeatureId(item.id)}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? `${item.color} border-border-default shadow-md` 
                      : "border-border-subtle bg-elevated/20 hover:bg-elevated/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className={`text-base font-bold tracking-wide transition-colors ${isActive ? 'text-white' : 'text-content-secondary'}`}>
                      {item.title}
                    </h3>
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'rotate-90 text-brand' : 'text-content-tertiary'}`} />
                  </div>
                  
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden mt-3"
                      >
                        <p className="text-sm text-content-secondary leading-relaxed pt-1 border-t border-border-subtle/50 font-sans">
                          {item.desc}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE ZK CONFIGURATOR (THE VISUALIZER) */}
      <section id="pipeline" className="py-24 bg-[#07080A] border-b border-border-subtle relative z-10">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="text-xs font-mono font-bold text-brand uppercase tracking-wider">
              {t.visualizerLabel}
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight uppercase leading-none text-content-primary">
              {t.visualizerSub}
            </h2>
            <div className="w-24 h-1 bg-brand mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Steps Container */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* STEP 1: Keypair Generation */}
              <div className="p-6 rounded-3xl bg-surface border border-border-subtle space-y-4 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-xs font-mono font-bold text-content-tertiary select-none">01</div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key className="h-5 w-5 text-brand" />
                  {t.step1Title}
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {t.step1Desc}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <Button 
                    onClick={handleGenKeypair}
                    isLoading={keygenLoading}
                    variant="secondary"
                    className="py-3 px-6 text-xs font-mono font-bold border border-white/5 shrink-0"
                  >
                    {t.genKeyBtn}
                  </Button>

                  {localKeys && (
                    <div className="w-full space-y-2 bg-[#1A1C21] p-3 rounded-2xl border border-border-subtle text-[10px] font-mono leading-normal overflow-x-auto">
                      <div>
                        <span className="text-brand font-bold">PUBLIC:</span> {localKeys.publicKey.slice(0, 48)}...
                      </div>
                      <div>
                        <span className="text-secondary font-bold">PRIVATE:</span> {localKeys.privateKey.slice(0, 24)}... (Secret client-side entropy)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: Encryption & Commitment */}
              <div className="p-6 rounded-3xl bg-surface border border-border-subtle space-y-4 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-xs font-mono font-bold text-content-tertiary select-none">02</div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-secondary" />
                  {t.step2Title}
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {t.step2Desc}
                </p>

                <form onSubmit={handleEncryptAmount} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-2 font-mono">Invoice Value (SUI)</label>
                      <Input 
                        type="number"
                        required
                        value={encryptAmountVal}
                        onChange={(e) => setEncryptAmountVal(parseInt(e.target.value) || 0)}
                        inputSize="md"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-2 font-mono">Client Peer Public Key</label>
                      <Input 
                        type="text"
                        required
                        placeholder="Paste ECDH public key (starts with spki hex)"
                        value={peerPublicKey}
                        onChange={(e) => setPeerPublicKey(e.target.value)}
                        inputSize="md"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    isLoading={encryptLoading}
                    disabled={!localKeys}
                    variant="primary"
                    className="py-3 px-6 text-xs font-mono font-bold"
                  >
                    {t.encryptBtn}
                  </Button>
                </form>

                {encryptedResult && (
                  <div className="space-y-3 bg-[#1A1C21] p-4 rounded-2xl border border-border-subtle text-[10px] font-mono leading-normal overflow-x-auto">
                    <div className="flex justify-between items-center pb-2 border-b border-border-subtle/50">
                      <span className="text-positive font-bold uppercase tracking-wider text-[9px]">Encryption Successful</span>
                    </div>
                    <div>
                      <span className="text-brand font-bold">CIPHERTEXT (AES-GCM):</span> {encryptedResult.ciphertext.slice(0, 48)}...
                    </div>
                    <div>
                      <span className="text-secondary font-bold">IV / NONCE:</span> {encryptedResult.iv}
                    </div>
                    <div>
                      <span className="text-caution font-bold">SALT GENERATED:</span> {encryptedResult.salt}
                    </div>
                    <div>
                      <span className="text-white font-bold">ZK BINDING COMMITMENT:</span> <span className="text-indigo-400 font-bold">{encryptedResult.commitment}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: ZK Verification */}
              <div className="p-6 rounded-3xl bg-surface border border-border-subtle space-y-4 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-xs font-mono font-bold text-content-tertiary select-none">03</div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Check className="h-5 w-5 text-positive" />
                  {t.step3Title}
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {t.step3Desc}
                </p>

                <form onSubmit={handleVerifyCommitment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-2 font-mono">Verify Amount (SUI)</label>
                      <Input 
                        type="number"
                        required
                        value={verifyAmount}
                        onChange={(e) => setVerifyAmount(parseInt(e.target.value) || 0)}
                        inputSize="md"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-2 font-mono">Secret Salt</label>
                      <Input 
                        type="text"
                        required
                        placeholder="Paste verification salt"
                        value={verifySalt}
                        onChange={(e) => setVerifySalt(e.target.value)}
                        inputSize="md"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-content-tertiary uppercase tracking-wider mb-2 font-mono">Target Commitment</label>
                      <Input 
                        type="text"
                        required
                        placeholder="Paste commitment hash"
                        value={verifyCommitment}
                        onChange={(e) => setVerifyCommitment(e.target.value)}
                        inputSize="md"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    isLoading={verifyLoading}
                    variant="secondary"
                    className="py-3 px-6 text-xs font-mono font-bold border border-white/5"
                  >
                    {t.verifyBtn}
                  </Button>
                </form>

                {verificationResult && (
                  <div className={`p-4.5 rounded-2xl border text-xs font-mono ${
                    verificationResult.success 
                      ? 'bg-positive-subtle border-positive text-positive' 
                      : 'bg-critical-subtle border-critical text-critical'
                  }`}>
                    {verificationResult.message}
                  </div>
                )}
              </div>

            </div>

            {/* Mascot Interaction Sidebar */}
            <div className="lg:col-span-4 p-6 rounded-3xl bg-surface border border-border-subtle flex flex-col items-center justify-center text-center space-y-6 lg:sticky lg:top-24">
              <div className="p-4 bg-elevated rounded-full border border-border-subtle/80 relative">
                <MurkyMascot pose={mascotPose} className="w-28 h-28" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-brand text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-brand/20 shadow">
                  Murky v1.2
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {lang === 'en' ? 'Active ZK Guard' : 'Aktivni ZK Čuvar'}
                </h4>
                <p className="text-[11px] text-content-secondary leading-relaxed font-sans max-w-[240px]">
                  {lang === 'en' 
                    ? 'Murky reacts dynamically in real-time as cryptographic computations are executed on the client.'
                    : 'Murky reagira dinamički u stvarnom vremenu kako se kriptografski proračuni izvode na klijentu.'
                  }
                </p>
              </div>

              {/* Status LEDs */}
              <div className="w-full pt-4 border-t border-border-subtle/50 grid grid-cols-3 gap-2 font-mono text-[9px] font-bold text-content-secondary">
                <div className="flex flex-col items-center gap-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${localKeys ? 'bg-positive animate-pulse' : 'bg-content-disabled'}`} />
                  <span>KEYPAIR</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${encryptedResult ? 'bg-positive animate-pulse' : 'bg-content-disabled'}`} />
                  <span>CIPHERTEXT</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${verificationResult?.success ? 'bg-positive animate-pulse' : 'bg-content-disabled'}`} />
                  <span>VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AUDIENCE PERSONA SECTION */}
      <section id="audit" className="py-24 bg-[#0D0E10] border-b border-border-subtle relative z-10">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          {/* Heading */}
          <div className="text-center space-y-4">
            <div className="text-xs font-mono font-bold text-brand uppercase tracking-wider">
              {t.audienceLabel}
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight uppercase leading-none text-content-primary">
              {t.audienceSub}
            </h2>
            <div className="w-24 h-1 bg-brand mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { id: 1, title: t.persona1Title, desc: t.persona1Desc, details: "ECDH + SHA-256", icon: Shield },
              { id: 2, title: t.persona2Title, desc: t.persona2Desc, details: "SUI Settlement", icon: Globe },
              { id: 3, title: t.persona3Title, desc: t.persona3Desc, details: "Audit Commitments", icon: HelpCircle }
            ].map((persona) => {
              const Icon = persona.icon;
              return (
                <div 
                  key={persona.id}
                  className="p-8 rounded-3xl bg-surface border border-border-subtle hover:border-brand/20 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="p-3 bg-elevated border border-border-subtle rounded-2xl w-fit text-brand">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">{persona.title}</h3>
                    <p className="text-xs text-content-secondary leading-relaxed font-sans">{persona.desc}</p>
                  </div>
                  <div className="pt-4 border-t border-border-subtle/50 flex justify-between items-center text-[10px] font-mono text-content-tertiary">
                    <span>Target Engine</span>
                    <span className="text-brand font-bold">{persona.details}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. SPONSORS & PARTNERS GRID */}
      <section className="py-24 bg-[#07080A] border-b border-border-subtle relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Sponsors grid details */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {partnerItems.map((p, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-surface border border-border-subtle text-center flex flex-col items-center justify-center gap-3 group hover:border-brand/20 transition-all duration-300"
              >
                <MurkLogo size={36} glow={false} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                <div>
                  <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">{p.name}</div>
                  <div className="text-[9px] font-mono text-content-tertiary uppercase pt-0.5">{p.role}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Glowing guest honor badge (Moroccan layout replacement) */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="relative group p-8 rounded-3xl bg-surface border border-brand/20 shadow-[0_0_25px_rgba(59,130,246,0.1)] text-center space-y-4 max-w-sm w-full overflow-hidden">
              {/* Rotating border glow element */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand/20 via-transparent to-secondary/20 opacity-40 animate-pulse pointer-events-none" />
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-subtle border border-secondary/20 text-[9px] font-bold text-secondary uppercase tracking-widest font-mono">
                {t.guestHonor}
              </div>
              <h3 className="text-xl font-display font-black tracking-tight text-white uppercase">
                M<span className="italic text-brand font-italic-accent lowercase">u</span>rk VM
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed font-sans">
                {t.guestHonorSub}
              </p>
              
              {/* Decorative graphic details */}
              <div className="h-[1px] w-12 bg-secondary/30 mx-auto" />
            </div>
          </div>

        </div>
      </section>

      {/* 9. NEWSLETTER SIGNUP WITH AN ANIMATED MASCOT */}
      <section className="py-24 bg-[#0D0E10] border-b border-border-subtle relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <div className="p-4 bg-[#07080A] rounded-full border border-border-subtle w-fit mx-auto relative group">
            <MurkyMascot pose={newsletterSubscribed ? 'wink' : 'shield'} className="w-16 h-16 animate-pulse-subtle" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight uppercase leading-none text-content-primary">
              {t.newsletterLabel}
            </h2>
            <p className="text-sm text-content-secondary max-w-lg mx-auto font-sans leading-relaxed">
              {t.newsletterSub}
            </p>
          </div>

          {newsletterSubscribed ? (
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-positive-subtle border border-positive text-positive text-xs font-mono">
              {t.newsletterSuccess}
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <Input 
                type="email"
                required
                placeholder={t.newsletterPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputSize="md"
                className="font-mono text-xs bg-[#07080A]"
              />
              <Button 
                type="submit"
                variant="primary"
                className="py-3 px-6 text-xs font-mono font-bold tracking-wider shrink-0"
              >
                {t.newsletterBtn}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="py-12 bg-[#07080A] relative z-10 text-center font-mono text-[10px] text-content-tertiary">
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-content-secondary">
            <span>Murk Protocol Labs</span>
            <span>•</span>
            <a href="mailto:devs@murk.finance" className="hover:text-brand transition-colors">devs@murk.finance</a>
          </div>
          <div>
            © 2026 Murk Protocol. All rights reserved. Settle confidentially on Sui.
          </div>
        </div>
      </footer>

      {/* Auth Gateway Onboarding Modal */}
      <IdentityModal 
        isOpen={isIdentityModalOpen} 
        onClose={() => setIsIdentityModalOpen(false)} 
      />
    </div>
  );
}
