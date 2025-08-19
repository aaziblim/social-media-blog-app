# hero-icon-js
Javascript custom element version from heroicons https://heroicons.com/

# Usage
## 1. install
> Note: If you intend to use hero-icon-js with a CDN, you can skip this installation step.
```
npm install hero-icon-js
```
Or just copy\
`hero-icon-outline.js` or `hero-icon-outline.min.js` for `outline` variant\
and\
`hero-icon-solid.js` or `hero-icon-solid.min.js` for `solid` variant.

## 2. Include
Include `hero-icon-outline.js` or `hero-icon-outline.min.js` for `outline` variant or\
Include `hero-icon-solid.js` or `hero-icon-solid.min.js` for `solid` variant.
```html
<script src="path/to/hero-icon-outline.js"></script>
<script src="path/to/hero-icon-solid.js"></script>
```
Or load the script from a CDN provider:
```html
<script src="https://unpkg.com/hero-icon-js/hero-icon-outline.js"></script>
<script src="https://unpkg.com/hero-icon-js/hero-icon-solid.js"></script>
```
```html
<script src="https://cdn.jsdelivr.net/npm/hero-icon-js/hero-icon-outline.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hero-icon-js/hero-icon-solid.js"></script>
```

## 3. Use
To use an icon on your page, add a `name` attribute with the icon name to an element:
```html
<hero-icon-outline name="check-circle"></hero-icon-outline>
<hero-icon-solid name="check-circle"></hero-icon-solid>
```
> See the complete list of icons at https://heroicons.com/

You can also add other attributes. Allowed attributes: `width`, `height`, `class`.
```html
<hero-icon-outline name="check-circle" width="48" height="48" class="text-success"></hero-icon-outline>
<hero-icon-solid name="check-circle" width="40" height="40" class="text-success"></hero-icon-solid>
```
All `hero-icon` elements will be replaced with SVG markup corresponding to their `name` attribute value.
