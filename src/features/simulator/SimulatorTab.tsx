import { useId, useSyncExternalStore } from 'react';
import { Check, CircleOff, CloudFog, Contrast, Eye, Focus, Info, Palette, RotateCcw } from 'lucide-react';
import type { SimulationMode } from '../../shared/types';
import type { SimulatorController } from './simulator-controller';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { Button } from '../../components/ui/button';
import { Slider } from '../../components/ui/slider';
import { cn } from '../../components/shared/utils';
import { PRESETS, BLUR } from './filters';

const modes = [
  { id: 'none', description: 'Original page appearance', icon: CircleOff },
  { id: 'protanopia', description: 'Red sensitivity', icon: Eye },
  { id: 'deuteranopia', description: 'Green sensitivity', icon: Eye },
  { id: 'tritanopia', description: 'Blue sensitivity', icon: Eye },
  { id: 'visionless', description: 'Keyboard and spoken focus', icon: Eye },
  { id: 'achromatopsia', description: 'No color, grayscale only', icon: Palette },
  { id: 'cataracts', description: 'Hazy, faded, yellowed', icon: CloudFog },
  { id: 'low-contrast', description: 'Washed-out light and dark', icon: Contrast },
  { id: 'blur', description: 'Reduced visual clarity', icon: Focus },
] as const;

export function SimulatorTab({ controller, modeReader }: { controller: SimulatorController; modeReader: SimulatorModeReader }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const activeMode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const { mode, blurPx } = state.settings;
  const speechStatus = useSyncExternalStore(controller.subscribeSpeech,controller.getSpeechStatus);
  const intensityId = useId();
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Simulate vision</h2>
          <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">Live preview</span>
        </div>
        <p className="text-sm text-muted-foreground">Explore visual barriers on this page.</p>
      </div>
      {mode === 'visionless' && <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3.5">
        <h3 className="text-sm font-semibold">Active mode: Visionless</h3>
        <p className="text-sm">Use Tab / Shift+Tab to navigate the page, Enter or Space to activate controls, and Escape to stop speech. Panel controls are not narrated.</p>
        <p aria-live="polite" className="text-xs text-muted-foreground">{speechStatus}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={()=>controller.stopSpeech()}>Stop Speech</Button>
          <Button type="button" onClick={()=>controller.reset()}>Exit Visionless</Button>
        </div>
        <p className="text-xs text-muted-foreground">Visionless Mode is a simplified educational approximation. It does not reproduce the experience of blindness or replace testing with a real screen reader.</p>
        <p className="text-xs text-muted-foreground">Native top-layer dialogs and unusual stacking contexts may remain visible. Exit Visionless if blackout is incomplete.</p>
      </div>}
      <fieldset className="min-w-0 space-y-2.5">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Vision mode</legend>
        <div className="grid grid-cols-2 gap-2">
          {modes.map(({ id, description, icon: Icon }) => (
            <Button key={id} type="button" variant="outline" aria-label={PRESETS[id].label} aria-pressed={mode === id}
              onClick={() => controller.setMode(id satisfies SimulationMode)}
              className={cn('relative h-auto min-h-20 flex-col items-start justify-center gap-1 rounded-lg px-3 py-3 text-left whitespace-normal transition-colors duration-150',
                id === 'none' && 'col-span-2 min-h-14 flex-row items-center justify-start gap-3',
                mode === id ? 'border-ring bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : 'border-border bg-background hover:bg-secondary')}>
              <Icon className="size-4" aria-hidden="true" />
              <span className="flex flex-col gap-0.5"><span className="text-sm font-medium">{PRESETS[id].label}</span><span className="text-xs font-normal text-muted-foreground">{description}</span></span>
              {mode === id && <Check className="absolute top-3 right-3 size-3.5 text-accent-foreground" aria-hidden="true" />}
            </Button>
          ))}
        </div>
      </fieldset>
      {mode === 'blur' && <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3.5">
        <div className="flex items-center justify-between gap-2"><span id={intensityId} className="text-sm font-medium">Low Acuity intensity</span><span className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium tabular-nums">{blurPx} px</span></div>
        <Slider min={BLUR.min} max={BLUR.max} step={BLUR.step} value={[blurPx]} aria-labelledby={intensityId}
          aria-valuetext={`${blurPx} pixels of blur`} onValueChange={([value]) => { if (value !== undefined) controller.setBlurPx(value); }} />
        <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true"><span>0 px · Clear</span><span>8 px · Blurred</span></div>
      </div>}
      <div className="flex items-center justify-between gap-2">
        <p role="status" aria-live="polite" aria-atomic="true" className="min-w-0 text-xs text-muted-foreground">Active: <strong className="font-medium text-foreground">{PRESETS[activeMode].label}</strong></p>
        <Button type="button" variant="outline" size="sm" onClick={() => controller.reset()}><RotateCcw className="size-3.5" aria-hidden="true" />Reset</Button>
      </div>
      {state.error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{state.error} Use Reset to return to Off.</p>}
      <div className="flex items-start gap-2.5 rounded-lg bg-secondary p-3.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4" aria-hidden="true" />
        <div className="space-y-2">
          <p>These simulations are approximations and do not represent any individual's lived visual experience.</p>
          <p>They do not determine accessibility. Page sections are simulated separately; backgrounds, overlays and embedded frames may differ.</p>
        </div>
      </div>
    </div>
  );
}
