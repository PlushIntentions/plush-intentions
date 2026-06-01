import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createServerSupabase = (cookieStore?: any) => {
  const { createServerClient } = require('@supabase/ssr')
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookieStore?.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  })
}
