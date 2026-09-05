const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

let supabase = null;
let supabaseAdmin = null;

const isConfigured = Boolean(
  config.supabase.url &&
  config.supabase.anonKey &&
  !config.supabase.url.includes('placeholder') &&
  !config.supabase.url.includes('your-project')
);

if (isConfigured) {
  try {
    supabase = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (config.supabase.serviceRoleKey && !config.supabase.serviceRoleKey.includes('placeholder')) {
      supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
  }
}

/**
 * Checks the database connection status
 * @returns {Promise<{ status: string, message: string }>}
 */
const checkDatabaseConnection = async () => {
  if (!isConfigured || !supabase) {
    return {
      status: 'unconfigured',
      message: 'Supabase credentials are not configured or contain placeholder values',
    };
  }

  try {
    // Attempt a lightweight ping query
    const { error } = await supabase.from('_dummy_health_check').select('*').limit(1);
    
    // In Supabase, if the table doesn't exist (PGRST116/42P01), it still confirms connectivity to PostgREST
    if (error && error.code !== '42P01' && error.code !== 'PGRST116' && error.code !== 'PGRST204' && !error.message?.includes('relation "_dummy_health_check" does not exist')) {
      return {
        status: 'error',
        message: error.message,
      };
    }

    return {
      status: 'connected',
      message: 'Supabase connection established successfully',
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.message || 'Failed to communicate with Supabase',
    };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  isConfigured,
  checkDatabaseConnection,
};
