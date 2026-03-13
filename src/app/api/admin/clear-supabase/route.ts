import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase service role key not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let deleted = 0;

  try {
    // List users in pages of 1000 and delete them
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error) throw error;
      if (!data.users.length) break;

      for (const user of data.users) {
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
        if (delError) {
          console.error(`Failed to delete user ${user.id}:`, delError.message);
        } else {
          deleted++;
        }
      }

      // If we got fewer than 1000, we're done
      if (data.users.length < 1000) break;
      page++;
    }

    return NextResponse.json({ deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear Supabase users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
