/**
 * Official Ukrainian → Latin transliteration for personal names
 * (Cabinet of Ministers Resolution No. 55, 27 January 2010 — passport style).
 *
 * Position-dependent letters (є/ї/й/ю/я) use word-initial forms at the start
 * of the string and after whitespace or hyphen. Soft sign and apostrophe are
 * omitted. The digraph «зг» becomes «zgh».
 */

const SIMPLE: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
};

const OMIT = new Set(["ь", "'", "\u2019", "\u02BC", "`"]);

function isWordStart(prev: string | undefined): boolean {
  return prev === undefined || /[\s-]/.test(prev);
}

function applyCase(source: string, latin: string): string {
  if (!latin) return latin;
  if (source === source.toLowerCase()) return latin;
  // One uppercase Cyrillic letter → title-case digraph (Ш→Sh, not SH).
  return latin.charAt(0).toUpperCase() + latin.slice(1).toLowerCase();
}

function mapLetter(ch: string, atWordStart: boolean): string {
  const lower = ch.toLowerCase();
  if (OMIT.has(lower)) return "";

  let latin: string | undefined;
  switch (lower) {
    case "є":
      latin = atWordStart ? "ye" : "ie";
      break;
    case "ї":
      latin = atWordStart ? "yi" : "i";
      break;
    case "й":
      latin = atWordStart ? "y" : "i";
      break;
    case "ю":
      latin = atWordStart ? "yu" : "iu";
      break;
    case "я":
      latin = atWordStart ? "ya" : "ia";
      break;
    default:
      latin = SIMPLE[lower];
  }

  if (latin === undefined) return ch;
  return applyCase(ch, latin);
}

function mapZgh(z: string, h: string): string {
  const bothUpper =
    z === z.toUpperCase() &&
    z !== z.toLowerCase() &&
    h === h.toUpperCase() &&
    h !== h.toLowerCase();
  if (bothUpper) return "ZGH";
  if (z !== z.toLowerCase()) return "Zgh";
  return "zgh";
}

/** Transliterate a Ukrainian name (or phrase) to Latin passport form. */
export function transliterateUa(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const lower = ch.toLowerCase();
    const prev = i > 0 ? input[i - 1] : undefined;
    const next = i + 1 < input.length ? input[i + 1] : undefined;

    if (lower === "з" && next?.toLowerCase() === "г") {
      out += mapZgh(ch, next);
      i += 1;
      continue;
    }

    out += mapLetter(ch, isWordStart(prev));
  }
  return out;
}
