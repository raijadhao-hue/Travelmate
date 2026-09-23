import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://carmreiznexvbhctilcl.supabase.co';
const supabaseAnonKey = 'sb_publishable_KucIWE7IF-dPTSipts8dkw__08CS6sr';

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connectivity...');
  console.log(`📍 URL: ${supabaseUrl}`);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Basic connection with health check
    console.log('\n✅ Supabase client created successfully');
    
    // Test 2: Try to fetch from a table to verify auth
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('❌ Table "profiles" does not exist (expected if first run)');
    } else if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
    } else {
      console.log('✅ Successfully queried profiles table');
      console.log(`   Found ${data?.length || 0} records`);
    }
    
    // Test 3: Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`✅ Auth status: ${user ? 'Authenticated' : 'Not authenticated (expected for public key)'}`);
    
    console.log('\n🎉 Supabase connectivity check completed!');
    
  } catch (err) {
    console.error('❌ Connection failed:', err);
    if (err instanceof Error) {
      console.error(`   Error: ${err.message}`);
    }
  }
}

testSupabaseConnection();
