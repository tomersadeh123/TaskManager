/**
 * Script to fix LinkedIn credential encryption format
 * Run this script if users are having LinkedIn credential decryption issues
 */

const { MongoClient } = require('mongodb');

async function fixLinkedInCredentials() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/task-management';
  
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is required');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    const users = db.collection('users');
    
    // Find users with LinkedIn credentials that might have format issues
    const usersWithLinkedIn = await users.find({
      'linkedinAuth.isConnected': true,
      'linkedinAuth.email': { $exists: true },
      'linkedinAuth.password': { $exists: true }
    }).toArray();
    
    console.log(`📊 Found ${usersWithLinkedIn.length} users with LinkedIn credentials`);
    
    let updatedCount = 0;
    
    for (const user of usersWithLinkedIn) {
      // Check if credentials are in old format (need to be re-encrypted)
      const email = user.linkedinAuth.email;
      const password = user.linkedinAuth.password;
      
      // Old format typically doesn't have 3 parts separated by colons
      const emailParts = email.split(':');
      const passwordParts = password.split(':');
      
      if (emailParts.length !== 3 || passwordParts.length !== 3) {
        console.log(`🔄 Marking credentials as invalid for user: ${user.userName || user._id}`);
        
        await users.updateOne(
          { _id: user._id },
          {
            $set: {
              'linkedinAuth.loginStatus': 'invalid',
              'linkedinAuth.lastUpdateRequired': new Date()
            }
          }
        );
        
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} user records`);
    console.log('📝 Users will need to re-enter their LinkedIn credentials in the profile page');
    
  } catch (error) {
    console.error('❌ Error fixing LinkedIn credentials:', error);
  } finally {
    await client.close();
  }
}

// Run the script
fixLinkedInCredentials();