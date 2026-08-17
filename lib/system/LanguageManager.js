import fs from "fs";
import path from "path";

export class LanguageManager {
  constructor(defaultLang = "en") {
    this.defaultLang = defaultLang;
    this.languages = {};
    this.loadLanguages();
  }

  loadLanguages() {
    const localesPath = path.join(process.cwd(), "lib", "locales");
    const files = fs.readdirSync(localesPath);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const langCode = file.replace(".json", "");
        const content = JSON.parse(
          fs.readFileSync(path.join(localesPath, file), "utf-8"),
        );
        this.languages[langCode] = content;
      }
    }
  }

  setLanguage(langCode) {
    if (this.languages[langCode]) {
      this.defaultLang = langCode;
    } else {
      console.warn(
        `⚠️ Language '${langCode}' not found. Using default '${this.defaultLang}'.`,
      );
    }
  }

  get(key) {
    const keys = key.split(".");
    let result = this.languages[this.defaultLang];

    for (const k of keys) {
      if (result && typeof result === "object") {
        result = result[k];
      } else {
        return key;
      }
    }

    return result || key;
  }
}
