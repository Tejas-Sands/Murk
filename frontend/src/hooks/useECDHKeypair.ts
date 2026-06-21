import { useState, useEffect } from 'react';
import { generateECDHKeypair } from '../lib/confidential';

export function useECDHKeypair() {
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initKeys() {
      setLoading(true);
      const stored = localStorage.getItem('murk_ecdh_keys');
      if (stored) {
        try {
          setKeys(JSON.parse(stored));
        } catch (e) {
          await regenerate();
        }
      } else {
        await regenerate();
      }
      setLoading(false);
    }
    initKeys();
  }, []);

  const regenerate = async () => {
    try {
      const newKeys = await generateECDHKeypair();
      localStorage.setItem('murk_ecdh_keys', JSON.stringify(newKeys));
      setKeys(newKeys);
      return newKeys;
    } catch (err) {
      console.error('Failed to generate ECDH keys:', err);
      return null;
    }
  };

  return { keys, loading, regenerate };
}
