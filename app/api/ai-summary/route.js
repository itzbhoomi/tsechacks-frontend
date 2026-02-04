import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();

  const res = await fetch(
    "https://uncavilling-howard-intertwiningly.ngrok-free.dev/generate-summary",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: body.title,
        description: body.description,
      }),
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
