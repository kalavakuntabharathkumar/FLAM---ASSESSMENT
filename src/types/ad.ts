export type ElementType = 'text' | 'image' | 'button';
export type ElementRole = 'primary' | 'secondary' | 'hero' | 'action' | 'branding';
export type Priority = 1 | 2 | 3;

// 'reposition' was declared but never produced by the resolver (the engine
// only ever hides, truncates, or shrinks font size — it never moves an
// element as a distinct degradation step). Keeping it in this type meant a
// degradation log entry could claim an operation the algorithm doesn't
// perform. Narrowed to the operations the resolver actually emits.
export type DegradationOperation = 'resize' | 'truncate' | 'hide';

export interface TextConstraints {
  minFontSize: number;
  preferredFontSize: number;
  maxLines?: number;
  allowTruncation: boolean;
}

export interface ImageConstraints {
  aspectRatio: number;
  minWidth: number;
  minHeight: number;
  preferredWidth: number;
  preferredHeight: number;
}

export interface ElementFlexibility {
  resize: boolean;
  reposition: boolean;
  truncate: boolean;
  droppable: boolean;
}

interface BaseElementSpec {
  id: string;
  content: string;
  priority: Priority;
  minWidth: number;
  minHeight: number;
  preferredWidth: number;
  preferredHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  flexibility: ElementFlexibility;
}

// Discriminated union keyed on `type` (and, for images, `role`), so that
// invalid combinations are compile-time errors instead of silently-optional
// fields:
//  - a 'text' element without `text` constraints can't be constructed
//  - a 'hero' image without `image` (aspect ratio etc.) can't be constructed
//  - a 'button' can't accidentally carry text/image constraints
//  - a 'text' element can't claim role 'hero', and a 'button'/'text' can't
//    claim role 'branding' (only an image can be branding)
export interface TextElementSpec extends BaseElementSpec {
  type: 'text';
  role: Exclude<ElementRole, 'hero' | 'branding'>;
  text: TextConstraints;
  image?: never;
}

export interface HeroImageElementSpec extends BaseElementSpec {
  type: 'image';
  role: 'hero';
  image: ImageConstraints;
  text?: never;
}

// Branding is rendered text-like (a wordmark), so it optionally carries
// TextConstraints for font sizing and may omit a physical ImageConstraints
// block entirely, unlike a hero product image.
export interface BrandingImageElementSpec extends BaseElementSpec {
  type: 'image';
  role: 'branding';
  image?: ImageConstraints;
  text?: TextConstraints;
}

export interface ButtonElementSpec extends BaseElementSpec {
  type: 'button';
  role: Exclude<ElementRole, 'hero' | 'branding'>;
  text?: never;
  image?: never;
}

export type AdElementSpec =
  | TextElementSpec
  | HeroImageElementSpec
  | BrandingImageElementSpec
  | ButtonElementSpec;

export interface AdSpecification {
  id: string;
  elements: AdElementSpec[];
}