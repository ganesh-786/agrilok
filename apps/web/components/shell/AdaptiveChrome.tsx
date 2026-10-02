"use client";

import { useEffect } from "react";

// Two jobs, both about how much of the screen the bars take.
//
// 1. Keep navigation available without letting enlarged text or a short
//    viewport trap the reading area between bars that do not scroll. On a
//    phone the exam bar sits at the top and the five destinations at the
//    bottom; on a laptop the masthead sits at the top with the exam bar under
//    it. When those would take too much of the viewport, every bar goes back
//    into the page's normal flow.
//
// 2. Tuck the exam bar away while the student scrolls down, and bring it back
//    the moment they scroll up. Reading needs the room; an upward scroll is
//    the sign that the student wants the page's controls again. The bar is
//    never tucked near the top of the page, while its editor is open, or while
//    the keyboard is inside it.

// A scroll shorter than this is a finger settling or a wheel's last tick, not a
// change of direction.
const JITTER = 6;

export function AdaptiveChrome() {
  useEffect(() => {
    const root = document.documentElement;
    const masthead = document.querySelector<HTMLElement>(".study-header");
    const exam = document.querySelector<HTMLElement>(".study-exam");
    const bottom = document.querySelector<HTMLElement>(".study-bottom-nav");
    if (!masthead || !exam || !bottom) return;
    const examRow = exam.querySelector<HTMLElement>("summary") ?? exam;
    const details = exam.querySelector("details");
    // Matches the lg breakpoint the layout switches navigation at.
    const laptop = window.matchMedia("(min-width: 64rem)");

    function update() {
      const height = window.innerHeight;
      // Measured from the closed row: the open editor is never sticky.
      let top = examRow.getBoundingClientRect().height;
      let below = 0;
      if (laptop.matches) {
        const mastheadHeight = masthead!.getBoundingClientRect().height;
        // The exam bar sticks directly under the masthead, whatever its height.
        root.style.setProperty("--masthead-h", `${mastheadHeight}px`);
        root.style.removeProperty("--bottom-nav-h");
        top += mastheadHeight;
      } else {
        root.style.removeProperty("--masthead-h");
        below = bottom!.getBoundingClientRect().height;
        // A toast sits above the bottom navigation, whatever its height.
        root.style.setProperty("--bottom-nav-h", `${below}px`);
      }
      const flow = top > height * 0.28 || below > height * 0.24 || top + below > height * 0.45;
      root.toggleAttribute("data-flow-chrome", flow);
      if (flow) exam!.removeAttribute("data-tucked");
    }

    let lastY = window.scrollY;
    let frame = 0;
    function show() {
      exam!.removeAttribute("data-tucked");
    }
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY;
        if (Math.abs(delta) < JITTER) return;
        lastY = y;
        // Where the bar has only just left its place there is nothing to gain
        // by hiding it, and a bar that vanishes at the first touch reads as a
        // glitch. Two bar heights past the masthead is far enough.
        const settle = masthead!.offsetHeight + examRow.offsetHeight * 2;
        const hold =
          root.hasAttribute("data-flow-chrome") ||
          details?.open ||
          exam!.contains(document.activeElement);
        if (delta < 0 || y < settle || hold) show();
        else exam!.setAttribute("data-tucked", "");
      });
    }

    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(masthead);
    observer?.observe(examRow);
    observer?.observe(bottom);
    window.addEventListener("resize", update);
    laptop.addEventListener("change", update);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Tabbing back into a tucked bar brings it out: focus is never left on
    // something that cannot be seen.
    exam.addEventListener("focusin", show);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      laptop.removeEventListener("change", update);
      window.removeEventListener("scroll", onScroll);
      exam.removeEventListener("focusin", show);
      if (frame) window.cancelAnimationFrame(frame);
      exam.removeAttribute("data-tucked");
      root.removeAttribute("data-flow-chrome");
      root.style.removeProperty("--masthead-h");
      root.style.removeProperty("--bottom-nav-h");
    };
  }, []);
  return null;
}
