import { seedIfEmpty } from "@/db/seed";
import {
  clearLiveVotes,
  getLiveVotes,
  getTwitchRuntimeStatus,
  subscribeTwitch,
} from "@/server/twitch-irc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await seedIfEmpty();
  const url = new URL(req.url);
  if (url.searchParams.get("resetVotes") === "1") clearLiveVotes();

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };
      send({
        type: "hello",
        at: new Date().toISOString(),
        payload: {
          runtime: getTwitchRuntimeStatus(),
          votes: getLiveVotes(),
        },
      });
      unsubscribe = subscribeTwitch((ev) => send(ev));
      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
