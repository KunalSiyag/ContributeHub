
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const email = body.email;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const result = await supabase.from('waitlist').insert([{ email }]);

    if (result.error) {
      if (result.error.code === '23505') {
        return NextResponse.json(
          { message: 'You are already on the waitlist!' },
          { status: 409 }
        );
      }
      throw result.error;
    }

    return NextResponse.json(
      { message: 'Successfully joined the waitlist!' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Waitlist error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}