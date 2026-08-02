import { NextResponse } from "next/server"
import { runtimeMetadata } from "@/lib/observability"

export function GET() {
  return NextResponse.json({ status: "ok", ...runtimeMetadata() })
}
