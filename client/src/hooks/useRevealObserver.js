import { useEffect } from "react";

const selector = "[data-reveal]";

export default function useRevealObserver() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = new WeakSet();
    let intersectionObserver;

    function reveal(element) {
      if (elements.has(element)) return;
      elements.add(element);
      if (reducedMotion || !("IntersectionObserver" in window)) {
        element.dataset.revealed = "true";
        return;
      }
      intersectionObserver.observe(element);
    }

    if (!reducedMotion && "IntersectionObserver" in window) {
      intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.dataset.revealed = "true";
          intersectionObserver.unobserve(entry.target);
        }
      }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    }

    document.querySelectorAll(selector).forEach(reveal);
    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(selector)) reveal(node);
          node.querySelectorAll(selector).forEach(reveal);
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, []);
}
