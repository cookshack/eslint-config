# @cookshack/eslint-config

ESLint config for Cookshack projects.

### Usage

```sh
npx eslint \
--no-warn-ignored \
-f ./node_modules/@cookshack/eslint-config/dist/formatter.js \
-c ./node_modules/@cookshack/eslint-config/dist/index.js \
*.js
```

outputs

```
/home/name/src/codemirror-ruler/index.js:5:1: More than 1 blank line not allowed. (consecutiveBlank, no-multiple-empty-lines)
```

