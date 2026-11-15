import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ScanLine, SlidersHorizontal, Wrench, Sun, Moon, ShieldCheck, Minus, ChevronUp, GripVertical } from 'lucide-react';
import { SimulatorFooter, SimulatorTab } from '../features/simulator/SimulatorTab';
import { InspectorTab } from '../features/inspector/InspectorTab';
import { FixerTab } from '../features/fixer/FixerTab';
import type { SimulatorController } from '../features/simulator/simulator-controller';
import type { SimulatorModeReader } from '../shared/simulator-mode-reader';
import type { FixerController } from '../features/fixer/fixer-controller';
import { HighlightLayer } from '../features/inspector/HighlightLayer';
import type { InspectorStore } from '../features/inspector/inspector-store';
import type { InspectedIssue } from '../features/inspector/axe-runner';
import type { ImageIssue } from '../features/inspector/image-runner';
import type { IssueHandoffStore } from '../shared/issue-handoff';
import { isVerifiedFailure, type FeatureId } from '../shared/types';
import { APP_NAME } from '../shared/constants';
import { LOGO_DARK, LOGO_LIGHT } from '../assets/brand';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { PanelFooter } from './shared/panel-footer';
import { cn } from './shared/utils';
import { OverlayContainerContext } from './shared/overlay-container';
import { useTheme } from './shared/use-theme';
import { usePanelPosition } from './shared/use-panel-position';
import { UserMode } from '../features/user-mode/UserMode';
import type { UserModeController } from '../features/user-mode/user-mode-controller';
import { RESIZE_EDGES } from './shared/panel-size';

