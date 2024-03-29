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

* **Presentation decks should rely on open standards:** a2r builds HTML
* **Nobody has the time or will to write pure HTML:** a2r uses Asciidoc
* **Developers want hackable solutions with sane defaults:** a2r is hackable, defaults are designed for the targeted audience, devs
* **1MB is too heavy for a deck aimed at a technical audience:** a2r has a relatively raw size (200kB) and encourages use of light image formats
* **A deck should be a double-clickable single-file and work everywhere:** a2r creates an auto-contained HTML file
* **Chrome is an unwanted monopoly:** a2r build target is Firefox, one of the very few alternatives that devs actually use. I might add other targets in the future, this part is still to be defined

## Targeted audience

Basically, this is a personal tool, you are free to use it (it's licensed under Apache 2.0) but don't expect changes that don't fit my needs. 

This is a personal project and I don't intend to spend any time on it if I'm not gaining enough value for the time I put in.

## Usage

If after reading all of the above, you still want to use the tool, here's how:

```shell
npm install --global '@quilicicf/asciidoc-2-reveal' # Install globally
a2r --help                                          # Display general help
a2r build --help                                    # Display help for command build
a2r watch \
  --input-file '/path/to/deck.adoc' \
  --output-file '/path/to/deck.html' \
  --assets-folder 'assets'                          # Watch for changes in deck/assets & live-reload open decks
```
