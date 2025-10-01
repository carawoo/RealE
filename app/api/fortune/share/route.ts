// app/api/fortune/share/route.ts
// 공유 횟수 증가 API

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareSlug } = body;

    if (!shareSlug) {
      return NextResponse.json(
        { error: 'Share slug is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 공유 횟수 증가
    const { error } = await supabase
      .from('fortune_log')
      .update({ share_count: supabase.rpc('increment', { x: 1 }) })
      .eq('share_slug', shareSlug);

    if (error) {
      // increment RPC가 없으면 직접 증가
      const { data: current } = await supabase
        .from('fortune_log')
        .select('share_count')
        .eq('share_slug', shareSlug)
        .single();

      if (current) {
        await supabase
          .from('fortune_log')
          .update({ share_count: (current.share_count || 0) + 1 })
          .eq('share_slug', shareSlug);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('공유 카운트 증가 오류:', error);
    return NextResponse.json(
      {
        error: '공유 카운트를 증가시키는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 조회수 증가
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareSlug = searchParams.get('slug');

    if (!shareSlug) {
      return NextResponse.json(
        { error: 'Share slug is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 조회수 증가
    const { data: current } = await supabase
      .from('fortune_log')
      .select('view_count')
      .eq('share_slug', shareSlug)
      .single();

    if (current) {
      await supabase
        .from('fortune_log')
        .update({ view_count: (current.view_count || 0) + 1 })
        .eq('share_slug', shareSlug);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('조회수 증가 오류:', error);
    return NextResponse.json(
      {
        error: '조회수를 증가시키는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

