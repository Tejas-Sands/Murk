import { useState, useEffect } from 'react';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { generateECDHKeypair } from '../lib/confidential';

export interface MurkProfile {
  username: string;
  address: string;
  ecdhPublicKey: string;
  name?: string;
  email?: string;
  provider?: string; // 'wallet' | 'email' | 'google' | 'twitter' etc.
  avatarSeed?: string;
}

// Prepopulated users for demo lookup
const DEFAULT_DEMO_USERS: MurkProfile[] = [
  {
    username: 'alice',
    address: '0x0111111111111111111111111111111111111111111111111111111111111111',
    ecdhPublicKey: '028ca94892c90c7d42cf389d429a10294e9f7331828f72921a938c8dfa737be74a',
    name: 'Alice Cooper',
    email: 'alice@cooper.com',
    provider: 'email',
    avatarSeed: 'alice',
  },
  {
    username: 'bob',
    address: '0x0222222222222222222222222222222222222222222222222222222222222222',
    ecdhPublicKey: '03bc68ef73cfab764f6de990fa1b2502ef82b993c8dfa6401fa9b8cfd98a002ebc',
    name: 'Bob Miller',
    email: 'bob@miller.com',
    provider: 'google',
    avatarSeed: 'bob',
  },
  {
    username: 'charlie',
    address: '0x0333333333333333333333333333333333333333333333333333333333333333',
    ecdhPublicKey: '028dfac90b8fca8b99c8de902abecdf0918efcb9287cba190da9c8efa8efea902f',
    name: 'Charlie Smith',
    email: 'charlie@smith.dev',
    provider: 'twitter',
    avatarSeed: 'charlie',
  },
  {
    username: 'auditor',
    address: '0x7777777777777777777777777777777777777777777777777777777777777777',
    ecdhPublicKey: '02cda984ef92c81d42a9b3cf82fa01bbfe92c99a8efcd19a82cdbf7a8efb7a0ebd',
    name: 'Compliance Auditor',
    email: 'audit@murk.finance',
    provider: 'email',
    avatarSeed: 'auditor',
  }
];

