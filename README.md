# Asciidoc-2-Reveal (A2R)

> A highly opinionated transformer for .adoc files to turn them into self-contained Reveal.js presentations

## Why?

Because the asciidoc-reveal plugin is opinionated, and the opinions behind it clash with mine.

## What to expect?

A2R is a CLI tool that takes a .adoc file as input and generates a single HTML file with a Reveal.js presentation inside.

You can find a lot more information in [the presentation deck](./test/deck.adoc), but of course it's meant to be turned into a Reveal.js presentation :wink:.

I plan to generate GitHub pages for it once I publish the repository and CLI tool.

## Opinions

A tool ain't opinionated without opinions, here goes:

* Presentation decks should rely on open standards
* Nobody has the time or will to write pure HTML
* Developers want hackable solutions with sane defaults
* 1MB is too heavy for a deck aimed at a technical audience (HD images are superfluous)
* A deck should be a double-clickable single-file and work everywhere

## Targeted audience

Basically, this is a personal tool, you are free to use it (it's licensed under Apache 2.0) but don't expect changes that don't fit my needs. This is a personal project and I don't intend to spend any time on it if I'm not gaining enough value for the time I put in.
