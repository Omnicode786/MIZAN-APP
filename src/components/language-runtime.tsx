"use client";

import { useEffect, useRef } from "react";
import { LANGUAGE_CHANGE_EVENT, LANGUAGE_STORAGE_KEY } from "@/hooks/use-language";
import { normalizeLanguage, type AppLanguage } from "@/lib/language";
import { translateUiText } from "@/lib/phrase-translations";

const textOriginals = new WeakMap<Text, string>();
const attributeNames = ["placeholder", "title", "aria-label"];
const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

function applyDocumentLanguage(language: AppLanguage) {
  document.documentElement.lang = language === "ur" ? "ur" : "en";
  document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  document.documentElement.dataset.language = language;
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (ignoredTags.has(parent.tagName)) return true;
  if (parent.closest("[data-no-localize]")) return true;
  return !node.nodeValue?.trim();
}

function localizeTextNode(node: Text, language: AppLanguage) {
  if (shouldSkipTextNode(node)) return;

  const current = node.nodeValue || "";
  const stored = textOriginals.get(node);

  if (language === "en") {
    if (stored && current !== stored) node.nodeValue = stored;
    return;
  }

  if (!stored) {
    textOriginals.set(node, current);
    node.nodeValue = translateUiText(current, language);
    return;
  }

  const translatedStored = translateUiText(stored, language);
  if (current !== stored && current !== translatedStored) {
    textOriginals.set(node, current);
    node.nodeValue = translateUiText(current, language);
    return;
  }

  if (current !== translatedStored) {
    node.nodeValue = translatedStored;
  }
}

function localizeAttributes(element: Element, language: AppLanguage) {
  for (const attribute of attributeNames) {
    const value = element.getAttribute(attribute);
    if (!value?.trim()) continue;

    const dataKey = `data-lawsphere-original-${attribute}`;
    const stored = element.getAttribute(dataKey);

    if (language === "en") {
      if (stored && value !== stored) element.setAttribute(attribute, stored);
      continue;
    }

    const original = stored || value;
    if (!stored) element.setAttribute(dataKey, original);
    const translated = translateUiText(original, language);
    if (value !== translated) element.setAttribute(attribute, translated);
  }
}

function localizeTree(root: ParentNode, language: AppLanguage) {
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();

  while (textNode) {
    localizeTextNode(textNode as Text, language);
    textNode = textWalker.nextNode();
  }

  if (root instanceof Element) localizeAttributes(root, language);

  root.querySelectorAll?.("*").forEach((element) => {
    if (!element.closest("[data-no-localize]")) {
      localizeAttributes(element, language);
    }
  });
}

export function LanguageRuntime() {
  const languageRef = useRef<AppLanguage>("en");
  const applyingRef = useRef(false);

  useEffect(() => {
    function apply(language: AppLanguage) {
      applyingRef.current = true;
      languageRef.current = language;
      applyDocumentLanguage(language);
      localizeTree(document.body, language);
      applyingRef.current = false;
    }

    const initialLanguage = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    apply(initialLanguage);

    function onLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<AppLanguage>;
      apply(normalizeLanguage(customEvent.detail));
    }

    const observer = new MutationObserver((mutations) => {
      if (applyingRef.current) return;

      window.requestAnimationFrame(() => {
        applyingRef.current = true;
        for (const mutation of mutations) {
          if (mutation.type === "characterData") {
            localizeTextNode(mutation.target as Text, languageRef.current);
          }

          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              localizeTextNode(node as Text, languageRef.current);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              localizeTree(node as Element, languageRef.current);
            }
          });

          if (mutation.type === "attributes" && mutation.target instanceof Element) {
            localizeAttributes(mutation.target, languageRef.current);
          }
        }
        applyingRef.current = false;
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributeNames
    });

    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);

    return () => {
      observer.disconnect();
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
    };
  }, []);

  return null;
}
