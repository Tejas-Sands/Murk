const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper to convert Uint8Array / Buffer to array of numbers for Sui CLI
function toSuiVec(buf) {
  return `[${Array.from(buf).join(',')}]`;
}

// Generate P-256 keypair matching SubtleCrypto format
function generateKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  return {
    publicKey: pubDer.toString('hex'),
    privateKey: privDer.toString('hex')
  };
}

async function seed() {
  console.log('Starting blockchain seeding...');

  const deployedJsonPath = path.join(__dirname, '../frontend/src/lib/deployed_objects.json');
  if (!fs.existsSync(deployedJsonPath)) {
    console.error('deployed_objects.json not found. Run deploy script first.');
    process.exit(1);
  }

  const { packageId, registryId } = JSON.parse(fs.readFileSync(deployedJsonPath).toString());
  
  // Get active address from Sui CLI
  const activeAddress = execSync('sui client active-address').toString().trim();
  console.log(`Active Sui Address: ${activeAddress}`);

  // Generate cryptographic identities
  const auditorKeys = generateKeypair();
  const payerKeys = generateKeypair();
  const payeeKeys = generateKeypair();

  console.log('Generating seed assets...');

  try {
    // 1. Register Active Address as Auditor with the generated auditorKeys.publicKey
    console.log('Registering Auditor on-chain...');
    const pubkeyVec = toSuiVec(Buffer.from(auditorKeys.publicKey, 'hex'));
    
    execSync(
      `sui client call --package ${packageId} --module auditor --function register_auditor --args "${registryId}" "${activeAddress}" "${pubkeyVec}" --gas-budget 100000000 --json`,
      { stdio: 'ignore' }
    );
    console.log('Auditor registered successfully.');

    // 2. Draft an Invoice (using a mock encrypted amount of "50.00 USDC")
    // Amount = 50,000,000 (USDC has 6 decimals)
    const amountVal = 50 * 1000000;
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Compute commitment
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(BigInt(amountVal));
    const combined = Buffer.concat([amountBuf, Buffer.from(salt, 'hex')]);
    const commitment = crypto.createHash('sha256').update(combined).digest();

    // Plaintext = amount + ":" + salt
    const plaintext = `${amountVal}:${salt}`;
    
    // Encrypt for payer (using ECDH key exchange with AES-GCM)
    // To simplify seeding CLI args without loading a heavy TS/JS cryptography library,
    // we can use a mock ciphertext representation or pre-computed AES key since it's just a seed.
    // Let's use simple encryption or direct ciphertext bytes for seeding.
    const encPayerString = `${plaintext}:mockiv`;
    const encAuditorString = `${plaintext}:mockiv`;

    const encPayerVec = toSuiVec(Buffer.from(encPayerString, 'utf8'));
    const commitmentVec = toSuiVec(commitment);
    const auditorPubkeyVec = toSuiVec(Buffer.from(auditorKeys.publicKey, 'hex'));
    const encAuditorVec = toSuiVec(Buffer.from(encAuditorString, 'utf8'));

    const descBytes = toSuiVec(Buffer.from('Seed Consulting Services', 'utf8'));
    const refBytes = toSuiVec(Buffer.from('SEED-INV-001', 'utf8'));
    const deadlineMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    console.log('Creating Seed Invoice on-chain...');
    const createStdout = execSync(
      `sui client call --package ${packageId} --module murk --function create_invoice --args "${encPayerVec}" "${commitmentVec}" "${auditorPubkeyVec}" "${encAuditorVec}" "true" "${activeAddress}" "${descBytes}" "${refBytes}" "${deadlineMs}" "0x6" --gas-budget 100000000 --json`
    ).toString();

    const createResult = JSON.parse(createStdout);
    const createdObj = createResult.objectChanges?.find(
      c => c.type === 'created' && c.objectType.includes('::invoice::Invoice')
    );

    if (!createdObj) {
      throw new Error('Failed to extract created Invoice object from transaction');
    }

    const invoiceId = createdObj.objectId;
    console.log(`Seed Invoice created! ID: ${invoiceId}`);

    // Save keypairs and metadata to seed_keys.json
    const seedKeysData = {
      invoiceId,
      amount: 50.00,
      amountRaw: amountVal,
      salt,
      activeAddress,
      auditor: {
        address: activeAddress,
        publicKey: auditorKeys.publicKey,
        privateKey: auditorKeys.privateKey
      },
      payer: {
        publicKey: payerKeys.publicKey,
        privateKey: payerKeys.privateKey
      },
      payee: {
        publicKey: payeeKeys.publicKey,
        privateKey: payeeKeys.privateKey
      }
    };

    const keysJsonPath = path.join(__dirname, 'seed_keys.json');
    fs.writeFileSync(keysJsonPath, JSON.stringify(seedKeysData, null, 2));
    console.log(`Successfully wrote keypairs to ${keysJsonPath}`);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
