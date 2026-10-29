import { GET as dispatch } from "../dispatch/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Older schedulers call this path. It runs the same guarded dispatcher. */
export function POST(request: Request) { return dispatch(request); }
export function GET(request: Request) { return dispatch(request); }
