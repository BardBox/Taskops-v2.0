import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(['team_member', 'project_manager', 'project_owner', 'sales_team', 'production_superviser', 'business_head']),
  avatar_url: z.string().nullable().optional()
})

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().max(255).optional(),
  full_name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['team_member', 'project_manager', 'project_owner', 'sales_team', 'production_superviser', 'business_head']).optional(),
  creative_title: z.string().max(50).nullable().optional(),
  avatar_url: z.string().nullable().optional()
})

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
          .select('id, full_name, user_code, creative_title')

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
            creative_title: profile.creative_title || null,
            role: userRole?.role || 'team_member',
          }
        }) || []

        return new Response(JSON.stringify({ users: usersData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create': {
        // Validate input data
        const validated = createUserSchema.parse(payload)
        const { email, password, full_name, role, avatar_url } = validated

        // Validate PM permissions for creating users
        if (isPM && !isOwner && !['team_member', 'project_manager'].includes(role)) {
          return new Response(JSON.stringify({ error: 'Project Managers can only create Team Members and Project Managers' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Create user in auth
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, role, avatar_url },
        })

        if (authError) throw authError

        // Explicitly set the user role in the user_roles table
        // This ensures the role is set correctly even if triggers fail or default to team_member
        if (authData.user) {
          const { error: roleError } = await supabaseClient
            .from('user_roles')
            .upsert({
              user_id: authData.user.id,
              role: role
            }, { onConflict: 'user_id' })

          if (roleError) {
            console.error('Error setting user role:', roleError)
            // We don't throw here to avoid failing the whole request if the user was created
            // but we log it. The role might default to team_member via trigger.
          }
        }

        return new Response(JSON.stringify({ success: true, user: authData.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update': {
        // Validate input data
        const validated = updateUserSchema.parse(payload)
        const { userId, full_name, email, role, creative_title, avatar_url } = validated

        // Get target user's current role
        const { data: targetUserRole } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single()

        // PMs cannot edit Project Owners
        if (isPM && !isOwner && targetUserRole?.role === 'project_owner') {
          return new Response(JSON.stringify({ error: 'Cannot edit project owners' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // PMs cannot set role to project_owner
        if (isPM && !isOwner && role === 'project_owner') {
          return new Response(JSON.stringify({ error: 'Cannot assign project owner role' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Update user email if provided and changed
        if (email) {
          const { error: emailError } = await supabaseClient.auth.admin.updateUserById(
            userId,
            { email }
          )
          if (emailError) throw emailError
        }

        // Update profile (full_name, creative_title, and/or avatar_url)
        const profileUpdates: any = {}
        if (full_name !== undefined) profileUpdates.full_name = full_name
        if (creative_title !== undefined) profileUpdates.creative_title = creative_title
        if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url

        if (Object.keys(profileUpdates).length > 0) {
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId)

          if (profileError) throw profileError
        }

        // Update role if provided - Use upsert to handle cases where role row might be missing
        if (role) {
          const { error: roleError } = await supabaseClient
            .from('user_roles')
            .upsert({
              user_id: userId,
              role: role
            }, { onConflict: 'user_id' })

          if (roleError) throw roleError
        }

        return new Response(JSON.stringify({ success: true }), {
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

      case 'resetPassword': {
        const { userId } = payload

        // Get target user's current role
        const { data: targetUserRole } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single()

        // PMs cannot reset passwords for Project Owners
        if (isPM && !isOwner && targetUserRole?.role === 'project_owner') {
          return new Response(JSON.stringify({ error: 'Cannot reset password for project owners' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Get user's email
        const { data: authUser, error: getUserError } = await supabaseClient.auth.admin.getUserById(userId)
        if (getUserError || !authUser.user?.email) {
          throw new Error('User not found or email missing')
        }

        // Generate password reset link
        const { data, error: resetError } = await supabaseClient.auth.admin.generateLink({
          type: 'recovery',
          email: authUser.user.email,
        })

        if (resetError) throw resetError

        return new Response(JSON.stringify({
          success: true,
          message: 'Password reset email sent successfully',
          resetLink: data.properties.action_link
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'changePassword': {
        // Only owners can directly change passwords
        if (!isOwner) {
          return new Response(JSON.stringify({ error: 'Only project owners can change passwords directly' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { userId, newPassword } = payload

        // Validate password
        if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
          return new Response(JSON.stringify({ error: 'Password must be between 8 and 128 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Update user's password
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        )

        if (updateError) throw updateError

        return new Response(JSON.stringify({
          success: true,
          message: 'Password changed successfully'
        }), {
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