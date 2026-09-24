import { Fragment } from "react";

// Official titles run service groups together with slashes and no spaces
// ("Agri Extension/Horticulture/Agronomy/Plant Protection"). On a phone that
// run is wider than the screen, and without a break point the browser splits
// it mid-word. A <wbr> after each slash lets the line break where a reader expects.
export function SlashBreaks({ text }: { text: string }) {
  const parts = text.split("/");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <>
              /<wbr />
            </>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}
