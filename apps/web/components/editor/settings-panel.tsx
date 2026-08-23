"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  latestVersion: string | null;
  leftWidth?: number;
  rightWidth?: number;
  statesHeight?: number;
  setLeftWidth?: (n: number) => void;
  setRightWidth?: (n: number) => void;
  setStatesHeight?: (n: number) => void;
  showLeft?: boolean;
  showRight?: boolean;
};

export function SettingsPanel({
  open,
  onClose,
  latestVersion,
  leftWidth,
  rightWidth,
  statesHeight,
  setLeftWidth,
  setRightWidth,
  setStatesHeight,
  showLeft,
  showRight,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [entering, setEntering] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [snapEdgesEnabled, setSnapEdgesEnabled] = useLocalStorage<boolean>("caplay_settings_snap_edges", true);
  const [snapLayersEnabled, setSnapLayersEnabled] = useLocalStorage<boolean>("caplay_settings_snap_layers", true);
  const [snapResizeEnabled, setSnapResizeEnabled] = useLocalStorage<boolean>("caplay_settings_snap_resize", true);
  const [snapRotationEnabled, setSnapRotationEnabled] = useLocalStorage<boolean>("caplay_settings_snap_rotation", true);
  const [SNAP_THRESHOLD, setSnapThreshold] = useLocalStorage<number>("caplay_settings_snap_threshold", 12);
  const [showAnchorPoint, setShowAnchorPoint] = useLocalStorage<boolean>("caplay_preview_anchor_point", false);
  const [autoClosePanels, setAutoClosePanels] = useLocalStorage<boolean>("caplay_settings_auto_close_panels", true);
  const [pinchZoomSensitivity, setPinchZoomSensitivity] = useLocalStorage<number>("caplay_settings_pinch_zoom_sensitivity", 1);
  const [showGeometryResize, setShowGeometryResize] = useLocalStorage<boolean>("caplay_settings_show_geometry_resize", false);
  const [showAlignButtons, setShowAlignButtons] = useLocalStorage<boolean>("caplay_settings_show_align_buttons", false);
  const [uiDensity, setUiDensity] = useLocalStorage<'default' | 'compact'>("caplay_settings_ui_density", 'default');
  const [dragSensitivity, setDragSensitivity] = useLocalStorage<number>("caplay_settings_drag_sensitivity", 3);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      setEntering(false);
      const id = requestAnimationFrame(() => setEntering(true));
      return () => cancelAnimationFrame(id);
    } else if (shouldRender) {
      setEntering(false);
      setIsClosing(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open, shouldRender]);

  useEffect(() => {
    if (!mounted) return;
    if (!shouldRender) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [shouldRender, mounted]);

  useEffect(() => {
    if (!shouldRender) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shouldRender, onClose]);

  if (!mounted || !shouldRender || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-[1000] bg-black/50 transition-opacity duration-300 ease-in-out",
          entering && !isClosing ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-[1001] bg-background border-l shadow-2xl",
          "w-full md:w-[500px] lg:w-[600px]",
          "transform transition-transform duration-300 ease-out",
          entering ? "translate-x-0" : "translate-x-full",
          "flex flex-col"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t("editor.settings.title")}
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <h2 className="text-lg font-semibold">{t("editor.settings.title")}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("editor.settings.close")} onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-medium">{t("editor.settings.language")}</Label>
            <LanguageSwitcher compact />
          </div>

          {/* Interface Density */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("editor.settings.interfaceDensity")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={cn(
                  "group cursor-pointer space-y-2",
                  "transition-all duration-200"
                )}
                onClick={() => setUiDensity('default')}
              >
                <div className={cn(
                  "aspect-[4/3] rounded-lg border-2 bg-muted/50 p-2 overflow-hidden flex flex-col gap-1.5",
                  uiDensity === 'default' ? "border-primary ring-2 ring-primary/20" : "border-transparent group-hover:border-muted-foreground/25"
                )}>
                  <div className="h-2 w-1/2 bg-muted-foreground/20 rounded-full mb-1" />
                  <div className="flex gap-1.5 flex-1 min-h-0">
                    <div className="w-1/3 flex flex-col gap-1.5">
                      <div className="h-3 w-full bg-muted-foreground/10 rounded-sm" />
                      <div className="h-3 w-full bg-muted-foreground/10 rounded-sm" />
                      <div className="h-3 w-full bg-muted-foreground/10 rounded-sm" />
                    </div>
                    <div className="flex-1 bg-muted-foreground/5 rounded-md" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium">{t("editor.settings.defaultDensity")}</div>
                  <div className="text-[10px] text-muted-foreground">{t("editor.settings.defaultDensityDescription")}</div>
                </div>
              </div>

              <div
                className={cn(
                  "group cursor-pointer space-y-2",
                  "transition-all duration-200"
                )}
                onClick={() => setUiDensity('compact')}
              >
                <div className={cn(
                  "aspect-[4/3] rounded-lg border-2 bg-muted/50 p-1.5 overflow-hidden flex flex-col gap-1",
                  uiDensity === 'compact' ? "border-primary ring-2 ring-primary/20" : "border-transparent group-hover:border-muted-foreground/25"
                )}>
                  <div className="h-1.5 w-1/3 bg-muted-foreground/20 rounded-full mb-0.5" />
                  <div className="flex gap-1 flex-1 min-h-0">
                    <div className="w-1/4 flex flex-col gap-1">
                      <div className="h-2 w-full bg-muted-foreground/10 rounded-[1px]" />
                      <div className="h-2 w-full bg-muted-foreground/10 rounded-[1px]" />
                      <div className="h-2 w-full bg-muted-foreground/10 rounded-[1px]" />
                      <div className="h-2 w-full bg-muted-foreground/10 rounded-[1px]" />
                    </div>
                    <div className="flex-1 bg-muted-foreground/5 rounded-sm" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium">{t("editor.settings.compactDensity")}</div>
                  <div className="text-[10px] text-muted-foreground">{t("editor.settings.compactDensityDescription")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Snapping */}

          {/* Snapping */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("editor.settings.snapping")}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-edges" className="text-sm">{t("editor.settings.snapEdges")}</Label>
                <Switch id="snap-edges" checked={!!snapEdgesEnabled} onCheckedChange={(c) => setSnapEdgesEnabled(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-layers" className="text-sm">{t("editor.settings.snapLayers")}</Label>
                <Switch id="snap-layers" checked={!!snapLayersEnabled} onCheckedChange={(c) => setSnapLayersEnabled(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-resize" className="text-sm">{t("editor.settings.snapResize")}</Label>
                <Switch id="snap-resize" checked={!!snapResizeEnabled} onCheckedChange={(c) => setSnapResizeEnabled(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="snap-rotation" className="text-sm">{t("editor.settings.snapRotation")}</Label>
                <Switch id="snap-rotation" checked={!!snapRotationEnabled} onCheckedChange={(c) => setSnapRotationEnabled(!!c)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="snap-threshold" className="text-sm">{t("editor.settings.sensitivity")}</Label>
                  <Button variant="outline" size="sm" onClick={() => { setSnapThreshold(12) }}>{t("common.reset")}</Button>
                </div>
                <Slider id="snap-threshold" value={[SNAP_THRESHOLD]} min={3} max={25} onValueChange={([c]) => setSnapThreshold(c)} />
              </div>
            </div>
          </div>

          {/* Layer Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("editor.settings.layerControls")}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="show-geometry-resize" className="text-sm">{t("editor.settings.showGeometryResize")}</Label>
                <Switch id="show-geometry-resize" checked={!!showGeometryResize} onCheckedChange={(c) => setShowGeometryResize(!!c)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="show-align-buttons" className="text-sm">{t("editor.settings.showAlign")}</Label>
                <Switch id="show-align-buttons" checked={!!showAlignButtons} onCheckedChange={(c) => setShowAlignButtons(!!c)} />
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="drag-sensitivity" className="text-sm">{t("editor.settings.dragSensitivity")}</Label>
                  <Button variant="outline" size="sm" onClick={() => { setDragSensitivity(3) }}>{t("common.reset")}</Button>
                </div>
                <Slider id="drag-sensitivity" value={[dragSensitivity]} min={0.5} max={10} step={0.5} onValueChange={([c]) => setDragSensitivity(c)} />
                <p className="text-[11px] text-muted-foreground">{t("editor.settings.dragSensitivityDescription")}</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("editor.settings.preview")}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="show-anchor-point" className="text-sm">{t("editor.settings.showAnchor")}</Label>
                <Switch id="show-anchor-point" checked={!!showAnchorPoint} onCheckedChange={(c) => setShowAnchorPoint(!!c)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="pinch-zoom-sensitivity" className="text-sm">{t("editor.settings.pinchSensitivity")}</Label>
                  <Button variant="outline" size="sm" onClick={() => { setPinchZoomSensitivity(1) }}>{t("common.reset")}</Button>
                </div>
                <Slider id="pinch-zoom-sensitivity" value={[pinchZoomSensitivity]} min={0.5} max={2} step={0.1} onValueChange={([c]) => setPinchZoomSensitivity(c)} />
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("editor.settings.shortcuts")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>{t("editor.history.undo")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Z</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.history.redo")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + Z</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.shortcuts.zoomIn")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + +</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.shortcuts.zoomOut")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + -</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.shortcuts.recenter")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + 0</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.shortcuts.export")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + E</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.pan")}</span><span className="font-mono text-muted-foreground text-xs">Shift + Drag or Middle Click</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.shortcuts.toggleLeft")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + L</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.shortcuts.toggleRight")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + I</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.bringForward")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + ]</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.sendBackward")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + [</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.bringFront")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + ]</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.sendBack")}</span><span className="font-mono text-muted-foreground text-xs">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + [</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.deleteLayer")}</span><span className="font-mono text-muted-foreground text-xs">Delete</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.resizeCenter")}</span><span className="font-mono text-muted-foreground text-xs">Alt + Drag Handle</span></div>
              <div className="flex items-center justify-between"><span>{t("editor.settings.aspectRatio")}</span><span className="font-mono text-muted-foreground text-xs">Shift + Drag Handle</span></div>
            </div>
          </div>

          {/* Panels */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("editor.settings.panels")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="auto-close-panels" className="text-sm">{t("editor.settings.autoClose")}</Label>
                <Switch id="auto-close-panels" checked={!!autoClosePanels} onCheckedChange={(c) => setAutoClosePanels(!!c)} />
              </div>
              <div className="flex items-center justify-between">
                <span>{t("editor.settings.leftWidth")}</span>
                <span className="font-mono text-muted-foreground text-xs">{leftWidth ?? '—'} px</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("editor.settings.rightWidth")}</span>
                <span className="font-mono text-muted-foreground text-xs">{rightWidth ?? '—'} px</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("editor.settings.statesHeight")}</span>
                <span className="font-mono text-muted-foreground text-xs">{statesHeight ?? '—'} px</span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setLeftWidth?.(320);
                    setRightWidth?.(400);
                    setStatesHeight?.(350);
                  }}
                >
                  {t("editor.settings.resetLayout")}
                </Button>
              </div>
            </div>
          </div>

          {/* Other */}
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('caplay:start-onboarding' as any));
                }
                onClose();
              }}
              disabled={!showLeft || !showRight}
            >
              {t("editor.settings.showOnboarding")}
            </Button>
          </div>

          {/* Version info */}
          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground text-center">
              {t("editor.settings.version", { version: latestVersion ?? '...' })}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
