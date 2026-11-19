"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Eraser,
  Maximize2,
  Minimize2,
  Move,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Point, Stroke } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const COLORS = ["#e8edf5", "#5b9cff", "#5ee4a4", "#f5c542", "#f07167", "#c084fc"];

interface Props {
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
  className?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function Whiteboard({
  strokes,
  onChange,
  className,
  expanded,
  onToggleExpand,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const current = useRef<Stroke | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser" | "pan">("pen");
  const [color, setColor] = useState(COLORS[0]!);
  const [size, setSize] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--board").trim() || "#111";
    ctx.fillStyle = "#0c0e14";
    ctx.fillRect(0, 0, w, h);

    // subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const step = 32 * zoom;
    const ox = offset.x % step;
    const oy = offset.y % step;
    for (let x = ox; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = oy; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const all = current.current ? [...strokes, current.current] : strokes;
    for (const s of all) {
      if (s.points.length < 2) continue;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = s.size * zoom;
      if (s.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = s.color;
      }
      ctx.beginPath();
      const p0 = s.points[0]!;
      ctx.moveTo(p0.x * zoom + offset.x, p0.y * zoom + offset.y);
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i]!;
        ctx.lineTo(p.x * zoom + offset.x, p.y * zoom + offset.y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, [strokes, zoom, offset]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [redraw]);

  const toLocal = (e: ReactPointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / zoom,
      y: (e.clientY - rect.top - offset.y) / zoom,
      p: e.pressure || 0.5,
    };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "pan") {
      panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      return;
    }
    drawing.current = true;
    setPast((p) => [...p.slice(-40), strokes]);
    setFuture([]);
    current.current = {
      tool: tool === "eraser" ? "eraser" : "pen",
      color,
      size: tool === "eraser" ? size * 4 : size,
      points: [toLocal(e)],
    };
    redraw();
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (tool === "pan" && panStart.current) {
      setOffset({
        x: panStart.current.ox + (e.clientX - panStart.current.x),
        y: panStart.current.oy + (e.clientY - panStart.current.y),
      });
      return;
    }
    if (!drawing.current || !current.current) return;
    current.current = {
      ...current.current,
      points: [...current.current.points, toLocal(e)],
    };
    redraw();
  };

  const onPointerUp = () => {
    panStart.current = null;
    if (!drawing.current || !current.current) return;
    drawing.current = false;
    const stroke = current.current;
    current.current = null;
    if (stroke.points.length > 1) onChange([...strokes, stroke]);
    else redraw();
  };

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1]!;
    setFuture((f) => [strokes, ...f]);
    setPast((p) => p.slice(0, -1));
    onChange(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0]!;
    setPast((p) => [...p, strokes]);
    setFuture((f) => f.slice(1));
    onChange(next);
  };

  const clear = () => {
    setPast((p) => [...p, strokes]);
    setFuture([]);
    onChange([]);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-border bg-board",
        expanded && "fixed inset-3 z-50 shadow-2xl",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-surface px-2 py-1.5">
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} title="Caneta">
          <Pencil className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Borracha">
          <Eraser className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={tool === "pan"} onClick={() => setTool("pan")} title="Mover">
          <Move className="size-3.5" />
        </ToolBtn>
        <div className="mx-1 h-4 w-px bg-border" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => {
              setColor(c);
              setTool("pen");
            }}
            className={cn(
              "size-5 rounded-full border border-border/50 transition-transform",
              color === c && tool === "pen" && "scale-110 ring-2 ring-primary",
            )}
            style={{ background: c }}
          />
        ))}
        <div className="mx-1 flex w-24 items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground">Traço</span>
          <Slider
            value={[size]}
            min={1}
            max={16}
            step={1}
            onValueChange={(v) => setSize(v[0] ?? 3)}
            className="flex-1"
          />
        </div>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolBtn onClick={undo} title="Desfazer" disabled={!past.length}>
          <Undo2 className="size-3.5" />
        </ToolBtn>
        <ToolBtn onClick={redo} title="Refazer" disabled={!future.length}>
          <Redo2 className="size-3.5" />
        </ToolBtn>
        <ToolBtn onClick={clear} title="Limpar">
          <Trash2 className="size-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => setZoom((z) => Math.min(3, z + 0.15))} title="Zoom +">
          <ZoomIn className="size-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))} title="Zoom −">
          <ZoomOut className="size-3.5" />
        </ToolBtn>
        <span className="ml-1 text-[10px] tabular text-muted-foreground">{Math.round(zoom * 100)}%</span>
        {onToggleExpand && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto size-7"
            onClick={onToggleExpand}
            title={expanded ? "Sair da tela cheia" : "Tela cheia"}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        )}
      </div>
      <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none">
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 size-full",
            tool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  active,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}
