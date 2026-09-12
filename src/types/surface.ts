export interface SafeArea { top: number; right: number; bottom: number; left: number; }
export interface SurfaceProfile {
  id: string; name: string; width: number; height: number; safeArea: SafeArea;
  minTapTarget: number; minTextSize: number; viewingDistance: 'near' | 'far'; touchOnly: boolean;
}
