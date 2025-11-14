import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user's token and check their role
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user has admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const userRole = roleData?.role
    const isOwner = userRole === 'project_owner'
    const isPM = userRole === 'project_manager'

    if (!isOwner && !isPM) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'list': {
        // Get all profiles
        const { data: profiles, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, user_code')

        if (profilesError) throw profilesError

        // Get all roles
        const { data: roles, error: rolesError } = await supabaseClient
          .from('user_roles')
          .select('user_id, role')

        if (rolesError) throw rolesError

        // Get all auth users
        const { data: { users: authUsers }, error: authError } = await supabaseClient.auth.admin.listUsers()
        if (authError) throw authError

        // Combine the data
        const usersData = profiles?.map((profile: any) => {
          const authUser = authUsers?.find((u: any) => u.id === profile.id)
          const userRole = roles?.find((r: any) => r.user_id === profile.id)

          return {
            id: profile.id,
            email: authUser?.email || '',
            full_name: profile.full_name,
            user_code: profile.user_code || '',
            role: userRole?.role || 'team_member',
          }
        }) || []

        return new Response(JSON.stringify({ users: usersData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create': {
        const { email, password, full_name, role } = payload

        // Validate PM can only create TMs
        if (!isOwner && role !== 'team_member') {
          return new Response(JSON.stringify({ error: 'Project Managers can only create Team Members' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Create user in auth
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, role },
        })

        if (authError) throw authError

        return new Response(JSON.stringify({ success: true, user: authData.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete': {
        const { userId } = payload

        // Only owners can delete users
        if (!isOwner) {
          return new Response(JSON.stringify({ error: 'Only owners can delete users' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)
        if (deleteError) throw deleteError

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})