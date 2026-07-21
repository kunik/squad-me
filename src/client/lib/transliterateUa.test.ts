import { describe, expect, it } from "vitest";
import { transliterateUa } from "./transliterateUa";

describe("transliterateUa (CMU Resolution 55)", () => {
  it("transliterates representative personal names", () => {
    expect(transliterateUa("Тарас")).toBe("Taras");
    expect(transliterateUa("Шевченко")).toBe("Shevchenko");
    expect(transliterateUa("Юлія")).toBe("Yuliia");
    expect(transliterateUa("Захарченко")).toBe("Zakharchenko");
    expect(transliterateUa("Андрій")).toBe("Andrii");
    expect(transliterateUa("Олексій")).toBe("Oleksii");
  });

  it("applies word-initial forms for є ї й ю я", () => {
    expect(transliterateUa("Єнакієве")).toBe("Yenakiieve");
    expect(transliterateUa("Гаєвич")).toBe("Haievych");
    expect(transliterateUa("Їжакевич")).toBe("Yizhakevych");
    expect(transliterateUa("Кадиївка")).toBe("Kadyivka");
    expect(transliterateUa("Йосипівка")).toBe("Yosypivka");
    expect(transliterateUa("Стрий")).toBe("Stryi");
    expect(transliterateUa("Юрій")).toBe("Yurii");
    expect(transliterateUa("Корюківка")).toBe("Koriukivka");
    expect(transliterateUa("Ярошенко")).toBe("Yaroshenko");
    expect(transliterateUa("Костянтин")).toBe("Kostiantyn");
  });

  it("maps зг to zgh and omits soft sign and apostrophe", () => {
    expect(transliterateUa("Згурський")).toBe("Zghurskyi");
    expect(transliterateUa("Згорани")).toBe("Zghorany");
    expect(transliterateUa("Тернопіль")).toBe("Ternopil");
    expect(transliterateUa("Мар'їне")).toBe("Marine");
    expect(transliterateUa("Короп'є")).toBe("Koropie");
  });

  it("preserves spaces and hyphens; restarts word-initial after them", () => {
    expect(transliterateUa("Тарас Шевченко")).toBe("Taras Shevchenko");
    expect(transliterateUa("Анна-Ярина")).toBe("Anna-Yaryna");
  });

  it("maps ґ to g and г to h", () => {
    expect(transliterateUa("Ґалаґан")).toBe("Galagan");
    expect(transliterateUa("Гадяч")).toBe("Hadiach");
    expect(transliterateUa("Київ")).toBe("Kyiv");
  });
});
