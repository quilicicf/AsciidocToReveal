# Changelog

## 1.1.0

* :art: Add `fit-content` class in CSS boilerplate file. Allows shrinking code blocks to the minimum width that fits the text
* :bug: Fix CSS
  * Use lighter color for link hover in dark mode
  * Use outline instead of border to avoid shrinking images (makes text in screenshots blurry)

## 1.0.2

* :bug: Fix watcher for relative paths
  * The first build was working, only the watcher needed an absolute path
* :art: The path resolution for watcher logs is now done from the process' `cwd`

## 1.0.1

* :triangular_ruler: Include the bundled deck base in the source code

   > This moves Parcel in the dev dependencies, where it belongs and hopefully fixes usage of a2r in GitHub Actions where it failed because of a Parcel-related error (`Could not resolve module "@parcel/config-default"`).   

## 1.0.0

Initial release
