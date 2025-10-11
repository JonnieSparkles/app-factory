#!/usr/bin/env node

// Test script for the remote agent deployment system

import { deployFile } from './deploy.js';
import { generateCommitHash, generateShortHash } from './lib/utils.js';

async function runTests() {
  console.log('🧪 Running deployment system tests...\n');

  // Test 1: Hash generation
  console.log('Test 1: Hash generation');
  const content1 = 'Hello World!';
  const hash1 = generateCommitHash(content1);
  const short1 = generateShortHash(hash1);
  console.log(`   Content: "${content1}"`);
  console.log(`   Hash: ${short1}...`);
  console.log(`   ✅ Hash generation works\n`);

  // Test 2: Same content = same hash
  console.log('Test 2: Hash consistency');
  const hash2 = generateCommitHash(content1);
  const short2 = generateShortHash(hash2);
  console.log(`   Same content hash: ${short2}...`);
  console.log(`   Match: ${short1 === short2 ? '✅' : '❌'}\n`);

  // Test 3: Different content = different hash
  console.log('Test 3: Hash uniqueness');
  const content3 = 'Hello Universe!';
  const hash3 = generateCommitHash(content3);
  const short3 = generateShortHash(hash3);
  console.log(`   Different content: "${content3}"`);
  console.log(`   Hash: ${short3}...`);
  console.log(`   Different: ${short1 !== short3 ? '✅' : '❌'}\n`);

  // Test 4: Dry run deployment
  console.log('Test 4: Dry run deployment');
  try {
    const result = await deployFile({
      filePath: 'test-file.txt',
      content: 'Test content for dry run',
      dryRun: true
    });
    
    if (result.success && result.dryRun) {
      console.log(`   ✅ Dry run successful`);
      console.log(`   Would deploy to undername: ${result.undername}`);
    } else {
      console.log(`   ❌ Dry run failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Dry run error: ${error.message}`);
  }

  console.log('\n🎉 Tests completed!');
  console.log('\nTo run a real deployment:');
  console.log('  npm run deploy -- --file hello-world.txt --content "Your content here"');
  console.log('\nTo see help:');
  console.log('  npm run deploy -- --help');
}

// Run tests
runTests().catch(console.error);
