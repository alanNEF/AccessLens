import { useId, useSyncExternalStore } from 'react';
import { Blend, CloudFog, Contrast, Droplets, Eye, EyeOff, Info, RotateCcw } from 'lucide-react';
import type { SimulationMode } from '../../shared/types';
import type { SimulatorController } from './simulator-controller';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { Button } from '../../components/ui/button';
import { Slider } from '../../components/ui/slider';
import { PanelFooter } from '../../components/shared/panel-footer';
import { cn } from '../../components/shared/utils';
import { PRESETS, BLUR } from './filters';

/** Display order and wording for the 3×3 grid; `PRESETS` keeps the technical labels. */
const modes = [
  { id: 'none', name: 'Off', description: 'Original page appearance', icon: Eye },
  { id: 'protanopia', name: 'Protanopia', description: 'Red sensitivity', icon: Eye },
  { id: 'deuteranopia', name: 'Deuteranopia', description: 'Green sensitivity', icon: Eye },
  { id: 'tritanopia', name: 'Tritanopia', description: 'Blue sensitivity', icon: Eye },
  { id: 'achromatopsia', name: 'Grayscale', description: 'No color, grayscale only', icon: Droplets },
  { id: 'low-contrast', name: 'Low contrast', description: 'Washed-out light and dark', icon: Contrast },
  { id: 'blur', name: 'Low acuity', description: 'Reduced visual clarity', icon: Blend },
  { id: 'cataracts', name: 'Cataracts', description: 'Hazy, faded, yellowed', icon: CloudFog },
  { id: 'visionless', name: 'Visionless', description: 'Keyboard and spoken focus', icon: EyeOff },
] as const satisfies readonly { id: SimulationMode; name: string; description: string; icon: unknown }[];

const modeInfo = (id: SimulationMode) => modes.find(mode => mode.id === id) ?? modes[0];
/** The short name shown for a mode anywhere in the panel. */
export const modeName = (id: SimulationMode) => modeInfo(id).name;

export function SimulatorTab({ controller }: { controller: SimulatorController; modeReader: SimulatorModeReader }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const { mode, blurPx } = state.settings;
  const speechStatus = useSyncExternalStore(controller.subscribeSpeech, controller.getSpeechStatus);
  const intensityId = useId();
  return (
    <div className="space-y-3">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs text-muted-foreground">Vision mode</legend>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(({ id, name, icon: Icon }) => (
            // aria-label keeps the technical name (e.g. "Low Acuity", "Achromatopsia") that the e2e tests and screen readers use.
            <Button key={id} type="button" variant="outline" aria-label={id === 'achromatopsia' ? 'Grayscale (Achromatopsia)' : PRESETS[id].label} aria-pressed={mode === id}
              onClick={() => controller.setMode(id)}
              className={cn('h-auto min-h-[68px] flex-col gap-1.5 rounded-xl px-1.5 py-3 text-xs font-medium whitespace-normal',
                mode === id ? 'border-ring bg-accent text-foreground hover:bg-accent [&_svg]:text-accent-foreground' : 'border-border bg-background hover:bg-secondary [&_svg]:text-muted-foreground')}>
              <Icon className="size-[18px]" aria-hidden="true" />
              <span>{name}</span>
            </Button>
          ))}
        </div>
      </fieldset>

      {mode === 'blur' && (
        <div className="rounded-xl border border-border p-3">
          <div className="mb-2.5 flex items-center gap-2.5">
            <Blend className="size-4 text-muted-foreground" aria-hidden="true" />
            <span id={intensityId} className="flex-1 text-sm font-medium">Low acuity</span>
            <span className="text-xs tabular-nums text-muted-foreground">{blurPx} px</span>
          </div>
          <Slider min={BLUR.min} max={BLUR.max} step={BLUR.step} value={[blurPx]} aria-labelledby={intensityId}
            aria-valuetext={`${blurPx} pixels of blur`} onValueChange={([value]) => { if (value !== undefined) controller.setBlurPx(value); }} />
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground" aria-hidden="true"><span>Clear</span><span>Blurred</span></div>
        </div>
      )}

      {mode === 'visionless' && (
        <div className="space-y-2.5 rounded-xl border border-border p-3">
          <p className="text-sm">Use Tab and Shift+Tab to move through the page, Enter or Space to activate, and Escape to stop speech. Panel controls aren’t narrated.</p>
          <p aria-live="polite" className="text-xs text-muted-foreground">{speechStatus}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => controller.stopSpeech()}>Stop Speech</Button>
            <Button type="button" size="sm" onClick={() => controller.reset()}>Exit Visionless</Button>
          </div>
          <p className="text-xs text-muted-foreground">An educational approximation. It doesn’t replace testing with a real screen reader, and native dialogs may stay visible.</p>
        </div>
      )}

      {state.error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{state.error} Use Reset to return to Off.</p>}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span>{mode === 'none' ? 'Pick a mode to preview this page. Simulations are approximations, not a lived experience.' : `${modeInfo(mode).description} · an approximation, not a lived experience`}</span>
      </p>
    </div>
  );
}

/** Bottom bar for the Simulate tab: the applied mode and Reset. */
export function SimulatorFooter({ controller, modeReader }: { controller: SimulatorController; modeReader: SimulatorModeReader }) {
  const activeMode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const { blurPx } = useSyncExternalStore(controller.subscribe, controller.getState).settings;
  const on = activeMode !== 'none';
  return (
    <PanelFooter>
      <span className={cn('size-2 shrink-0 rounded-full', on ? 'bg-ring' : 'bg-muted-foreground/50')} aria-hidden="true" />
      <p role="status" aria-live="polite" aria-atomic="true" className="min-w-0 flex-1 truncate">
        {on ? <>Viewing as <strong className="font-medium text-foreground">{modeName(activeMode)}{activeMode === 'blur' ? ` · ${blurPx} px` : ''}</strong></> : 'Original page'}
      </p>
      <Button type="button" variant="ghost" size="xs" className="text-foreground" onClick={() => controller.reset()}><RotateCcw className="size-3.5" aria-hidden="true" />Reset</Button>
    </PanelFooter>
  );
}
