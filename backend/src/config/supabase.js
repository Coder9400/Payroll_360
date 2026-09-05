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

    if (
      config.supabase.serviceRoleKey &&
      !config.supabase.serviceRoleKey.includes('placeholder')
    ) {
      supabaseAdmin = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
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
      message:
        'Supabase credentials are not configured or contain placeholder values',
    };
  }

  try {
    // Attempt a lightweight ping query
    const { error } = await supabase
      .from('_dummy_health_check')
      .select('*')
      .limit(1);

    // If the table does not exist, Supabase has still responded,
    // which confirms that the connection to Supabase is working.
    const tableDoesNotExist =
      error &&
      (
        error.code === '42P01' ||
        error.code === 'PGRST116' ||
        error.code === 'PGRST204' ||
        error.message?.includes(
          'relation "_dummy_health_check" does not exist'
        ) ||
        error.message?.includes(
          "Could not find the table 'public._dummy_health_check'"
        )
      );

    // A different error means something is actually wrong.
    if (error && !tableDoesNotExist) {
      return {
        status: 'error',
        message: error.message,
      };
    }

    // No error OR expected "table doesn't exist" error
    // means Supabase itself is reachable.
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