export function AccessLensPanel({ controller, modeReader, inspector, handoff, fixer, userMode }: {
  controller: SimulatorController;
  modeReader: SimulatorModeReader;
  inspector: InspectorStore;
  handoff: IssueHandoffStore;
  fixer: FixerController;
  userMode: UserModeController;
}) {
  const { mode } = useSyncExternalStore(userMode.subscribe, userMode.getState);
  const inspected = useSyncExternalStore(inspector.subscribe, inspector.getState);
  const { ready, theme, preference, changeTheme, storageError } = useTheme();
  const [overlayContainer, setOverlayContainer] = useState<HTMLDivElement | null>(null);
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const position = usePanelPosition(rootEl);

  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<FeatureId>('simulator');
  // Inspector → Fixer handoff (INS-07): store the verified issue, then show the Fixer tab.
  const [selectedImage, setSelectedImage] = useState<ImageIssue | null>(null);
  function previewFix(item: InspectedIssue) {
    if (!isVerifiedFailure(item.issue)) return;
    setSelectedImage(null);
    handoff.set({ issue: item.issue, element: item.element });
    setActiveTab('fixer');
  }
  function previewImageFix(item: ImageIssue) {
    setSelectedImage(item);
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
    <div ref={setRootEl} className={`accesslens-ui ${theme === 'dark' ? 'dark' : ''}`} data-theme={theme} data-dragging={position.dragging} data-resizing={position.resizing}>
      <OverlayContainerContext.Provider value={overlayContainer}>
        <TooltipProvider delayDuration={350}>
          {mode === 'developer' && <HighlightLayer store={inspector} />}
          {collapsed && <Button ref={expandButton} onClick={position.guardClick(toggleCollapsed)} {...position.dragHandlers} aria-label={`Expand ${APP_NAME}`} aria-expanded={false}
            title="Click to expand · drag to move"
            className="accesslens-drag-handle relative z-10 size-12 rounded-xl border border-border bg-primary text-primary-foreground shadow-xl hover:bg-primary/90">
            <img src={LOGO_DARK} alt="" className="size-8" draggable={false} /><ChevronUp className="absolute right-1 bottom-1 size-3" aria-hidden="true" />
          </Button>}
          <section hidden={collapsed} className="accesslens-panel flex flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl" aria-label={APP_NAME}>
            <header className="accesslens-drag-handle flex shrink-0 items-center gap-2 px-3 py-3" {...position.dragHandlers} onDoubleClick={event => { if (!(event.target as Element).closest('button, [role="switch"]')) position.reset(); }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button data-drag-handle variant="ghost" size="icon-xs" className="cursor-grab text-muted-foreground"
                    aria-label="Move panel. Use arrow keys to move, Shift for bigger steps, Home to reset."
                    aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home" onKeyDown={position.onKeyDown}>
                    <GripVertical className="size-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Drag to move · arrow keys to nudge · double-click header to reset</TooltipContent>
              </Tooltip>
              <img src={theme === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="" className="size-8 shrink-0" draggable={false} />
              <h1 className="min-w-0 flex-1 truncate text-base leading-6 font-semibold tracking-tight">{APP_NAME}</h1>
              <div role="group" aria-label="Operating mode" className="flex shrink-0 rounded-lg bg-secondary p-0.5">
                {(['developer', 'user'] as const).map(option => (
                  <button key={option} type="button" aria-pressed={mode === option} aria-label={option === 'developer' ? 'Developer' : 'User'}
                    onClick={() => userMode.setMode(option)}
                    className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', mode === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                    {option === 'developer' ? 'Dev' : 'User'}
                  </button>
                ))}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" role="switch" aria-checked={theme === 'dark'} aria-label="Dark theme" className="text-muted-foreground"
                    onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{preference === 'system' ? 'Following your system theme · click to switch' : 'Switch light or dark theme'}</TooltipContent>
              </Tooltip>
              <Button ref={collapseButton} variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Collapse ${APP_NAME}`} aria-expanded={true} onClick={toggleCollapsed}><Minus className="size-4" aria-hidden="true" /></Button>
            </header>
            <Separator />
            {mode === 'user' ? <div className="accesslens-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"><UserMode controller={userMode} fixer={fixer} /></div> : <Tabs value={activeTab} onValueChange={value => setActiveTab(value as FeatureId)} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="shrink-0 px-4 pt-3 pb-1">
                <TabsList className="grid h-10 w-full grid-cols-3 rounded-lg bg-secondary p-1" aria-label={`${APP_NAME} features`}>
                  <TabsTrigger value="simulator"><SlidersHorizontal aria-hidden="true" />Simulate</TabsTrigger>
                  <TabsTrigger value="inspector"><ScanLine aria-hidden="true" />Inspect</TabsTrigger>
                  <TabsTrigger value="fixer"><Wrench aria-hidden="true" />Fix</TabsTrigger>
                </TabsList>
              </div>
              <div className="accesslens-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-4">
                <TabsContent value="simulator" className="m-0"><SimulatorTab controller={controller} modeReader={modeReader} /></TabsContent>
                <TabsContent value="inspector" className="m-0"><InspectorTab store={inspector} modeReader={modeReader} onPreviewFix={previewFix} onPreviewImageFix={previewImageFix} /></TabsContent>
                <TabsContent value="fixer" className="m-0"><FixerTab controller={fixer} modeReader={modeReader} inspector={inspector}
                  // A rescan drops an image picked from an older scan.
                  selectedImage={selectedImage && inspected.status === 'done' && inspected.imageIssues.includes(selectedImage) ? selectedImage : null} /></TabsContent>
              </div>
            </Tabs>}
            {storageError && <p role="alert" className="px-4 pb-3 text-xs text-destructive">Theme storage is unavailable. Changes apply to this session.</p>}
            <Separator />
            {mode === 'developer' && activeTab === 'simulator' ? <SimulatorFooter controller={controller} modeReader={modeReader} />
              : <PanelFooter><ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />{mode === 'user' ? 'Only this page, only for you. Nothing is saved.' : 'Temporary effects. Your source stays yours.'}</PanelFooter>}
            {/* Resize: drag any edge or corner. The top-left corner is also a keyboard control. */}
            {RESIZE_EDGES.map(edge => edge === 'nw'
              ? <button key={edge} type="button" className={`accesslens-resize accesslens-resize--${edge}`} {...position.resizeHandlers(edge)}
                  onKeyDown={position.onResizeKeyDown} title="Drag to resize · arrow keys to resize"
                  aria-label="Resize panel. Left and Up arrows grow it, Right and Down shrink it, Shift for bigger steps, Home for the default size."
                  aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home" />
              : <div key={edge} className={`accesslens-resize accesslens-resize--${edge}`} aria-hidden="true" {...position.resizeHandlers(edge)} />)}
          </section>
          {/* Every Radix portal stays inside this themed Shadow DOM subtree. */}
          <div ref={setOverlayContainer} />
        </TooltipProvider>
      </OverlayContainerContext.Provider>
    </div>
  );
}
