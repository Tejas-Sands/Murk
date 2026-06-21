const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function deploy() {
  console.log('Starting deployment of Murk Move package...');
  
  const moveDir = path.join(__dirname, '../move');
  const targetJsonPath = path.join(__dirname, '../frontend/src/lib/deployed_objects.json');

  try {
    // Delete existing ephemeral Pub.devnet.toml if present to avoid build-env mismatch errors
    const pubFile = path.join(moveDir, 'Pub.devnet.toml');
    if (fs.existsSync(pubFile)) {
      console.log('Cleaning existing ephemeral publication file...');
      fs.unlinkSync(pubFile);
    }

    // 1. Run sui client test-publish with build-env devnet
    console.log('Publishing package on Sui Devnet...');
    const stdout = execSync(
      'sui client test-publish --gas-budget 500000000 --json --build-env devnet',
      { cwd: moveDir, maxBuffer: 10 * 1024 * 1024 }
    ).toString();

    const result = JSON.parse(stdout);
    
    if (result.error) {
      throw new Error(`Sui client publish error: ${result.error}`);
    }

    const objectChanges = result.objectChanges;
    if (!objectChanges) {
      throw new Error('No objectChanges returned in publish output');
    }

    // Extract published package ID
    const publishChange = objectChanges.find(c => c.type === 'published');
    if (!publishChange) {
      throw new Error('Could not find published package ID in object changes');
    }
    const packageId = publishChange.packageId;
    console.log(`Package published successfully! ID: ${packageId}`);

    // 2. Initialize AuditorRegistry shared object
    console.log('Initializing AuditorRegistry shared object...');
    const callStdout = execSync(
      `sui client call --package ${packageId} --module auditor --function create_registry --gas-budget 100000000 --json`,
      { cwd: moveDir }
    ).toString();

    const callResult = JSON.parse(callStdout);
    const createdChanges = callResult.objectChanges;
    
    const registryChange = createdChanges.find(
      c => c.type === 'created' && c.objectType === `${packageId}::auditor::AuditorRegistry`
    );

    if (!registryChange) {
      throw new Error('Could not find created AuditorRegistry object in transaction effects');
    }

    const registryId = registryChange.objectId;
    console.log(`AuditorRegistry created and shared! ID: ${registryId}`);

    // Write to deployed_objects.json
    const deployedData = {
      packageId,
      registryId,
      network: 'devnet',
      deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(targetJsonPath, JSON.stringify(deployedData, null, 2));
    console.log(`Successfully wrote deployed IDs to ${targetJsonPath}`);

  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy();
