import { useLayoutEffect, useRef, useState } from 'react';
import { Eye, ScanLine, SlidersHorizontal, Sparkles, Sun, Moon, Monitor, ShieldCheck, Minus, ChevronUp } from 'lucide-react';
import { SimulatorTab } from '../features/simulator/SimulatorTab';
import { InspectorTab } from '../features/inspector/InspectorTab';
import { FixerTab } from '../features/fixer/FixerTab';
import type { SimulatorController } from '../features/simulator/simulator-controller';
import type { SimulatorModeReader } from '../shared/simulator-mode-reader';
import type { FixerController } from '../features/fixer/fixer-controller';
import { HighlightLayer } from '../features/inspector/HighlightLayer';
import type { InspectorStore } from '../features/inspector/inspector-store';
import type { InspectedIssue } from '../features/inspector/axe-runner';
import type { IssueHandoffStore } from '../shared/issue-handoff';
import { isVerifiedFailure, type FeatureId } from '../shared/types';
import { APP_NAME } from '../shared/constants';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Switch } from './ui/switch';
import { OverlayContainerContext } from './shared/overlay-container';
import { useTheme } from './shared/use-theme';

export function AccessLensPanel({ controller, modeReader, inspector, handoff, fixer }: {
  controller: SimulatorController;
  modeReader: SimulatorModeReader;
  inspector: InspectorStore;
  handoff: IssueHandoffStore;
  fixer: FixerController;
}) {
  const { ready, theme, preference, changeTheme, storageError } = useTheme();
  const [overlayContainer, setOverlayContainer] = useState<HTMLDivElement | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<FeatureId>('simulator');
  // Inspector → Fixer handoff (INS-07): store the verified issue, then show the Fixer tab.
  function previewFix(item: InspectedIssue) {
    if (!isVerifiedFailure(item.issue)) return;
    handoff.set({ issue: item.issue, element: item.element });
    setActiveTab('fixer');
  }
  const expandButton = useRef<HTMLButtonElement>(null);
  const collapseButton = useRef<HTMLButtonElement>(null);
  const userToggled = useRef(false);
  useLayoutEffect(() => {
    if (userToggled.current) (collapsed ? expandButton : collapseButton).current?.focus();
  }, [collapsed]);
  function toggleCollapsed() {
    userToggled.current = true;
    setCollapsed(value => !value);
  }

  // Wait for storage before the first paint so a saved dark theme never flashes light.
  if (!ready) return null;

  return (
    <div className={`accesslens-ui ${theme === 'dark' ? 'dark' : ''}`} data-theme={theme}>
      <OverlayContainerContext.Provider value={overlayContainer}>
        <TooltipProvider delayDuration={350}>
          <HighlightLayer store={inspector} />
          {collapsed && <Button ref={expandButton} onClick={toggleCollapsed} aria-label="Expand AccessLens" aria-expanded={false}
            className="relative z-10 size-12 rounded-xl border border-border bg-primary text-primary-foreground shadow-xl hover:bg-primary/90">
            <Eye className="size-5" aria-hidden="true" /><ChevronUp className="absolute right-1 bottom-1 size-3" aria-hidden="true" />
          </Button>}
          <section hidden={collapsed} className="accesslens-panel flex flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl" aria-label={APP_NAME}>
            <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Eye className="size-5" aria-hidden="true" /></div>
                <div>
                  <h1 className="text-base leading-6 font-semibold tracking-tight">{APP_NAME}</h1>
                  <p className="accesslens-subtitle text-xs text-muted-foreground">Your accessibility toolkit</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Use system theme" aria-pressed={preference === 'system'} onClick={() => changeTheme('system')} className={preference === 'system' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}><Monitor className="size-4" aria-hidden="true" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Use system theme</TooltipContent>
                </Tooltip>
                <Switch checked={theme === 'dark'} onCheckedChange={dark => changeTheme(dark ? 'dark' : 'light')} aria-label="Dark theme" icon={theme === 'dark' ? <Moon className="size-3" aria-hidden="true" /> : <Sun className="size-3" aria-hidden="true" />} />
                <Button ref={collapseButton} variant="ghost" size="icon-sm" aria-label="Collapse AccessLens" aria-expanded={true} onClick={toggleCollapsed}><Minus className="size-4" aria-hidden="true" /></Button>
              </div>
            </header>
            <Separator />
            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as FeatureId)} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="shrink-0 px-5 pt-4 pb-1">
                <TabsList className="grid h-10 w-full grid-cols-3 rounded-lg bg-secondary p-1" aria-label="AccessLens features">
                  <TabsTrigger value="simulator"><SlidersHorizontal aria-hidden="true" />Simulator</TabsTrigger>
                  <TabsTrigger value="inspector"><ScanLine aria-hidden="true" />Inspector</TabsTrigger>
                  <TabsTrigger value="fixer"><Sparkles aria-hidden="true" />Fixer</TabsTrigger>
                </TabsList>
              </div>
              <div className="accesslens-scroll min-h-0 overflow-y-auto overscroll-contain px-5 pt-4 pb-5">
                <TabsContent value="simulator" className="m-0"><SimulatorTab controller={controller} modeReader={modeReader} /></TabsContent>
                <TabsContent value="inspector" className="m-0"><InspectorTab store={inspector} modeReader={modeReader} onPreviewFix={previewFix} /></TabsContent>
                <TabsContent value="fixer" className="m-0"><FixerTab controller={fixer} modeReader={modeReader} /></TabsContent>
              </div>
            </Tabs>
            {storageError && <p role="alert" className="px-5 pb-3 text-xs text-destructive">Theme storage is unavailable. Changes apply to this session.</p>}
            <Separator />
            <footer className="flex shrink-0 items-center gap-2 bg-secondary/50 px-5 py-3 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" aria-hidden="true" />Temporary effects. Your source stays yours.</footer>
          </section>
          {/* Every Radix portal stays inside this themed Shadow DOM subtree. */}
          <div ref={setOverlayContainer} />
        </TooltipProvider>
      </OverlayContainerContext.Provider>
    </div>
  );
}
