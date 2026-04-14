import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Profile } from '@/lib/types'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => {
          try {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((x) => x.toLowerCase()))
  return a.filter((x) => setB.has(x.toLowerCase()))
}

export async function GET(_req: NextRequest) {
  const supabase = await getSupabase()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: myProfile, error: myProfileError } = await supabase
    .from('profiles')
    .select('id, user_id, interests, looking_for')
    .eq('user_id', user.id)
    .single()

  if (myProfileError || !myProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('profiles')
    .select('*')
    .neq('user_id', user.id)
    .eq('is_active', true)

  if (candidatesError) {
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ profile: null })
  }

  const randomIndex = Math.floor(Math.random() * candidates.length)
  const picked = candidates[randomIndex] as Profile

  const myInterests: string[] = myProfile.interests ?? []
  const myGoals: string[] = myProfile.looking_for ?? []
  const theirInterests: string[] = picked.interests ?? []
  const theirGoals: string[] = picked.looking_for ?? []

  const commonInterests = intersect(myInterests, theirInterests)
  const commonGoals = intersect(myGoals, theirGoals)

  const randomBonus = Math.floor(Math.random() * 16) // 0–15
  const score = Math.min(98, 70 + commonInterests.length * 5 + randomBonus)

  return NextResponse.json({ profile: picked, score, commonInterests, commonGoals })
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await req.json()
  if (
    typeof body !== 'object' ||
    body === null ||
    !('targetProfileId' in body) ||
    typeof (body as Record<string, unknown>).targetProfileId !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { targetProfileId } = body as { targetProfileId: string }

  const { data: myProfile, error: myProfileError } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single()

  if (myProfileError || !myProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Check if match already exists (either direction)
  const { data: existingMatches, error: matchCheckError } = await supabase
    .from('matches')
    .select('id')
    .or(
      `and(user_a_id.eq.${myProfile.id},user_b_id.eq.${targetProfileId}),and(user_a_id.eq.${targetProfileId},user_b_id.eq.${myProfile.id})`
    )

  if (matchCheckError) {
    return NextResponse.json({ error: 'Failed to check existing matches' }, { status: 500 })
  }

  if (existingMatches && existingMatches.length > 0) {
    return NextResponse.json({ matchId: existingMatches[0].id })
  }

  // Create new match
  const { data: newMatch, error: insertError } = await supabase
    .from('matches')
    .insert({
      user_a_id: myProfile.id,
      user_b_id: targetProfileId,
      status: 'pending',
      created_by: myProfile.id,
    })
    .select('id')
    .single()

  if (insertError || !newMatch) {
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }

  return NextResponse.json({ matchId: newMatch.id })
}
