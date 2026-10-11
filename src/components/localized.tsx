"use client";

import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { useLocale, useDisplayTranslations } from "@/components/localization-provider";
import { translateText } from "@/lib/localized-text";
import type { Locale } from "@/lib/i18n";

// A presentation-only boundary for legacy English copy. It preserves component
// identity, event handlers, keys, form values and application data. New copy can
// use translateText directly. No DOM mutation or asynchronous translation.
export function localizeTree(node: ReactNode, locale: Locale, translations: Record<string, string> = {}): ReactNode {
  if (typeof node === "string") return translateText(node, locale, translations);
  if (Array.isArray(node)) return Children.map(node, child => localizeTree(child, locale, translations));
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  if (["script", "style", "code", "pre", "textarea"].includes(String(node.type)) || node.props.translate === "no") return node;
  const props: Record<string, unknown> = {};
  for (const key of ["title", "alt", "aria-label", "placeholder", "label", "description", "eyebrow"]) {
    if (typeof node.props[key] === "string") props[key] = translateText(node.props[key], locale, translations);
  }
  if (node.type === "option" && node.props.value === undefined && typeof node.props.children === "string") props.value = node.props.children;
  if (node.props.children !== undefined) props.children = localizeTree(node.props.children as ReactNode, locale, translations);
  return cloneElement(node, props);
}
export function Localized({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const translations = useDisplayTranslations();
  return locale === "fr" || Object.keys(translations).length ? localizeTree(children, locale, translations) : children;
}
