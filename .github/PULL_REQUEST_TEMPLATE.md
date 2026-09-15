<!--
Keep this PR to the four sections below. Nothing else.

Write it the way you would explain the change to a teammate at their desk.
Plain sentences, no marketing voice, no filler.

Do not use double hyphens or long dashes anywhere in this PR. Use a comma, a
full stop, or split the sentence.

Do not add any AI or tool attribution, co-author line, or generated-with note.
-->

## Topic

<!-- One line. Which part of the system this touches. -->

## What it solves

<!--
Two or three sentences in plain language. The problem, not the patch.
If someone reads only this, they should know why the change exists.
Link the issue: Closes #123
-->

## How it solves it

<!-- Bullet points. One idea per bullet. Say what you did, not what you hope. -->

-
-
-

## What changes

<!--
A small diagram of the change. Show the flow before and after, or the new path
through the system. ASCII is fine and preferred, it reads on every screen.

Example:

  before:
    question -> retrieval -> Gemini -> answer

  after:
    question -> cache hit? -> yes -> cached answer
                           -> no  -> retrieval -> Gemini -> answer
                                                         -> cache write
-->

```

```