export function useMurkIdentity() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [profile, setProfile] = useState<MurkProfile | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<MurkProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and load registered users & current session profile
  useEffect(() => {
    setIsLoading(true);
    
    // Load registered users database
    const storedUsers = localStorage.getItem('murk_registered_users');
    let usersList: MurkProfile[] = [];
    if (storedUsers) {
      try {
        usersList = JSON.parse(storedUsers);
      } catch (e) {
        usersList = [...DEFAULT_DEMO_USERS];
      }
    } else {
      usersList = [...DEFAULT_DEMO_USERS];
      localStorage.setItem('murk_registered_users', JSON.stringify(usersList));
    }
    setRegisteredUsers(usersList);

    // If wallet is connected, check if there's an associated username profile
    if (currentAccount?.address) {
      const match = usersList.find(u => u.address.toLowerCase() === currentAccount.address.toLowerCase());
      if (match) {
        setProfile(match);
        // Sync ECDH keys for this user
        if (!localStorage.getItem('murk_ecdh_keys')) {
          localStorage.setItem('murk_ecdh_keys', JSON.stringify({
            publicKey: match.ecdhPublicKey,
            privateKey: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('') // Mock private key if missing
          }));
        }
      } else {
        // Connected but not registered, check if they signed in via mock social/email earlier
        const activeSession = localStorage.getItem('murk_active_profile');
        if (activeSession) {
          try {
            const parsedSession = JSON.parse(activeSession);
            if (parsedSession.address.toLowerCase() === currentAccount.address.toLowerCase()) {
              setProfile(parsedSession);
            } else {
              setProfile(null);
            }
          } catch (e) {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
    } else {
      // Wallet not connected, check if there is an active social/email embedded wallet session
      const activeSession = localStorage.getItem('murk_active_profile');
      if (activeSession) {
        try {
          const parsedSession = JSON.parse(activeSession);
          // Set profile
          setProfile(parsedSession);
          
          // Make sure keys are synced
          const ecdhKeys = localStorage.getItem('murk_ecdh_keys');
          if (!ecdhKeys) {
            localStorage.setItem('murk_ecdh_keys', JSON.stringify({
              publicKey: parsedSession.ecdhPublicKey,
              privateKey: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')
            }));
          }
        } catch (e) {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    }
    
    setIsLoading(false);
  }, [currentAccount]);

  // Sign In using Web2 social methods (mock Privy auth)
  const loginSocial = async (provider: string, emailOrUsername?: string) => {
    setIsLoading(true);
    try {
      // Check if user is already registered for this email/provider
      const usersList = JSON.parse(localStorage.getItem('murk_registered_users') || '[]');
      const match = usersList.find((u: MurkProfile) => u.email === emailOrUsername && u.provider === provider);
      
      if (match) {
        localStorage.setItem('murk_active_profile', JSON.stringify(match));
        setProfile(match);
        setIsLoading(false);
        return { success: true, registered: true, profile: match };
      } else {
        // Need to register! Generate a temporary embedded Sui address and ECDH keys
        const mockAddress = '0x09' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const ecdhKeypair = await generateECDHKeypair();
        
        // Save ECDH keys
        localStorage.setItem('murk_ecdh_keys', JSON.stringify(ecdhKeypair));
        
        const partialProfile = {
          address: mockAddress,
          ecdhPublicKey: ecdhKeypair.publicKey,
          email: provider === 'email' ? emailOrUsername : undefined,
          provider: provider,
        };
        
        // Store partial session data to be completed during registration step
        localStorage.setItem('murk_pending_profile', JSON.stringify(partialProfile));
        
        setIsLoading(false);
        return { success: true, registered: false, pendingProfile: partialProfile };
      }
    } catch (err) {
      console.error('Social login failed:', err);
      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    }
  };

  // Connect Wallet login (mock/actual)
  const loginWallet = async (address: string) => {
    setIsLoading(true);
    const usersList = JSON.parse(localStorage.getItem('murk_registered_users') || '[]');
    const match = usersList.find((u: MurkProfile) => u.address.toLowerCase() === address.toLowerCase());
    
    if (match) {
      localStorage.setItem('murk_active_profile', JSON.stringify(match));
      setProfile(match);
      setIsLoading(false);
      return { success: true, registered: true, profile: match };
    } else {
      // Prompt username registration
      const ecdhKeypair = await generateECDHKeypair();
      localStorage.setItem('murk_ecdh_keys', JSON.stringify(ecdhKeypair));
      
      const partialProfile = {
        address: address,
        ecdhPublicKey: ecdhKeypair.publicKey,
        provider: 'wallet'
      };
      
      localStorage.setItem('murk_pending_profile', JSON.stringify(partialProfile));
      setIsLoading(false);
      return { success: true, registered: false, pendingProfile: partialProfile };
    }
  };

  // Claim username and complete registration
  const registerUsername = async (username: string, name?: string) => {
    setIsLoading(true);
    
    const formattedUsername = username.trim().toLowerCase().replace('@', '');
    const usersList = JSON.parse(localStorage.getItem('murk_registered_users') || '[]');
    
    // Check uniqueness
    if (usersList.some((u: MurkProfile) => u.username === formattedUsername)) {
      setIsLoading(false);
      return { success: false, error: 'Username is already taken' };
    }

    let pending = localStorage.getItem('murk_pending_profile');
    let profileData: Partial<MurkProfile> = {};
    
    if (pending) {
      try {
        profileData = JSON.parse(pending);
      } catch(e) {}
    } else if (currentAccount) {
      // Fallback if connected via wallet directly
      const ecdhKeys = localStorage.getItem('murk_ecdh_keys');
      const pubKey = ecdhKeys ? JSON.parse(ecdhKeys).publicKey : (await generateECDHKeypair()).publicKey;
      profileData = {
        address: currentAccount.address,
        ecdhPublicKey: pubKey,
        provider: 'wallet'
      };
    } else {
      // Brand new user registration without login
      const mockAddress = '0x09' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const ecdhKeypair = await generateECDHKeypair();
      localStorage.setItem('murk_ecdh_keys', JSON.stringify(ecdhKeypair));
      
      profileData = {
        address: mockAddress,
        ecdhPublicKey: ecdhKeypair.publicKey,
        provider: 'email'
      };
    }

    const newProfile: MurkProfile = {
      username: formattedUsername,
      address: profileData.address || '',
      ecdhPublicKey: profileData.ecdhPublicKey || '',
      name: name || formattedUsername.charAt(0).toUpperCase() + formattedUsername.slice(1),
      email: profileData.email,
      provider: profileData.provider || 'wallet',
      avatarSeed: formattedUsername
    };

    const updatedUsers = [...usersList, newProfile];
    localStorage.setItem('murk_registered_users', JSON.stringify(updatedUsers));
    localStorage.setItem('murk_active_profile', JSON.stringify(newProfile));
    localStorage.removeItem('murk_pending_profile');
    
    setProfile(newProfile);
    setRegisteredUsers(updatedUsers);
    setIsLoading(false);
    return { success: true, profile: newProfile };
  };

  const logout = () => {
    localStorage.removeItem('murk_active_profile');
    localStorage.removeItem('murk_pending_profile');
    setProfile(null);
    if (currentAccount) {
      disconnect();
    }
  };

  const resolveUsername = (username: string): MurkProfile | null => {
    const cleanUsername = username.trim().toLowerCase().replace('@', '');
    return registeredUsers.find(u => u.username === cleanUsername) || null;
  };

  return {
    profile,
    registeredUsers,
    isLoading,
    loginSocial,
    loginWallet,
    registerUsername,
    logout,
    resolveUsername
  };
}
