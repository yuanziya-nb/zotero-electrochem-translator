# Electrochem English–Chinese Translator for Zotero

A Zotero 7 add-on for translating selected English scientific text into Chinese, with a built-in electrochemistry terminology dictionary.

## Features

- English → Chinese translation
- Lingva as the primary free translation service
- LibreTranslate as an automatic fallback
- Built-in electrochemistry vocabulary, including working/counter/reference electrodes, cyclic voltammetry, impedance spectroscopy, overpotential, SEI, and more
- Custom phrase/term dictionary
- Tools-menu and keyboard shortcut

## Install

1. Build a ZIP/XPI package from this repository's files, with `manifest.json` and `bootstrap.js` at the ZIP root.
2. In Zotero 7, open **Tools → Plugins**.
3. Drag the `.xpi` file into Zotero, or use **Install Add-on From File**.
4. Restart Zotero.

For development, the repository can be packaged with:

```bash
zip -r electrochem-translator.xpi manifest.json bootstrap.js content
```

## Use

1. Select text in a Zotero PDF reader or note.
2. Use **Tools → Translate selected text (electrochemistry)**.
3. Or press **Ctrl+Shift+T**.

## Settings

Open **Tools → Electrochem Translator settings…**.

You can configure:

- a Lingva public instance;
- a LibreTranslate endpoint;
- custom JSON terminology mappings.

Example:

```json
{
  "cathode": "阴极",
  "anode": "阳极",
  "galvanostatic charge-discharge": "恒电流充放电"
}

```

## Privacy and reliability

Selected text is sent to the configured third-party translation service. Public free services are not guaranteed to be private or continuously available. For sensitive documents, host LibreTranslate yourself and set the endpoint to that server.

## License

MIT
