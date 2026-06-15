# Package README template

Every `@xfcfam/*` package README follows the same shape, so the registry reads
consistently and contributors don't reinvent the structure each time. Copy the
[skeleton](#skeleton) at the bottom into `packages/<pkg>/README.md` and fill it in.

## Sections, in order

| Section | Required? | Purpose |
|---|---|---|
| `# 🧩 ` + name | yes | Title — the package name in backticks. |
| `> tagline` | yes | A one- or two-line blockquote: what it is, in a sentence. |
| `> [!NOTE]` / `> [!IMPORTANT]` | recommended | The single positioning fact a reader must know (pair with an adapter, outbound vs inbound, native setup lives with the backend…). |
| `## 📦 Install` | yes | The `npm i …` line(s). |
| `## 🚀 Quick start` | yes | One short, realistic snippet. |
| `## 🧰 Exported Components` | yes | The component reference — see below. |
| extra `##` sections | optional | e.g. `## ⚙️ Options`, `## 🔗 What maps`. Each gets one descriptive emoji. |
| `## 📚 Documentation` | yes | `Full specification → **[xfcfam.org](https://xfcfam.org)**` (+ an example link if relevant). |
| `## ⚖️ License` | yes | `MIT`. |

## `## 🧰 Exported Components` — document by XF type

List every published component in a table **per XF type**, in this order, omitting
any type the package doesn't ship:

1. `### Logicals`
2. `### Generalizations`
3. `### Utilities`

Each table has just two columns:

| Component | Description |
|---|---|

- **Component** — the exported class. **Link it to its source file** (relative
  path): `` [`FooRepository`](./src/repository/general/FooRepository.ts) ``. The
  source is where each operation is documented (see JSDoc below), so the README
  does **not** re-list operations.
- **Description** — one sentence. **Fold the package's Transfers and Exceptions
  into the relevant component's description** — they do *not* get their own table.
- Most packages ship only **Generalizations** (the abstract bases you extend) and
  **Utilities**. They ship no concrete **Logicals** — you write those — so that
  table is usually absent.

> [!IMPORTANT]
> Because the README links to the source instead of re-listing operations, **every
> public operation of every exported component must carry a JSDoc comment** (in
> English). The linked source file is the operation-level documentation.

## Emoji rules

- **Unified `🧩` on the title.** Every package, the same emoji; it is the *only*
  emoji on the `#` line.
- **A descriptive emoji on every `##` heading** — `📦` `🚀` `🧰` `⚙️` `🔗` `📚` `⚖️` …
- **No emojis anywhere else** — not on `###` sub-headings, not on table rows, not
  on component names, not inline. Use words (`yes`, `sketch`), never `✅` / `🧪`.

## Callouts (GitHub alerts)

Use them for colour and emphasis. They render with an icon on GitHub and degrade
to a plain blockquote on npm:

- `> [!NOTE]` — positioning / context.
- `> [!TIP]` — a helpful pointer (a sibling package, a pattern).
- `> [!WARNING]` — boundary cases, gotchas, unsupported operations.
- `> [!IMPORTANT]` — something the consumer must do (e.g. native setup).

## Tone

Favour **readability over exhaustiveness in prose** — a short tagline, one quick
start, callouts instead of walls of text. The exhaustive part lives in the linked
source, not in the README.

## Skeleton

Copy this into `packages/<pkg>/README.md`:

````markdown
# 🧩 `@xfcfam/xf-<name>`

> One sentence: what the package is and what it does.

> [!NOTE]
> The single most important positioning fact (pair with X, outbound vs inbound, …).

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-<name>
```

## 🚀 Quick start

```ts
// one short, realistic snippet — extend a Generalization, reach it through the injection
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`FooRepository`](./src/repository/general/FooRepository.ts) | What it is; folds in its transfers / exceptions. |

### Utilities

| Component | Description |
|---|---|
| [`FooUtils`](./src/repository/utils/FooUtils.ts) | Pure helpers. |

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
````
